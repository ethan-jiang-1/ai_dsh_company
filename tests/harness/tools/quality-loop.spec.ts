// 负例留证 2026-11-10（实跑）：把 `verdictBodyHash` 改成不归一结尾换行 ⇒「裁决原文」用例红；
// 负例留证 2026-11-10：把原文索引改回跨轮全局 ⇒「R2 换新 verifier session」用例红（BUG-059）；
// 把 `parseDispositions` 的「接受」校验删掉 ⇒「接受必须写接受人」用例红；还原 ⇒ 绿。
// 真盘红证（探针驱动，同样实跑）见 `node probes/team/quality-loop-audit.mjs --self-test`：
// 改裁决正文 / 删一条处置 / 换方法版本 / 验证者写盘 各自变红，还原回绿。
//
// 质量环判据的 keyless 单测：**判据住 tools/lib/quality-loop.mjs，这一层只喂合成输入**。
// 它证明"契约判得对"，不证明"真会话里 agent 照做了"（那是 preset-smoke + 一次真模型 E2E）。
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'
import { fixVerdictText, hashBody } from '../../../packages/company-pack/presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs'
import {
  DISPOSITION_VALUES,
  MAX_ROUNDS,
  QUALITY_LOOP_DIR,
  auditQualityLoop,
  parseChecklist,
  parseDispositions,
  parseFindings,
  parseMethodSkill,
  parseVerdictHeader,
  splitVerdict,
  verdictBodyHash,
} from '../../../tools/lib/quality-loop.mjs'

const METHODS_HOME = join(ROOT, 'tests/fixtures/methods/dsh-home/company/methods')
/** 方法层根 = preset id（人按前缀找齐）；`side` 是方法包自己的词表。 */
const METHOD_ROOT = { producer: 'quality-loop-producer', verifier: 'quality-loop-verifier' } as const
const packOf = (side: string, name: string): ReturnType<typeof parseMethodSkill> =>
  parseMethodSkill(readFileSync(join(METHODS_HOME, METHOD_ROOT[side as keyof typeof METHOD_ROOT], name, 'SKILL.md'), 'utf8'))

const BODY = [
  '## 裁决：fail',
  '### 检查表',
  '| check-id | 结果 | 证据 |',
  '|---|---|---|',
  '| RT-01 | pass | 编号唯一 |',
  '| RT-02 | fail | REQ-002 缺来源 |',
  '| RT-03 | pass | 验收可判 |',
  '| RT-04 | skip | 本期无非范围 |',
  '### 发现',
  '- F1 [RT-02][blocker] REQ-002 没有来源',
  '',
].join('\n')

const BRIEF = [
  '| 目标 | 把上游基线变成可追溯账本 |',
  '| 约束 | 只读基线，不新增范围 |',
  '| 基线 | drafts/upstream.md |',
  '| 产物路径 | requirements.md |',
  '| 方法 | `requirements-trace@1.0.0` |',
  '| 轮次 | 2 |',
  '| 验收 | 检查表全覆盖 |',
  '',
].join('\n')

const DISPOSITIONS = ['| 发现 | 处置 | 说明 |', '|---|---|---|', '| F1 | fixed | 补了 REQ-002 的来源 |', ''].join('\n')

function header(body: string, overrides: Record<string, string> = {}): string {
  const fields = { round: '1', session: 's1', preset: 'quality-loop-verifier', depth: '2', producer: 'p1', method: 'requirements-trace@1.0.0', 'body-sha256': verdictBodyHash(body), ...overrides }
  return `<!-- quality-loop: ${Object.entries(fields).map(([key, value]) => `${key}=${value}`).join(' ')} -->`
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    brief: BRIEF,
    rounds: [{ file: 'verdict-r1.md', round: 1, verdictText: `${header(BODY)}\n${BODY}`, dispositionsText: DISPOSITIONS }],
    methods: { producer: packOf('producer', 'requirements-trace'), verifier: packOf('verifier', 'requirements-trace') },
    // 时序：产出者先开工（100）先收工（200），验证者收工后才开跑（250）——先生产、再验证。
    sessions: {
      p1: { preset: 'quality-loop-producer', depth: 2, createdAt: 100, firstTurnEnd: 200, assistantTexts: ['已产出'], toolNames: ['read', 'write'] },
      s1: { preset: 'quality-loop-verifier', depth: 2, createdAt: 250, finalText: BODY, toolNames: ['read', 'skill', 'todo'] },
    },
    ...overrides,
  }
}

const codes = (result: { problems: { code: string }[] }): string[] => result.problems.map(problem => problem.code)

describe('方法包夹具：两套方法、两侧同 id 同版本', () => {
  it('每套两侧都能解析出 metadata 与 check-id 表', () => {
    for (const [name, expected] of [['requirements-trace', { version: '1.0.0', ids: ['RT-01', 'RT-02', 'RT-03', 'RT-04'] }],
      ['api-contract', { version: '2.1.0', ids: ['AC-01', 'AC-02', 'AC-03'] }]] as const) {
      const producer = packOf('producer', name)
      const verifier = packOf('verifier', name)
      expect(producer?.method).toBe(name)
      expect(verifier?.method).toBe(name)
      expect(producer?.version).toBe(expected.version)
      expect(verifier?.version).toBe(expected.version)
      expect(producer?.side).toBe('producer')
      expect(verifier?.side).toBe('verifier')
      // 两侧检查表用同一批 check-id——否则覆盖核对没有锚。
      expect(producer?.checkIds).toEqual([...expected.ids])
      expect(verifier?.checkIds).toEqual([...expected.ids])
    }
  })

  it('同一套判据能审两套方法（第二消费者：换方法只换方法层）', () => {
    const body = ['## 裁决：pass', '### 检查表', '| check-id | 结果 | 证据 |', '|---|---|---|',
      '| AC-01 | pass | 端点齐全 |', '| AC-02 | pass | 有迁移路径 |', '| AC-03 | pass | 幂等已写 |', ''].join('\n')
    const result = auditQualityLoop(input({
      rounds: [{
        file: 'verdict-r1.md',
        round: 1,
        verdictText: `${header(body, { method: 'api-contract@2.1.0' })}\n${body}`,
        dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n',
      }],
      methods: { producer: packOf('producer', 'api-contract'), verifier: packOf('verifier', 'api-contract') },
      sessions: { s1: { preset: 'quality-loop-verifier', depth: 2, finalText: body, toolNames: ['read'] } },
      brief: BRIEF.replace('requirements-trace@1.0.0', 'api-contract@2.1.0'),
    }))
    expect(codes(result)).toEqual([])
  })
})

describe('解析器：形状即事实', () => {
  it('头行 → 字段；正文 = 头行之后一字不改', () => {
    const text = `${header(BODY)}\n${BODY}`
    const { header: parsed, body } = splitVerdict(text)
    expect(parsed).toEqual({
      round: '1', session: 's1', preset: 'quality-loop-verifier', depth: '2', producer: 'p1',
      method: 'requirements-trace@1.0.0', bodySha256: verdictBodyHash(BODY),
    })
    expect(body).toBe(BODY)
    expect(parseVerdictHeader('没有头')).toBeNull()
  })

  it('正文哈希归一结尾空白（文件尾随换行不算"改了"）', () => {
    expect(verdictBodyHash(`${BODY}\n\n`)).toBe(verdictBodyHash(BODY))
    expect(verdictBodyHash(`${BODY}补一句`)).not.toBe(verdictBodyHash(BODY))
  })

  it('检查表 / 发现 / 处置三张表按行解析', () => {
    expect(parseChecklist(BODY)).toEqual([
      { id: 'RT-01', result: 'pass', evidence: '编号唯一' },
      { id: 'RT-02', result: 'fail', evidence: 'REQ-002 缺来源' },
      { id: 'RT-03', result: 'pass', evidence: '验收可判' },
      { id: 'RT-04', result: 'skip', evidence: '本期无非范围' },
    ])
    expect(parseFindings(BODY)).toEqual([
      { id: 'F1', checkId: 'RT-02', level: 'blocker', text: 'REQ-002 没有来源' },
    ])
    expect(parseDispositions(DISPOSITIONS)).toEqual([{ id: 'F1', disposition: 'fixed', note: '补了 REQ-002 的来源' }])
  })
})

describe('审计判据：一条红配方一支用例', () => {
  it('合格的环 = 零问题', () => {
    expect(auditQualityLoop(input())).toEqual({ problems: [], warnings: [] })
  })

  it(`轮次上限 = ${String(MAX_ROUNDS)}；超限要升级（不许自己加轮）`, () => {
    const third = { file: 'verdict-r3.md', round: 3, verdictText: `${header(BODY, { round: '3' })}\n${BODY}`, dispositionsText: DISPOSITIONS }
    expect(codes(auditQualityLoop(input({ rounds: [input().rounds[0], third] })))).toContain('rounds-exceeded')
  })

  it('没有裁决 = 没有质量环', () => {
    expect(codes(auditQualityLoop(input({ rounds: [] })))).toContain('no-verdict')
  })

  it('同一轮出现两次（覆盖 append-only）= 红', () => {
    const rounds = [input().rounds[0], { ...input().rounds[0] }]
    expect(codes(auditQualityLoop(input({ rounds })))).toContain('duplicate-round')
  })

  it('缺任务书 / 任务书没点名方法 = 红（fail-closed）', () => {
    expect(codes(auditQualityLoop(input({ brief: null })))).toContain('no-brief')
    expect(codes(auditQualityLoop(input({ brief: BRIEF.replace('`requirements-trace@1.0.0`', '（待定）') })))).toContain('brief-no-method')
  })

  it('任务书点的方法与方法层不一致 = 红', () => {
    expect(codes(auditQualityLoop(input({ brief: BRIEF.replace('1.0.0', '0.9.0') })))).toContain('brief-method-mismatch')
  })

  it('缺头行 = 红（session/preset/depth/method 无处可查）', () => {
    const rounds = [{ ...input().rounds[0], verdictText: BODY }]
    expect(codes(auditQualityLoop(input({ rounds })))).toContain('no-header')
  })

  it('头里 preset 不是 verifier = 红（验的人不是做的人）', () => {
    const rounds = [{ ...input().rounds[0], verdictText: `${header(BODY, { preset: 'producer' })}\n${BODY}` }]
    expect(codes(auditQualityLoop(input({ rounds })))).toContain('header-preset')
  })

  it('裁决正文被改 = 红（文件自洽面）', () => {
    const rounds = [{ ...input().rounds[0], verdictText: `${header(BODY)}\n${BODY}（补一句）` }]
    expect(codes(auditQualityLoop(input({ rounds })))).toContain('body-modified')
  })

  it('裁决不是 child 最终消息原文 = 红', () => {
    const sessions = { s1: { ...input().sessions.s1, finalText: `${BODY}\n我另外补充了一段` } }
    expect(codes(auditQualityLoop(input({ sessions })))).toContain('not-verbatim')
  })

  it('R2 换新 verifier session：索引按会话重置，不误报 not-verbatim（BUG-059）', () => {
    const r1 = input().rounds[0]
    const r2 = {
      file: 'verdict-r2.md',
      round: 2,
      verdictText: `${header(BODY, { round: '2', session: 's2' })}\n${BODY}`,
    }
    const sessions = {
      ...input().sessions,
      s2: { preset: 'quality-loop-verifier', depth: 2, createdAt: 300, finalText: BODY, toolNames: ['read', 'skill'] },
    }
    expect(codes(auditQualityLoop(input({ rounds: [r1, r2], sessions })))).not.toContain('not-verbatim')
  })

  it('会话日志读不到 = warning，不假装核过原文', () => {
    const result = auditQualityLoop(input({ sessions: {} }))
    expect(result.problems).toEqual([])
    expect(result.warnings.map(warning => warning.code)).toContain('session-log-missing')
  })

  it('验证者会话调过 write/edit/bash = 红', () => {
    for (const tool of ['write', 'edit', 'bash']) {
      const sessions = { s1: { ...input().sessions.s1, toolNames: ['read', tool] } }
      expect(codes(auditQualityLoop(input({ sessions })))).toContain('verifier-wrote')
    }
  })

  it('会话 preset 或深度与头不符 = 红', () => {
    expect(codes(auditQualityLoop(input({ sessions: { s1: { ...input().sessions.s1, preset: 'producer' } } }))))
      .toContain('session-preset')
    expect(codes(auditQualityLoop(input({ sessions: { s1: { ...input().sessions.s1, depth: 3 } } }))))
      .toContain('session-depth')
  })

  it('检查表漏 check-id = 红（缺行 = 不通过）', () => {
    const body = BODY.replace('| RT-03 | pass | 验收可判 |\n', '')
    const rounds = [{ ...input().rounds[0], verdictText: `${header(body)}\n${body}` }]
    const sessions = { s1: { ...input().sessions.s1, finalText: body } }
    expect(codes(auditQualityLoop(input({ rounds, sessions })))).toContain('checklist-gap')
  })

  it('skip 不写理由 / 结果词不在词表 = 红', () => {
    const body = BODY.replace('| RT-04 | skip | 本期无非范围 |', '| RT-04 | skip |')
    const rounds = [{ ...input().rounds[0], verdictText: `${header(body)}\n${body}` }]
    const sessions = { s1: { ...input().sessions.s1, finalText: body } }
    const problems = codes(auditQualityLoop(input({ rounds, sessions })))
    expect(problems).toContain('checklist-skip-reason')
    const bad = BODY.replace('| RT-01 | pass | 编号唯一 |', '| RT-01 | ok | 编号唯一 |')
    const rounds2 = [{ ...input().rounds[0], verdictText: `${header(bad)}\n${bad}` }]
    const sessions2 = { s1: { ...input().sessions.s1, finalText: bad } }
    expect(codes(auditQualityLoop(input({ rounds: rounds2, sessions: sessions2 })))).toContain('checklist-result')
  })

  it('两侧方法版本不同 = 红；side 写错 = 红', () => {
    const methods = { ...input().methods, verifier: { ...input().methods.verifier, version: '1.0.1' } }
    expect(codes(auditQualityLoop(input({ methods })))).toContain('version-mismatch')
    const wrongSide = { ...input().methods, verifier: { ...input().methods.verifier, side: 'producer' } }
    expect(codes(auditQualityLoop(input({ methods: wrongSide })))).toContain('side-mismatch')
  })

  it('方法层缺一侧 = warning（fail-closed 面，不静默当通过）', () => {
    const result = auditQualityLoop(input({ methods: { producer: input().methods.producer } }))
    expect(result.warnings.map(warning => warning.code)).toContain('methods-unavailable')
  })

  it('发现没有处置 = 红（不许静默忽略）', () => {
    const rounds = [{ ...input().rounds[0], dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n' }]
    expect(codes(auditQualityLoop(input({ rounds })))).toContain('disposition-missing')
    const rounds2 = [{ ...input().rounds[0], dispositionsText: undefined }]
    expect(codes(auditQualityLoop(input({ rounds: rounds2 })))).toContain('no-dispositions')
  })

  it('处置词不在三选一 / 没写说明 = 红', () => {
    expect(DISPOSITION_VALUES).toEqual(['fixed', 'rebut', 'accept'])
    const rounds = [{ ...input().rounds[0], dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n| F1 | 忽略 | 不重要 |\n' }]
    expect(codes(auditQualityLoop(input({ rounds })))).toContain('disposition-value')
    const rounds2 = [{ ...input().rounds[0], dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n| F1 | fixed | |\n' }]
    expect(codes(auditQualityLoop(input({ rounds: rounds2 })))).toContain('disposition-note')
  })

  it('「接受」必须写接受人；blocker 不许自行接受', () => {
    const noAcceptor = [{ ...input().rounds[0], dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n| F1 | accept | 风险可控 |\n' }]
    expect(codes(auditQualityLoop(input({ rounds: noAcceptor })))).toContain('disposition-acceptor')
    const acceptedBlocker = [{
      ...input().rounds[0],
      dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n| F1 | accept | accepted-by: VP-Eng |\n',
    }]
    expect(codes(auditQualityLoop(input({ rounds: acceptedBlocker })))).toContain('blocker-accepted')
  })

  it('复验轮重列已处置的发现 = 闭环陈述（绿 + warning），不必再出处置表', () => {
    const passed = BODY.replace('## 裁决：fail', '## 裁决：pass')
    const round2 = {
      file: 'verdict-r2.md',
      round: 2,
      verdictText: `${header(passed, { round: '2' })}\n${passed}`,
      dispositionsText: undefined,
    }
    const result = auditQualityLoop(input({
      rounds: [input().rounds[0], round2],
      sessions: { ...input().sessions, s1: { ...input().sessions.s1, assistantTexts: [BODY, passed] } },
    }))
    expect(result.problems).toEqual([])
    expect(result.warnings.map(warning => warning.code)).toEqual(['carried-forward'])
  })

  it('复验轮提出**新**发现却没处置 = 红', () => {
    const body = BODY.replace('## 裁决：fail', '## 裁决：pass') + '- F2 [RT-04][blocker] 新增的一条\n'
    const round2 = {
      file: 'verdict-r2.md',
      round: 2,
      verdictText: `${header(body, { round: '2' })}\n${body}`,
      dispositionsText: undefined,
    }
    expect(codes(auditQualityLoop(input({ rounds: [input().rounds[0], round2] })))).toContain('disposition-missing')
  })

  it('处置首格把发现标题抄进去（`F1 [RT-04][blocker] …`）仍按 F1 认', () => {
    const rounds = [{
      ...input().rounds[0],
      dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n| F1 [RT-02][blocker] REQ-002 没有来源 | fixed | 补了来源 |\n',
    }]
    expect(codes(auditQualityLoop(input({ rounds })))).toEqual([])
  })

  it('同一 child 续跑（复验沿用 session）：原文命中任一条助手正文即算原文', () => {
    // R1 的正文是该会话第一条助手正文；最后一条是 R2 的裁决（E2E 实测形态）。
    const sessions = { s1: { ...input().sessions.s1, assistantTexts: [BODY, '## 裁决：pass\n复验通过'] } }
    expect(codes(auditQualityLoop(input({ sessions })))).toEqual([])
    const wrong = { s1: { ...input().sessions.s1, assistantTexts: ['另一段完全不同的正文'] } }
    expect(codes(auditQualityLoop(input({ sessions: wrong })))).toContain('not-verbatim')
  })

  it('先生产再验证：验证者早于产出者收工 = 红（同时发出去不算质量环）', () => {
    const parallel = { ...input().sessions, s1: { ...input().sessions.s1, createdAt: 150 } }
    expect(codes(auditQualityLoop(input({ sessions: parallel })))).toContain('order-violation')
    const noEnd = { ...input().sessions, p1: { ...input().sessions.p1, firstTurnEnd: undefined } }
    expect(codes(auditQualityLoop(input({ sessions: noEnd })))).toContain('order-violation')
    const reversed = { ...input().sessions, p1: { ...input().sessions.p1, createdAt: 400 }, s1: { ...input().sessions.s1, createdAt: 250 } }
    expect(codes(auditQualityLoop(input({ sessions: reversed })))).toContain('order-violation')
  })

  it('头里没写 producer（次序无从核对）= 红；写 unavailable = warning；产出者 preset 不对 = 红', () => {
    const withoutField = [{ ...input().rounds[0], verdictText: `${header(BODY, { producer: '' }).replace('producer= ', '')}\n${BODY}` }]
    expect(codes(auditQualityLoop(input({ rounds: withoutField })))).toContain('producer-missing')
    const unavailable = [{ ...input().rounds[0], verdictText: `${header(BODY, { producer: 'unavailable' })}\n${BODY}` }]
    const warned = auditQualityLoop(input({ rounds: unavailable }))
    expect(warned.problems).toEqual([])
    expect(warned.warnings.map(warning => warning.code)).toContain('producer-unverified')
    const wrongPreset = { ...input().sessions, p1: { ...input().sessions.p1, preset: 'quality-loop-verifier' } }
    expect(codes(auditQualityLoop(input({ sessions: wrongPreset })))).toContain('producer-preset')
  })

  it('处置表里夹着「无 / 备注」这类非发现行 = 忽略，不冒充 id', () => {
    const rounds = [{
      ...input().rounds[0],
      dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n| 无 | — | 裁决无发现 |\n| F1 | fixed | 补了来源 |\n',
    }]
    const result = auditQualityLoop(input({ rounds }))
    expect(result.problems).toEqual([])
    expect(result.warnings.map(warning => warning.code)).toEqual([])
  })

  it('处置词带排版（`**fixed**`）仍按词认', () => {
    const rounds = [{
      ...input().rounds[0],
      dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n| F1 | **fixed** | 补了来源 |\n',
    }]
    expect(codes(auditQualityLoop(input({ rounds })))).toEqual([])
  })

  it('裁决目录常量是唯一口径（流程 skill 与探针都引用它）', () => {
    expect(QUALITY_LOOP_DIR).toBe('quality-loop')
    const skill = readFileSync(join(ROOT, 'packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md'), 'utf8')
    expect(skill).toContain(QUALITY_LOOP_DIR)
    expect(skill).toContain('body-sha256')
  })
})

// 负例留证 2026-11-10：BUG-056 —— 修前没有 verdict-hash 工具；`--fix` 不归一尾随换行时，
// 「含尾随换行的旧 hash」用例会红（audit 判 body-modified）。补工具 + audit warning 后绿。
describe('verdict hash 工具与「unverified」可见性（BUG-056）', () => {
  it('尾随换行/空白不改变正文哈希（与 audit 同口径）', () => {
    for (const body of ['x\n', 'x\n\n', 'x \n', 'x\t\n']) {
      expect(hashBody(body)).toBe(verdictBodyHash(body))
    }
  })

  it('--fix 把含尾随换行的旧 hash 回填成 audit 口径', () => {
    const naive = createHash('sha256').update(`${BODY}\n`).digest('hex')
    const text = `<!-- quality-loop: round=1 session=s1 preset=quality-loop-verifier depth=2 producer=p1 method=requirements-trace@1.0.0 body-sha256=${naive} -->\n${BODY}`
    const fixed = fixVerdictText(text)
    const { header, body } = splitVerdict(fixed)
    expect(header?.bodySha256).toBe(verdictBodyHash(body))
    expect(body).toBe(BODY)
  })

  it('缺头 fail-loud', () => {
    expect(() => fixVerdictText('没有 quality-loop 头\n')).toThrow(/quality-loop 头/)
  })

  it('skill / guide 指向 verdict-hash 工具，不再教 `tail | shasum`', () => {
    const skill = readFileSync(join(ROOT, 'packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md'), 'utf8')
    expect(skill).toContain('verdict-hash.mjs --fix')
    expect(skill).toContain('Do not use `tail -n +2 file | shasum`')
    const guide = readFileSync(join(ROOT, 'docs/guides/quality-loop.md'), 'utf8')
    expect(guide).toContain('verdict-hash.mjs --fix')
    expect(guide).toContain('不要用 `tail -n +2 | shasum`')
  })

  it('处置表标 unverified 且没有 R2 → warning（不冒充原文一致）', () => {
    const rounds = [{
      ...input().rounds[0],
      dispositionsText: `${DISPOSITIONS}\n规则：本轮裁决后订正产物，unverified by a second verifier。\n`,
    }]
    const result = auditQualityLoop(input({ rounds }))
    expect(result.problems).toEqual([])
    expect(result.warnings.map(warning => warning.code)).toContain('post-verdict-unverified')
  })
})

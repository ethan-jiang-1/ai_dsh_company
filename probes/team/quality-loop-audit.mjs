#!/usr/bin/env node
// 状态：常驻
// 何时跑：跑过一轮质量环（producer→verifier）之后、或改质量环判据/方法包之后；收口前自检。
//   也用作规格自证：`--self-test`（keyless，秒级）把三种破坏各跑一遍，红→还原→绿。
// 成本：真实用例 keyless 秒级（只读盘与会话日志，不调模型）；`--self-test` 同档。
// 用法：source run/env.sh && node probes/team/quality-loop-audit.mjs [--workspace <dir>] [--deliverable <dir>]
//       [--home <dir>] [--methods <dir>] [--self-test] [--json]
// 判据（实现 = tools/lib/quality-loop.mjs，spec 钉同源）：
//   ① 两个独立 activation：裁决头的 session/preset/depth/producer 对得上真实 child durable header；
//   ⓪ 先生产再验证：验证者会话必须在产出者**首轮 turn/end 之后**才创建（顺序发工，不是并行）；
//   ① 两个独立 activation：裁决头的 session/preset/depth 对得上真实 child durable header（preset=quality-loop-verifier）；
//   ② 裁决原文：文件正文 sha256 == 头里 body-sha256 == child 最终消息正文哈希（不是同一次就红）；
//   ③ 未被改：正文与头对不上即红（append-only 的机械面）；
//   ④ 处置覆盖：裁决里每条 F<n> 都有三选一处置，且「接受」写了接受人；
//   ⑤ 方法配对：两侧 method+version 相同、side 正确、brief 点名与之一致、检查表逐 check-id 有结论；
//   ⑥ 只读手：验证者会话没有 write/edit/bash 调用；
//   ⑦ 裁决后订正：最后一轮 dispositions 显式写「未复验」→ warning `post-verdict-unverified`（不冒充原文一致）。
// 不证明：不证明产物质量、不证明验证者的判断对（那是人审）；不是运行时 veto——事后检测，改盘仍可能发生。
//   会话日志已轮转/归档时只核文件自洽并打 warning（`session-log-missing`），不假装核过原文。
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { pickSessionLog } from '../../tools/lib/session-log-generation.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import {
  QUALITY_LOOP_DIR,
  auditQualityLoop,
  parseMethodSkill,
  splitVerdict,
  verdictBodyHash,
} from '../../tools/lib/quality-loop.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const valueOf = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}

/** 读 zstd 会话日志（多帧）；不是 zstd 就按明文读。读不了返回空串（调用方按"日志不可读"处理）。 */
function readLog(file) {
  if (!file.endsWith('.zstd')) {
    try { return readFileSync(file, 'utf8') } catch { return '' }
  }
  try {
    const out = spawnSync('zstd', ['-dc', file], { maxBuffer: 64 * 1024 * 1024 })
    return out.status === 0 ? out.stdout.toString('utf8') : ''
  } catch { return '' }
}

/** 找到一个会话目录（`<home>/sessions/<workspace-slug>/<sessionId>/`）。 */
function findSessionDir(sessionsRoot, sessionId) {
  if (!existsSync(sessionsRoot)) return undefined
  for (const slug of readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue
    const dir = join(sessionsRoot, slug.name, sessionId)
    if (existsSync(dir)) return dir
  }
  return undefined
}

/** 会话事实：preset / 深度 / 最终正文 / 调过的工具名（durable header 为准）。 */
function sessionFacts(sessionsRoot, sessionId) {
  const dir = findSessionDir(sessionsRoot, sessionId)
  if (dir === undefined) return undefined
  const picked = pickSessionLog(dir)
  if (picked === undefined) return undefined
  const text = readLog(join(dir, picked.name))
  if (text === '') return undefined
  let preset = null
  let depth = null
  let createdAt = null
  let firstTurnEnd = null
  const assistantTexts = []
  const toolNames = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    let event
    try { event = JSON.parse(line) } catch { continue }
    if (event.type === 'session') {
      preset = event.agentPreset ?? null
      depth = typeof event.delegationDepth === 'number' ? event.delegationDepth : null
      createdAt = typeof event.createdAt === 'number' ? event.createdAt : null
    } else if (event.type === 'turn/end') {
      const at = typeof event.time === 'number' ? event.time : null
      if (at !== null && (firstTurnEnd === null || at < firstTurnEnd)) firstTurnEnd = at
    } else if (event.type === 'assistant/message') {
      const content = event.data?.message?.content
      if (Array.isArray(content)) {
        // 同一 child 可被续跑（R2 复验）：保留每一轮助手正文，原文一致性要能在**某一轮**命中。
        const said = content.filter(block => block?.type === 'text').map(block => block.text).join('\n')
        if (said.trim() !== '') assistantTexts.push(said)
      }
    } else if (event.type === 'tool/call') {
      if (typeof event.data?.name === 'string') toolNames.push(event.data.name)
    }
  }
  return { preset, depth, createdAt, firstTurnEnd, assistantTexts, finalText: assistantTexts.at(-1), toolNames }
}

/** 方法层根 = preset id（`<DSH_HOME>/company/methods/<preset id>/<pack>/SKILL.md`）；`side` 是方法包自己的词表。 */
const METHOD_ROOT_BY_SIDE = { producer: 'quality-loop-producer', verifier: 'quality-loop-verifier' }

/** 方法层：`<methodsRoot>/<preset id>/<pack>/SKILL.md`（缺目录容忍）。 */
function loadMethods(methodsRoot) {
  const bySide = { producer: {}, verifier: {} }
  for (const [side, presetId] of Object.entries(METHOD_ROOT_BY_SIDE)) {
    const dir = join(methodsRoot, presetId)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const file = join(dir, entry.name, 'SKILL.md')
      if (!existsSync(file)) continue
      const parsed = parseMethodSkill(readFileSync(file, 'utf8'))
      if (parsed !== null) bySide[side][entry.name] = { ...parsed, file }
    }
  }
  return bySide
}

/** 从 round-1 裁决头解析方法名，取两侧同名的一份（没头就按方法层唯一一份兜底）。 */
function resolveMethodPair(bySide, rounds) {
  let named
  for (const round of rounds) {
    const { header } = splitVerdict(round.verdictText)
    if (header?.method !== null && header?.method !== undefined) {
      named = header.method.split('@')[0]
      break
    }
  }
  const pick = (side) => {
    const packs = bySide[side]
    if (named !== undefined && packs[named] !== undefined) return packs[named]
    const names = Object.keys(packs)
    return names.length === 1 ? packs[names[0]] : undefined
  }
  const producer = pick('producer')
  const verifier = pick('verifier')
  return {
    methods: { ...(producer === undefined ? {} : { producer }), ...(verifier === undefined ? {} : { verifier }) },
    named,
  }
}

/** 一个交付目录的 quality-loop 产物 → 审计输入。 */
function loadLoop(loopDir, sessionsRoot, methodsRoot) {
  const read = (name) => {
    const file = join(loopDir, name)
    return existsSync(file) ? readFileSync(file, 'utf8') : null
  }
  const names = existsSync(loopDir) ? readdirSync(loopDir) : []
  const rounds = names
    .map(name => /^verdict-r(\d+)\.md$/.exec(name))
    .filter(match => match !== null)
    .map(match => {
      const round = Number(match[1])
      return {
        file: match[0],
        round,
        verdictText: read(match[0]) ?? '',
        dispositionsText: read(`dispositions-r${String(round)}.md`) ?? undefined,
      }
    })
  const { methods } = resolveMethodPair(loadMethods(methodsRoot), rounds)
  const sessions = {}
  for (const round of rounds) {
    const { header } = splitVerdict(round.verdictText)
    for (const id of [header?.session, header?.producer]) {
      if (id === null || id === undefined || sessions[id] !== undefined) continue
      const facts = sessionFacts(sessionsRoot, id)
      if (facts !== undefined) sessions[id] = facts
    }
  }
  return { rounds, methods, sessions, brief: read('brief.md') }
}

/** 审计一个交付目录：返回 problems/warnings（与 spec 同源）。 */
function auditDeliverable(deliverable, sessionsRoot, methodsRoot) {
  const loopDir = join(deliverable, QUALITY_LOOP_DIR)
  const input = loadLoop(loopDir, sessionsRoot, methodsRoot)
  return { loopDir, input, ...auditQualityLoop(input) }
}

function report(label, problems, warnings) {
  for (const warning of warnings) console.log(`  · ${label} ⚠ ${warning.code}: ${warning.detail}`)
  for (const problem of problems) console.log(`  ✗ ${label} ${problem.code}: ${problem.detail}`)
}

/** 规格自证：合成一次质量环 → 绿；三种破坏 → 各自红；还原 → 绿。 */
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'quality-loop-self-test-'))
  const methodsRoot = join(dir, 'methods')
  const body = [
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
  const producer = ['---', 'name: trace', 'metadata:', '  method: trace', '  version: 1.0.0', '  side: producer', '---',
    '| check-id | 判据 |', '|---|---|', '| RT-01 | a |', '| RT-02 | b |', '| RT-03 | c |', '| RT-04 | d |', ''].join('\n')
  const verifier = producer.replace('side: producer', 'side: verifier')
  for (const [side, text] of [['producer', producer], ['verifier', verifier]]) {
    const target = join(methodsRoot, METHOD_ROOT_BY_SIDE[side], 'trace')
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'SKILL.md'), text)
  }
  const bySide = loadMethods(methodsRoot)
  const rounds = [{
    file: 'verdict-r1.md',
    round: 1,
    verdictText: `<!-- quality-loop: round=1 session=s1 preset=quality-loop-verifier depth=2 producer=p1 method=trace@1.0.0 body-sha256=${verdictBodyHash(body)} -->\n${body}`,
    dispositionsText: ['| 发现 | 处置 | 说明 |', '|---|---|---|', '| F1 | 已修 | 补了来源 |', ''].join('\n'),
  }]
  const brief = '| 目标 | x |\n| 约束 | y |\n| 基线 | z |\n| 产物 | p |\n| 方法 | `trace@1.0.0` |\n| 轮次 | 2 |\n| 验收 | 全绿 |\n'
  // 时序：产出者先开工先收工（p1: 100 → 200），验证者收工后才开跑（s1: 250）。
  const sessions = {
    p1: { preset: 'quality-loop-producer', depth: 2, createdAt: 100, firstTurnEnd: 200, assistantTexts: ['已产出'], toolNames: ['read', 'write'] },
    s1: { preset: 'quality-loop-verifier', depth: 2, createdAt: 250, firstTurnEnd: 300, finalText: body, toolNames: ['read', 'skill'] },
  }
  const base = { rounds, methods: { producer: bySide.producer.trace, verifier: bySide.verifier.trace }, sessions, brief }

  const codesOf = (result) => result.problems.map(problem => problem.code)
  const cases = [
    { name: '基线', codes: codesOf(auditQualityLoop(base)), expect: [] },
    {
      name: '改裁决正文',
      codes: codesOf(auditQualityLoop({
        ...base,
        rounds: [{ ...rounds[0], verdictText: rounds[0].verdictText.replace('REQ-002 缺来源', 'REQ-002 缺来源（已看过）') }],
      })),
      expect: ['body-modified', 'not-verbatim'],
    },
    {
      name: '删一条处置',
      codes: codesOf(auditQualityLoop({
        ...base,
        rounds: [{ ...rounds[0], dispositionsText: '| 发现 | 处置 | 说明 |\n|---|---|---|\n' }],
      })),
      expect: ['disposition-missing'],
    },
    {
      name: '换方法版本',
      codes: codesOf(auditQualityLoop({
        ...base,
        methods: { ...base.methods, verifier: { ...base.methods.verifier, version: '1.0.1' } },
      })),
      expect: ['version-mismatch', 'header-method'],
    },
    {
      name: '并行发工（验证者先于产出者收工）',
      codes: codesOf(auditQualityLoop({ ...base, sessions: { ...sessions, s1: { ...sessions.s1, createdAt: 150 } } })),
      expect: ['order-violation'],
    },
    {
      name: '验证者写盘',
      codes: codesOf(auditQualityLoop({ ...base, sessions: { s1: { ...sessions.s1, toolNames: ['read', 'write'] } } })),
      expect: ['verifier-wrote'],
    },
    { name: '还原', codes: codesOf(auditQualityLoop(base)), expect: [] },
  ]

  const caseCount = cases.length
  let failed = 0
  for (const item of cases) {
    const missing = item.expect.filter(code => !item.codes.includes(code))
    const unexpected = item.expect.length === 0 ? item.codes : []
    const ok = missing.length === 0 && unexpected.length === 0
    if (!ok) failed += 1
    console.log(`${ok ? '✓' : '✗'} self-test ${item.name}：${item.codes.length === 0 ? '绿' : item.codes.join(', ')}`
      + (missing.length > 0 ? `；缺 ${missing.join(', ')}` : '')
      + (unexpected.length > 0 ? `；不该红：${unexpected.join(', ')}` : ''))
  }
  rmSync(dir, { recursive: true, force: true })
  return { failed, caseCount }
}

// ── 入口 ──────────────────────────────────────────────────────────────
if (flag('self-test')) {
  const { failed, caseCount } = selfTest()
  console.log(failed === 0 ? `quality-loop-audit --self-test：ALL PASS（${String(caseCount)} 支：基线 → 各破坏各红 → 还原绿）` : `quality-loop-audit --self-test：${String(failed)} 支 FAIL`)
  process.exit(failed === 0 ? 0 : 1)
}

let home
try {
  home = valueOf('home') === undefined ? requireDevHome('quality-loop-audit') : resolve(valueOf('home'))
} catch (error) {
  console.error(String(error?.message ?? error))
  process.exit(2)
}
const sessionsRoot = join(home, 'sessions')
const methodsRoot = valueOf('methods') === undefined ? join(home, 'company', 'methods') : resolve(valueOf('methods'))

const targets = []
const explicit = valueOf('deliverable')
if (explicit !== undefined) {
  targets.push(resolve(explicit))
} else {
  const workspace = resolve(valueOf('workspace') ?? join(ROOT, 'company-workspace'))
  const deliverables = join(workspace, '.dsh-company', 'deliverables')
  if (!existsSync(deliverables)) {
    console.error(`quality-loop-audit: ${deliverables} 不在盘上（先跑 pnpm bundle:init，或用 --deliverable 点名）`)
    process.exit(2)
  }
  for (const entry of readdirSync(deliverables, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(deliverables, entry.name)
    if (existsSync(join(dir, QUALITY_LOOP_DIR))) targets.push(dir)
  }
}

if (targets.length === 0) {
  console.log('quality-loop-audit: 没有质量环产物（`<交付目录>/quality-loop/`）——跳过（不是通过）')
  process.exit(0)
}

const results = []
let problems = 0
for (const target of targets) {
  const result = auditDeliverable(target, sessionsRoot, methodsRoot)
  const label = target.split('/').slice(-1)[0]
  if (flag('json')) {
    results.push({ deliverable: label, problems: result.problems, warnings: result.warnings })
  } else {
    report(label, result.problems, result.warnings)
    console.log(`${result.problems.length === 0 ? '✓' : '✗'} ${label}：裁决 ${String(result.input.rounds.length)} 轮 / 方法 ${Object.keys(result.input.methods).length} 侧 / 发现覆盖见上`)
  }
  problems += result.problems.length
}
if (flag('json')) console.log(`JSON:${JSON.stringify({ deliverables: results })}`)
console.log(problems === 0 ? `quality-loop-audit: ALL PASS（${String(targets.length)} 个交付目录）` : `quality-loop-audit: ${String(problems)} 处 FAIL`)
process.exit(problems === 0 ? 0 : 1)

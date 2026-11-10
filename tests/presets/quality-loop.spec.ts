// 负例留证 2026-11-10：把 quality-loop-verifier 的 `tool-fs` 改回可写（删 `write: false`/`edit: false`）⇒
// 「验证者真只读」用例红；把它加回 `_shared/delegation/skills/` ⇒ delegation-contract 的
// 「worker/能力档不挂 delegation 根」用例红；还原 ⇒ 绿。
//
// 质量环的两个能力档（`quality-loop-producer` / `quality-loop-verifier`）与流程 skill 的**声明面**守卫。
// 行为面（两个独立会话、验证者真不写盘、裁决原文）不在这里——那是 preset-smoke（挂载）与
// 一次真模型 E2E（证据进落地 Note，不进回归，见卡 2026-11-10-producer-verifier-quality-loop 验收 7）。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { COMPANY_ROLE_IDS, COMPANY_SUPPORT_PRESET_IDS } from '../../tools/lib/company-roles.mjs'
import { handbookSkipPresets } from '../../tools/lib/delegation-model.mjs'
import { NON_ROLE_PRESETS } from '../../packages/company-pack/src/lib/delegation-surface.ts'
import { allRows, loadPresetDoc, pluginConfig, rowById } from './preset-yaml.ts'

const PACK = join(ROOT, 'packages/company-pack')
const SUPPORT_SKILLS = 'presets/_shared/skills/'
const QUALITY_LOOP_SKILL = join(PACK, SUPPORT_SKILLS, 'quality-loop/SKILL.md')

const namesOf = (id: string): Set<string> => new Set(allRows(loadPresetDoc(id))
  .map(row => row.name)
  .filter((name): name is string => typeof name === 'string'))

const personaOf = (id: string): string => String(pluginConfig(rowById(loadPresetDoc(id), 'persona')).prefix ?? '')

/** 两个能力档都不该有的行：委派/协作/决策面 + 公司手册注入。 */
const FORBIDDEN_ROWS = [
  '@deepseek-ai/dsh-tool-subagent',
  '@deepseek-ai/dsh-tool-workflow',
  '@deepseek-ai/dsh-workflow-ptc',
  '@deepseek-ai/dsh-experimental-tool-agent-team',
  '@deepseek-ai/dsh-tool-subagent-control',
  '@deepseek-ai/dsh-tool-subagent-control/list-agents',
  '@deepseek-ai/dsh-tool-ask-user',
  '@deepseek-ai/dsh-tool-present',
  '@deepseek-ai/dsh-agent-instructions',
]

describe('质量环能力档：roster 与声明面', () => {
  it('两个能力档是 support、不占公司角色，且共用 `quality-loop-` 前缀（人按前缀找齐）', () => {
    const patch = (JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: readonly string[] } }
    }).dsh?.bundle?.patch ?? []
    for (const preset of ['quality-loop-producer', 'quality-loop-verifier']) {
      expect(preset.startsWith('quality-loop-'), `${preset} 没带共用前缀`).toBe(true)
      expect(COMPANY_SUPPORT_PRESET_IDS).toContain(preset)
      expect(COMPANY_ROLE_IDS).not.toContain(preset)
      expect(patch, `${preset} 未进 dsh.bundle.patch（装了也不进名册）`).toContain(`./presets/${preset}/agent.cordis.yml`)
      const doc = loadPresetDoc(preset)
      expect(doc.id).toBe(preset)
      expect(doc.raw).toContain(`- id: preset-${preset}`)
      expect(doc.raw).toMatch(new RegExp(`^\\s+id: ${preset}$`, 'm'))
      expect(doc.description ?? '', `${preset} 缺模型可见 description`).not.toBe('')
    }
  })

  it('两者都不注入公司手册（模型派生 == 运行时表）', () => {
    for (const preset of ['quality-loop-producer', 'quality-loop-verifier']) {
      expect(handbookSkipPresets(), `${preset} 是非角色，手册跳过集合该含它`).toContain(preset)
      expect([...NON_ROLE_PRESETS], `${preset} 的运行时跳过表与模型不一致`).toContain(preset)
      expect(namesOf(preset).has('@deepseek-ai/dsh-agent-instructions')).toBe(false)
    }
  })

  it('它们的行引用的插件都在 pack 依赖声明里（安装后解析得到，否则 preset broken）', () => {
    const manifest = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }
    const deps = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})])
    const missing = [...namesOf('quality-loop-producer'), ...namesOf('quality-loop-verifier')]
      // 行名 = 插件包名（或带 subpath）；`cordis:group` 这类组行不是包，跳过。
      .filter(spec => spec.startsWith('@'))
      .map(spec => /^(@[^/]+\/[^/]+)/.exec(spec)?.[1] ?? spec)
      .filter(name => !deps.has(name))
    expect([...new Set(missing)], '能力档的行引用了未声明的插件').toEqual([])
  })
})

describe('产出者（quality-loop-producer）：有手、有方法槽、没有委派面', () => {
  it('工具面 = 读/写/跑/查 + 技能 + 压缩', () => {
    const names = namesOf('quality-loop-producer')
    for (const required of [
      '@deepseek-ai/dsh-tool-fs',
      '@deepseek-ai/dsh-tool-fs-search',
      '@deepseek-ai/dsh-tool-bash',
      '@deepseek-ai/dsh-tool-web',
      '@deepseek-ai/dsh-tool-todo',
      '@deepseek-ai/dsh-tool-skill',
      '@deepseek-ai/dsh-compaction-basic',
      '@deepseek-ai/dsh-command-compact',
      '@deepseek-ai/dsh-compaction-tool-result-pruner',
    ]) {
      expect(names.has(required), `producer 缺 ${required}`).toBe(true)
    }
    const fs = pluginConfig(rowById(loadPresetDoc('quality-loop-producer'), 'tool-fs'))
    expect(fs.write, 'producer 要能写产物').not.toBe(false)
    expect(fs.edit, 'producer 要能改产物').not.toBe(false)
  })

  it('没有 subagent/team/workflow/control/ask-user/present/手册', () => {
    const names = namesOf('quality-loop-producer')
    for (const forbidden of FORBIDDEN_ROWS) {
      expect(names.has(forbidden), `producer 不该有 ${forbidden}`).toBe(false)
    }
  })
})

describe('验证者（quality-loop-verifier）：真只读（能力面，不是文案）', () => {
  it('tool-fs 关掉写/改；没有 bash', () => {
    const doc = loadPresetDoc('quality-loop-verifier')
    const fs = pluginConfig(rowById(doc, 'tool-fs'))
    expect(fs.write, 'verifier 必须 write: false（否则"只读"只是 persona 里的一句话）').toBe(false)
    expect(fs.edit, 'verifier 必须 edit: false').toBe(false)
    const names = namesOf('quality-loop-verifier')
    expect(names.has('@deepseek-ai/dsh-tool-bash'), 'verifier v1 没有 bash（真只读的代价已记账）').toBe(false)
    for (const required of [
      '@deepseek-ai/dsh-tool-fs',
      '@deepseek-ai/dsh-tool-fs-search',
      '@deepseek-ai/dsh-tool-web',
      '@deepseek-ai/dsh-tool-todo',
      '@deepseek-ai/dsh-tool-skill',
      '@deepseek-ai/dsh-compaction-basic',
    ]) {
      expect(names.has(required), `verifier 缺 ${required}（连读都读不了就验不了）`).toBe(true)
    }
  })

  it('没有 subagent/team/workflow/control/ask-user/present/手册', () => {
    const names = namesOf('quality-loop-verifier')
    for (const forbidden of FORBIDDEN_ROWS) {
      expect(names.has(forbidden), `verifier 不该有 ${forbidden}`).toBe(false)
    }
  })
})

describe('方法槽与流程 skill：身份不含方法，流程不含身份', () => {
  it('两侧 customSkillDirs 各指自己的方法层 + 共享流程根；不并入默认根', () => {
    for (const preset of ['quality-loop-producer', 'quality-loop-verifier']) {
      const dirs = pluginConfig(rowById(loadPresetDoc(preset), 'skill-filesystem')).customSkillDirs
      expect(Array.isArray(dirs), `${preset} 缺 customSkillDirs`).toBe(true)
      const joined = (dirs as readonly string[]).join('\n')
      expect(joined, `${preset} 缺自己的方法层根`).toContain(`company/methods/${preset}/`)
      expect(joined, `${preset} 缺共享流程根（quality-loop 在那里）`).toContain('presets/_shared/skills/')
      expect(pluginConfig(rowById(loadPresetDoc(preset), 'skill-filesystem')).includeDefaultRoots,
        `${preset} 必须硬隔离（否则项目根/用户级技能会盖掉方法层）`).toBe(false)
      expect(joined, `${preset} 不该挂委派共享根`).not.toContain('_shared/delegation/skills/')
    }
  })

  it('persona 短（≤2KB）且不含方法名/退役方法论/公司事实', () => {
    for (const preset of ['quality-loop-producer', 'quality-loop-verifier']) {
      const persona = personaOf(preset)
      expect(persona, `${preset} persona 缺失`).not.toBe('')
      expect(Buffer.byteLength(persona, 'utf8'), `${preset} persona 超 2KB（方法该住方法层，人格只留边界）`)
        .toBeLessThanOrEqual(2048)
      // 窄 tripwire：只挡**已知**的三种错位，不当宽泛黑名单用（会漂）。
      expect(persona, `${preset} persona 写死了方法名（方法必须由任务书点名）`)
        .not.toMatch(/requirements-trace|api-contract/)
      expect(persona, `${preset} persona 写回了退役方法论（V 模型/SyRS/SQA = 2026-11-09 退役的那套）`)
        .not.toMatch(/V\s*模型|SyRS|IRS|SQA/)
      expect(persona, `${preset} persona 写了公司事实（公司事实住 .dsh-company/kb/）`)
        .not.toMatch(/kb\/(company|org)\.md/)
    }
  })

  it('quality-loop skill 在场，且八件事都有家（流程唯一家）', () => {
    const skill = readFileSync(QUALITY_LOOP_SKILL, 'utf8')
    expect(skill).toContain('name: quality-loop')
    for (const [label, needle] of [
      ['任务书字段', '## 1. 任务书'],
      ['交接包', '## 2. 两轮交接'],
      ['落盘与裁决头', '## 3. 落盘'],
      ['处置三选一', '## 4. 处置'],
      ['轮次与升级', '## 5. 轮次与升级'],
      ['方法包契约', '## 6. 方法包契约'],
      ['严格串行', '严格串行：先生产，再验证'],
      ['独立性口径', '## 7. 独立性怎么说'],
    ] as const) {
      expect(skill.includes(needle), `quality-loop skill 缺「${label}」（${needle}）`).toBe(true)
    }
    // 方法是数据：流程 skill 不许点名任何具体方法包（换公司/换方法只换方法层）。
    expect(skill, 'quality-loop skill 不得点名具体方法包').not.toMatch(/requirements-trace|api-contract/)
    // 只读边界与真相：验证者写不了盘，所以裁决由调用方落盘——这条不许被写成"验证者自己写"。
    expect(skill).toMatch(/验证者只读|只读/)
  })
})

describe('VP-Eng 的两条命名行：一个做、一个验', () => {
  it('produce → producer / verify → verifier，各 maxDepth 2', () => {
    const rows = allRows(loadPresetDoc('vp-eng'))
      .filter(row => row.name === '@deepseek-ai/dsh-tool-subagent')
    const expected = { quality_loop_produce: 'quality-loop-producer', quality_loop_verify: 'quality-loop-verifier' }
    for (const [tool, preset] of Object.entries(expected)) {
      const row = rows.find(candidate => pluginConfig(candidate).toolName === tool)
      expect(row, `vp-eng 缺 ${tool} 命名行`).toBeDefined()
      const config = pluginConfig(row)
      expect(config.provider).toBe('spawn')
      expect(config.agentPreset, `${tool} 必须钉 preset（模型自选不可靠）`).toBe(preset)
      expect(config.maxDepth, `${tool} 的深度预算 = 2（团队成员 depth 1 起的 child 落 2）`).toBe(2)
    }
  })

  it('两条行不在通用 subagent 的白名单上（身份不由模型自选）', () => {
    const generic = allRows(loadPresetDoc('vp-eng'))
      .find(row => row.name === '@deepseek-ai/dsh-tool-subagent'
        && pluginConfig(row).provider === 'spawn'
        && String(pluginConfig(row).toolName ?? 'subagent') === 'subagent')
    const allow = pluginConfig(generic).allowedAgentPresets as readonly string[]
    expect(allow, '通用白名单不该出现能力档').not.toContain('quality-loop-producer')
    expect(allow, '通用白名单不该出现能力档').not.toContain('quality-loop-verifier')
  })

  it('VP-Eng persona 点名质量环，并把「先生产、再验证」写成硬次序', () => {
    const persona = personaOf('vp-eng')
    expect(persona).toContain('quality-loop')
    expect(persona, 'persona 没写严格串行（同时发工 = 让验证者看半成品）').toContain('严格串行')
    expect(persona).toMatch(/quality_loop_produce[^。]*收工[^。]*quality_loop_verify/)
  })

  it('两个能力档的 description 各自标明是第几步（模型按工具描述选顺序）', () => {
    const producer = loadPresetDoc('quality-loop-producer').description ?? ''
    const verifier = loadPresetDoc('quality-loop-verifier').description ?? ''
    expect(producer).toContain('第一步')
    expect(verifier).toContain('第二步')
    expect(verifier, '验证者描述要说清"产出落盘并收工之后"').toMatch(/落盘.*收工/)
  })
})

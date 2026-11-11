// 负例留证 2026-11-10：把 worker-orchestrator 的 description/persona 写回「1–2 个 leaf」⇒
// 「fan-out 不承诺硬数字」用例红；还原 ⇒ 绿。BUG-051
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { COMPANY_ROLE_IDS, COMPANY_SUPPORT_PRESET_IDS } from '../../tools/lib/company-roles.mjs'
import { COMPOSITIONS, PRESET_IDS } from '../../tools/lib/delegation-model.mjs'
import { allRows, loadPresetDoc, pluginConfig, rowById } from './preset-yaml.ts'

const TOOL_SUBAGENT = '@deepseek-ai/dsh-tool-subagent'
const TOOL_SUBAGENT_CONTROL = '@deepseek-ai/dsh-tool-subagent-control'
const TOOL_WORKFLOW = '@deepseek-ai/dsh-tool-workflow'
const WORKFLOW_PTC = '@deepseek-ai/dsh-workflow-ptc'

interface Derived {
  readonly channels: string[]
  readonly genericSpawn: boolean
  readonly workerProfile: string | null
  readonly namedDelegates: string[]
  readonly namedProfiles: Record<string, string>
  readonly depthRows: Record<string, number | 'default'>
  readonly control: boolean
  readonly workflow: boolean
}

/** 从真实 YAML 推导组合面；模型是期望，这里是观测。 */
function derive(id: string): Derived {
  const spec = COMPOSITIONS[id]
  const rows = allRows(loadPresetDoc(id))
  const subagentRows = rows.filter(row => row.name === TOOL_SUBAGENT)
  const spawnRows = subagentRows.filter(row => pluginConfig(row).provider === 'spawn')
  const forkRows = subagentRows.filter(row => pluginConfig(row).provider === 'fork')
  const genericRow = spawnRows.find(row => {
    const config = pluginConfig(row)
    return String(config.toolName ?? 'subagent') === 'subagent'
  })
  const genericSpawn = genericRow !== undefined
  const workerProfile = genericRow !== undefined && typeof pluginConfig(genericRow).agentPreset === 'string'
    ? pluginConfig(genericRow).agentPreset as string
    : null
  const namedRows = spawnRows
    .filter(row => {
      const config = pluginConfig(row)
      return typeof config.agentPreset === 'string' && String(config.toolName ?? 'subagent') !== 'subagent'
    })
  const namedDelegates = namedRows.map(row => String(pluginConfig(row).toolName)).sort()
  const namedProfiles = Object.fromEntries(namedRows.map(row => [String(pluginConfig(row).toolName), String(pluginConfig(row).agentPreset)]))
  const control = rows.some(row => row.name === TOOL_SUBAGENT_CONTROL || row.name === `${TOOL_SUBAGENT_CONTROL}/list-agents`)
  const workflow = rows.some(row => row.name === WORKFLOW_PTC || row.name === TOOL_WORKFLOW)
  const channels: string[] = []
  if (spawnRows.length > 0) channels.push('spawn')
  if (forkRows.length > 0) channels.push('fork')
  if (workflow) channels.push('workflow')
  if (spec.teamLeadWhenRoot) channels.push('team')
  const depthRows: Record<string, number | 'default'> = {}
  for (const row of [...spawnRows, ...forkRows]) {
    const config = pluginConfig(row)
    const key = String(config.toolName ?? (config.provider === 'fork' ? 'subagent_fork' : 'subagent'))
    depthRows[key] = typeof config.maxDepth === 'number' ? config.maxDepth : 'default'
  }
  return { channels, genericSpawn, workerProfile, namedDelegates, namedProfiles, depthRows, control, workflow }
}

describe('delegation composition：YAML 是模型的投影', () => {
  for (const id of PRESET_IDS) {
    it(`${id}：通道/worker/命名委托/深度/控制/workflow 与模型一致`, () => {
      const spec = COMPOSITIONS[id]
      const observed = derive(id)
      expect(observed.channels).toEqual(spec.channels)
      expect(observed.genericSpawn).toBe(spec.genericSpawn)
      expect(observed.workerProfile).toBe(spec.workerProfile)
      expect(observed.namedDelegates).toEqual([...spec.namedDelegates].sort())
      expect(observed.namedProfiles).toEqual(spec.namedProfiles ?? {})
      expect(observed.depthRows).toEqual(spec.depthRows)
      expect(observed.control).toBe(spec.control)
      expect(observed.workflow).toBe(spec.workflow)
    })
  }

  it('archetype 形状：lead/full/worker 各自不越界', () => {
    for (const id of PRESET_IDS) {
      const spec = COMPOSITIONS[id]
      const observed = derive(id)
      if (spec.archetype === 'lead') {
        expect(observed.genericSpawn, `${id}: lead 不该有通用 subagent`).toBe(false)
        expect(observed.workflow, `${id}: lead 不该有 workflow`).toBe(false)
        expect(observed.control, `${id}: lead 控制行是团队 shadow 下的死行`).toBe(false)
        expect(observed.namedDelegates.length, `${id}: lead 应有命名委托`).toBeGreaterThan(0)
      }
      if (spec.archetype === 'full') {
        expect(observed.genericSpawn || observed.channels.includes('fork'), `${id}: full 应有通用委派面`).toBe(true)
        expect(observed.control, `${id}: full 应有控制行（给命名 child 用）`).toBe(true)
      }
      const workerLeaf = spec.archetype === 'worker' && !spec.genericSpawn && spec.channels.length === 0
      if (workerLeaf) {
        expect(observed.channels, `${id}: worker 不该有委派通道`).toEqual([])
        expect(observed.control, `${id}: worker 不该有控制行`).toBe(false)
        expect(observed.workflow, `${id}: worker 不该有 workflow`).toBe(false)
      }
    }
  })

  it('depth rows compose：CEO 的 vp_eng 行=1，vp-eng 自己的通用 subagent 行=3', () => {
    const ceoRows = allRows(loadPresetDoc('ceo'))
    const vpEngRow = ceoRows.find(row => row.name === TOOL_SUBAGENT && pluginConfig(row).toolName === 'vp_eng')
    expect(vpEngRow, 'CEO 缺 vp_eng 命名行').toBeDefined()
    expect(pluginConfig(vpEngRow).maxDepth, 'CEO 只把直接 child 钉在 depth 1').toBe(1)

    const vpEngRows = allRows(loadPresetDoc('vp-eng'))
    const generic = vpEngRows.find(row => row.name === TOOL_SUBAGENT
      && pluginConfig(row).provider === 'spawn'
      && String(pluginConfig(row).toolName ?? 'subagent') === 'subagent')
    expect(generic, 'vp-eng 缺通用 subagent 行').toBeDefined()
    expect(pluginConfig(generic).maxDepth, 'vp-eng child 自己的通用行放行到 3').toBe(3)
  })

  it('vp-eng：通用 subagent 钉 worker；fork 仍是无 agentPreset 的 clone', () => {
    const rows = allRows(loadPresetDoc('vp-eng'))
    const generic = rows.find(row => row.name === TOOL_SUBAGENT
      && pluginConfig(row).provider === 'spawn'
      && String(pluginConfig(row).toolName ?? 'subagent') === 'subagent')
    expect(generic, 'vp-eng 缺通用 subagent 行').toBeDefined()
    expect(pluginConfig(generic).agentPreset).toBe('worker')
    expect(pluginConfig(generic).allowedAgentPresets).toEqual(['worker', 'worker-orchestrator'])
    const fork = rows.find(row => row.name === TOOL_SUBAGENT && pluginConfig(row).provider === 'fork')
    expect(fork, 'vp-eng 缺 subagent_fork 行').toBeDefined()
    expect(pluginConfig(fork).agentPreset, 'fork 不能钉 preset（provider 不支持）').toBeUndefined()
  })

  it('worker preset：只有执行手工具面，没有 subagent/team/workflow/control/ask-user/present/手册', () => {
    const doc = loadPresetDoc('worker')
    const names = new Set(allRows(doc).map(row => row.name).filter((name): name is string => typeof name === 'string'))
    for (const required of [
      '@deepseek-ai/dsh-tool-fs',
      '@deepseek-ai/dsh-tool-fs-search',
      '@deepseek-ai/dsh-tool-bash',
      '@deepseek-ai/dsh-tool-web',
      '@deepseek-ai/dsh-tool-todo',
      '@deepseek-ai/dsh-compaction-basic',
      '@deepseek-ai/dsh-command-compact',
      '@deepseek-ai/dsh-compaction-tool-result-pruner',
    ]) {
      expect(names.has(required), `worker 缺 ${required}`).toBe(true)
    }
    for (const forbidden of [
      TOOL_SUBAGENT,
      TOOL_WORKFLOW,
      WORKFLOW_PTC,
      '@deepseek-ai/dsh-experimental-tool-agent-team',
      TOOL_SUBAGENT_CONTROL,
      '@deepseek-ai/dsh-tool-present',
      '@deepseek-ai/dsh-tool-ask-user',
      '@deepseek-ai/dsh-agent-instructions',
    ]) {
      expect(names.has(forbidden), `worker 不该有 ${forbidden}`).toBe(false)
    }
    const persona = rowById(doc, 'persona')
    const prefix = String(pluginConfig(persona).prefix ?? '')
    expect(prefix).toContain('不是公司角色')
    expect(prefix).toContain('不委派')
  })

  it('worker 的 roster 语义：在 support、不在公司角色；声明行与 patch 都在场', () => {
    expect(COMPANY_SUPPORT_PRESET_IDS).toContain('worker')
    expect(COMPANY_ROLE_IDS).not.toContain('worker')
    const doc = loadPresetDoc('worker')
    expect(doc.id).toBe('worker')
    expect(doc.raw).toContain('- id: preset-worker')
    expect(doc.raw).toContain('id: worker')
    const patch = (JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: readonly string[] } }
    }).dsh?.bundle?.patch ?? []
    expect(patch).toContain('./presets/worker/agent.cordis.yml')
  })

  it('worker-orchestrator：fan-out 不承诺硬数字，文案按父代理 brief（BUG-051）', () => {
    const doc = loadPresetDoc('worker-orchestrator')
    const description = doc.description ?? ''
    const persona = String(pluginConfig(rowById(doc, 'persona')).prefix ?? '')
    for (const [label, text] of [['description', description], ['persona', persona]] as const) {
      expect(text, `${label} 仍在承诺 1–2`).not.toMatch(/1[–-]2/)
      expect(text, `${label} 缺父代理 brief 口径`).toMatch(/按 brief|父代理/)
    }
  })

  it('worker-orchestrator：一条 spawn 行钉 leaf worker；没有 team/workflow/control/ask-user/present/skill', () => {
    const doc = loadPresetDoc('worker-orchestrator')
    const rows = allRows(doc)
    const names = new Set(rows.map(row => row.name).filter((name): name is string => typeof name === 'string'))
    const spawns = rows.filter(row => row.name === TOOL_SUBAGENT && pluginConfig(row).provider === 'spawn')
    expect(spawns).toHaveLength(1)
    expect(pluginConfig(spawns[0]).agentPreset).toBe('worker')
    expect(pluginConfig(spawns[0]).maxDepth).toBe(3)
    for (const required of [
      '@deepseek-ai/dsh-tool-fs',
      '@deepseek-ai/dsh-tool-fs-search',
      '@deepseek-ai/dsh-tool-bash',
      '@deepseek-ai/dsh-tool-web',
      '@deepseek-ai/dsh-tool-todo',
      '@deepseek-ai/dsh-compaction-basic',
    ]) {
      expect(names.has(required), `worker-orchestrator 缺 ${required}`).toBe(true)
    }
    for (const forbidden of [
      TOOL_WORKFLOW,
      WORKFLOW_PTC,
      '@deepseek-ai/dsh-experimental-tool-agent-team',
      TOOL_SUBAGENT_CONTROL,
      '@deepseek-ai/dsh-tool-present',
      '@deepseek-ai/dsh-tool-ask-user',
      '@deepseek-ai/dsh-tool-skill',
      '@deepseek-ai/dsh-agent-instructions',
    ]) {
      expect(names.has(forbidden), `worker-orchestrator 不该有 ${forbidden}`).toBe(false)
    }
    expect(COMPANY_SUPPORT_PRESET_IDS).toContain('worker-orchestrator')
    expect(COMPANY_ROLE_IDS).not.toContain('worker-orchestrator')
  })


  it('worker-researcher：只读 fs、无 bash/写/委派/skill', () => {
    const doc = loadPresetDoc('worker-researcher')
    const rows = allRows(doc)
    const names = new Set(rows.map(row => row.name).filter((name): name is string => typeof name === 'string'))
    const fs = rowById(doc, 'tool-fs')
    expect(pluginConfig(fs).write).toBe(false)
    expect(pluginConfig(fs).edit).toBe(false)
    expect(names.has('@deepseek-ai/dsh-tool-bash')).toBe(false)
    expect(names.has('@deepseek-ai/dsh-tool-skill')).toBe(false)
    expect(names.has(TOOL_SUBAGENT)).toBe(false)
    expect(names.has(TOOL_SUBAGENT_CONTROL)).toBe(false)
    expect(COMPANY_SUPPORT_PRESET_IDS).toContain('worker-researcher')
    expect(COMPANY_ROLE_IDS).not.toContain('worker-researcher')
  })

})

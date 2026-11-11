// 负例留证 2026-11-09：把 CONTRACTS['policy.delegation'].status 从 delivered 改回 planned ⇒
// 「合同载体状态与真实载体一致」用例红（`expected 'planned' to be 'delivered'`）；还原 ⇒ 10 passed。BUG-049
// 负例留证 2026-11-09：把 NON_ROLE_PRESETS 只留 ['worker'] ⇒「handbook 边界按非公司角色」用例红；
// 还原 ⇒ 绿。BUG-047
// 负例留证 2026-11-10：把 WORKER_PROFILES['worker-orchestrator'].fanOut.hardMax 改成数字（或把 policy
// 改成 'hard'）⇒「fan-out 是声明策略」用例红；还原 ⇒ 绿。BUG-051
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { NON_ROLE_PRESETS } from '../../packages/company-pack/src/lib/delegation-surface.ts'
import {
  CHANNELS,
  COMPOSITIONS,
  CONTRACTS,
  FULL_ROLE_IDS,
  PRESET_IDS,
  SUPPORT_PRESET_IDS,
  WORKER_PROFILES,
  handbookSkipPresets,
  implementedWorkerProfiles,
  modelProblems,
  presetPath,
} from '../../tools/lib/delegation-model.mjs'

const PACKAGE = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')) as {
  dsh?: { bundle?: { patch?: readonly string[] } }
}
const PATCH = PACKAGE.dsh?.bundle?.patch ?? []

describe('delegation model：唯一期望源', () => {
  it('模型内部一致（通道/合同/worker profile/组合引用都能解析）', () => {
    expect(modelProblems()).toEqual([])
  })

  it('preset 清单：唯一、full role 与 support 不重叠、worker 是 support 不是角色', () => {
    expect(new Set(PRESET_IDS).size).toBe(PRESET_IDS.length)
    expect(SUPPORT_PRESET_IDS).toContain('worker')
    expect(SUPPORT_PRESET_IDS).toContain('worker-researcher')
    expect(SUPPORT_PRESET_IDS).toContain('worker-orchestrator')
    expect(FULL_ROLE_IDS).not.toContain('worker')
    expect(FULL_ROLE_IDS).not.toContain('worker-orchestrator')
    expect(FULL_ROLE_IDS).not.toContain('worker-researcher')
    for (const id of FULL_ROLE_IDS) expect(SUPPORT_PRESET_IDS).not.toContain(id)
    for (const id of SUPPORT_PRESET_IDS) expect(PRESET_IDS).toContain(id)
  })

  it('每个 preset 都有声明文件并已登记进 bundle.patch；worker family 不遗漏', () => {
    for (const id of PRESET_IDS) {
      expect(existsSync(join(ROOT, presetPath(id))), `${id} 缺声明文件`).toBe(true)
      expect(PATCH, `${id} 未进 dsh.bundle.patch`).toContain(`./presets/${id}/agent.cordis.yml`)
    }
    expect(PATCH).toContain('./presets/worker/agent.cordis.yml')
    expect(PATCH).toContain('./presets/worker-researcher/agent.cordis.yml')
    expect(PATCH).toContain('./presets/worker-orchestrator/agent.cordis.yml')
  })

  it('worker family：leaf + 只读调研 + 小工头三档已落；不再有 planned', () => {
    expect(implementedWorkerProfiles()).toEqual(['worker', 'worker-researcher', 'worker-orchestrator'])
    expect(WORKER_PROFILES.worker.preset).toBe('worker')
    expect(PRESET_IDS).toContain(WORKER_PROFILES.worker.preset)
    for (const [id, profile] of Object.entries(WORKER_PROFILES)) {
      if (profile.status === 'planned') expect(PRESET_IDS, `${id} 不该在 P1 发布`).not.toContain(profile.preset)
    }
  })

  it('handbook 边界按「非公司角色」派生（BUG-047）', () => {
    // 唯一期望源：非公司角色的全部 preset（worker family + 质量环能力档）；不写 ID 白名单。
    expect(handbookSkipPresets()).toEqual(['worker', 'worker-researcher', 'worker-orchestrator', 'quality-loop-producer', 'quality-loop-verifier'])
    expect([...NON_ROLE_PRESETS]).toEqual(handbookSkipPresets())
    for (const id of FULL_ROLE_IDS) expect(handbookSkipPresets(), `${id} 是公司角色，应注入手册`).not.toContain(id)
  })

  it('worker family 的 fan-out 是声明策略，不是硬承诺（BUG-051）', () => {
    // 没有 vendor per-tool child cap：orchestrator 的件数由父代理 brief 决定，preset 不承诺硬数字。
    expect(WORKER_PROFILES.worker.fanOut).toEqual({ policy: 'none' })
    expect(WORKER_PROFILES['worker-researcher'].fanOut).toEqual({ policy: 'none' })
    expect(WORKER_PROFILES['worker-orchestrator'].fanOut).toEqual({ policy: 'parent-brief', hardMax: null })
  })

  it('worker 铺开目标：vp-eng 已钉 leaf，其余 full role 记 target；CEO 不直接钉 worker', () => {
    expect(COMPOSITIONS['vp-eng'].workerProfile).toBe('worker')
    expect(COMPOSITIONS['vp-eng'].allowedWorkerProfiles).toEqual(['worker', 'worker-orchestrator'])
    for (const id of ['vp-sales', 'coo', 'cfo', 'cmo']) {
      expect(COMPOSITIONS[id].workerProfile, `${id} 不该先铺开`).toBeNull()
      expect(COMPOSITIONS[id].targetWorkerProfile, `${id} 缺目标`).toBe('worker')
    }
    expect(COMPOSITIONS.ceo.workerProfile).toBeNull()
    expect(COMPOSITIONS.ceo.targetWorkerProfile).toBeNull()
  })

  it('channel 能力表：只有 spawn 支持 agentPreset；fork 继承父上下文；workflow/team 都不支持', () => {
    expect(CHANNELS.spawn.agentPreset).toBe(true)
    expect(CHANNELS.spawn.inheritsParentContext).toBe(false)
    for (const id of ['fork', 'workflow', 'team']) {
      expect(CHANNELS[id as keyof typeof CHANNELS].agentPreset, `${id} 不该宣称支持 agentPreset`).toBe(false)
    }
    expect(CHANNELS.fork.inheritsParentContext).toBe(true)
    expect(CHANNELS.team.inheritsParentContext).toBe('optional')
    expect(CHANNELS.team.context).toBe('fresh | fork (default fresh)')
    expect(CHANNELS.workflow.depth).toBe('parent+1 (branch activation)')
    expect(CHANNELS.team.depth).toBe('parent+1 (member activation)')
  })

  it('合同作用域：policy 覆盖四条通道；engine 合同只覆盖各自能力', () => {
    expect(CONTRACTS['policy.delegation'].scopeChannels).toEqual(['spawn', 'fork', 'workflow', 'team'])
    expect(CONTRACTS['engine.workflow'].scopeChannels).toEqual(['workflow'])
    expect(CONTRACTS['engine.subagent'].scopeChannels).toEqual(['spawn', 'fork'])
  })

  it('合同载体状态与真实载体一致：已落载体不得再标 planned（BUG-049）', () => {
    expect(CONTRACTS['policy.delegation'].status).toBe('delivered')
    expect(CONTRACTS['engine.workflow'].status).toBe('delivered')
    expect(CONTRACTS['engine.subagent'].status).toBe('merged')
    expect(CONTRACTS['engine.subagent'].mergedInto).toBe('policy.delegation')
    for (const [id, contract] of Object.entries(CONTRACTS)) {
      expect(['delivered', 'merged', 'planned'], `${id} 状态词`).toContain(contract.status)
      if (contract.status === 'delivered') {
        expect(typeof contract.carrierPath, `${id} 缺 carrierPath`).toBe('string')
        expect(existsSync(join(ROOT, contract.carrierPath)), `${id} carrierPath 不存在`).toBe(true)
      }
      if (contract.status === 'merged') {
        expect(CONTRACTS[contract.mergedInto], `${id} mergedInto 指向未知合同`).toBeDefined()
      }
    }
  })

  it('组合的合同覆盖：有 spawn/fork 就要 engine.subagent；有 workflow 就要 engine.workflow；有委派就要 policy', () => {
    for (const [id, spec] of Object.entries(COMPOSITIONS)) {
      const channels = spec.channels as readonly string[]
      const contracts = spec.contracts as readonly string[]
      const delegates = channels.some(channel => ['spawn', 'fork', 'workflow', 'team'].includes(channel))
      // worker family 的窄规则住 persona（1–2 个 leaf / 不组队 / 不问用户），不挂共享 policy skill。
      if (delegates && spec.archetype !== 'worker') expect(contracts, `${id} 缺 policy.delegation`).toContain('policy.delegation')
      if (channels.includes('spawn') || channels.includes('fork')) {
        expect(contracts, `${id} 缺 engine.subagent`).toContain('engine.subagent')
      }
      if (channels.includes('workflow')) {
        expect(contracts, `${id} 缺 engine.workflow`).toContain('engine.workflow')
      }
    }
  })

  it('当前形态：CEO 无 control/fork；vp-eng 是唯一 workflow；leaf/worker 无委派面', () => {
    expect(COMPOSITIONS.ceo.control).toBe(false)
    expect(COMPOSITIONS.ceo.channels).not.toContain('fork')
    expect(COMPOSITIONS['vp-eng'].workflow).toBe(true)
    for (const id of ['worker-researcher', 'worker']) {
      expect(COMPOSITIONS[id].channels).toEqual([])
      expect(COMPOSITIONS[id].control).toBe(false)
      expect(COMPOSITIONS[id].workflow).toBe(false)
    }
  })
})

/**
 * presets 委派面的可执行模型（RFC 2026-11-09）。
 *
 * 这是**期望的唯一源**：spec / dump smoke / 生成器都消费它，不得各自再写一份矩阵。
 * 运行期仍是自包含 YAML（DSH 无 patch 继承）；本文件只在构建/测试/观测面使用。
 *
 * 术语：
 * - capability：组合能做什么（spawn/fork/workflow/team/control/...）。
 * - channel：委派的传输方式；每条通道对 agentPreset/context/depth 的支持不同。
 * - composition：角色/archetype/capability/contract 的投影 → presets/<id>/agent.cordis.yml。
 * - contract：政策（公司教义）或引擎（DSH pin）规则；挂在 capability 上，不挂在角色散文里。
 *
 * 维护纪律：改模型 = 改期望；改 YAML 不同步 = 静态矩阵红。不要在这里写“实现细节的副本”；
 * 具体行仍以 YAML 为准，模型只声明“应该长什么样”。
 */

/** 当前随包发布的 preset（顺序 = 名册语义序；worker 是 support，不是公司角色）。 */
export const PRESET_IDS = [
  'ceo',
  'vp-eng',
  'vp-sales',
  'coo',
  'cfo',
  'cmo',
  'worker',
  'worker-researcher',
  'worker-orchestrator',
]

/** 公司六角色（汇报线/在场板/培养面）；worker 不在此列。 */
export const FULL_ROLE_IDS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo']

/** 非角色的委派子人格/执行手；进 support preset 门禁与 preset-smoke。 */
export const SUPPORT_PRESET_IDS = ['worker', 'worker-researcher', 'worker-orchestrator']

/**
 * 四条通道的硬能力。`depth` 是语义标签，不是行上的数字：
 * - parent+1：spawn/fork 子代深度 = 父 + 1（vendor 语义）。
 * - parent+1 (branch activation)：workflow 分支本身也是 activation 子代；引擎无独立闸，行级 maxDepth 仍生效。
 * - parent+1 (member activation)：team 成员也是 activation 子代；继承 Lead 组合。
 */
export const CHANNELS = {
  spawn: {
    agentPreset: true,
    inheritsParentContext: false,
    depth: 'parent+1',
    control: ['list_subagents', 'send_to_subagent'],
  },
  fork: {
    agentPreset: false,
    inheritsParentContext: true,
    depth: 'parent+1',
    control: ['list_subagents', 'send_to_subagent'],
  },
  workflow: {
    agentPreset: false,
    inheritsParentContext: false,
    // 分支本身是 startActivation(parent) 的子代：深度 = parent+1；workflow 引擎没有独立的闸。
    depth: 'parent+1 (branch activation)',
    control: ['workflow_runs'],
  },
  team: {
    agentPreset: false,
    inheritsParentContext: true,
    // teammate 也走 startActivation(root)：深度 = Lead+1；继承 Lead 组合。
    depth: 'parent+1 (member activation)',
    control: ['send_message', 'list_agents', 'wait_agent', 'interrupt_agent'],
  },
}

/**
 * worker family（不是“一个 worker”）。默认最窄 leaf；需要子层时显式升级。
 * `status`：implemented = 随包发布；当前没有 planned profile（worker-workflow no-go）。
 */
export const WORKER_PROFILES = {
  worker: {
    label: '执行手（内部）',
    preset: 'worker',
    status: 'implemented',
    channels: [],
    depthBudget: 0,
    capabilities: ['fs', 'bash', 'web', 'todo', 'compaction'],
    contracts: [],
    exposure: 'generic',
  },
  'worker-researcher': {
    label: '执行手（只读调研）',
    preset: 'worker-researcher',
    status: 'implemented',
    channels: [],
    depthBudget: 0,
    capabilities: ['fs-readonly', 'fs-search', 'web', 'todo'],
    contracts: [],
    exposure: 'named',
  },
  'worker-orchestrator': {
    label: '执行手（小工头）',
    preset: 'worker-orchestrator',
    status: 'implemented',
    channels: ['spawn'],
    depthBudget: 1,
    capabilities: ['fs', 'bash', 'web', 'todo', 'compaction', 'spawn'],
    contracts: ['engine.subagent'],
    exposure: 'generic',
  },
}

/**
 * 合同：两个 owner、两个生命周期。
 * - company：随公司委派教义变；共享 skill。
 * - dsh：随 vendor pin 变；capability-scoped prompt section。
 * 本 P1 只声明；载体在 P2 落（status = planned）。
 */
export const CONTRACTS = {
  'policy.delegation': {
    owner: 'company',
    carrier: 'skill',
    scopeChannels: ['spawn', 'fork', 'workflow', 'team'],
    status: 'planned',
  },
  'engine.workflow': {
    owner: 'dsh',
    carrier: 'section',
    scopeChannels: ['workflow'],
    status: 'planned',
  },
  'engine.subagent': {
    owner: 'dsh',
    carrier: 'section',
    scopeChannels: ['spawn', 'fork'],
    status: 'planned',
  },
}

/**
 * 每个 preset 的期望组合。
 *
 * 字段：
 * - archetype：lead / full / worker。
 * - teamLead：根会话是否天然是 Team Lead（full role 都是；leaf/worker 不是）。
 * - genericSpawn：是否有通用 `subagent` 行（toolName = subagent）。
 * - workerProfile：当前已钉的 worker profile；null = 仍继承父组合（待铺开）。
 * - targetWorkerProfile：目标 profile（长期）；pilot 阶段只 vp-eng 已落地。
 * - channels：组合能开的通道（team 由 teamLead 推导，不在 YAML 行里）。
 * - namedDelegates：命名委托行的 toolName。
 * - depthRows：toolName → 行上 maxDepth（'default' = 省略，读 Host 默认 1）。
 * - control：是否有 subagent 控制行（CEO 没有：根/团队被 shadow，是死行）。
 * - workflow：是否有 workflow 两行（当前只有 vp-eng）。
 * - contracts：该组合需要的合同。
 */
export const COMPOSITIONS = {
  ceo: {
    archetype: 'lead',
    teamLead: true,
    genericSpawn: false,
    workerProfile: null,
    targetWorkerProfile: null,
    channels: ['spawn', 'team'],
    namedDelegates: ['subagent_research', 'vp_eng', 'vp_sales', 'vp_cmo'],
    namedProfiles: {
      subagent_research: 'worker-researcher',
      vp_eng: 'vp-eng',
      vp_sales: 'vp-sales',
      vp_cmo: 'cmo',
    },
    depthRows: {
      subagent_research: 'default',
      vp_eng: 1,
      vp_sales: 1,
      vp_cmo: 1,
    },
    control: false,
    workflow: false,
    contracts: ['policy.delegation', 'engine.subagent'],
  },
  'vp-eng': {
    archetype: 'full',
    teamLead: true,
    genericSpawn: true,
    workerProfile: 'worker',
    targetWorkerProfile: 'worker',
    allowedWorkerProfiles: ['worker', 'worker-orchestrator'],
    channels: ['spawn', 'fork', 'workflow', 'team'],
    namedDelegates: ['vp_cmo'],
    namedProfiles: { vp_cmo: 'cmo' },
    depthRows: {
      subagent: 3,
      subagent_fork: 3,
      vp_cmo: 2,
    },
    control: true,
    workflow: true,
    contracts: ['policy.delegation', 'engine.workflow', 'engine.subagent'],
  },
  'vp-sales': {
    archetype: 'full',
    teamLead: true,
    genericSpawn: true,
    workerProfile: null,
    targetWorkerProfile: 'worker',
    channels: ['spawn', 'fork', 'team'],
    namedDelegates: [],
    depthRows: { subagent: 2, subagent_fork: 2 },
    control: true,
    workflow: false,
    contracts: ['policy.delegation', 'engine.subagent'],
  },
  coo: {
    archetype: 'full',
    teamLead: true,
    genericSpawn: true,
    workerProfile: null,
    targetWorkerProfile: 'worker',
    channels: ['spawn', 'fork', 'team'],
    namedDelegates: [],
    depthRows: { subagent: 2, subagent_fork: 2 },
    control: true,
    workflow: false,
    contracts: ['policy.delegation', 'engine.subagent'],
  },
  cfo: {
    archetype: 'full',
    teamLead: true,
    genericSpawn: true,
    workerProfile: null,
    targetWorkerProfile: 'worker',
    channels: ['spawn', 'fork', 'team'],
    namedDelegates: [],
    depthRows: { subagent: 2, subagent_fork: 2 },
    control: true,
    workflow: false,
    contracts: ['policy.delegation', 'engine.subagent'],
  },
  cmo: {
    archetype: 'full',
    teamLead: true,
    genericSpawn: true,
    workerProfile: null,
    targetWorkerProfile: 'worker',
    channels: ['spawn', 'fork', 'team'],
    namedDelegates: [],
    depthRows: { subagent: 2, subagent_fork: 2 },
    control: true,
    workflow: false,
    contracts: ['policy.delegation', 'engine.subagent'],
  },
  'worker-orchestrator': {
    archetype: 'worker',
    teamLead: false,
    genericSpawn: true,
    workerProfile: 'worker',
    targetWorkerProfile: null,
    channels: ['spawn'],
    namedDelegates: [],
    depthRows: { subagent: 3 },
    control: false,
    workflow: false,
    // 小工头的 1–2 个 leaf / 不组队 / 不问用户由 persona 本地承载；不挂共享 delegation skill。
    contracts: ['engine.subagent'],
  },
  'worker-researcher': {
    archetype: 'worker',
    teamLead: false,
    genericSpawn: false,
    workerProfile: null,
    targetWorkerProfile: null,
    channels: [],
    namedDelegates: [],
    depthRows: {},
    control: false,
    workflow: false,
    contracts: [],
  },
  worker: {
    archetype: 'worker',
    teamLead: false,
    genericSpawn: false,
    workerProfile: null,
    targetWorkerProfile: null,
    channels: [],
    namedDelegates: [],
    depthRows: {},
    control: false,
    workflow: false,
    contracts: [],
  },
}

/**
 * 重试合同：可见、有界、按幂等性判断；不做静默自动重试。
 *
 * - subagent 的 `SubagentResult.stopReason`：completed / aborted / error / max-tokens / refusal。
 * - durable terminal（重启/丢失）：interrupted / lost（来自 list_subagents / workflow_runs）。
 * - 只有 error / interrupted / lost 在幂等任务上重试；refusal / aborted / completed 不重试；
 *   max-tokens 不自动重试（要缩任务、提预算或换模型，交给人/父代理）。
 * - workflow 是“必须可重试/可聚合”的可靠通道；subagent 是 best-effort。
 */
export const RETRY = {
  subagent: {
    maxAttempts: 2,
    retryable: ['error', 'interrupted', 'lost'],
    noRetry: ['completed', 'aborted', 'refusal', 'max-tokens'],
    idempotentOnly: true,
    runtimeTool: 'subagent_retry',
    visibility: ['attempt label', 'list_subagents lastTurnEnd', 'graph terminal'],
    reliableAlternative: 'workflow',
  },
  workflow: {
    maxAttempts: 2,
    retryable: ['error', 'null', 'lost'],
    noRetry: ['completed', 'aborted', 'refusal'],
    idempotentOnly: true,
    visibility: ['attempt label', 'workflow_runs', 'graph terminal'],
    reliableAlternative: null,
  },
}

/**
 * 纯决策：这一次失败该不该重试。只回答“允许”，不启动任何东西。
 * @param channel - subagent / workflow。
 * @param terminal - stopReason 或 durable terminal；workflow 的 null 也可传。
 * @param attempt - 已经尝试过的次数（1 = 第一次失败）。
 * @param idempotent - 任务是否幂等；非幂等一律不重试。
 * @returns `{ retry, reason }`；调用方负责启动重试并记录 attempt。
 */
export function retryDecision(channel, terminal, attempt, idempotent) {
  const policy = RETRY[channel]
  if (policy === undefined) return { retry: false, reason: `unknown channel ${channel}` }
  if (!idempotent) return { retry: false, reason: 'non-idempotent' }
  if (attempt >= policy.maxAttempts) return { retry: false, reason: 'exhausted' }
  if (policy.retryable.includes(terminal)) return { retry: true, reason: `retryable ${terminal}` }
  return { retry: false, reason: `not retryable ${terminal}` }
}

/** 一个 preset 的 YAML 相对路径（仓库根起）。 */
export function presetPath(id) {
  return `packages/company-pack/presets/${id}/agent.cordis.yml`
}

/** 取一个组合；未知 id 直接抛，避免 spec 静默跳过。 */
export function composition(id) {
  const found = COMPOSITIONS[id]
  if (found === undefined) throw new Error(`delegation-model: unknown preset ${id}`)
  return found
}

/** 是否 full role（汇报线六角色）。 */
export function isFullRole(id) {
  return FULL_ROLE_IDS.includes(id)
}

/** 是否已实现的 worker profile。 */
export function implementedWorkerProfiles() {
  return Object.entries(WORKER_PROFILES)
    .filter(([, profile]) => profile.status === 'implemented')
    .map(([id]) => id)
}

/** 模型的内部一致性检查；spec 与 smoke 都可调用（纯函数，无 I/O）。 */
export function modelProblems() {
  const problems = []
  for (const id of PRESET_IDS) {
    if (COMPOSITIONS[id] === undefined) problems.push(`PRESET_IDS 含 ${id}，但 COMPOSITIONS 没有`)
  }
  for (const id of Object.keys(COMPOSITIONS)) {
    if (!PRESET_IDS.includes(id)) problems.push(`COMPOSITIONS 含 ${id}，但 PRESET_IDS 没有`)
  }
  for (const [id, spec] of Object.entries(COMPOSITIONS)) {
    if (!['lead', 'full', 'worker'].includes(spec.archetype)) problems.push(`${id}: 未知 archetype ${spec.archetype}`)
    for (const [tool, preset] of Object.entries(spec.namedProfiles ?? {})) {
      if (!PRESET_IDS.includes(preset)) problems.push(`${id}: namedProfiles.${tool} 指向未知 preset ${preset}`)
    }
    for (const channel of spec.channels) {
      if (CHANNELS[channel] === undefined) problems.push(`${id}: 未知通道 ${channel}`)
    }
    for (const contract of spec.contracts) {
      if (CONTRACTS[contract] === undefined) problems.push(`${id}: 未知合同 ${contract}`)
    }
    if (spec.workerProfile !== null && WORKER_PROFILES[spec.workerProfile] === undefined) {
      problems.push(`${id}: 未知 worker profile ${spec.workerProfile}`)
    }
    if (spec.targetWorkerProfile !== null && WORKER_PROFILES[spec.targetWorkerProfile] === undefined) {
      problems.push(`${id}: 未知 target worker profile ${spec.targetWorkerProfile}`)
    }
    if (spec.workerProfile !== null && spec.targetWorkerProfile !== null
      && spec.workerProfile !== spec.targetWorkerProfile) {
      problems.push(`${id}: 当前 worker profile 与目标不一致（${spec.workerProfile} vs ${spec.targetWorkerProfile}）`)
    }
  }
  for (const [id, profile] of Object.entries(WORKER_PROFILES)) {
    for (const channel of profile.channels) {
      if (CHANNELS[channel] === undefined) problems.push(`worker profile ${id}: 未知通道 ${channel}`)
    }
    for (const contract of profile.contracts) {
      if (CONTRACTS[contract] === undefined) problems.push(`worker profile ${id}: 未知合同 ${contract}`)
    }
  }
  for (const [id, contract] of Object.entries(CONTRACTS)) {
    for (const channel of contract.scopeChannels) {
      if (CHANNELS[channel] === undefined) problems.push(`合同 ${id}: 未知作用域通道 ${channel}`)
    }
  }
  return problems
}

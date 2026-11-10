// 运行时面矩阵：把「preset 声明」与「真会话的 request/header + system/message + skill-catalog」对上。
//
// 为什么（第八轮资产审计）：20 张有效委派面缺陷卡里 8 张是「声明/可观测面 ≠ 运行时面」
// （037/043/045/046/047/049/051/052）。model ↔ YAML 已有 keyless 对账（delegation-composition.spec），
// YAML ↔ runtime 没有；本模块补的就是这一环。纯判据：输入是已折叠的 observation，不读盘、不起进程。
//
// 入口语义（2026-11-10 实测，见 research/2026-11-10-asset-first-round.md §5）：
// - root：无 parent = Lead，**总是**有 9 个团队工具（cordis.patch.yml 的 agent-team overlay），
//   即使 preset 声明 teamLead:false（support 能力档）。不要把 support root 判成越权。
// - team member：继承 Lead 组合，团队工具在场；`send_to_subagent` 等宿主控制面也在场。
// - one-shot child / workflow 分支：按 preset 组合，**没有**团队协作工具；`control` 才按声明判。
// - `send_to_subagent` 在 root/member 是宿主面，只有 child 才能拿它判 preset 的 control（BUG-052 的判据）。
//
// 不证明：模型行为、深度预算是否拒绝、UI、生命周期；缺 header 的 observation 应显式标 unknown，
// 这里不猜 preset/depth。

import { COMPOSITIONS, handbookSkipPresets } from './delegation-model.mjs'

/** cordis.patch.yml 根会话 overlay 的 9 个团队工具（6 协作 + 3 控制）。 */
export const PROFILE_TEAM_COORDINATION = [
  'spawn_teammate',
  'wait_agent',
  'team_task_create',
  'team_task_get',
  'team_task_list',
  'team_task_update',
]
export const PROFILE_TEAM_CONTROL = ['list_agents', 'send_message', 'interrupt_agent']
export const PROFILE_TEAM_TOOLS = [...PROFILE_TEAM_COORDINATION, ...PROFILE_TEAM_CONTROL]

/** 只读手：preset 的 persona/合同声明没有写盘或跑命令；矩阵按工具面反证。 */
export const READ_ONLY_PRESETS = ['quality-loop-verifier', 'worker-researcher']
export const READ_ONLY_FORBIDDEN = ['write', 'edit', 'bash']

/**
 * 入口分类：优先用父会话证据里的 link kind；没有才按工具面推断（并允许调用方标 inferred）。
 * @param {object} evidence
 * @param {{linkKind?: string}} [options]
 */
export function entryKind(evidence, { linkKind } = {}) {
  if (evidence?.header?.missing === true) return 'unknown'
  const depth = Number(evidence?.header?.depth)
  if (!Number.isFinite(depth)) return 'unknown'
  if (depth === 0) return 'root'
  if (linkKind === 'member') return 'team-member'
  if (linkKind === 'workflow') return 'workflow-branch'
  if (linkKind === 'named') return 'child'
  // 没有父证据时：团队协作工具在场 = 更像 member；否则按 one-shot child 处理。
  return (evidence?.surface?.tools ?? []).includes('spawn_teammate') ? 'team-member' : 'child'
}

/**
 * 把一份 session-evidence 折成矩阵 observation；expectedSkills 由调用方按 preset 内容目录算。
 * @param {object} evidence
 * @param {{entry?: string, expectedSkills?: readonly string[]}} [options]
 */
export function observationOf(evidence, { entry, expectedSkills = [] } = {}) {
  return {
    id: evidence?.id ?? 'unavailable',
    preset: evidence?.header?.preset ?? 'unavailable',
    depth: evidence?.header?.depth ?? 'unavailable',
    entry: entry ?? entryKind(evidence),
    tools: evidence?.surface?.tools ?? [],
    markers: evidence?.surface?.markers ?? { handbook: false, workflowContract: false },
    catalog: evidence?.surface?.catalog ?? [],
    expectedSkills,
  }
}

const has = (tools, name) => tools.includes(name)
const teamCoordination = tools => PROFILE_TEAM_COORDINATION.filter(name => has(tools, name))
const controlTools = tools => ['list_subagents', 'send_to_subagent'].filter(name => has(tools, name))

/**
 * 判一份 observation 的运行时面。
 * @param {object} observation `observationOf` 的形状。
 * @param {{skipPresets?: readonly string[]}} [options] 默认 = `handbookSkipPresets()`。
 * @returns {string[]} 问题列表；空 = 这一面没发现漂移（不是行为 PASS）。
 */
export function observationProblems(observation, { skipPresets = handbookSkipPresets() } = {}) {
  const problems = []
  const tag = `${String(observation.id).slice(0, 8)} ${observation.preset} d${String(observation.depth)}`
  const spec = COMPOSITIONS[observation.preset]
  if (spec === undefined) return [`${tag}: 未知 preset（模型里没有）`]
  const tools = observation.tools
  const entry = observation.entry
  const team = teamCoordination(tools)
  const controls = controlTools(tools)
  const isRoot = entry === 'root'
  const isMember = entry === 'team-member'
  const isOneShot = entry === 'child' || entry === 'workflow-branch'

  if (entry === 'unknown') {
    problems.push(`${tag}: 入口未知（缺 session 首帧）——不按默认 worker/0 判`)
    return problems
  }

  // 团队协作工具：root/member 必须在场（Lead 语义）；one-shot child/分支必须不在场。
  if (isRoot || isMember) {
    if (!has(tools, 'spawn_teammate')) problems.push(`${tag}: ${entry} 缺 spawn_teammate（root/member 应是 Lead 面）`)
    if (!has(tools, 'wait_agent')) problems.push(`${tag}: ${entry} 缺 wait_agent（root/member 应是 Lead 面）`)
  }
  if (isOneShot && team.length > 0) {
    problems.push(`${tag}: ${entry} 出现团队协作工具 ${team.join(', ')}（per-agent 组合不应装）`)
  }

  // preset 声明的通道：所有入口都可判 generic/fork/workflow/retry。
  if (spec.genericSpawn !== has(tools, 'subagent')) {
    problems.push(`${tag}: generic subagent=${has(tools, 'subagent')}，模型=${spec.genericSpawn}`)
  }
  if (spec.channels.includes('fork') !== has(tools, 'subagent_fork')) {
    problems.push(`${tag}: fork=${has(tools, 'subagent_fork')}，模型=${spec.channels.includes('fork')}`)
  }
  if (spec.workflow !== has(tools, 'workflow')) {
    problems.push(`${tag}: workflow=${has(tools, 'workflow')}，模型=${spec.workflow}`)
  }
  if (spec.genericSpawn !== has(tools, 'subagent_retry')) {
    problems.push(`${tag}: subagent_retry=${has(tools, 'subagent_retry')}，模型(有 generic 才有)=${spec.genericSpawn}`)
  }
  for (const name of spec.namedDelegates) {
    if (!has(tools, name)) problems.push(`${tag}: 缺命名委托行 ${name}`)
  }

  // 控制面：只在 one-shot child / 分支判（root/member 有宿主控制面，见文件头）。
  if (isOneShot) {
    const expected = spec.control ? 2 : 0
    if (controls.length !== expected) {
      problems.push(`${tag}: control 工具=${controls.join(',') || '无'}（期望 ${String(expected)} 个；BUG-052 同型）`)
    }
  }

  // handbook：skip 名单里的 preset 不应有；名单外应有。root/child 同判。
  const handbook = observation.markers?.handbook === true
  if (skipPresets.includes(observation.preset) === handbook) {
    problems.push(`${tag}: handbook=${handbook}，skip=${skipPresets.includes(observation.preset)}`)
  }

  // workflow 合同：跟随工具面（contracts.ts 的 capability-scoped 规则）。
  const contract = observation.markers?.workflowContract === true
  if (has(tools, 'workflow') !== contract) {
    problems.push(`${tag}: workflow 合同=${contract}，workflow 工具=${has(tools, 'workflow')}`)
  }

  // 只读手：persona 说“只读”不等于工具面只读；按能力反证。
  if (READ_ONLY_PRESETS.includes(observation.preset)) {
    const leaked = READ_ONLY_FORBIDDEN.filter(name => has(tools, name))
    if (leaked.length > 0) problems.push(`${tag}: 只读 preset 出现写/跑工具 ${leaked.join(', ')}`)
  }

  // skill catalog：只报缺（多出来可能是 <DSH_HOME>/company/methods 的采纳方法，合法）。
  const observed = new Set(observation.catalog)
  const missing = (observation.expectedSkills ?? []).filter(name => !observed.has(name))
  if (missing.length > 0) problems.push(`${tag}: skill catalog 缺 ${missing.join(', ')}`)

  return problems
}

/** 一批 observation → 问题列表（稳定顺序，方便卡内粘贴）。 */
export function surfaceProblems(observations, options = {}) {
  return (observations ?? []).flatMap(observation => observationProblems(observation, options))
}

/** 矩阵行：给 audit 输出与卡内摘要；不参与判分。 */
export function matrixRows(observations) {
  return (observations ?? []).map(observation => ({
    id: observation.id,
    preset: observation.preset,
    depth: observation.depth,
    entry: observation.entry,
    tools: observation.tools.length,
    catalog: observation.catalog.length,
    handbook: observation.markers?.handbook === true,
    workflowContract: observation.markers?.workflowContract === true,
    team: teamCoordination(observation.tools).length,
    control: controlTools(observation.tools).length,
    expectedSkills: observation.expectedSkills?.length ?? 0,
  }))
}

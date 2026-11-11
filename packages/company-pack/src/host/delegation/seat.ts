/**
 * 运行时委派座位（BUG-076/077/078 的共同判据）。
 *
 * 为什么单开一个模块：座位不是 preset 的函数。同一个 preset 作为 root、命名 child、teammate 时，
 * 能做的事完全不同；`teamLead` 也不等于“能协作”或“能拥有 child”。BUG-072 只建模了“能不能 spawn”
 * 一个布尔，剩余三个面（team 协作、vendor team policy、child 控制）各自用 preset/单一布尔推导，
 * 于是 076/077/078 同时出现。这里把座位一次算清，header/section、guard、control 三处都读它。
 *
 * 三个独立能力（别再用一个布尔覆盖）：
 * - `teamLead`：公司角色 Lead，能 `spawn_teammate`（support preset 即使被 vendor 当 Lead 也不是）；
 * - `teamCollaborate`：团队名册成员（Lead 或 teammate）能用的协作面（send_message / 任务板 / wait_agent）；
 * - `controlsChildren`：这个座位能拥有 child 会话（root/命名 child 等；teammate 与 support 不在内）。
 *   teammate 是否真能起 child 还要看它的工具面里有没有通用 child 通道（见 delegation-control：
 *   CEO teammate 没有，vp-eng teammate 有 `subagent`，不能按角色一刀切）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { delegationCapabilitiesOf } from '../../lib/delegation-capabilities.ts'
import { isSupportPreset } from '../../lib/delegation-surface.ts'
import { composedPresetOf } from '../prompt/handbook.ts'

/** Agent Teams 名册里的角色；undefined = 不在名册。 */
export type TeamRole = 'lead' | 'teammate'

/**
 * vendor `tool-agent-team` 安装的九件套（六个协作 + 三个控制）。
 * 名单来源 = vendor 包里的九个 `defineTool` name；新增 vendor 工具时同 diff 补这里。
 */
export const TEAM_SURFACE_TOOLS: ReadonlySet<string> = new Set([
  'spawn_teammate',
  'list_agents',
  'send_message',
  'wait_agent',
  'interrupt_agent',
  'team_task_create',
  'team_task_list',
  'team_task_get',
  'team_task_update',
])

interface AgentTeamsLike {
  tryMembership?(agent: unknown): { readonly role?: string } | undefined
}

interface AgentLike {
  readonly ctx: Context
  /** 只读 `header.parentSession` / `header.delegationDepth`；各组 AgentLike 的 session 形状各异。 */
  readonly session?: unknown
  /** runtime 注入的委派深度（与 durable header 二选一，取较大值）。 */
  readonly options?: { readonly subagentDepth?: number | string }
}

/** 一次算清的运行时座位。 */
export interface DelegationSeat {
  /** 当前组合的 preset id；未知/无 preset 服务时 undefined。 */
  readonly preset: string | undefined
  /** 团队名册角色（lead / teammate）；不在名册时 undefined。 */
  readonly teamRole: TeamRole | undefined
  /** 非角色 support preset（worker family / 质量环能力档）。 */
  readonly support: boolean
  /** 公司角色 Lead：能 spawn 队友。 */
  readonly teamLead: boolean
  /** 名册成员（Lead 或 teammate）：能用团队协作面。 */
  readonly teamCollaborate: boolean
  /** durable/runtime 的委派深度；root = 0。 */
  readonly depth: number
  /** 该 preset 的 spawn/fork 行允许的最大 child depth；无 child 行 = 0。 */
  readonly childDepth: number
  /** 当前 depth 下还能起 child（childDepth > depth）。 */
  readonly canStartChild: boolean
  /** 这个座位能拥有 child 会话并装 control 面（support 之外，且还有 child 预算）。 */
  readonly controlsChildren: boolean
}

/**
 * 读运行时团队角色。
 * 先用 agentTeams 的 membership（原生语义），服务缺席/非成员时用 `header.parentSession` 兜底：
 * 无 parent = root = Lead；有 parent 且不在名册 = 普通 child。
 * @param agent - 正在创建的 Agent。
 * @returns `lead` / `teammate` / undefined。
 */
export function teamRoleOf(agent: AgentLike): TeamRole | undefined {
  const teams = agent.ctx.get('agentTeams') as AgentTeamsLike | undefined
  try {
    const membership = teams?.tryMembership?.(agent)
    if (membership?.role === 'lead') return 'lead'
    if (membership?.role === 'teammate') return 'teammate'
  } catch { /* fall through to parentSession */ }
  const header = (agent.session as { readonly header?: { readonly parentSession?: string } } | undefined)?.header
  return header?.parentSession === undefined ? 'lead' : undefined
}

/**
 * 读当前 Agent 的委派深度：durable header 优先，runtime options 兜底，取较大值。
 * @param agent - 正在创建的 Agent。
 * @returns 非负整数深度；缺失/非法 = 0。
 */
export function delegationDepthOf(agent: AgentLike): number {
  const header = (agent.session as { readonly header?: { readonly delegationDepth?: number | string } } | undefined)?.header
  const candidates = [header?.delegationDepth, agent.options?.subagentDepth]
  let depth = 0
  for (const candidate of candidates) {
    const value = typeof candidate === 'string' ? Number(candidate) : candidate
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) depth = Math.max(depth, value)
  }
  return depth
}

/**
 * 算出一个 Agent 的委派座位；纯读服务，不注册任何东西。
 * @param agent - 正在创建的 Agent。
 * @param preset - 已解析的 preset（调用方已有 scope 时传入，避免两次读）；省略时从 agent.ctx 读。
 * @returns 座位矩阵。
 */
export function delegationSeatOf(
  agent: AgentLike,
  preset: string | undefined = composedPresetOf(agent.ctx),
): DelegationSeat {
  const teamRole = teamRoleOf(agent)
  const support = isSupportPreset(preset)
  const depth = delegationDepthOf(agent)
  const childDepth = delegationCapabilitiesOf(preset)?.childDepth ?? 0
  const canStartChild = childDepth > depth
  return {
    preset,
    teamRole,
    support,
    teamLead: teamRole === 'lead' && !support,
    teamCollaborate: teamRole !== undefined && !support,
    depth,
    childDepth,
    canStartChild,
    // 未知 preset 没有能力表：保持旧行为（root/命名 child 装 control，teammate 不装），不猜 childDepth。
    controlsChildren: !support && (preset === undefined ? teamRole !== 'teammate' : canStartChild),
  }
}

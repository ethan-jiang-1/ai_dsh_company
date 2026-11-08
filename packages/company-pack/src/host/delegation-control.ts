/**
 * `list_subagents` / `send_to_subagent`：根会话（Team Lead）够到自己 subagent child 的控制面。
 *
 * 为什么存在（BUG-037/041 的真修，2026-11-08）：`tool-agent-team` 会按成员身份把
 * `send_message` / `list_agents` **按同名 shadow 成团队版**，而任何没有 parentSession 的
 * 根会话必是 Lead ⇒ 根门拿不到全局控制名，够不到自己起的 subagent child（R3/M2/R14 实测）。
 * 团队版问题在 vendor；本仓能做的是**换一个不被 shadow 的名字**，把官方
 * `ctx.subagents.sendMessage()` 与父会话自己的 durable catalog 暴露给模型（不是平行实现）。
 *
 * 数据来源（层契约，BUG-042）：父会话 `session.ownEvents()` 里的 `subagent/catalog`（父拥有的
 * durable 事件，宿主重启后随会话重放）；**终态**用 root 可用的 `sessionPersistence.open(id,'read')`
 * 读 child durable 日志的最后一个 `turn/end`——**不用** `sessionQuery`（它在本 package 的
 * `isolate: { sessionQuery: true }` 组内，host 工具拿不到；2026-11-08 实测）。状态只读 live
 * Agent registry：`running` / `inactive`；**身份**用 `agentTeams.tryMembership/listMembers`（teammate vs
 * subagent + 寻址：team 名 / session id）。承诺字段不静默省略：读不到时输出 `lastTurnEnd:
 * 'unavailable'`（可见降级）。已知边界：只给 reason.kind（如 `interrupted`），不给错过的通知内容。
 *
 * 退役条件：上游让根会话拿到全局控制名（team shadow 修复）后，本工具删除；
 * 检测锚点 = `tests/company/delegation-control.spec.ts` 与台账 `[CT-LIFE]`。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

/** 父会话 durable catalog 里的 `subagent/catalog` 事件（只取本模块用到的字段）。 */
interface CatalogEvent {
  type: 'subagent/catalog'
  data: {
    childId: string
    childCreatedAt?: number
    label?: string
    mode?: string
  }
}

/** 本模块真正用到的服务面；类型不引 vendor 子包，避免把 pack 的 peer 依赖面扩大。 */
interface AgentsLike {
  get(id: string): { status?: string } | undefined
}

interface SubagentsLike {
  sendMessage(
    sender: unknown,
    targetId: string,
    content: Array<{ type: 'text'; text: string }>,
    options: { signal?: AbortSignal },
  ): Promise<string>
}

interface SessionLike {
  id: string
  ownEvents(): readonly { type: string; data: unknown }[]
}

interface AgentLike {
  session: SessionLike
}

interface TeamMemberLike {
  id: string
  name: string
  role: string
}

interface AgentTeamsLike {
  tryMembership(agent: unknown): unknown
  listMembers(agent: unknown): TeamMemberLike[]
}

/** 一条 child 的身份：teammate 按 team 名寻址，subagent 按 session id 寻址。 */
export interface ChildIdentity {
  role: 'teammate' | 'subagent'
  address: string
}

/** 一条模型可见 child 行。 */
export interface SubagentRow {
  id: string
  label: string
  mode: string
  status: 'running' | 'inactive'
  /** teammate（team 名册成员）或普通 subagent child。 */
  role: 'teammate' | 'subagent'
  /** 寻址：teammate 用 team 名，subagent 用 session id。 */
  address: string
  /** 子会话 durable 日志里最后一个 `turn/end` 的 reason.kind；读不到时为 `unavailable`（可见降级）。 */
  lastTurnEnd: string
}

/** `sessionPersistence` 的只读一面（root 服务；base 挂 JSONL，agent-loop/team 同款用法）。 */
interface PersistedHandleLike {
  read(from: number, to?: number, options?: { signal?: AbortSignal }): Promise<{ events: readonly { type: string; data: unknown }[] }>
  close(): Promise<void>
}

interface SessionPersistenceLike {
  open(id: string, access: 'read', options?: { signal?: AbortSignal }): Promise<PersistedHandleLike>
}

/**
 * Last `turn/end` reason kind from a child's durable event log.
 * Pure: the spec pins the exact value the model sees after a host restart.
 * @param events - the child session's raw event log.
 * @returns `data.reason.kind` of the last turn/end, or undefined when absent/malformed.
 */
export function terminalOf(events: readonly { type: string; data: unknown }[]): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'turn/end') continue
    const reason = (event.data as { reason?: { kind?: unknown } } | undefined)?.reason
    return typeof reason?.kind === 'string' ? reason.kind : undefined
  }
  return undefined
}

/**
 * Read one child's last `turn/end` reason through the root-available durable persistence.
 * Throws when the session cannot be opened/read; the caller maps that to a visible `unavailable`.
 * @param persistence - the session persistence service (root; not the isolated sessionQuery).
 * @param id - the child session id from the parent catalog.
 * @param signal - optional cancellation for open/read.
 * @returns the last turn/end reason kind, or undefined when the log has no turn/end.
 */
export async function readChildTerminal(
  persistence: SessionPersistenceLike,
  id: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const handle = await persistence.open(id, 'read', signal === undefined ? undefined : { signal })
  try {
    const { events } = await handle.read(0, undefined, signal === undefined ? undefined : { signal })
    return terminalOf(events)
  } finally {
    await handle.close()
  }
}

/**
 * Fold the parent's own `subagent/catalog` events into child rows, last-wins per child.
 * Pure so the spec can pin exactly what the model sees without a live runtime.
 * @param events - the calling session's own durable events.
 * @param statusOf - live-agent status lookup; absent means inactive.
 * @returns one row per cataloged child, in first-catalog order.
 */
export function subagentRows(
  events: readonly { type: string; data: unknown }[],
  statusOf: (id: string) => 'running' | 'inactive',
  roleOf: (id: string) => ChildIdentity = id => ({ role: 'subagent', address: id }),
): SubagentRow[] {
  const rows = new Map<string, SubagentRow>()
  for (const event of events) {
    if (event.type !== 'subagent/catalog') continue
    const data = (event as CatalogEvent).data
    if (typeof data?.childId !== 'string') continue
    const identity = roleOf(data.childId)
    rows.set(data.childId, {
      id: data.childId,
      label: typeof data.label === 'string' ? data.label : '',
      mode: typeof data.mode === 'string' ? data.mode : 'unknown',
      status: statusOf(data.childId),
      role: identity.role,
      address: identity.address,
      lastTurnEnd: 'unavailable',
    })
  }
  return [...rows.values()]
}

/** 注册两个控制工具；服务缺席时 execute 报明确错误，而不是静默无操作。 */
export function registerDelegationControl(ctx: Context): void {
  const statusOf = (id: string): 'running' | 'inactive' => {
    const agents = ctx.get('agents') as AgentsLike | undefined
    return agents?.get(id)?.status === 'running' ? 'running' : 'inactive'
  }

  ctx.tools.register(defineTool({
    name: 'list_subagents',
    description: 'List the children THIS session started, from the session\'s durable catalog (the list '
      + 'survives a host restart). Every row carries `role` and `address`: `teammate` rows are Team roster '
      + 'members — address them with the team `send_message` by `address` (their team name); `subagent` rows '
      + 'are plain/named subagent children — address them with `send_to_subagent` by `address` (their session '
      + 'id). Use it when the team-scoped `list_agents` only returns roster members and you need the non-roster '
      + 'children too. `running` means the child is working; `inactive` means it is '
      + 'not currently working. `lastTurnEnd` is the reason its durable log recorded for the last turn '
      + '(e.g. `interrupted` after a host restart, `completed`); it is `unavailable` when the log cannot be '
      + 'read (visible degradation, never silently omitted). '
      + 'An `interrupted` child never sends a completion notice: continue it with `send_to_subagent` or report the gap.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          subagents: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                label: { type: 'string' },
                mode: { type: 'string' },
                status: { type: 'string', required: true },
                role: { type: 'string', required: true },
                address: { type: 'string', required: true },
                lastTurnEnd: { type: 'string', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute(_args, exec) {
      const agent = exec.agent as AgentLike | undefined
      if (agent === undefined) throw new Error('list_subagents requires a calling agent')
      // 身份：team 成员标 role/address；没有 team 服务或非 Lead 时全部按 subagent（不隐藏任何 child）。
      const teammateByName = new Map<string, string>()
      try {
        const teams = ctx.get('agentTeams') as AgentTeamsLike | undefined
        if (teams?.tryMembership(agent) !== undefined) {
          for (const member of teams.listMembers(agent)) {
            if (member.role === 'teammate') teammateByName.set(String(member.id), member.name)
          }
        }
      } catch { /* no team context; every child is a plain subagent */ }
      const roleOf = (id: string): ChildIdentity => teammateByName.has(id)
        ? { role: 'teammate', address: teammateByName.get(id) as string }
        : { role: 'subagent', address: id }
      const rows = subagentRows(agent.session.ownEvents(), statusOf, roleOf)
      // 终态读 root 的 sessionPersistence（不用 isolate 组里的 sessionQuery）；读不到就**可见降级**。
      const persistence = ctx.get('sessionPersistence') as SessionPersistenceLike | undefined
      await Promise.all(rows.map(async row => {
        if (persistence === undefined) {
          row.lastTurnEnd = 'unavailable'
          return
        }
        // 宿主刚重启时 durable 根可能还在 settle（首次读偶发失败，C2 实测）；有界重试，
        // 仍失败则**可见降级**并留一条 warn 供诊断——不静默、不无限重试。
        let lastError: unknown
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            row.lastTurnEnd = (await readChildTerminal(persistence, row.id, exec.signal)) ?? 'unavailable'
            return
          } catch (error) {
            lastError = error
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)))
          }
        }
        row.lastTurnEnd = 'unavailable'
        ;(ctx as unknown as { logger?: { warn(message: string): void } }).logger?.warn(
          `list_subagents: cannot read durable log for ${row.id}: ${String(lastError)}`,
        )
      }))
      return { subagents: rows }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'send_to_subagent',
    description: 'Send a message to a subagent child THIS session started, or continue its conversation '
      + '(an idle child starts a new turn). Use it when the team-scoped `send_message` reports '
      + '"active teammate not found": named and generic subagent children are not team roster members, so '
      + 'the team-scoped name cannot reach them. For a `role: teammate` row from list_subagents use the team '
      + '`send_message` by team name instead. Returns delivery confirmation, not the child\'s answer. '
      + 'One-shot children reject continuation.',
    parameters: {
      subagent_id: {
        type: 'string',
        required: true,
        description: 'The child session id, as returned by list_subagents or by the start receipt.',
      },
      message: {
        type: 'string',
        required: true,
        description: 'The message to deliver to the child.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { messageId: { type: 'string', required: true } },
      },
      render: (args, _value) => [{
        type: 'text',
        text: `message delivered to subagent ${args.subagent_id}`,
      }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('send_to_subagent requires a calling agent')
      const subagents = ctx.get('subagents') as SubagentsLike | undefined
      if (subagents === undefined) throw new Error('send_to_subagent requires the subagents service')
      const messageId = await subagents.sendMessage(
        agent,
        args.subagent_id,
        [{ type: 'text', text: args.message }],
        { signal: exec.signal },
      )
      return { messageId: String(messageId) }
    },
  }))
}

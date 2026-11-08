/**
 * `list_subagents` / `send_to_subagent`：根会话（Team Lead）够到自己 subagent child 的控制面。
 *
 * 为什么存在（BUG-037/041 的真修，2026-11-08）：`tool-agent-team` 会按成员身份把
 * `send_message` / `list_agents` **按同名 shadow 成团队版**，而任何没有 parentSession 的
 * 根会话必是 Lead ⇒ 根门拿不到全局控制名，够不到自己起的 subagent child（R3/M2/R14 实测）。
 * 团队版问题在 vendor；本仓能做的是**换一个不被 shadow 的名字**，把官方
 * `ctx.subagents.sendMessage()` 与父会话自己的 durable catalog 暴露给模型（不是平行实现）。
 *
 * 数据来源：父会话 `session.ownEvents()` 里的 `subagent/catalog`（父拥有的 durable 事件，
 * 宿主重启后随会话重放）；**终态**用 `sessionQuery.readSession(childId)` 读 child 的 durable 日志
 * 最后一个 `turn/end`（`openAt: never` 只禁搜索，durable 读仍可用；服务缺席时 fail-soft 省略）。
 * 状态只读 live Agent registry：`running` / `inactive`。
 * 已知边界：`readSession` 只给 reason.kind（如 `interrupted`），不给错过的完成通知内容。
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

/** 一条模型可见 child 行。 */
export interface SubagentRow {
  id: string
  label: string
  mode: string
  status: 'running' | 'inactive'
  /** 子会话 durable 日志里最后一个 `turn/end` 的 reason.kind（宿主重启后常见 `interrupted`）。 */
  lastTurnEnd?: string
}

/** 只用到 durable 读一面；`sessionQuery` 在 `openAt: never` 下仍支持 readSession（搜索被禁）。 */
interface SessionQueryLike {
  readSession(id: string): Promise<{ events: readonly { type: string; data: unknown }[] }>
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
 * Fold the parent's own `subagent/catalog` events into child rows, last-wins per child.
 * Pure so the spec can pin exactly what the model sees without a live runtime.
 * @param events - the calling session's own durable events.
 * @param statusOf - live-agent status lookup; absent means inactive.
 * @returns one row per cataloged child, in first-catalog order.
 */
export function subagentRows(
  events: readonly { type: string; data: unknown }[],
  statusOf: (id: string) => 'running' | 'inactive',
): SubagentRow[] {
  const rows = new Map<string, SubagentRow>()
  for (const event of events) {
    if (event.type !== 'subagent/catalog') continue
    const data = (event as CatalogEvent).data
    if (typeof data?.childId !== 'string') continue
    rows.set(data.childId, {
      id: data.childId,
      label: typeof data.label === 'string' ? data.label : '',
      mode: typeof data.mode === 'string' ? data.mode : 'unknown',
      status: statusOf(data.childId),
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
    description: 'List the subagent children THIS session started, from the session\'s durable catalog '
      + '(the list survives a host restart). Use it when the team-scoped `list_agents` only returns roster '
      + 'members — named and generic subagent children are not team roster members, so in a root (Team Lead) '
      + 'session `list_agents` cannot see them. `running` means the child is working; `inactive` means it is '
      + 'not currently working. `lastTurnEnd` is the reason its durable log recorded for the last turn '
      + '(e.g. `interrupted` after a host restart, `completed`); it is absent when the log cannot be read. '
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
                lastTurnEnd: { type: 'string' },
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
      const rows = subagentRows(agent.session.ownEvents(), statusOf)
      // 终态读取是**可选增强**：服务缺席或单条日志坏了都不影响列出 child（fail-soft，逐条）。
      const query = ctx.get('sessionQuery') as SessionQueryLike | undefined
      if (query !== undefined) {
        await Promise.all(rows.map(async row => {
          try {
            const terminal = terminalOf((await query.readSession(row.id)).events)
            if (terminal !== undefined) row.lastTurnEnd = terminal
          } catch { /* durable log unavailable for this child; keep the row without a terminal */ }
        }))
      }
      return { subagents: rows }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'send_to_subagent',
    description: 'Send a message to a subagent child THIS session started, or continue its conversation '
      + '(an idle child starts a new turn). Use it when the team-scoped `send_message` reports '
      + '"active teammate not found": named and generic subagent children are not team roster members, so '
      + 'the team-scoped name cannot reach them. Returns delivery confirmation, not the child\'s answer. '
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

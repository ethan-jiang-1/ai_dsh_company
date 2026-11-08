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
 * 宿主重启后随会话重放）——不依赖 `sessionQuery`（本 profile 根 provider 是 `openAt: never`）。
 * 状态只读 live Agent registry：`running` / `inactive`；重启后 in-flight child 会显示 inactive，
 * 终态（interrupted）仍由 child 自己的会话记录，卡 BUG-041 的剩余缺口在此如实记账。
 *
 * 退役条件：上游让根会话拿到全局控制名（team shadow 修复）后，本工具删除；
 * 检测锚点见 `tests/harness/contract/` 与台账 `[CT-LIFE]`。
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
      + 'not currently working. An `inactive` child that was interrupted by a host restart never sends a '
      + 'completion notice: continue it with `send_to_subagent` or report the gap.',
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
      return { subagents: subagentRows(agent.session.ownEvents(), statusOf) }
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
        { ...exec.signal === undefined ? {} : { signal: exec.signal } },
      )
      return { messageId: String(messageId) }
    },
  }))
}

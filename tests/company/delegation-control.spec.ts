/**
 * host 半 `list_subagents` / `send_to_subagent` 行为 spec（BUG-037/041 真修的机械锚点）。
 *
 * 证明什么：① 控制面名字不与 vendor 的 `send_message` / `list_agents` 相撞（团队版 shadow 不到）；
 *   ② list 从**父会话自己的 durable catalog** 折叠，不依赖 sessionQuery（本 profile 根 provider
 *   是 openAt: never）；③ send 把 target/content/signal 原样交给官方 `ctx.subagents.sendMessage`。
 * 不证明：真实装配里工具可见性（preset-smoke / 真会话探针）、cold resume 的 provider 行为。
 */
import { describe, expect, it } from 'vitest'
import { registerDelegationControl, subagentRows, terminalOf } from '../../packages/company-pack/src/host/delegation-control.ts'

type ToolDefinition = {
  name: string
  execute(args: never, exec: never): Promise<unknown>
  output: { render(args: never, value: never): Array<{ type: string; text: string }> }
}

function harness(options: { subagents?: unknown; agents?: unknown; sessionQuery?: unknown } = {}) {
  const tools = new Map<string, ToolDefinition>()
  const ctx = {
    tools: { register: (definition: ToolDefinition) => { tools.set(definition.name, definition) } },
    get: (name: string) => name === 'subagents' ? options.subagents
      : name === 'agents' ? options.agents
        : name === 'sessionQuery' ? options.sessionQuery
          : undefined,
  }
  registerDelegationControl(ctx as never)
  return tools
}

const catalog = (childId: string, label: string, mode = 'continuable') => ({
  type: 'subagent/catalog',
  data: { childId, childCreatedAt: 1, label, mode, version: 0 },
})
const agentWith = (events: unknown[]) => ({ session: { id: 'parent', ownEvents: () => events } })

describe('delegation control tools', () => {
  it('registers names the team shadow cannot occupy', () => {
    expect([...harness().keys()].sort()).toEqual(['list_subagents', 'send_to_subagent'])
  })

  it('folds the parent durable catalog last-wins and ignores unrelated events', () => {
    const rows = subagentRows([
      catalog('a', '旧标签'),
      { type: 'turn/end', data: {} },
      catalog('a', '新标签'),
      catalog('b', 'worker-b', 'one-shot'),
      { type: 'subagent/catalog', data: {} },
    ], id => (id === 'b' ? 'running' : 'inactive'))
    expect(rows).toEqual([
      { id: 'a', label: '新标签', mode: 'continuable', status: 'inactive' },
      { id: 'b', label: 'worker-b', mode: 'one-shot', status: 'running' },
    ])
  })

  it('list_subagents reads the calling session own events and live status', async () => {
    const tool = harness({ agents: { get: (id: string) => (id === 'child-2' ? { status: 'running' } : undefined) } })
      .get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1'), catalog('child-2', 'w2')]),
      signal: new AbortController().signal,
    } as never)
    expect(result).toEqual({
      subagents: [
        { id: 'child-1', label: 'w1', mode: 'continuable', status: 'inactive' },
        { id: 'child-2', label: 'w2', mode: 'continuable', status: 'running' },
      ],
    })
  })

  it('list_subagents requires a calling agent instead of silently returning nothing', async () => {
    const tool = harness().get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    await expect(tool.execute({} as never, { signal: new AbortController().signal } as never))
      .rejects.toThrow(/calling agent/)
  })

  it('send_to_subagent forwards id, text and signal to the official service', async () => {
    const calls: unknown[] = []
    const subagents = {
      sendMessage: async (sender: unknown, targetId: string, content: unknown, options: unknown) => {
        calls.push({ sender, targetId, content, options })
        return 'msg-1'
      },
    }
    const tool = harness({ subagents }).get('send_to_subagent')
    if (tool === undefined) throw new Error('send_to_subagent not registered')
    const signal = new AbortController().signal
    const agent = agentWith([])
    const result = await tool.execute({ subagent_id: 'child-1', message: '报一下版本' } as never, { agent, signal } as never)
    expect(result).toEqual({ messageId: 'msg-1' })
    expect(calls).toEqual([{
      sender: agent,
      targetId: 'child-1',
      content: [{ type: 'text', text: '报一下版本' }],
      options: { signal },
    }])
  })

  it('send_to_subagent names the missing service instead of failing obscurely', async () => {
    const tool = harness().get('send_to_subagent')
    if (tool === undefined) throw new Error('send_to_subagent not registered')
    await expect(tool.execute({ subagent_id: 'x', message: 'y' } as never, { agent: agentWith([]) } as never))
      .rejects.toThrow(/subagents service/)
  })
  it('terminalOf takes the last turn/end reason and ignores malformed rows', () => {
    expect(terminalOf([
      { type: 'turn/start', data: {} },
      { type: 'turn/end', data: { reason: { kind: 'completed' } } },
      { type: 'turn/start', data: {} },
      { type: 'turn/end', data: { reason: { kind: 'interrupted' } } },
    ])).toBe('interrupted')
    expect(terminalOf([{ type: 'turn/end', data: {} }])).toBeUndefined()
    expect(terminalOf([])).toBeUndefined()
  })

  // 负例留证 2026-11-08：BUG-041 的终态守卫——把 list_subagents 的 sessionQuery 终态增强临时关掉
  //   （`const query = undefined`）→ 本用例 1 failed / 8 passed；还原 → 9 passed。
  //   红判依据：终态来自 readSession 的最后一个 turn/end，增强关掉后行上没有 lastTurnEnd，断言即红。
  it('list_subagents adds the durable terminal reason after a host restart (BUG-041)', async () => {
    const sessionQuery = {
      readSession: async (id: string) => ({
        events: id === 'child-1'
          ? [{ type: 'turn/start', data: {} }, { type: 'turn/end', data: { reason: { kind: 'interrupted' } } }]
          : [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }],
      }),
    }
    const tool = harness({ sessionQuery }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1'), catalog('child-2', 'w2')]),
      signal: new AbortController().signal,
    } as never)
    expect(result).toEqual({
      subagents: [
        { id: 'child-1', label: 'w1', mode: 'continuable', status: 'inactive', lastTurnEnd: 'interrupted' },
        { id: 'child-2', label: 'w2', mode: 'continuable', status: 'inactive', lastTurnEnd: 'completed' },
      ],
    })
  })

  it('list_subagents keeps the rows when a child log cannot be read (fail-soft)', async () => {
    const sessionQuery = { readSession: async () => { throw new Error('corrupt child log') } }
    const tool = harness({ sessionQuery }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never)
    expect(result).toEqual({
      subagents: [{ id: 'child-1', label: 'w1', mode: 'continuable', status: 'inactive' }],
    })
  })

})

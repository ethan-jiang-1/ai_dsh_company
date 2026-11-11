/**
 * host 半 `list_subagents` / `send_to_subagent` 行为 spec（BUG-037/041/046 的机械锚点）。
 *
 * 证明什么：① 控制面名字不与 vendor 的 `send_message` / `list_agents` 相撞（团队版 shadow 不到）；
 *   ② list 从**父会话自己的 durable catalog** 折叠；终态与引擎身份（preset/depth）读 root 的
 *   `sessionPersistence`（不是 isolate 组里的 `sessionQuery`），读不到输出 `unavailable` 而不是省略；
 *   ③ send 把 target/content/signal 原样交官方服务。
 * 不证明：真实装配里工具可见性（preset-smoke / 真会话探针）、cold resume 的 provider 行为。
 */
// 负例留证 2026-11-09：让 readChildTurnState 不返回 durable header 的 preset/depth（或把 rows 初始化成
// worker/0）⇒「暴露 header 身份」与「缺 header 显式 unavailable」两条红；还原 ⇒ 绿。BUG-046
// 负例留证 2026-11-10：把 install 的 worker family 过滤去掉（或只跳过 worker）⇒「worker family 不安装
// control」红（orchestrator 出现 control 名）；还原 ⇒ 绿。BUG-052
import { describe, expect, it } from 'vitest'
import { childTurnState, readChildTurnState, registerDelegationControl, subagentRows, terminalOf } from '../../../packages/company-pack/src/host/delegation/delegation-control.ts'

// 负例留证 2026-11-11：去掉 teammate 的“无通用 child 通道”判据（只按 preset）⇒
// 「teammate without a generic child channel」用例红（死工具回来）；还原 → 24 passed。BUG-078

type ToolDefinition = {
  name: string
  description: string
  execute(args: never, exec: never): Promise<unknown>
  output: { render(args: never, value: never): Array<{ type: string; text: string }> }
}

function harness(
  options: {
    subagents?: unknown; agents?: unknown; agentTeams?: unknown; sessionPersistence?: unknown; warnings?: string[]
    /** agent 工具面里的子通道名（teammate 能力判据）；默认空。 */
    childTools?: readonly string[]
    /** agent session header 的 parentSession；用于命名 child 座位。 */
    parentSession?: string
    /** agent session header 的 delegationDepth；teammate/命名 child 用。 */
    depth?: number
  } = {},
  preset: string | undefined = 'vp-eng',
) {
  const tools = new Map<string, ToolDefinition>()
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const ctx = {
    logger: { warn: (message: string) => { options.warnings?.push(message) } },
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
    get: (name: string) => name === 'subagents' ? options.subagents
      : name === 'agents' ? options.agents
        : name === 'agentTeams' ? options.agentTeams
          : name === 'sessionPersistence' ? options.sessionPersistence
            : undefined,
  }
  registerDelegationControl(ctx as never)
  // control 工具现在是 per-agent 安装（BUG-052）：fake 一个 agent scope，触发 agent/created。
  const childTools = new Set(options.childTools ?? [])
  const agent = {
    session: {
      id: 'parent',
      ownEvents: () => [],
      header: {
        ...(options.parentSession === undefined ? {} : { parentSession: options.parentSession }),
        ...(options.depth === undefined ? {} : { delegationDepth: options.depth }),
      },
    },
    ctx: {
      get: (name: string) => name === 'agentPresets' ? { composedPreset: () => preset }
        : name === 'agentTeams' ? options.agentTeams
          : undefined,
      inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
        callback({
          tools: {
            register: (definition: ToolDefinition) => {
              tools.set(definition.name, definition)
              return () => {}
            },
            get: (name: string) => childTools.has(name) ? { name } : undefined,
          },
          effect: (callback: () => () => void) => callback(),
        })
        return { dispose: async () => {} }
      },
    },
  }
  for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
  return tools
}

/** `sessionPersistence` 的只读假件：按 id 返回事件日志；值是 Error 时模拟读失败。 */
const persistenceOf = (
  logs: Record<string, unknown[] | Error>,
  header?: { agentPreset?: string; delegationDepth?: number },
) => ({
  open: async (id: string) => {
    const events = logs[id]
    if (events instanceof Error) throw events
    if (events === undefined) throw new Error(`session ${id} not found`)
    return { header, read: async () => ({ events }), close: async () => {} }
  },
})

const catalog = (childId: string, label: string, mode = 'continuable') => ({
  type: 'subagent/catalog',
  data: { childId, childCreatedAt: 1, label, mode, version: 0 },
})
const agentWith = (events: unknown[]) => ({ session: { id: 'parent', ownEvents: () => events } })

describe('delegation control tools', () => {
  it('registers names the team shadow cannot occupy', () => {
    const tools = harness()
    expect([...tools.keys()].sort()).toEqual(['list_subagents', 'send_to_subagent'])
    // 两条寻址规则写在模型面：role/address + team send_message vs send_to_subagent。
    const list = tools.get('list_subagents')?.description ?? ''
    expect(list).toContain('`role`')
    expect(list).toContain('`address`')
    expect(list).toContain('teammate')
    expect(tools.get('send_to_subagent')?.description ?? '').toContain('teammate')
  })

  it('非角色 preset 不安装 control 工具；company 角色保留（BUG-052）', () => {
    // 表 = 模型 handbookSkipPresets() 同一张（worker family + 质量环能力档）；验证者尤其不该拿 send_to_subagent。
    for (const preset of ['worker', 'worker-researcher', 'worker-orchestrator', 'quality-loop-producer', 'quality-loop-verifier']) {
      expect([...harness({}, preset).keys()], preset).toEqual([])
    }
    for (const preset of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo']) {
      expect([...harness({}, preset).keys()].sort(), preset).toEqual(['list_subagents', 'send_to_subagent'])
    }
    // 未知 preset（非 company 组合）保持旧行为：安装，不因过滤漏掉根会话。
    expect([...harness({}, undefined).keys()].sort()).toEqual(['list_subagents', 'send_to_subagent'])
  })

  it('teammate without a generic child channel: no dead control tools (BUG-078)', () => {
    const tools = harness({ agentTeams: { tryMembership: () => ({ role: 'teammate' }) }, depth: 1 }, 'ceo')
    expect([...tools.keys()]).toEqual([])
  })

  it('teammate with a generic child channel keeps control tools (vp-eng teammate)', () => {
    const tools = harness({
      agentTeams: { tryMembership: () => ({ role: 'teammate' }) },
      childTools: ['subagent'],
      depth: 1,
    }, 'vp-eng')
    expect([...tools.keys()].sort()).toEqual(['list_subagents', 'send_to_subagent'])
  })

  it('named child (not in the roster) keeps control tools', () => {
    const tools = harness({ parentSession: 'root', childTools: ['subagent'], depth: 1 }, 'vp-eng')
    expect([...tools.keys()].sort()).toEqual(['list_subagents', 'send_to_subagent'])
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
      { id: 'a', label: '新标签', mode: 'continuable', status: 'inactive', role: 'subagent', address: 'a', lastTurnEnd: 'unavailable', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
      { id: 'b', label: 'worker-b', mode: 'one-shot', status: 'running', role: 'subagent', address: 'b', lastTurnEnd: 'unavailable', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
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
        { id: 'child-1', label: 'w1', mode: 'continuable', status: 'inactive', role: 'subagent', address: 'child-1', lastTurnEnd: 'unavailable', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
        { id: 'child-2', label: 'w2', mode: 'continuable', status: 'running', role: 'subagent', address: 'child-2', lastTurnEnd: 'unavailable', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
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
  it('readChildTurnState opens read-only, reads from 0, always closes, and returns header identity', async () => {
    const calls: string[] = []
    const persistence = {
      open: async (id: string, access: string) => {
        calls.push(`open:${id}:${access}`)
        return {
          header: { agentPreset: 'worker', delegationDepth: 3 },
          read: async (from: number) => {
            calls.push(`read:${String(from)}`)
            return { events: [{ type: 'turn/end', data: { reason: { kind: 'interrupted' } } }] }
          },
          close: async () => { calls.push('close') },
        }
      },
    }
    await expect(readChildTurnState(persistence, 'child-1'))
      .resolves.toEqual({
        terminal: 'interrupted',
        openTurn: false,
        sawTurn: true,
        agentPreset: 'worker',
        delegationDepth: 3,
      })
    expect(calls).toEqual(['open:child-1:read', 'read:0', 'close'])
  })

  it('marks roster teammates with role/address and leaves plain children as subagents', async () => {
    const agentTeams = {
      tryMembership: () => ({ lead: 'parent' }),
      listMembers: () => [{ id: 'child-2', name: 'eng-2', role: 'teammate' }],
    }
    const tool = harness({ agentTeams }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'worker'), catalog('child-2', 'eng-2')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ id: string; role: string; address: string }> }
    expect(result.subagents).toEqual([
      { id: 'child-1', label: 'worker', mode: 'continuable', status: 'inactive', role: 'subagent', address: 'child-1', lastTurnEnd: 'unavailable', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
      { id: 'child-2', label: 'eng-2', mode: 'continuable', status: 'inactive', role: 'teammate', address: 'eng-2', lastTurnEnd: 'unavailable', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
    ])
  })

  it('treats every child as a subagent when the caller is not in a team', async () => {
    const agentTeams = { tryMembership: () => undefined, listMembers: () => [] }
    const tool = harness({ agentTeams }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'worker')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ role: string; address: string }> }
    expect(result.subagents[0]).toMatchObject({ role: 'subagent', address: 'child-1' })
  })

  it('retries a transient durable-read failure and still reports the terminal', async () => {
    let attempts = 0
    const sessionPersistence = {
      open: async () => {
        attempts += 1
        if (attempts < 3) throw new Error('durable root still settling')
        return {
          read: async () => ({ events: [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }] }),
          close: async () => {},
        }
      },
    }
    const tool = harness({ sessionPersistence }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ lastTurnEnd: string; lastTurnEndDetail?: string }> }
    expect(result.subagents[0]?.lastTurnEnd).toBe('completed')
    expect(attempts).toBe(3)
  })

  it('reports unavailable and logs one warning when all retries fail', async () => {
    const warnings: string[] = []
    const sessionPersistence = { open: async () => { throw new Error('persistently unreadable') } }
    const tool = harness({ sessionPersistence, warnings }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ lastTurnEnd: string; lastTurnEndDetail?: string }> }
    expect(result.subagents[0]?.lastTurnEnd).toBe('unavailable')
    expect(result.subagents[0]?.lastTurnEndDetail).toBe('persistently unreadable')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('cannot read durable log')
  })

  it('childTurnState distinguishes a recorded terminal, an open turn, and no turn', () => {
    expect(childTurnState([
      { type: 'turn/start', seq: 0, data: {} },
      { type: 'turn/end', seq: 1, data: { reason: { kind: 'completed' } } },
    ])).toEqual({ terminal: 'completed', openTurn: false, sawTurn: true })
    expect(childTurnState([
      { type: 'turn/start', seq: 0, data: {} },
      { type: 'turn/end', seq: 1, data: { reason: { kind: 'completed' } } },
      { type: 'turn/start', seq: 2, data: {} },
    ])).toEqual({ openTurn: true, sawTurn: true })
    expect(childTurnState([{ type: 'message', seq: 0, data: {} }]))
      .toEqual({ openTurn: false, sawTurn: false })
  })

  it('reports interrupted for an inactive child with an open durable turn (host-kill signature)', async () => {
    const sessionPersistence = persistenceOf({
      'child-1': [{ type: 'turn/start', data: {} }],
    })
    const tool = harness({ sessionPersistence }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ lastTurnEnd: string; lastTurnEndDetail?: string }> }
    expect(result.subagents[0]).toMatchObject({ lastTurnEnd: 'interrupted', lastTurnEndDetail: 'inferred-open-turn' })
  })

  it('reports none (turn in progress) for a running child with an open turn', async () => {
    const sessionPersistence = persistenceOf({
      'child-1': [{ type: 'turn/start', data: {} }],
    })
    const tool = harness({ sessionPersistence, agents: { get: () => ({ status: 'running' }) } }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ lastTurnEnd: string; lastTurnEndDetail?: string }> }
    expect(result.subagents[0]).toMatchObject({ lastTurnEnd: 'none', lastTurnEndDetail: 'turn-in-progress' })
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

  // 负例留证 2026-11-08：BUG-041 的终态守卫——把 list_subagents 的持久化终态读临时关掉
  //   （`const persistence = undefined`）→ 本用例红（lastTurnEnd 变 unavailable）；还原 → 绿。
  //   红判依据：终态来自 sessionPersistence 日志的最后一个 turn/end，读路径断掉即红。
  it('list_subagents adds the durable terminal reason after a host restart (BUG-041)', async () => {
    const sessionPersistence = persistenceOf({
      'child-1': [{ type: 'turn/start', data: {} }, { type: 'turn/end', data: { reason: { kind: 'interrupted' } } }],
      'child-2': [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }],
    })
    const tool = harness({ sessionPersistence }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1'), catalog('child-2', 'w2')]),
      signal: new AbortController().signal,
    } as never)
    expect(result).toEqual({
      subagents: [
        { id: 'child-1', label: 'w1', mode: 'continuable', status: 'inactive', role: 'subagent', address: 'child-1', lastTurnEnd: 'interrupted', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
        { id: 'child-2', label: 'w2', mode: 'continuable', status: 'inactive', role: 'subagent', address: 'child-2', lastTurnEnd: 'completed', agentPreset: 'unavailable', delegationDepth: 'unavailable' },
      ],
    })
  })

  it('list_subagents keeps the rows and reports unavailable when a child log cannot be read', async () => {
    const sessionPersistence = persistenceOf({ 'child-1': new Error('corrupt child log') })
    const tool = harness({ sessionPersistence }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never)
    expect(result).toEqual({
      subagents: [{ id: 'child-1', label: 'w1', mode: 'continuable', status: 'inactive', role: 'subagent', address: 'child-1', lastTurnEnd: 'unavailable', lastTurnEndDetail: 'corrupt child log', agentPreset: 'unavailable', delegationDepth: 'unavailable', identityDetail: 'corrupt child log' }],
    })
  })

  it('list_subagents exposes the engine-applied preset/depth from the durable header (BUG-046)', async () => {
    const sessionPersistence = persistenceOf(
      { 'child-1': [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }] },
      { agentPreset: 'worker', delegationDepth: 3 },
    )
    const tool = harness({ sessionPersistence }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ agentPreset: string; delegationDepth: string; lastTurnEnd: string }> }
    expect(result.subagents[0]).toMatchObject({ agentPreset: 'worker', delegationDepth: '3', lastTurnEnd: 'completed' })
  })

  it('reports unavailable when the durable header has no preset/depth (never guesses worker/0)', async () => {
    const sessionPersistence = persistenceOf({
      'child-1': [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }],
    })
    const tool = harness({ sessionPersistence }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ agentPreset: string; delegationDepth: string }> }
    expect(result.subagents[0]).toMatchObject({ agentPreset: 'unavailable', delegationDepth: 'unavailable' })
  })

  it('depth 0 is a real value (top-level header), not unavailable', async () => {
    const sessionPersistence = persistenceOf(
      { 'child-1': [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }] },
      { delegationDepth: 0 },
    )
    const tool = harness({ sessionPersistence }).get('list_subagents')
    if (tool === undefined) throw new Error('list_subagents not registered')
    const result = await tool.execute({} as never, {
      agent: agentWith([catalog('child-1', 'w1')]),
      signal: new AbortController().signal,
    } as never) as { subagents: Array<{ agentPreset: string; delegationDepth: string }> }
    expect(result.subagents[0]).toMatchObject({ agentPreset: 'unavailable', delegationDepth: '0' })
  })

})

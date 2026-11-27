/**
 * Real Cordis `Context` host + per-agent test harness (`@deepseek-ai/cordis`).
 *
 * Why this exists: hand-rolled `{ inject: (_deps, cb) => { cb(...); return { dispose: async () => {} } } }`
 * stubs silently ignore fiber disposal, turning real `agent.ctx` plugin-unload leaks into false greens.
 * Every registration on `host` and `agent.ctx` here is backed by a real `ctx.effect()`, so unloading
 * either owner (`agent.dispose()` or `pluginFiber.dispose()`) tests genuine Cordis fiber unwinding.
 */
import { Context, Service } from '@deepseek-ai/cordis'
export { Context, Service }

export function emitAgentCreated(ctx: Context, agent: unknown): void {
  ;(ctx as unknown as { emit(event: string, payload: unknown): void }).emit('agent/created', { agent })
}

export function emitAgentDisposed(ctx: Context, agent: unknown): void {
  ;(ctx as unknown as { emit(event: string, payload: unknown): void }).emit('agent/disposed', { agent })
}

export interface PromptSectionRecord {
  readonly name: string
  readonly order?: number
  readonly text: string | (() => string)
  readonly interpolate?: boolean
}

export interface RealAgentOptions {
  readonly id?: string
  readonly preset?: string
  readonly cwd?: string
  readonly parentSession?: string
  readonly delegationDepth?: number
  readonly fixedTools?: readonly string[]
  readonly teamRole?: 'lead' | 'teammate'
}

export interface RealAgentHarness {
  readonly agent: {
    readonly id: string
    readonly status: 'idle' | 'running'
    readonly ctx: Context
    readonly session: {
      readonly id: string
      readonly header: {
        readonly id: string
        readonly cwd?: string
        readonly parentSession?: string
        readonly delegationDepth?: number
      }
      ownEvents(): readonly { type: string; data: unknown; seq?: number }[]
    }
    readonly options: Record<string, unknown>
  }
  readonly sections: Map<string, PromptSectionRecord>
  readonly tools: Map<string, { readonly name: string; readonly execute?: (...args: unknown[]) => unknown }>
  readonly guards: Set<(exec: { readonly name: string }) => string | undefined>
  readSectionText(name: string): string | undefined
  disposeAgent(hostCtx?: Context): Promise<void>
}

export function createRealAgentHarness(options: RealAgentOptions = {}): RealAgentHarness {
  const agentCtx = new Context()
  const sections = new Map<string, PromptSectionRecord>()
  const tools = new Map<string, { readonly name: string; readonly execute?: (...args: unknown[]) => unknown }>()
  const guards = new Set<(exec: { readonly name: string }) => string | undefined>()
  const fixedTools = new Set(options.fixedTools ?? ['workflow', 'subagent', 'subagent_fork', 'spawn_teammate', 'team_task_list'])

  if (options.preset !== undefined) {
    const preset = options.preset
    agentCtx.provide('agentPresets', {
      composedPreset: () => preset,
    } as never)
  }

  if (options.teamRole !== undefined) {
    const role = options.teamRole
    agentCtx.provide('agentTeams', {
      tryMembership: () => ({ role }),
    } as never)
  }

  class TestSystemPromptService extends Service {
    constructor(ctx: Context) {
      super(ctx, 'systemPrompt')
    }
    getSectionOrder(): number {
      return 2800
    }
    section(record: PromptSectionRecord) {
      sections.set(record.name, record)
      return this.ctx.effect(() => () => {
        sections.delete(record.name)
      })
    }
  }

  class TestToolsService extends Service {
    constructor(ctx: Context) {
      super(ctx, 'tools')
    }
    get(name: string) {
      if (tools.has(name)) return tools.get(name)
      if (fixedTools.has(name)) return { name }
      return undefined
    }
    register(tool: { readonly name: string; readonly execute?: (...args: unknown[]) => unknown }) {
      tools.set(tool.name, tool)
      return this.ctx.effect(() => () => {
        tools.delete(tool.name)
      })
    }
    guard(fn: (exec: { readonly name: string }) => string | undefined) {
      guards.add(fn)
      return this.ctx.effect(() => () => {
        guards.delete(fn)
      })
    }
  }

  agentCtx.plugin(TestSystemPromptService)
  agentCtx.plugin(TestToolsService)

  const id = options.id ?? 'session-real-agent'
  const header = {
    id,
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.parentSession === undefined ? {} : { parentSession: options.parentSession }),
    ...(options.delegationDepth === undefined ? {} : { delegationDepth: options.delegationDepth }),
  }

  const agent: RealAgentHarness['agent'] = {
    id,
    status: 'idle',
    ctx: agentCtx,
    session: {
      id,
      header,
      ownEvents: () => [],
    },
    options: {},
  }

  return {
    agent,
    sections,
    tools,
    guards,
    readSectionText(name: string): string | undefined {
      const entry = sections.get(name)
      if (entry === undefined) return undefined
      return typeof entry.text === 'function' ? entry.text() : entry.text
    },
    async disposeAgent(hostCtx?: Context): Promise<void> {
      if (hostCtx !== undefined) emitAgentDisposed(hostCtx, agent)
      await agentCtx.fiber.dispose()
    },
  }
}

export interface RealHostHarness {
  readonly ctx: Context
  readonly warns: string[]
  readonly hostTools: Map<string, unknown>
  readonly hostCommands: Map<string, unknown>
  readonly liveAgents: RealAgentHarness['agent'][]
  readonly subagentsCalls: number
  provideSubagents(): void
}

export function createRealHostHarness(initialAgents: readonly RealAgentHarness['agent'][] = []): RealHostHarness {
  const ctx = new Context()
  const warns: string[] = []
  const hostTools = new Map<string, unknown>()
  const hostCommands = new Map<string, unknown>()
  const liveAgents = [...initialAgents]
  let subagentsCalls = 0

  ctx.provide('tools', {
    register: (def: { readonly name: string }) => {
      hostTools.set(def.name, def)
      return ctx.effect(() => () => { hostTools.delete(def.name) })
    },
  } as never)

  ctx.provide('commands', {
    register: (def: { readonly name: string }) => {
      hostCommands.set(def.name, def)
      return ctx.effect(() => () => { hostCommands.delete(def.name) })
    },
  } as never)

  ctx.provide('approval', {
    request: async () => 'rejected',
  } as never)

  ctx.provide('agents', {
    list: () => [...liveAgents],
    get: (id: string) => liveAgents.find(a => a.id === id),
  } as never)

  ;(ctx.logger as unknown as { warn: (...args: unknown[]) => void }).warn = (...args) => {
    warns.push(args.map(String).join(' '))
  }

  return {
    ctx,
    warns,
    hostTools,
    hostCommands,
    liveAgents,
    get subagentsCalls() { return subagentsCalls },
    provideSubagents() {
      ctx.provide('subagents', {
        startActivation: async () => {
          subagentsCalls += 1
          return { childId: 'child-1', result: Promise.resolve({ output: [], stopReason: 'completed' }) }
        },
      } as never)
    },
  }
}

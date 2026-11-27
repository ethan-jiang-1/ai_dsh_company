/**
 * Dual-owner per-agent registration primitive for Host plugins (`@deepseek-ai/cordis`).
 *
 * Upstream contract (`cordis-plugin-development/references/practices.md`):
 * A registration on `agent.ctx` has TWO owners — the agent scope and this plugin's fiber.
 * Unloading the plugin does NOT dispose `agent.ctx` registrations by itself; conversely,
 * disposing an agent while the plugin stays loaded must release its entry from our map so
 * long-lived hosts do not retain dead fibers. In addition, live plugin enable/reload must
 * attach to agents already present in `ctx.agents.list()` as well as future `agent/created`.
 */
import type { Context } from '@deepseek-ai/cordis'

export interface DisposableFiber {
  dispose?: () => unknown
}

export interface AgentWithContext {
  readonly ctx: Context
}

export interface InjectEachAgentOptions<A extends AgentWithContext> {
  /** Optional predicate checked once per agent before opening an `agent.ctx.inject` fiber. */
  readonly filter?: (agent: A) => boolean
}

interface AgentRegistryLike<A> {
  list?(): readonly A[]
}

function disposeFiberSafely(fiber: DisposableFiber | undefined): void {
  if (typeof fiber?.dispose !== 'function') return
  try {
    const out = fiber.dispose()
    if (
      out !== null
      && (typeof out === 'object' || typeof out === 'function')
      && typeof (out as { catch?: unknown }).catch === 'function'
    ) {
      ;(out as Promise<unknown>).catch(() => {
        // intentional-fallback: async fiber teardown after scope close is best-effort
      })
    }
  } catch {
    // intentional-fallback: idempotent teardown when agent scope already unwound
  }
}

function readAgentRegistry<A>(ctx: Context): AgentRegistryLike<A> | undefined {
  const get = (ctx as unknown as { get?: (name: string) => unknown }).get
  if (typeof get === 'function') {
    return get.call(ctx, 'agents') as AgentRegistryLike<A> | undefined
  }
  return (ctx as unknown as { agents?: AgentRegistryLike<A> }).agents
}

/**
 * Install an `agent.ctx.inject(deps, ...)` fiber on every live and future agent,
 * tearing down cleanly on EITHER `agent/disposed` OR plugin `ctx` disposal.
 */
export function injectEachAgent<A extends AgentWithContext>(
  ctx: Context,
  deps: readonly string[],
  callback: (scope: Context, agent: A) => void,
  options: InjectEachAgentOptions<A> = {},
): () => void {
  const fibers = new Map<A, DisposableFiber | undefined>()
  let disposed = false

  const attach = (agent: A): void => {
    if (disposed || fibers.has(agent)) return
    if (options.filter !== undefined && !options.filter(agent)) return
    let fiber: DisposableFiber | undefined
    const rawInject = (agent.ctx as unknown as {
      inject: (names: readonly string[], fn: (scope: Context) => void) => DisposableFiber | undefined
    }).inject
    try {
      fiber = rawInject.call(agent.ctx, deps, (scope: Context) => {
        if (disposed) return
        callback(scope, agent)
      })
    } catch {
      // intentional-fallback: agent scope rejected registration because it is already closing
      return
    }
    fibers.set(agent, fiber)
  }

  const detach = (agent: A): void => {
    if (!fibers.has(agent)) return
    const fiber = fibers.get(agent)
    fibers.delete(agent)
    disposeFiberSafely(fiber)
  }

  const rawOn = (ctx as unknown as {
    on: (event: string, listener: (payload: { agent: A }) => void) => (() => void) | undefined
  }).on

  const offCreated = rawOn.call(ctx, 'agent/created', (payload: { agent: A }) => {
    attach(payload.agent)
  })

  const offDisposed = rawOn.call(ctx, 'agent/disposed', (payload: { agent: A }) => {
    detach(payload.agent)
  })

  const existing = readAgentRegistry<A>(ctx)?.list?.()
  if (existing !== undefined) {
    for (const agent of existing) attach(agent)
  } else {
    const inject = (ctx as unknown as { inject?: (names: readonly string[], fn: (scope: Context) => void) => unknown }).inject
    const effect = (ctx as unknown as { effect?: unknown }).effect
    if (typeof inject === 'function' && typeof effect === 'function') {
      inject.call(ctx, ['agents'], (scope: Context) => {
        if (disposed) return
        for (const agent of readAgentRegistry<A>(scope)?.list?.() ?? []) attach(agent)
      })
    }
  }

  const disposeAll = (): void => {
    if (disposed) return
    disposed = true
    offCreated?.()
    offDisposed?.()
    const active = [...fibers.values()]
    fibers.clear()
    for (const fiber of active) disposeFiberSafely(fiber)
  }

  const effect = (ctx as unknown as { effect?: (fn: () => () => void) => unknown }).effect
  if (typeof effect === 'function') {
    effect.call(ctx, () => () => { disposeAll() })
  }

  return disposeAll
}

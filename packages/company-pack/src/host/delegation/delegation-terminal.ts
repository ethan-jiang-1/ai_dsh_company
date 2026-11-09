/**
 * Host session projection: latest `turn/end` reason per session.
 *
 * 为什么不用 client 猜：`subagentTiming.lastTurnCompleted` 只有 boolean；要把
 * interrupted / aborted / refusal / max-tokens 在 UI 里说清，必须由 host 的
 * `turn/end.reason.kind` 折成投影。它是**只读观测**，不驱动任何调度。
 *
 * 注册是可选贡献：没有 sessionProjections 的测试 mock/旧宿主不挂，客户端按
 * absent=unknown 处理，不伪造终态。
 */
import type { Context } from '@deepseek-ai/cordis'
import { z } from 'zod'

export const DELEGATION_TERMINAL_KEY = 'companyDelegationTerminal'

interface TerminalState { lastTurnEnd?: string }
interface TurnEndLike { readonly type: string; readonly data?: { readonly reason?: { readonly kind?: string } } }

const stateSchema = z.object({ lastTurnEnd: z.string().optional() }).strict()
const viewSchema = z.object({ lastTurnEnd: z.string().optional() }).strict()

export const delegationTerminalDefinition = {
  key: DELEGATION_TERMINAL_KEY,
  stateSchema,
  init: (): TerminalState => ({}),
  apply: (state: TerminalState, event: TurnEndLike): TerminalState => {
    if (event.type !== 'turn/end') return state
    const kind = event.data?.reason?.kind
    return typeof kind === 'string' ? { lastTurnEnd: kind } : state
  },
  wire: {
    viewSchema,
    view: (state: TerminalState) => state.lastTurnEnd === undefined ? {} : { lastTurnEnd: state.lastTurnEnd },
  },
  stateVersion: 1,
} as const

/**
 * Register the read-only projection; effect-scoped and optional.
 * @param ctx - host context.
 */
export function registerDelegationTerminal(ctx: Context): void {
  if (typeof (ctx as unknown as { inject?: unknown }).inject !== 'function') return
  ctx.inject(['sessionProjections'], (scope) => {
    const registry = (scope as unknown as {
      readonly sessionProjections?: { register(definition: unknown): () => void }
    }).sessionProjections
    if (registry === undefined) return
    registry.register(delegationTerminalDefinition)
  })
}

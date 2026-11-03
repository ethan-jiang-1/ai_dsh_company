/**
 * 培养「背景」的客户端接线：会话/成品引用 → 可读背景源 + 「打开原文」动作。
 *
 * 2026-11-03 D2/D5：从 `client/index.ts` 抽出（原住 apply 闭包旁）。抽出后可 keyless 直测
 * 三条分支（会话在/不在、subagent parent、文件 stat 失败/抛错），不再靠 whole-client 间接覆盖。
 * 证明边界：不证 slot 注册与 remote 真装配（→ company-client-composition / ui-scene）。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  contextRowsFromStore,
  makeCultivationContextSources,
  type CultivationContextSources,
  type FollowLike,
} from './cultivation-context-data.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'
import { sessionFileAddress } from '../lib/deliverables-address.ts'

/** 背景读/开的最小结构面（两个注入块共用；预检与导航都在容器，领域视图不碰 RPC）。 */
export interface ContextWiringScoped {
  readonly sessions: {
    readonly list: {
      getSnapshot(): {
        readonly byId: Record<string, { readonly id: string }>
      }
    }
    subagentAddress(id: SessionId): unknown
  }
  readonly uiWorkspace: { openSession(target: unknown): void }
  readonly sidebarRight: { openResource(address: string): void }
  readonly remote: {
    readonly workspaceFiles: {
      stat(agentId: SessionId, path: string, signal: AbortSignal): Promise<{ readonly ok: boolean }>
    }
  }
}

/** 造背景源与「打开原文」（会话查 list/subagentAddress；文件先 stat 再开 file resource）。 */
export function makeContextWiring(
  scoped: ContextWiringScoped,
  leadOf: (sessionId: SessionId) => SessionId,
  rawFollow: FollowLike,
  readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>,
): {
  readonly contextSources: (sessionId: SessionId) => CultivationContextSources
  readonly openContext: (sessionId: SessionId, context: CultivationContext) => Promise<
    { readonly ok: true } | { readonly ok: false, readonly problem: string }
  >
} {
  const rows = (): ReturnType<typeof contextRowsFromStore> =>
    contextRowsFromStore(scoped.sessions.list.getSnapshot().byId as never)
  return {
    contextSources: () => makeCultivationContextSources({
      getSessions: rows,
      follow: rawFollow,
      readCatalog: (sessionId, signal) => readCatalog(sessionId as SessionId, signal),
    }),
    openContext: async (sessionId, context) => {
      try {
        if (context.kind === 'session') {
          const state = scoped.sessions.list.getSnapshot()
          const exists = state.byId[context.ref as SessionId] !== undefined
            || (context.parentSessionId !== undefined
              && scoped.sessions.subagentAddress(context.ref as SessionId) !== undefined)
          if (!exists) return { ok: false, problem: '这个会话现在打不开了（可能已删除）。' }
          const target = context.parentSessionId === undefined
            ? context.ref
            : { parentSessionId: context.parentSessionId, childSessionId: context.ref, mode: context.mode ?? 'unknown' }
          scoped.uiWorkspace.openSession(target)
          return { ok: true }
        }
        const lead = leadOf(sessionId)
        const stat = await scoped.remote.workspaceFiles.stat(lead, context.ref, new AbortController().signal)
        if (!stat.ok) return { ok: false, problem: '原文不在了（文件可能已归档/移动）。' }
        scoped.sidebarRight.openResource(sessionFileAddress(lead, context.ref))
        return { ok: true }
      } catch (error) {
        return { ok: false, problem: `打不开原文：${error instanceof Error ? error.message : String(error)}` }
      }
    },
  }
}

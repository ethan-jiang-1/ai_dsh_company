/**
 * 「打开成员」导航（2026-11-03 D2/D5 从 client/index 的 inject 闭包抽出）。
 *
 * lead → 直接打开 lead 会话；teammate 只在 mainView 仍 retain 时刷新后按 continuable child 打开。
 * 抽出的理由：原闭包 12% branch，三种现场（lead / teammate 未 retain / refresh 失败）没有 keyless 证据。
 * 证明边界：不证 slot 注册与 UI 呈现（→ company-client-composition / ui-scene）。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'

export interface OpenMemberSessions {
  retainInfo(sessionId: SessionId): { getSnapshot(): { readonly retainedBy: { readonly mainView?: number } } }
  refresh(): Promise<void>
}

export interface OpenMemberDeps {
  readonly sessions: OpenMemberSessions
  readonly uiWorkspace: { openSession(target: unknown): void }
  readonly leadOf: (sessionId: SessionId) => SessionId
}

export interface OpenMemberTarget {
  readonly id: string
  readonly role: 'lead' | 'teammate'
}

/** 造 `openMember(sessionId, member)`；lead 直接开，teammate 需 mainView 仍 retain。 */
export function makeOpenMember(deps: OpenMemberDeps): (sessionId: SessionId, member: OpenMemberTarget) => Promise<void> {
  return async (sessionId, member) => {
    const lead = deps.leadOf(sessionId)
    if (member.role === 'lead') {
      deps.uiWorkspace.openSession(lead)
      return
    }
    if ((deps.sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0) return
    await deps.sessions.refresh()
    deps.uiWorkspace.openSession({ parentSessionId: lead, childSessionId: member.id as SessionId, mode: 'continuable' })
  }
}

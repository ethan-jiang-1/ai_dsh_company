/**
 * 总部内嵌培养工坊会话登记簿（BUG-393）：
 * 用于识别正在 HQ 右半侧内嵌 `conversation.content` 运行的培养会话，
 * 使外围会话 Chrome（`HeroMotionOptions` / `MotionCommandDock` / `CommandScopeHint`）
 * 自动让位，不把顶层动议指挥带与 Hero 模板胶囊挤进窄内嵌框。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'

const embeddedWorkshopSessions = new Set<string>()

/** 登记/注销某个 HQ 内嵌培养工坊正在挂载的 sessionId。 */
export function registerEmbeddedWorkshopSession(sessionId: SessionId): () => void {
  const key = String(sessionId)
  embeddedWorkshopSessions.add(key)
  return () => {
    embeddedWorkshopSessions.delete(key)
  }
}

/** 判断某 sessionId 当前是否作为 HQ 内嵌培养工坊运行。 */
export function isEmbeddedWorkshopSession(sessionId: SessionId | undefined): boolean {
  if (sessionId === undefined) return false
  return embeddedWorkshopSessions.has(String(sessionId))
}

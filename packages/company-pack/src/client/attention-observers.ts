/**
 * 「待办」远端事件观察者（驾驶舱①）：把跨会话的 `user-questions/request` 与 `approval/request`
 * 登记进挂起项登记处，供页签轮询读取。
 *
 * 为什么单开一个模块（2026-10-27 R3-10）：这段逻辑原先内联在 client 入口的 `ctx.inject` 里，
 * 只有真 Web 会话才会执行——907 例 keyless 全绿，待办观察者一行没跑过。抽出纯注册函数后，
 * 可以用假 remote 断言三条真契约：**只登记不接管（永远 `next()` 委托）**、**按发起会话登记**、
 * **`next()` 结算后销账**（无论成功还是抛错）。
 *
 * ⚠ 观察者不是应答者：真应答走官方 ui-user-questions / ui-approval 的 waterfall；这里 `this` =
 * 事件归属 owner ctx，`scopeOf` 解出发起会话（同款 ui-approval 手法）。
 */
import type { AttentionRegistry } from './attention-registry.ts'

/** 远端事件面（只用到 $on；handler 的 this = 事件归属 owner）。 */
export interface AttentionRemote {
  readonly $on: (event: string, handler: (this: unknown, request: never, next: () => unknown) => unknown) => unknown
}

/** 会话服务面（只用到 scopeOf）。 */
export interface AttentionSessions {
  readonly scopeOf: (owner: unknown) => string | undefined
}

export interface AttentionObserverDeps {
  readonly remote: AttentionRemote
  readonly sessions: AttentionSessions
  readonly attention: AttentionRegistry
}

/** 注册两个观察者（幂等：每个 apply 闭包一份登记处，重复 apply 由宿主 fiber 卸载旧实例）。 */
export function registerAttentionObservers({ remote, sessions, attention }: AttentionObserverDeps): void {
  remote.$on('user-questions/request', function (this: unknown, request: unknown, next: () => unknown) {
    const sessionId = sessions.scopeOf(this)
    if (sessionId === undefined) return next()
    const questions = (request as { questions?: readonly { question?: unknown }[] }).questions ?? []
    const first = questions[0]
    const text = typeof first?.question === 'string' ? first.question.trim() : ''
    const done = attention.begin({
      kind: 'question',
      sessionId,
      what: text === '' ? '（问询内容缺失）' : text,
      since: Date.now(),
    })
    return (async () => { try { return await next() } finally { done() } })()
  })
  remote.$on('approval/request', function (this: unknown, request: unknown, next: () => unknown) {
    const sessionId = sessions.scopeOf(this)
    if (sessionId === undefined) return next()
    const approval = request as { readonly toolName?: unknown; readonly reason?: unknown }
    const toolName = typeof approval.toolName === 'string' ? approval.toolName : '（工具名缺失）'
    const reason = typeof approval.reason === 'string' ? approval.reason.trim() : ''
    const done = attention.begin({
      kind: 'approval',
      sessionId,
      what: reason === '' ? toolName : `${toolName}：${reason}`,
      since: Date.now(),
    })
    return (async () => { try { return await next() } finally { done() } })()
  })
}

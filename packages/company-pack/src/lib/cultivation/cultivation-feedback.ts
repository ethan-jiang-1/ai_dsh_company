/**
 * 培养面板 · 人的赞/踩读模型（feedback D1 读模型半边，2026-10-03；出厂 message-feedback 事件的
 * 消费面；2026-10-21 自 cultivation.ts 拆出——该文件曾五合一）。
 */

/** 一条赞/踩（wire item 的领域投影；字段面 = vendor itemSchema 的消费子集）。 */
export interface FeedbackItem {
  readonly messageId: string
  readonly rating: 'positive' | 'negative'
  readonly note?: string
  readonly updatedAt: number
}

/**
 * feedback 会话事件的结构型声明（wire 边界——结构读不信任，坏形状跳过）。
 * put 载荷 = { item }；delete 载荷 = { messageId }（vendor deleteSchema）。
 */
export type FeedbackEventLike =
  | { readonly type: 'feedback/message-put'; readonly data: { readonly item?: unknown } }
  | { readonly type: 'feedback/message-delete'; readonly data: { readonly messageId?: unknown } }

/**
 * wire 载荷的已验形状（isItemShape 收窄后的视图）：note 保持 unknown——消费侧再单独窄化
 * （typeof === 'string'），不把「校验过三字段」偷换 成「note 也验过」。
 */
type ItemShape = { readonly messageId: string, readonly rating: 'positive' | 'negative', readonly updatedAt: number, readonly note?: unknown }

const isItemShape = (value: unknown): value is ItemShape => {
  if (value === null || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.messageId === 'string' && item.messageId !== ''
    && (item.rating === 'positive' || item.rating === 'negative')
    && typeof item.updatedAt === 'number'
}

/**
 * 把会话事件流折成「本会话赞/踩」当前态：put 按 messageId **upsert**、delete 移除、
 * 按 updatedAt 倒序（最新在前）。非 feedback 事件与坏形状一律跳过（面板不撒谎也不崩）。
 * @param events - 会话事件（历史快照 + 其后实时追加，顺序喂入即可）。
 */
export function feedbackItems(events: readonly unknown[]): readonly FeedbackItem[] {
  const byId = new Map<string, FeedbackItem>()
  for (const event of events) {
    if (event === null || typeof event !== 'object') continue
    const e = event as FeedbackEventLike
    if (e.type === 'feedback/message-put') {
      const raw = e.data?.item
      if (isItemShape(raw)) {
        // wire → 领域形状的最小投影：只留消费面四字段（version/createdAt 等不透传）。
        const note = typeof raw.note === 'string' ? raw.note : undefined
        byId.set(raw.messageId, { messageId: raw.messageId, rating: raw.rating, ...(note !== undefined ? { note } : {}), updatedAt: raw.updatedAt })
      }
    } else if (e.type === 'feedback/message-delete') {
      if (typeof e.data?.messageId === 'string') byId.delete(e.data.messageId)
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

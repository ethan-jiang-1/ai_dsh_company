/**
 * 培养面板读模型（驾驶舱④切片四）：把各角色 journal 目录的清单与文件首段折成「待审收件箱」行。
 *
 * 数据面 = `remote.workspaceFiles`（list + read，浏览器经会话身份读自己工作区）——纯函数只消费
 * 调用方喂进来的清单与文本。**待审语义**：journal/ 里的条目即待审素材——手册「轮末收敛」规则
 *（人审后压进 CHARTER「历史纪要」、journal 只留当前轮）成立后天然准确；收敛未做时面板如实显示
 * 全部存量（46 篇 = 46 篇待审，不撒谎）。keyless 单测 = `tests/cultivation.spec.ts`。
 */

/** 五角色（与 preset roster 一致）。 */
export const CULTIVATION_ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'] as const

/** 角色显示名（与在场板同口径）。 */
const ROLE_LABELS: Readonly<Record<(typeof CULTIVATION_ROLES)[number], string>> = {
  ceo: 'CEO',
  'vp-eng': 'VP-Eng',
  'vp-sales': 'VP-Sales',
  coo: 'COO',
  cfo: 'CFO',
}

/** 一条 journal 待审条目。 */
export interface JournalEntry {
  readonly role: string
  /** 文件名（相对 journal/ 目录）。 */
  readonly name: string
  /** 一句话标题（文件首个标题或首行）。 */
  readonly title: string
}

/** 面板一行：一个角色的待审收件箱。 */
export interface CultivationRow {
  readonly role: string
  readonly label: string
  /** 待审条目总数。 */
  readonly count: number
  /** 预览条目（文件名倒序前 3 条；排序依据见 {@link inboxRows} 注）。 */
  readonly entries: readonly JournalEntry[]
}

/** 预览条数上限。 */
export const PREVIEW_LIMIT = 3

/** 标题截断上限。 */
const TITLE_CLIP = 60

/**
 * 从 journal 文本提取一句话标题：优先首个 `#`/`##` 标题行，退回首段首个非空行；截断到
 * {@link TITLE_CLIP} 字。空文本给「（空）」。
 */
export function journalTitle(text: string): string {
  const lines = text.split('\n')
  for (const line of lines) {
    const heading = /^#{1,3}\s+(.+)$/.exec(line.trim())
    if (heading !== null) {
      const title = heading[1]!.trim()
      if (title !== '') return clip(title)
    }
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed !== '') return clip(trimmed)
  }
  return '（空）'
}

function clip(text: string): string {
  return text.length <= TITLE_CLIP ? text : `${text.slice(0, TITLE_CLIP)}…`
}

/**
 * 折面板行。
 * @param listings - 每角色的 journal 文件名清单（只喂 `.md` 文件，目录由调用方过滤）。
 * @param firstText - 已读取文件的首段文本（未读的条目标题降级为文件名）。
 * @returns 每角色一行；清单缺角色给 0 条（面板如实显示"无待审"）。
 *
 * 排序注：listing 无 mtime，按**文件名倒序**近似"最新在前"——历史 journal 命名不定长，此排序
 * 在「记忆收敛」条目把命名钉成日期前缀后即精确（衔接留痕，见 RFC §切片四）。
 */
export function inboxRows(
  listings: Readonly<Record<string, readonly string[]>>,
  firstText: Readonly<Record<string, string>>,
): readonly CultivationRow[] {
  return CULTIVATION_ROLES.map(role => {
    const names = [...(listings[role] ?? [])].sort().reverse()
    const entries = names.slice(0, PREVIEW_LIMIT).map(name => ({
      role,
      name,
      title: firstText[`${role}/${name}`] !== undefined
        ? journalTitle(firstText[`${role}/${name}`]!)
        : name.replace(/\.md$/, ''),
    }))
    return {
      role,
      label: ROLE_LABELS[role] ?? role,
      count: names.length,
      entries,
    }
  })
}

// ── 人的赞/踩（feedback D1 读模型半边，2026-10-03；出厂 message-feedback 事件的消费面）──

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

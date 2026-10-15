/**
 * 培养面板读模型（驾驶舱④切片四）：把各角色 journal 目录的清单与文件首段折成「待审收件箱」行。
 *
 * 数据面 = `remote.workspaceFiles`（list + read，浏览器经会话身份读自己工作区）——纯函数只消费
 * 调用方喂进来的清单与文本。**待审语义**：journal/ 里的条目即待审素材——手册「轮末收敛」规则
 *（人审后压进 CHARTER「历史纪要」、journal 只留当前轮）成立后天然准确；收敛未做时面板如实显示
 * 全部存量（46 篇 = 46 篇待审，不撒谎）。keyless 单测 = `tests/company/cultivation.spec.ts`。
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

/** 角色 → 显示名（培养记录/面板共用；未知角色原样返回）。 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role as (typeof CULTIVATION_ROLES)[number]] ?? role
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
  /** 该角色 journal 目录是否可达（2026-10-13 培养卡 V2：不可达 ≠ 0 条）。 */
  readonly reach: 'ok' | 'unreachable'
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
 * @param listings - 每角色的 journal 文件名清单（只喂 `.md` 文件，目录由调用方过滤）；
 *   **null = 该角色目录不可达**（目录缺失/断流——行显示「不可达」，不是 0 条）。
 * @param firstText - 已读取文件的首段文本（未读的条目标题降级为文件名）。
 * @returns 每角色一行；清单缺角色给 0 条（面板如实显示"无待审"）。
 *
 * 排序注：listing 无 mtime，按**文件名倒序**近似"最新在前"——历史 journal 命名不定长，此排序
 * 在「记忆收敛」条目把命名钉成日期前缀后即精确（衔接留痕，见 RFC §切片四）。
 */
export function inboxRows(
  listings: Readonly<Record<string, readonly string[] | null>>,
  firstText: Readonly<Record<string, string>>,
): readonly CultivationRow[] {
  return CULTIVATION_ROLES.map(role => {
    const listing = listings[role]
    if (listing === null || listing === undefined) {
      return { role, label: roleLabel(role), count: 0, reach: 'unreachable' as const, entries: [] }
    }
    const names = [...listing].sort().reverse()
    const entries = names.slice(0, PREVIEW_LIMIT).map(name => ({
      role,
      name,
      title: firstText[`${role}/${name}`] !== undefined
        ? journalTitle(firstText[`${role}/${name}`]!)
        : name.replace(/\.md$/, ''),
    }))
    return {
      role,
      label: roleLabel(role),
      count: names.length,
      reach: 'ok' as const,
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

// ── 培养记录（2026-10-13 培养卡：本人教学 / 跨角色建议 / 采纳回执与验证）──
// 记录 = 公司盘 `cultivation/records/*.md`：frontmatter 扁平字段 + 正文（提案全文）。
// 手解析（逐行 `key: value`）——不把 yaml 解析器拉进浏览器包；字段集固定、值一律单行
// （{@link recordText} 写入侧已把换行压成空格）。正文事实仍留原家（KB/CHARTER/会话日志），
// 记录只存关系与决定——它不是第二份 KB（培养卡 §4）。

/** 一条培养记录（frontmatter 的领域投影）。 */
export interface CultivationRecord {
  /** 文件名去 `.md`（时间戳前缀 ⇒ 文件名倒序 ≈ 最新在前）。 */
  readonly id: string
  readonly kind: 'correction' | 'suggestion'
  /** 培养对象角色（建议由谁采纳）。 */
  readonly targetRole: string
  /** 提出者角色（preset id；人敲命令时 = 所在会话的角色）。 */
  readonly proposerRole: string
  /** 提出者是人（命令）还是分身（工具）。 */
  readonly proposerKind: 'human' | 'agent'
  /** 原始材料坐标（文件/会话引用；可缺席——正文里可再展开）。 */
  readonly source: string
  /** 期望行为一句话。 */
  readonly expectation: string
  readonly status: 'open' | 'adopted' | 'rejected'
  /** 采纳后部署进方法层的方法名（status=adopted 时在场）。 */
  readonly methodSlug?: string
  /** 拒绝理由（status=rejected 时在场）。 */
  readonly reason?: string
  /** 验证态（人判定后回填；缺席 = 未验证）。 */
  readonly verification?: 'pending' | 'pass' | 'fail'
  readonly decidedAt?: string
  /** 方法撤回时间（在场 = 方法已从方法层删除，新会话不再加载）。 */
  readonly revokedAt?: string
  /** 正文首句（收件箱预览标题）。 */
  readonly title: string
}

/** 记录 frontmatter 的可选透传字段（解析 → 领域形状）。 */
const OPTIONAL_FIELDS = ['methodSlug', 'reason', 'decidedAt', 'revokedAt'] as const

/** 一条新记录的写入面（status 恒为 open；采纳/拒绝由 host 侧改写）。 */
export interface RecordDraft {
  readonly kind: 'correction' | 'suggestion'
  readonly targetRole: string
  readonly proposerRole: string
  readonly proposerKind: 'human' | 'agent'
  readonly source: string
  readonly expectation: string
  readonly body: string
}

/** 单行化（frontmatter 值不许换行；换行压成空格）。 */
const oneLine = (text: string): string => text.replaceAll('\n', ' ').trim()

/**
 * 造一条新记录的全文（host 工具与命令共用；keyless spec 做往返）。
 * 正文保持原样（多行提案全文）。
 */
export function recordText(draft: RecordDraft): string {
  return [
    '---',
    `kind: ${draft.kind}`,
    `targetRole: ${oneLine(draft.targetRole)}`,
    `proposerRole: ${oneLine(draft.proposerRole)}`,
    `proposerKind: ${oneLine(draft.proposerKind)}`,
    `source: ${oneLine(draft.source)}`,
    `expectation: ${oneLine(draft.expectation)}`,
    'status: open',
    '---',
    '',
    draft.body.trim(),
    '',
  ].join('\n')
}

/**
 * 解析一条培养记录。坏形状（无 frontmatter / 枚举外值 / 缺必填）给 null——
 * 收件箱不撒谎也不崩（wire 边界不信任，同 {@link feedbackItems} 纪律）。
 */
function recordFrontmatter(text: string): { readonly fields: Map<string, string>, readonly body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (match === null) return null
  const fields = new Map<string, string>()
  for (const line of match[1]!.split('\n')) {
    const field = /^([a-zA-Z]+):\s*(.*)$/.exec(line)
    if (field !== null) fields.set(field[1]!, field[2]!.trim())
  }
  return { fields, body: text.slice(match[0].length) }
}

/** Return the persisted proposal body without exposing it in the Client record view. */
export function recordBody(text: string): string | null {
  return recordFrontmatter(text)?.body ?? null
}

export function parseRecord(id: string, text: string): CultivationRecord | null {
  const parsed = recordFrontmatter(text)
  if (parsed === null) return null
  const { fields } = parsed
  const kind = fields.get('kind')
  const targetRole = fields.get('targetRole')
  const proposerRole = fields.get('proposerRole')
  const proposerKind = fields.get('proposerKind')
  const expectation = fields.get('expectation')
  if (kind !== 'correction' && kind !== 'suggestion') return null
  if (targetRole === undefined || targetRole === '' || proposerRole === undefined || proposerRole === '') return null
  if (proposerKind !== 'human' && proposerKind !== 'agent') return null
  if (expectation === undefined || expectation === '') return null
  const status = fields.get('status') ?? 'open'
  if (status !== 'open' && status !== 'adopted' && status !== 'rejected') return null
  const verification = fields.get('verification')
  if (verification !== undefined && verification !== 'pending' && verification !== 'pass' && verification !== 'fail') return null
  const body = parsed.body
  // 可选字段先聚成普通对象再收窄成领域形状（避免对 readonly 接口的索引签名强转）。
  const loose: Record<string, unknown> = {
    id,
    kind,
    targetRole,
    proposerRole,
    proposerKind,
    source: fields.get('source') ?? '（会话内提交）',
    expectation,
    status,
    title: journalTitle(body),
  }
  for (const key of OPTIONAL_FIELDS) {
    const value = fields.get(key)
    if (value !== undefined && value !== '') loose[key] = value
  }
  if (verification !== undefined) loose.verification = verification
  return loose as unknown as CultivationRecord
}

/** 按目标角色分箱后的收件箱（培养卡 V7：归属过滤 + 回执）。 */
export interface RecordInbox {
  /** 待我决策：open 且目标是我（跨角色建议进我屋也算）。 */
  readonly needsDecision: readonly CultivationRecord[]
  /** 我提交的（全部状态——被采纳/被拒绝的带回执）。 */
  readonly mine: readonly CultivationRecord[]
  /** 我的分身已采纳的方法（新会话生效；含撤回标记）。 */
  readonly adoptedForViewer: readonly CultivationRecord[]
  /** 我已处理（目标是我、已拒绝——理由留档，提出者另在「我提交的」见回执）。 */
  readonly processedForViewer: readonly CultivationRecord[]
}

/**
 * 把记录折成 viewer 的收件箱。保持输入顺序（调用方按 id 倒序喂 = 最新在前）；
 * viewer 缺席（未选角色）→ 四个箱全空，不猜身份。
 */
export function recordInbox(records: readonly CultivationRecord[], viewerRole: string): RecordInbox {
  const viewer = viewerRole.trim()
  if (viewer === '') return { needsDecision: [], mine: [], adoptedForViewer: [], processedForViewer: [] }
  const needsDecision: CultivationRecord[] = []
  const mine: CultivationRecord[] = []
  const adoptedForViewer: CultivationRecord[] = []
  const processedForViewer: CultivationRecord[] = []
  for (const record of records) {
    if (record.status === 'open' && record.targetRole === viewer) needsDecision.push(record)
    if (record.proposerRole === viewer) mine.push(record)
    if (record.status === 'adopted' && record.targetRole === viewer) adoptedForViewer.push(record)
    if (record.status === 'rejected' && record.targetRole === viewer) processedForViewer.push(record)
  }
  return { needsDecision, mine, adoptedForViewer, processedForViewer }
}

/**
 * 造部署进方法层的 SKILL.md（host adopt 命令写入；skill-filesystem 发现必需
 * name/description frontmatter）。正文只写方法论（D17）——来源与验证留记录，不进方法文件。
 */
export function methodSkillText(input: { readonly slug: string; readonly expectation: string; readonly body: string }): string {
  return [
    '---',
    `name: ${input.slug}`,
    `description: ${oneLine(input.expectation)}`,
    '---',
    '',
    `# ${input.slug}`,
    '',
    input.body.trim(),
    '',
  ].join('\n')
}

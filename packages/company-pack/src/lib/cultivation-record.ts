/**
 * 培养面板 · 培养记录读模型（2026-10-13 培养卡：本人教学 / 跨角色建议 / 采纳回执与验证；
 * 2026-10-21 自 cultivation.ts 拆出——该文件曾五合一）。
 *
 * 记录 = 公司盘 `cultivation/records/*.md`：frontmatter 扁平字段 + 正文（提案全文）。
 * 手解析（逐行 `key: value`）——不把 yaml 解析器拉进浏览器包；字段集固定、值一律单行
 * （{@link recordText} 写入侧已把换行压成空格）。正文事实仍留原家（KB/CHARTER/会话日志），
 * 记录只存关系与决定——它不是第二份 KB（培养卡 §4）。
 */

import { journalTitle } from './cultivation-inbox.ts'

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
  /**
   * 提案正文（做法与证据全文，trim 后）。
   * 2026-10-17 修订（培养 GUI 卡 S4）：原先**刻意不暴露给客户端**（人只看得到首句 `title`），
   * 结果是人只能盲判。判断必须先有材料 ⇒ 正文进客户端读模型、面板就地展开。
   */
  readonly body: string
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
 * 收件箱不撒谎也不崩（wire 边界不信任）。
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

/**
 * 取记录正文（原文，未 trim）。
 * host 侧部署方法用原文；客户端读模型另走 {@link parseRecord} 的 `body`（trim 后）。
 */
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
    body: body.trim(),
  }
  for (const key of OPTIONAL_FIELDS) {
    const value = fields.get(key)
    if (value !== undefined && value !== '') loose[key] = value
  }
  if (verification !== undefined) loose.verification = verification
  return loose as unknown as CultivationRecord
}

/**
 * 从记录 id 里取提出时间（真实记录 id = `<YYYYMMDD>-<HHMMSS>-<4位随机>`，**本地时区**，
 * 与 host 的 `newRecordId` 同口径）。非该形状（如测试/手写 id）给 null——不猜时间。
 * @param id - 记录 id（文件名去 `.md`）。
 * @returns epoch 毫秒；形状不符给 null。
 */
export function recordStampOf(id: string): number | null {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-/.exec(id)
  if (match === null) return null
  const [, y, mo, d, h, mi, s] = match
  const at = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).getTime()
  return Number.isNaN(at) ? null : at
}

/**
 * 时间的人话标签（新到旧：刚刚 / N 分钟前 / N 小时前 / 昨天 HH:MM / MM-DD HH:MM / YYYY-MM-DD HH:MM）。
 * 为什么要它：面板此前**完全没有时间信息**（场景轮 S9 实测），人分不清谁新谁旧、该先处理哪条。
 * @param at - epoch 毫秒。
 * @param now - 当前时间（epoch 毫秒；注入以便测试）。
 * @returns 人话标签。
 */
export function timeLabel(at: number, now: number): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  const date = new Date(at)
  const hhmm = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const delta = now - at
  if (delta < 60_000) return '刚刚'
  if (delta < 3_600_000) return `${String(Math.floor(delta / 60_000))} 分钟前`
  if (delta < 86_400_000) return `${String(Math.floor(delta / 3_600_000))} 小时前`
  const today = new Date(now)
  const sameDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const yesterday = new Date(now - 86_400_000)
  if (sameDay(date, yesterday)) return `昨天 ${hhmm}`
  const md = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return date.getFullYear() === today.getFullYear() ? `${md} ${hhmm}` : `${String(date.getFullYear())}-${md} ${hhmm}`
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

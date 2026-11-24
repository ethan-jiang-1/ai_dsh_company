/**
 * 培养面板 · 培养记录读模型（2026-10-13 培养卡：本人教学 / 跨角色建议 / 采纳回执与验证；
 * 2026-10-21 自 cultivation.ts 拆出——该文件曾五合一）。
 *
 * 记录 = 公司盘 `cultivation/records/*.md`：frontmatter 扁平字段 + 正文（提案全文）。
 * 手解析（逐行 `key: value`）——不把 yaml 解析器拉进浏览器包；字段集固定、值一律单行
 * （{@link recordText} 写入侧已把换行压成空格）。正文事实仍留原家（KB/CHARTER/会话日志），
 * 记录只存关系与决定——它不是第二份 KB（培养卡 §4）。
 */

import { parseContextPayload, contextPayloadText, type CultivationContext } from './cultivation-context.ts'
import { journalTitle } from './cultivation-inbox.ts'

/** 来源为“会话内提交”的落盘标记（host 按当前语言写中/英文，读侧统一识别）。 */
const IN_SESSION_SOURCES = new Set(['（会话内提交）', '(submitted in-session)'])

/** 判断记录来源是否属于“会话内提交”占位。 */
export function isInSessionSource(source: string): boolean {
  return IN_SESSION_SOURCES.has(source)
}

const SUBMITTED_RECORD_ID_RE = /(?:已提交培养记录|Submitted cultivation record)\s+(\S+)/

/** 从 host `/cultivation` 提交回执里提取新记录 id；提取不到返回 null。 */
export function extractSubmittedRecordId(text: string): string | null {
  const match = SUBMITTED_RECORD_ID_RE.exec(text)
  return match?.[1] ?? null
}

/** 一次培养记录（frontmatter 的领域投影）。 */
export interface CultivationVerification {
  readonly outcome: 'pass' | 'fail'
  readonly evidence: string
  readonly at: string
}

export interface CultivationRecord {
  /** 文件名去 `.md`（时间戳前缀 ⇒ 文件名倒序 ≈ 最新在前）。 */
  readonly id: string
  /** 记录格式版本；旧记录缺字段按 1 读（2026-10-28 数据卡 v2：记录也要可迁移）。 */
  readonly schema?: number
  readonly kind: 'correction' | 'suggestion'
  /** 培养对象角色（建议由谁采纳）。 */
  readonly targetRole: string
  /** 提出者角色（preset id；人敲命令时 = 所在会话的角色）。 */
  readonly proposerRole: string
  /** 提出者是人（命令）还是分身（工具）。 */
  readonly proposerKind: 'human' | 'agent'
  /** 原始材料坐标（文件/会话引用；可缺席——正文里可再展开）。 */
  readonly source: string
  /** 这次什么工作 / 想改善什么（2026-10-30 工作优先切片；旧记录缺席）。 */
  readonly work?: string
  /** 期望行为一句话。 */
  readonly expectation: string
  readonly status: 'open' | 'adopted' | 'rejected'
  /** 采纳后部署进方法层的方法名（status=adopted 时在场）。 */
  readonly methodSlug?: string
  /** 拒绝理由（status=rejected 时在场）。 */
  readonly reason?: string
  /** 验证态（人判定后回填；缺席 = 未验证）。 */
  readonly verification?: 'pending' | 'pass' | 'fail'
  /** 每次验证对应的一条后续工作证据；旧记录缺席时按空历史读取。 */
  readonly verificationHistory?: readonly CultivationVerification[]
  /** 坏历史单独告警，主培养记录仍保留。 */
  /** 验证历史损坏代号（`corrupt`）；人话在 client 字典。 */
  readonly verificationHistoryProblem?: string | null
  readonly decidedAt?: string
  /** 方法撤回时间（在场 = 方法已从方法层删除，新会话不再加载）。 */
  readonly revokedAt?: string
  /** 正文首句（收件箱预览标题）。 */
  readonly title: string
  /** 正文是否只加载了摘要（面板分段读；true = 展开也不是全文）。 */
  readonly bodyTruncated?: boolean
  /**
   * 提案正文（做法与证据全文，trim 后）。
   * 2026-10-17 修订（培养 GUI 卡 S4）：原先**刻意不暴露给客户端**（人只看得到首句 `title`），
   * 结果是人只能盲判。判断必须先有材料 ⇒ 正文进客户端读模型、面板就地展开。
   */
  readonly body: string
  /** 自包含背景（2026-10-23 背景卡 D1=A；host 读后写）。旧记录缺席 = `[]`。 */
  readonly contexts?: readonly CultivationContext[]
  /** `contexts` 坏形状时的可读原因；记录本身仍显示。 */
  /** 背景负载损坏代号（`corrupt`）；人话在 client 字典。 */
  readonly contextProblem?: string | null
}

/** 记录 frontmatter 的可选透传字段（解析 → 领域形状）。 */
const OPTIONAL_FIELDS = ['work', 'methodSlug', 'reason', 'decidedAt', 'revokedAt'] as const

export const WORK_TEXT_LIMIT = 2_000
export const VERIFICATION_HISTORY_LIMIT = 20
export const VERIFICATION_EVIDENCE_LIMIT = 1_000

export function encodeVerificationHistory(history: readonly CultivationVerification[]): string {
  return encodeURIComponent(JSON.stringify(history))
}

function parseVerificationHistory(raw: string | undefined): readonly CultivationVerification[] | null {
  if (raw === undefined || raw === '') return []
  try {
    const decoded: unknown = JSON.parse(decodeURIComponent(raw))
    if (!Array.isArray(decoded) || decoded.length > VERIFICATION_HISTORY_LIMIT) return null
    const history: CultivationVerification[] = []
    for (const item of decoded) {
      if (item === null || typeof item !== 'object') return null
      const entry = item as Record<string, unknown>
      if ((entry.outcome !== 'pass' && entry.outcome !== 'fail')
        || typeof entry.evidence !== 'string' || entry.evidence.trim() === ''
        || entry.evidence.length > VERIFICATION_EVIDENCE_LIMIT
        || typeof entry.at !== 'string' || Number.isNaN(Date.parse(entry.at))) return null
      history.push({ outcome: entry.outcome, evidence: entry.evidence, at: entry.at })
    }
    return history
  } catch {
    return null
  }
}

/** 当前培养记录格式版本；旧记录缺 `schema` 按本版读。 */
export const RECORD_SCHEMA = 1

/** 一条新记录的写入面（status 恒为 open；采纳/拒绝由 host 侧改写）。 */
export interface RecordDraft {
  readonly kind: 'correction' | 'suggestion'
  readonly targetRole: string
  readonly proposerRole: string
  readonly proposerKind: 'human' | 'agent'
  readonly source: string
  /** 这次什么工作 / 想改善什么；缺席 = 旧表单/旧记录。 */
  readonly work?: string
  readonly expectation: string
  readonly body: string
  /** 背景（host 读后填；缺席 = 不写 `contexts` 字段）。 */
  readonly contexts?: readonly CultivationContext[]
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
    `schema: ${String(RECORD_SCHEMA)}`,
    `kind: ${draft.kind}`,
    `targetRole: ${oneLine(draft.targetRole)}`,
    `proposerRole: ${oneLine(draft.proposerRole)}`,
    `proposerKind: ${oneLine(draft.proposerKind)}`,
    `source: ${oneLine(draft.source)}`,
    ...(draft.work === undefined || draft.work.trim() === '' ? [] : [`work: ${oneLine(draft.work)}`]),
    `expectation: ${oneLine(draft.expectation)}`,
    'status: open',
    ...(draft.contexts === undefined || draft.contexts.length === 0
      ? []
      : [`contexts: ${contextPayloadText(draft.contexts)}`]),
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
  const schemaRaw = fields.get('schema')
  const schema = schemaRaw === undefined ? RECORD_SCHEMA : Number(schemaRaw)
  if (!Number.isSafeInteger(schema) || schema < 1) return null
  const verification = fields.get('verification')
  if (verification !== undefined && verification !== 'pending' && verification !== 'pass' && verification !== 'fail') return null
  const verificationHistory = parseVerificationHistory(fields.get('verificationHistory'))
  // 只给代号，不产出人话：翻译在 client 字典（BUG-334，R2 棘轮也要能收）。
  const verificationHistoryProblem = verificationHistory === null ? 'corrupt' : null
  const body = parsed.body
  const contextRead = parseContextPayload(fields.get('contexts'))
  // 可选字段先聚成普通对象再收窄成领域形状（避免对 readonly 接口的索引签名强转）。
  const loose: Record<string, unknown> = {
    id,
    schema,
    kind,
    targetRole,
    proposerRole,
    proposerKind,
    source: fields.get('source') ?? '',
    expectation,
    status,
    title: journalTitle(body),
    body: body.trim(),
    contexts: contextRead.contexts,
    // 同上：记录侧只记「背景坏了」，命令/选择器那条路仍有可读 reason。
    contextProblem: contextRead.problem === null ? null : 'corrupt',
    verificationHistory: verificationHistory ?? [],
    verificationHistoryProblem,
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
  const parts = [Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s)] as const
  const date = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5])
  const at = date.getTime()
  if (Number.isNaN(at)) return null
  // 往返校验（BUG-378）：`new Date` 会把 00 月/13 月/61 日进位成合法时间，
  // 只有回读分量全部相等才是真实存在的本地时间戳（与 isCalendarDate 同思路）。
  const roundTrip = date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1
    && date.getDate() === parts[2] && date.getHours() === parts[3]
    && date.getMinutes() === parts[4] && date.getSeconds() === parts[5]
  return roundTrip ? at : null
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
  /**
   * 我已处理（目标是我、已拒绝——理由留档）。
   * **不含自己提的**：自己的记录已经在 `mine` 里带回执，两处都放会让同一行出现两次（BUG-309）。
   */
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
    // 自己提自己拒的记录：只在 `mine` 里出现（带「已拒绝」回执），不再进 processedForViewer。
    if (record.status === 'rejected' && record.targetRole === viewer && record.proposerRole !== viewer) processedForViewer.push(record)
  }
  return { needsDecision, mine, adoptedForViewer, processedForViewer }
}

/**
 * 造部署进方法层的 SKILL.md（host adopt 命令写入；skill-filesystem 发现必需
 * name/description frontmatter）。正文只写方法论（D17）——来源与验证留记录，不进方法文件。
 */
export function methodSkillText(input: { readonly slug: string; readonly expectation: string; readonly body: string }): string {
  // BUG-351：description 是任意用户文本，必须按 YAML 标量编码——JSON.stringify 产出合法的
  // YAML 双引号标量（`: `/`[`/`*`/引号/纯数字都不再改语义），否则 DSH 会静默丢弃整份技能。
  const description = JSON.stringify(oneLine(input.expectation))
  return [
    '---',
    `name: ${input.slug}`,
    `description: ${description}`,
    '---',
    '',
    `# ${input.slug}`,
    '',
    input.body.trim() === '' ? oneLine(input.expectation) : input.body.trim(),
    '',
  ].join('\n')
}

/**
 * 落盘前自检（BUG-351）：确认生成的 `SKILL.md` frontmatter 只有 name/description 且
 * description 能逐字还原期望行为。返回 null = 自洽；否则给原因代号（host 负责按语言说人话）。
 * @param text - `methodSkillText` 的产物。
 * @param slug - 期望的方法 slug。
 * @param expectation - 期望行为原文。
 * @returns 问题代号（`frontmatter-shape` / `name-mismatch` / `description-mismatch`）或 null。
 */
export function methodSkillProblem(text: string, slug: string, expectation: string): string | null {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text)
  if (match === null) return 'frontmatter-shape'
  const lines = (match[1] ?? '').split('\n')
  const nameLine = lines.find(line => line.startsWith('name:'))
  const descriptionLine = lines.find(line => line.startsWith('description:'))
  if (lines.length !== 2 || nameLine === undefined || descriptionLine === undefined) return 'frontmatter-shape'
  if (nameLine.slice('name:'.length).trim() !== slug) return 'name-mismatch'
  const raw = descriptionLine.slice('description:'.length).trim()
  let decoded: unknown
  try { decoded = JSON.parse(raw) } catch { return 'description-mismatch' }
  return decoded === oneLine(expectation) ? null : 'description-mismatch'
}

/**
 * 采纳/拒绝时间的人话（BUG-300）：host 把 `decidedAt` 写成完整 ISO（审计需要精确值），
 * 但正文里给用户看的是「1 小时前」这种相对时间——同一个面板不能有两种时间口径。
 * @param iso - ISO 时间串（host 写入）。
 * @param now - 当前时刻（epoch ms；判据注入以求稳定，缺省 = 现在）。
 * @returns 相对时间；解析失败时原样返回（不编时间、也不吞掉值）。
 */
export function decidedAtLabel(iso: string, now: number = Date.now()): string {
  const at = Date.parse(iso)
  return Number.isNaN(at) ? iso : timeLabel(at, now)
}

/** 时间的人话**片段**（不含语言）：给多语言渲染层用，避免表达层把中文写死（BUG-302）。 */
export type TimeParts =
  | { readonly kind: 'just-now' }
  | { readonly kind: 'minutes', readonly n: number }
  | { readonly kind: 'hours', readonly n: number }
  | { readonly kind: 'yesterday', readonly hhmm: string }
  | { readonly kind: 'date', readonly text: string }
  /** 非法时间（`NaN`/`Infinity`）：调用方不得渲染出 `NaN-NaN-NaN`（BUG-335）。 */
  | { readonly kind: 'invalid' }

/**
 * 相对时间 → 片段（`timeLabel` 的中文只是其中一种渲染，不再是唯一出口）。
 * @param at - 目标时刻（epoch ms）。
 * @param now - 当前时刻。
 * @returns 结构片段（调用方按语言渲染）。
 */
export function timeParts(at: number, now: number): TimeParts {
  // 非法时间不编造日期：`new Date(NaN)` 的 getter 全是 NaN，直出会渲染成 `NaN-NaN-NaN`（BUG-335）。
  if (!Number.isFinite(at) || !Number.isFinite(now)) return { kind: 'invalid' }
  const pad = (n: number): string => String(n).padStart(2, '0')
  const date = new Date(at)
  const hhmm = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const delta = now - at
  if (delta < 60_000) return { kind: 'just-now' }
  if (delta < 3_600_000) return { kind: 'minutes', n: Math.floor(delta / 60_000) }
  if (delta < 86_400_000) return { kind: 'hours', n: Math.floor(delta / 3_600_000) }
  const today = new Date(now)
  const sameDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(date, new Date(now - 86_400_000))) return { kind: 'yesterday', hhmm }
  const md = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return { kind: 'date', text: date.getFullYear() === today.getFullYear() ? `${md} ${hhmm}` : `${String(date.getFullYear())}-${md} ${hhmm}` }
}

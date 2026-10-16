// 交付物判据的**形状与身份**基座（R4「成品流程」轮；2026-10-16 第三轮结构收敛按
// 「形状与身份 / 声明对账」自原 deliverables.mjs 拆出）。
//
// 本文件管：一份交付物是什么（`deliverableId` 的身份解析，认新形状与平铺旧形状）、
// 住在盘上哪（活跃根 / 归档根 / drafts / sources / sources 子目录）、形状合不合法
// （`classifyDeliverable`）、meta.md 的行形状与词表（`parseMeta` / `validateMeta`）、
// 占位/让位首行判定，以及观察项与 meta 词表（`WARNING` / `META_TYPES` / `META_RESULTS`）。
// **会话声明与盘上对账**（`auditDeliverables`、`parseSessionLog`、`presentResultRows`、
// `VIOLATION`）住 ./deliverables-audit.mjs，依赖方向单向：audit → 本文件，本文件不反向 import。
//
// 本模块**不做 I/O**、不读文件系统：调用方把"工作区文件清单"喂进来——分层纪律见
// `docs/guides/dev-loop.md` §9.1。
import { COMPANY_ROLE_IDS } from './company-roles.mjs'

/** 成品文件名与过程稿目录名（三态的字面约定）。 */
export const FINAL_BASENAME = 'final.md'
export const DRAFTS_DIRNAME = 'drafts'
export const SOURCES_DIRNAME = 'sources'

/** 活跃根与归档根（C1，2026-10-03 拍板：收敛件整目录 git mv 进归档家，判据跟随扩根——T-11 处置 = 跟随扩根）。 */
export const ACTIVE_ROOT = 'deliverables/'
export const ARCHIVE_ROOT = 'deliverables-archive/'

/** 话题目录名的日期前缀（A1 命名：`<kickoff 日期>-<slug>`）；slug = 剥前缀。 */
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/

/** 话题目录名 → slug（剥日期前缀；无前缀原样返回）。 */
export function slugFromDirName(dirName) {
  return dirName.replace(DATE_PREFIX, '')
}

/** 平铺旧形状里表达"这份就是定稿"的后缀（R2 用过 `reconcile-package-final.md`）。 */
const LEGACY_FINAL_SUFFIX = '-final'

/**
 * **观察项**（不是违规，不影响退出码）：值得每次提醒、但不该判红的信号。
 * 为什么要有这一档（2026-09-26）：slug 撞车在本仓**已经发生过**（renewal-y-2026 两场动议共用），
 * 判红会让门禁永久带伤；但它的真实代价（产物互相覆盖、判据看不出）值得每次都摆到人眼前。
 */
export const WARNING = {
  /** 同一 slug 的成品被**多个 Lead 会话**声明过 ⇒ 产物互相覆盖。 */
  SLUG_COLLISION: 'slug-collision',
  /** 盘上有 `deliverables/<slug>/` 但动议台账没有该行（跑完到轮末收敛之间的正常态，也含真漏登）。 */
  SLUG_UNLEDGERED: 'slug-unledgered',
  /** 开场占位抢注登记（R0-2）：`drafts/<role>.md` 首行「占位=认领，非出稿」= 机器可查的认领面。 */
  PLACEHOLDER_CLAIMS: 'placeholder-claims',
  /** 成品在盘上但同 slug 没有 meta.md（T-9：绕过一切新检查、从生成台账消失的入口）。 */
  FINAL_WITHOUT_META: 'final-without-meta',
  /** meta 的「结果」留空（存量迁移回填态；收敛时维护者回填）。 */
  META_RESULT_PENDING: 'meta-result-pending',
  /** meta.kickoff 与台账日期列不一致（两笔账对不上——B4 一致性门禁的观察半边）。 */
  META_LEDGER_MISMATCH: 'meta-ledger-mismatch',
  /**
   * 非 Lead 会话 present 了**过程稿**（BUG-003，2026-10-06 多人 UX 猎捕立）。
   * 观察档（不判违规）：单操作者语境下「非 Lead 的 present = 过程稿可见化」是当时的**有意容忍**
   * （见 auditDeliverables 声明面注释）；多人形态把容忍作废——每扇门后是**不同的人**，present 的
   * vendor 语义 = "Declare existing files as final deliverables"，非 Lead 直呈即绕过成品专属性。
   * 历史行为不追溯红（观察项每次提醒），成品侧越权仍是既有违规（两档并存不互吞）。
   */
  DRAFT_PRESENTED_BY_NON_LEAD: 'draft-presented-by-non-lead',
  /**
   * 成品没有 present 背书，但**调用方声明这段时期拿不到会话日志** ⇒ 证据不可考、不判红
   * （BUG-019，2026-10-16）。与 `VIOLATION.FINAL_NOT_PRESENTED` 的分工：那条是「**有**证据而
   * 证据里没有声明」，这条是「**没有**证据可查」。只有调用方显式给 `evidenceMissingBefore` 才可能
   * 出现——不声明则维持严格判红（**没证据 ≠ 没问题**）。
   */
  PRESENT_EVIDENCE_MISSING: 'present-evidence-missing',
}

/** 占位抢注的首行形状（R0-2，2026-10-03；「一字不差」是机器可查的前提，合同家 = multi-human.md §3 纪律 5）。 */
export const PLACEHOLDER_CLAIM_LINE = '占位=认领，非出稿'

/** 判一份稿是不是占位抢注稿：首个非空行（去首尾空白）恰好是占位首行。 */
export function isPlaceholderClaim(body) {
  const first = body.split('\n').find(line => line.trim() !== '')
  return first !== undefined && first.trim() === PLACEHOLDER_CLAIM_LINE
}

/**
 * 让位的首行形状（BUG-004 修复轮，2026-10-06；合同家 = 公司手册「写盘守卫」行——
 * 占位后重读同组对手文件，让位时把首行改写为本行；持认判定 = 占位 ∧ ¬让位）。
 */
export const PLACEHOLDER_YIELD_LINE = '让位=认领撤销，非出稿'

/** 判一份稿是不是让位稿：首个非空行恰好是让位首行（与占位靠首行互斥区分）。 */
export function isPlaceholderYield(body) {
  const first = body.split('\n').find(line => line.trim() !== '')
  return first !== undefined && first.trim() === PLACEHOLDER_YIELD_LINE
}



/** 动议分型（决策点③：先分型再定词——试金 22 话题全覆盖的四型）。 */
export const META_TYPES = ['决策', '生产', '诊断', '口径问答']
/** 决议结果枚举（跨型共用；单值装不下的历史由「落地事件」多行字段承载）。 */
export const META_RESULTS = ['进行中', '已采纳', '已否决', '已搁置', '已废弃', '判不了', '已完成']

/**
 * 解析 meta.md 全文：`字段: 值` 行进 fields（取首现），`落地事件:` 行逐条进 events（多值）。
 * 不认形状的行忽略——校验交给 {@link validateMeta}，解析不抛。
 */
export function parseMeta(body) {
  const fields = new Map()
  const events = []
  for (const line of body.split('\n')) {
    const m = /^([\w一-鿿]+)\s*[:：]\s*(.*)$/.exec(line.trim())
    if (m === null) continue
    if (m[1] === '落地事件') { if (m[2].trim() !== '') events.push(m[2].trim()); continue }
    if (!fields.has(m[1])) fields.set(m[1], m[2].trim())
  }
  return { fields, events }
}

/**
 * 校验 meta.md 形状（机器可查的字段面；缺行/枚举外/日期格式不对 = 红，走 `META_SHAPE_BAD`）。
 * 「结果」行允许**留空**（存量迁移的回填态）——留空归观察（`META_RESULT_PENDING`），不判红。
 */
export function validateMeta(body) {
  const { fields } = parseMeta(body)
  const problems = []
  for (const key of ['slug', 'kickoff', '类型', '结果']) {
    if (!fields.has(key)) problems.push(`缺行「${key}:」`)
  }
  if (fields.has('kickoff') && !/^\d{4}-\d{2}-\d{2}$/.test(fields.get('kickoff'))) {
    problems.push(`kickoff 不是 YYYY-MM-DD：「${fields.get('kickoff')}」`)
  }
  if (fields.has('类型') && fields.get('类型') !== '' && !META_TYPES.includes(fields.get('类型'))) {
    problems.push(`类型不在词表 ${JSON.stringify(META_TYPES)}：「${fields.get('类型')}」`)
  }
  if (fields.has('结果') && fields.get('结果') !== '' && !META_RESULTS.includes(fields.get('结果'))) {
    problems.push(`结果不在词表 ${JSON.stringify(META_RESULTS)}：「${fields.get('结果')}」`)
  }
  if (fields.has('slug') && /\d{4}-\d{2}-\d{2}-/.test(fields.get('slug'))) {
    problems.push('slug 字段写剥前缀形式（不带日期前缀——日期住 kickoff 字段）')
  }
  return { ok: problems.length === 0, problems, fields }
}

/** 把路径归一成工作区相对的正斜杠形式，便于两侧比较。 */
export function normalizeRel(path) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/')
}

/**
 * 解析一份交付物的身份：`{ slug, kind, role? }`，`kind` ∈ `final` / `draft`。
 * 同时认新形状与平铺旧形状——因为 **`present` 事件里的路径永远是历史形状的**，
 * 而盘上文件可能是迁移后的新形状，两侧要能对上同一个身份。
 * @param relPath - 工作区相对路径（正斜杠）。
 * @returns 身份对象；不在 `deliverables/` 下、不是 `.md`、或形状无法解释时返回 `undefined`。
 *
 * 平铺旧形状的两条约定（只为读懂历史，不鼓励新用）：
 *   1. `-<role>` 可以出现在名字中间带限定词，如 `reconcile-package-cfo-review.md`
 *      ⇒ 身份 = slug `reconcile-package` + 角色 `cfo-review`；
 *   2. 尾部 `-final` 表示定稿，如 `reconcile-package-final.md` ⇒ slug `reconcile-package` + 成品。
 */
export function deliverableId(relPath) {
  const path = normalizeRel(relPath)
  const root = path.startsWith(ACTIVE_ROOT) ? ACTIVE_ROOT : path.startsWith(ARCHIVE_ROOT) ? ARCHIVE_ROOT : undefined
  if (root === undefined || !path.endsWith('.md')) return undefined
  const parts = path.slice(root.length).split('/')

  // 新形状（三态的字面形状 + meta 户口；目录名可带 A1 日期前缀，slug 按剥前缀归一）
  if (parts.length === 2 && parts[1] === FINAL_BASENAME) return { slug: slugFromDirName(parts[0]), kind: 'final' }
  if (parts.length === 2 && parts[1] === 'meta.md') return { slug: slugFromDirName(parts[0]), kind: 'meta' }
  if (parts.length === 3 && parts[1] === DRAFTS_DIRNAME) {
    return { slug: slugFromDirName(parts[0]), kind: 'draft', role: parts[2].replace(/\.md$/, '') }
  }
  if (parts.length !== 1 || root === ARCHIVE_ROOT) return undefined

  // 平铺旧形状
  let base = parts[0].replace(/\.md$/, '')
  if (base.endsWith(LEGACY_FINAL_SUFFIX)) {
    base = base.slice(0, -LEGACY_FINAL_SUFFIX.length)
    return { slug: base, kind: 'final' }
  }
  const segments = base.split('-')
  // 角色记号至少出现在第 2 段起（`coo-...` 这类前缀不许被吃掉，否则 slug 会变空）。
  for (let i = 1; i < segments.length; i++) {
    const tail = segments.slice(i).join('-')
    const role = COMPANY_ROLE_IDS.find(candidate => tail === candidate || tail.startsWith(`${candidate}-`))
    if (role === undefined) continue
    return { slug: segments.slice(0, i).join('-'), kind: 'draft', role: tail }
  }
  return { slug: base, kind: 'final' }
}

/**
 * 判一个**盘上文件**的形状合法性（与 `deliverableId` 分开：这里才管"允不允许平铺"）。
 * @param relPath - 工作区相对路径（正斜杠）。
 * @param options - `legacyFlat: true` 时把平铺旧形状也算合法（只给已归档快照用）。
 * @returns `{ state, slug, role? }`；`state` ∈ `final` / `draft` / `meta` / `source` / `other`。
 */
export function classifyDeliverable(relPath, options = {}) {
  const path = normalizeRel(relPath)
  const root = path.startsWith(ACTIVE_ROOT) ? ACTIVE_ROOT : path.startsWith(ARCHIVE_ROOT) ? ARCHIVE_ROOT : undefined
  if (root === undefined || !path.endsWith('.md')) return { state: 'other' }
  const flat = !path.slice(root.length).includes('/')
  if (flat && (root === ARCHIVE_ROOT || options.legacyFlat !== true)) return { state: 'other' }
  // 取证落盘点（2026-10-10 立，手册「事实阻塞闸门」③/HITL）：drafts/sources/ 是合法证据目录——
  // 原文/文件按来源命名、FETCH-LOG 记通道（ai-transformation-2026 实证立）。不算 unshaped。
  const parts = path.slice(root.length).split('/')
  if (parts.length >= 4 && parts[1] === DRAFTS_DIRNAME && parts[2] === SOURCES_DIRNAME) {
    return { state: 'source', slug: slugFromDirName(parts[0]) }
  }
  // 过程物料（2026-10-10 ai-sprint 实证立）：drafts/ 下的主题工作子目录（sprint/ 等）是
  // 团队的自然工作形状——合法物料，不该被官僚 policing（UX：让团队自然干活）。
  if (parts.length >= 4 && parts[1] === DRAFTS_DIRNAME) {
    return { state: 'material', slug: slugFromDirName(parts[0]), dir: parts[2] }
  }
  const id = deliverableId(path)
  if (id === undefined) return { state: 'other' }
  if (id.kind === 'meta') return { state: 'meta', slug: id.slug }
  return id.kind === 'final'
    ? { state: 'final', slug: id.slug }
    : { state: 'draft', slug: id.slug, role: id.role }
}


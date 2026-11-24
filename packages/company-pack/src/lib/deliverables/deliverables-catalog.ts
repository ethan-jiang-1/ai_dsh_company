/**
 * 成品目录的纯逻辑（无 I/O，2026-10-25，RFC installed-shape-self-sufficient）。
 *
 * 口径与仓库生成器（tools/lib/company/deliverables-catalog.mjs，不随包分发）保持一致：
 * - 成品 = 有 `final.md` 的目录；过程稿目录不进目录。
 * - 数据面 = 盘上 meta/final；`presented` 由部署 host 的 present 事件投影，未观测 = null（未核）。
 * - `ledgered` = slug 能在 kb/motion-ledger.md 找到。
 */
import { parseMotionLedger } from '../accounting/ledger.ts'
import { RUN_BUNDLE_PATHS } from '../shared/run-bundle-paths.ts'

export const CATALOG_ROOTS = [RUN_BUNDLE_PATHS.deliverables, RUN_BUNDLE_PATHS.archive] as const
export type CatalogRoot = (typeof CATALOG_ROOTS)[number]

/** 动议分型（唯一词表；模板与校验共用）。 */
export const META_TYPES = ['decision', 'production', 'diagnostic', 'qa'] as const
/** 决议结果词表（跨型共用）。 */
export const META_RESULTS = ['in-progress', 'accepted', 'rejected', 'deferred', 'obsolete', 'undecidable', 'completed'] as const

export interface MetaFields {
  readonly fields: ReadonlyMap<string, string>
  readonly events: readonly string[]
}

/** 解析 meta.md 的 `字段: 值` 行；首现优先，不认形状的行忽略。 */
export function parseMeta(body: string): MetaFields {
  const fields = new Map<string, string>()
  const events: string[] = []
  for (const line of body.split('\n')) {
    const match = /^([\w一-鿿]+)\s*[:：]\s*(.*)$/.exec(line.trim())
    if (match === null) continue
    // 两个捕获组在 `match !== null` 时必然存在（正则 `(.*)`）；String 避免不可达的 `??` 分支/断言空洞。
    const key = String(match[1])
    const value = String(match[2])
    // 正则 `+` 保证 key 非空，无需再判 `key === ''`（不可达分支）。
    if (key === 'events') {
      if (value.trim() !== '') events.push(value.trim())
      continue
    }
    if (!fields.has(key)) fields.set(key, value.trim())
  }
  return { fields, events }
}

/** 目录名 → slug（剥日期前缀）。 */
export function slugFromDirName(dirName: string): string {
  return dirName.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

/** 路径归一成工作区相对的正斜杠形式。 */
export function normalizeRel(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/')
}

export interface CatalogEntry {
  readonly slug: string
  readonly kickoff: string
  readonly type: string
  readonly result: string
  readonly summary: string
  readonly root: CatalogRoot
  readonly dir: string
  readonly path: string
  readonly ledgered: boolean
  /** Lead present 背书；null = 部署 host 未观测到（未核，不冒充 false）。 */
  readonly presented: boolean | null
  /** meta 形状问题（缺行/枚举外/日期格式）；null = 形状检查通过。 */
  readonly metaProblem: string | null
}

export interface CatalogCounts {
  readonly total: number
  readonly active: number
  readonly archive: number
  readonly unledgered: number
  readonly presented: number
  readonly notPresented: number
  readonly presentUnknown: number
}

export interface DeliverablesCatalog {
  readonly schema: 1
  readonly generatedAt: string
  readonly counts: CatalogCounts
  readonly entries: readonly CatalogEntry[]
}

export interface CatalogScanEntry {
  readonly root: CatalogRoot
  readonly dir: string
  readonly fields: ReadonlyMap<string, string>
  readonly final: boolean
  readonly presented?: boolean | null
}

/** 成品 slug：`slug:` 缺失或空/空白 → 目录名（BUG-232 的单一判据）。 */
export function deliverableSlug(fields: ReadonlyMap<string, string>, dir: string): string {
  const raw = (fields.get('slug') ?? '').trim()
  return raw === '' ? slugFromDirName(dir) : raw
}

/**
 * meta 形状检查（唯一判据；成品面板与 tools/parity 共用；BUG-371）。
 * 语义：`kickoff`/`type` 缺失或空 = 缺行；`result` 可留空（未收口），只在非空时校验词表；
 * `slug` 可省略（由 `deliverableSlug` 回退目录名），但写成日期前缀形式 = 红（与台账 slug 对不上）。
 * @param fields - `parseMeta` 的字段表。
 * @returns 问题串（空 = 形状合法）。
 */
export function metaProblemsOf(fields: ReadonlyMap<string, string>): string[] {
  const problems: string[] = []
  for (const key of ['kickoff', 'type']) {
    const raw = fields.get(key)
    if (raw === undefined || raw.trim() === '') problems.push(`缺行「${key}:」`)
  }
  const kickoff = (fields.get('kickoff') ?? '').trim()
  if (kickoff !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(kickoff)) problems.push(`kickoff 不是 YYYY-MM-DD：「${kickoff}」`)
  const type = (fields.get('type') ?? '').trim()
  if (type !== '' && !META_TYPES.some(value => value === type)) problems.push(`type 不在词表：「${type}」`)
  const result = (fields.get('result') ?? '').trim()
  if (result !== '' && !META_RESULTS.some(value => value === result)) problems.push(`result 不在词表：「${result}」`)
  const slug = (fields.get('slug') ?? '').trim()
  if (slug !== '' && /^\d{4}-\d{2}-\d{2}-/.test(slug)) problems.push('slug 字段写剥前缀形式（不带日期前缀——日期住 kickoff 字段）')
  return problems
}
/** 把扫描结果折成稳定目录（kickoff 倒序、同日起 slug 升序）。 */
export function buildDeliverablesCatalog(input: {
  readonly entries: readonly CatalogScanEntry[]
  readonly ledgerSlugs: ReadonlySet<string>
  readonly generatedAt: string
}): DeliverablesCatalog {
  const rows: CatalogEntry[] = []
  for (const entry of input.entries) {
    if (!entry.final) continue
    const slug = deliverableSlug(entry.fields, entry.dir)
    const metaProblems = metaProblemsOf(entry.fields)
    rows.push({
      slug,
      kickoff: entry.fields.get('kickoff') ?? '',
      type: entry.fields.get('type') ?? '',
      result: entry.fields.get('result') ?? '',
      summary: entry.fields.get('summary') ?? '',
      root: entry.root,
      dir: entry.dir,
      path: `${entry.root}/${entry.dir}/final.md`,
      ledgered: input.ledgerSlugs.has(slug),
      presented: entry.presented ?? null,
      metaProblem: metaProblems.length === 0 ? null : metaProblems.join('；'),
    })
  }
  rows.sort((left, right) => right.kickoff.localeCompare(left.kickoff) || left.slug.localeCompare(right.slug))
  return {
    schema: 1,
    generatedAt: input.generatedAt,
    counts: {
      total: rows.length,
      active: rows.filter(row => row.root === RUN_BUNDLE_PATHS.deliverables).length,
      archive: rows.filter(row => row.root === RUN_BUNDLE_PATHS.archive).length,
      unledgered: rows.filter(row => !row.ledgered).length,
      presented: rows.filter(row => row.presented === true).length,
      notPresented: rows.filter(row => row.presented === false).length,
      presentUnknown: rows.filter(row => row.presented === null).length,
    },
    entries: rows,
  }
}

/**
 * 动议台账里的 slug 集合（只认表行首列；格式家 = kb/motion-ledger.md）。
 * 直接复用台账权威解析的行有效性（列数/空行/分隔行/重复表头，BUG-362）：坏行不进「已入账」。
 * @param text - 台账全文。
 * @returns slug 集合。
 */
export function ledgerSlugsFromText(text: string): Set<string> {
  const { rows, badRows, headerOk } = parseMotionLedger(text)
  // 读齐边界：坏行/表头诊断是行有效性的一部分；坏行与表头不符都不进「已入账」。
  void badRows
  if (!headerOk) return new Set()
  return new Set(rows.map(row => row.slug).filter(slug => slug !== ''))
}

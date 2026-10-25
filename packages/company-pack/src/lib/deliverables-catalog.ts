/**
 * 成品目录的纯逻辑（无 I/O，2026-10-25，RFC installed-shape-self-sufficient）。
 *
 * 口径与仓库生成器（tools/lib/deliverables-catalog.mjs）保持一致：
 * - 成品 = 有 `final.md` 的目录；过程稿目录不进目录。
 * - 数据面 = 盘上 meta/final；`presented` 由部署 host 的 present 事件投影，未观测 = null（未核）。
 * - `ledgered` = slug 能在 kb/motion-ledger.md 找到。
 */
export const CATALOG_ROOTS = ['deliverables', 'deliverables-archive'] as const
export type CatalogRoot = (typeof CATALOG_ROOTS)[number]

/** 动议分型（唯一词表；模板与校验共用）。 */
export const META_TYPES = ['决策', '生产', '诊断', '口径问答'] as const
/** 决议结果词表（跨型共用）。 */
export const META_RESULTS = ['进行中', '已采纳', '已否决', '已搁置', '已废弃', '判不了', '已完成'] as const

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
    const key = match[1] ?? ''
    const value = match[2] ?? ''
    if (key === '') continue
    if (key === '落地事件') {
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

/** 把扫描结果折成稳定目录（kickoff 倒序、同日起 slug 升序）。 */
export function buildDeliverablesCatalog(input: {
  readonly entries: readonly CatalogScanEntry[]
  readonly ledgerSlugs: ReadonlySet<string>
  readonly generatedAt: string
}): DeliverablesCatalog {
  const rows: CatalogEntry[] = []
  for (const entry of input.entries) {
    if (!entry.final) continue
    const slug = entry.fields.get('slug') ?? slugFromDirName(entry.dir)
    rows.push({
      slug,
      kickoff: entry.fields.get('kickoff') ?? '',
      type: entry.fields.get('类型') ?? '',
      result: entry.fields.get('结果') ?? '',
      summary: entry.fields.get('一句话结论') ?? '',
      root: entry.root,
      dir: entry.dir,
      path: `${entry.root}/${entry.dir}/final.md`,
      ledgered: input.ledgerSlugs.has(slug),
      presented: entry.presented ?? null,
    })
  }
  rows.sort((left, right) => right.kickoff.localeCompare(left.kickoff) || left.slug.localeCompare(right.slug))
  return {
    schema: 1,
    generatedAt: input.generatedAt,
    counts: {
      total: rows.length,
      active: rows.filter(row => row.root === 'deliverables').length,
      archive: rows.filter(row => row.root === 'deliverables-archive').length,
      unledgered: rows.filter(row => !row.ledgered).length,
      presented: rows.filter(row => row.presented === true).length,
      notPresented: rows.filter(row => row.presented === false).length,
      presentUnknown: rows.filter(row => row.presented === null).length,
    },
    entries: rows,
  }
}

/** 动议台账里的 slug 集合（只认表行首列；格式家 = kb/motion-ledger.md）。 */
export function ledgerSlugsFromText(text: string): Set<string> {
  const slugs = new Set<string>()
  let headerSeen = false
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined).split('|').map(cell => cell.trim())
    if (!headerSeen) {
      if (cells[0] === 'slug') headerSeen = true
      continue
    }
    if (cells.every(cell => /^[-: ]*$/.test(cell))) continue
    if (cells[0] !== undefined && cells[0] !== '') slugs.add(cells[0])
  }
  return slugs
}

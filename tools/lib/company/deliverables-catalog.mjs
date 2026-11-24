// 成品目录的**形状**（纯逻辑，无 I/O）：把 `deliverables/` + `deliverables-archive/` 的
// meta/final 折成一份可供页签渲染的目录。生成器 = `tools/repo/deliverables-index.mjs`；
// 消费方 = `packages/company-pack/src/client/tabs/DeliverablesTab.tsx`（只读生成结果，不自己扫盘）。
//
// 口径（2026-10-19 成品台账卡）：
// - **成品 = 有 `final.md` 的目录**；没有 final 的过程稿目录不进目录。
// - 数据面 = 盘上 meta/final（D20 的 `present` 背书仍归 `deliverables-check`；本目录首版不冒充它）。
// - `ledgered` = slug 能在 `kb/motion-ledger.md` 找到；false 的成品在面板上标「台账外」。
// - 只做**派生视图**：不新建第二份手写事实；跑生成器即可重建。
import { splitTableRow } from './markdown-table.mjs'
import { META_RESULTS, META_TYPES, metaProblemsOf, slugFromDirName } from './deliverables.mjs'

// 形状判据唯一实现住 deliverables.mjs（与 validateMeta 同文件），本模块只再导出（BUG-371/dedup）。
export { metaProblemsOf }

/** 目录条目的根（活跃 / 归档）。 */
export const CATALOG_ROOTS = ['.dsh-company/deliverables', '.dsh-company/deliverables-archive']

/** 一条成品目录项。 */
/**
 * @typedef {object} CatalogEntry
 * @property {string} slug
 * @property {string} kickoff YYYY-MM-DD（缺省空串）
 * @property {string} type meta「类型」
 * @property {string} result meta「结果」
 * @property {string} summary meta「一句话结论」
 * @property {'.dsh-company/deliverables'|'.dsh-company/deliverables-archive'} root
 * @property {string} dir 目录名（含日期前缀）
 * @property {string} path final.md 的 workspace 相对路径
 * @property {boolean} ledgered 是否在动议台账里
 * @property {boolean|null} presented 是否有 Lead `present` 背书（null = 审计不可得/未核）
 * @property {string|null} metaProblem meta 形状问题（null = 通过）
 */

/**
 * 成品 slug：`slug:` 缺失或空/空白 → 目录名（与 host `lib/deliverables` 的 `deliverableSlug` 同判据；BUG-232/347）。
 * @param {ReadonlyMap<string,string>} fields parseMeta 的字段表
 * @param {string} dir 成品目录名
 * @returns {string} 生效 slug
 */
export function deliverableSlug(fields, dir) {
  const raw = (fields.get('slug') ?? '').trim()
  return raw === '' ? slugFromDirName(dir) : raw
}


/**
 * 动议台账里的 slug 集合（与 host `ledgerSlugsFromText` 同判据；BUG-362 复审）。
 * 只认两种权威表头（7 列），行有效性 = 列数/非空行/非分隔行/非重复表头。
 * @param {string} text kb/motion-ledger.md 全文
 * @returns {Set<string>}
 */
export function ledgerSlugsFromText(text) {
  const HEADERS = [
    ['slug', 'date', 'type', 'participants', 'wallClock', 'deliverable', 'summary'],
    ['slug', '日期', '类型', '参与', '墙钟', '成品', '一句话结论'],
  ]
  const slugs = new Set()
  let header = null
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = splitTableRow(trimmed)
    if (header === null) {
      header = HEADERS.find(candidate => candidate.length === cells.length && candidate.every((name, i) => cells[i] === name)) ?? null
      continue
    }
    if (cells.length !== header.length) continue
    if (cells.every(cell => /^[-: ]*$/.test(cell))) continue
    if (header.every((name, i) => cells[i] === name)) continue
    if (cells[0] !== undefined && cells[0] !== '') slugs.add(cells[0])
  }
  return slugs
}

/**
 * 把交付物扫描结果折成稳定目录（按 kickoff 倒序、同日起 slug 升序）。
 * @param {object} input
 * @param {ReadonlyArray<{ root: '.dsh-company/deliverables'|'.dsh-company/deliverables-archive', dir: string, fields: Map<string,string>, final: boolean, presented?: boolean|null }>} input.entries 扫描结果（fields 来自 parseMeta）
 * @param {ReadonlySet<string>} input.ledgerSlugs 动议台账里的 slug 集合
 * @param {string} input.generatedAt ISO 时间
 * @returns {{ schema: 1, generatedAt: string, counts: { total: number, active: number, archive: number, unledgered: number, presented: number, notPresented: number, presentUnknown: number }, entries: CatalogEntry[] }}
 */
export function buildDeliverablesCatalog({ entries, ledgerSlugs, generatedAt }) {
  const rows = []
  for (const entry of entries) {
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
      ledgered: ledgerSlugs.has(slug),
      presented: entry.presented ?? null,
      metaProblem: metaProblems.length === 0 ? null : metaProblems.join('；'),
    })
  }
  rows.sort((left, right) => right.kickoff.localeCompare(left.kickoff) || left.slug.localeCompare(right.slug))
  return {
    schema: 1,
    generatedAt,
    counts: {
      total: rows.length,
      active: rows.filter(row => row.root === '.dsh-company/deliverables').length,
      archive: rows.filter(row => row.root === '.dsh-company/deliverables-archive').length,
      unledgered: rows.filter(row => !row.ledgered).length,
      presented: rows.filter(row => row.presented === true).length,
      notPresented: rows.filter(row => row.presented === false).length,
      presentUnknown: rows.filter(row => row.presented === null).length,
    },
    entries: rows,
  }
}

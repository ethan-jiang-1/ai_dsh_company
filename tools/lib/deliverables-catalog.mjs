// 成品目录的**形状**（纯逻辑，无 I/O）：把 `deliverables/` + `deliverables-archive/` 的
// meta/final 折成一份可供页签渲染的目录。生成器 = `tools/deliverables-index.mjs`；
// 消费方 = `packages/company-pack/src/client/DeliverablesTab.tsx`（只读生成结果，不自己扫盘）。
//
// 口径（2026-10-19 成品台账卡）：
// - **成品 = 有 `final.md` 的目录**；没有 final 的过程稿目录不进目录。
// - 数据面 = 盘上 meta/final（D20 的 `present` 背书仍归 `deliverables-check`；本目录首版不冒充它）。
// - `ledgered` = slug 能在 `kb/motion-ledger.md` 找到；false 的成品在面板上标「台账外」。
// - 只做**派生视图**：不新建第二份手写事实；跑生成器即可重建。
import { META_RESULTS, META_TYPES, slugFromDirName } from './deliverables.mjs'

/** 目录条目的根（活跃 / 归档）。 */
export const CATALOG_ROOTS = ['deliverables', 'deliverables-archive']

/** 一条成品目录项。 */
/**
 * @typedef {object} CatalogEntry
 * @property {string} slug
 * @property {string} kickoff YYYY-MM-DD（缺省空串）
 * @property {string} type meta「类型」
 * @property {string} result meta「结果」
 * @property {string} summary meta「一句话结论」
 * @property {'deliverables'|'deliverables-archive'} root
 * @property {string} dir 目录名（含日期前缀）
 * @property {string} path final.md 的 workspace 相对路径
 * @property {boolean} ledgered 是否在动议台账里
 * @property {boolean|null} presented 是否有 Lead `present` 背书（null = 审计不可得/未核）
 * @property {string|null} metaProblem meta 形状问题（null = 通过）
 */

/** meta 形状问题（缺行/枚举外/日期格式）；与产品 side 的 metaProblemsOf 同判据。 */
export function metaProblemsOf(fields) {
  const problems = []
  for (const key of ['kickoff', '类型', '结果']) {
    if (!fields.has(key)) problems.push(`缺行「${key}:」`)
  }
  const kickoff = fields.get('kickoff') ?? ''
  if (kickoff !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(kickoff)) problems.push(`kickoff 不是 YYYY-MM-DD：「${kickoff}」`)
  const type = fields.get('类型') ?? ''
  if (type !== '' && !META_TYPES.includes(type)) problems.push(`类型不在词表：「${type}」`)
  const result = fields.get('结果') ?? ''
  if (result !== '' && !META_RESULTS.includes(result)) problems.push(`结果不在词表：「${result}」`)
  return problems
}

/**
 * 把交付物扫描结果折成稳定目录（按 kickoff 倒序、同日起 slug 升序）。
 * @param {object} input
 * @param {ReadonlyArray<{ root: 'deliverables'|'deliverables-archive', dir: string, fields: Map<string,string>, final: boolean, presented?: boolean|null }>} input.entries 扫描结果（fields 来自 parseMeta）
 * @param {ReadonlySet<string>} input.ledgerSlugs 动议台账里的 slug 集合
 * @param {string} input.generatedAt ISO 时间
 * @returns {{ schema: 1, generatedAt: string, counts: { total: number, active: number, archive: number, unledgered: number, presented: number, notPresented: number, presentUnknown: number }, entries: CatalogEntry[] }}
 */
export function buildDeliverablesCatalog({ entries, ledgerSlugs, generatedAt }) {
  const rows = []
  for (const entry of entries) {
    if (!entry.final) continue
    const slug = entry.fields.get('slug') ?? slugFromDirName(entry.dir)
    const metaProblems = metaProblemsOf(entry.fields)
    rows.push({
      slug,
      kickoff: entry.fields.get('kickoff') ?? '',
      type: entry.fields.get('类型') ?? '',
      result: entry.fields.get('结果') ?? '',
      summary: entry.fields.get('一句话结论') ?? '',
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

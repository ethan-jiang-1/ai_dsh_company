/**
 * 成品索引的纯解析/筛选（2026-10-28 R4 收家：此前 `parseCatalog`/`filterCatalog` 埋在
 * `DeliverablesTab.tsx`，数据模块 `cultivation-context-data` 反向 import UI 文件）。
 *
 * 这里是 client 侧读模型：只做 JSON → 目录 → 筛选，不 import React、不做 I/O。
 * host 侧生成器仍是 `lib/deliverables-catalog.ts`（build from disk），两者没有互相依赖。
 */
import { RUN_BUNDLE_PATHS } from '../../lib/shared/run-bundle-paths.ts'

/** 一条成品目录项（与 `tools/lib/company/deliverables-catalog.mjs`（不随包分发）同形）。 */
export interface DeliverablesCatalogEntry {
  readonly slug: string
  readonly kickoff: string
  readonly type: string
  readonly result: string
  readonly summary: string
  readonly root: typeof RUN_BUNDLE_PATHS.deliverables | typeof RUN_BUNDLE_PATHS.archive
  readonly dir: string
  readonly path: string
  readonly ledgered: boolean
  /** Lead `present` 背书：true/false；null = 审计不可得（未核，不冒充）。 */
  readonly presented: boolean | null
  /** meta 形状问题（缺行/枚举外/日期格式）；null = 形状检查通过。 */
  readonly metaProblem: string | null
}

/** 解析后的目录形状（counts 不解析：视图从 entries 现算，避免第二份计数）。 */
export interface DeliverablesCatalog {
  readonly schema: 1
  readonly generatedAt: string
  readonly entries: readonly DeliverablesCatalogEntry[]
  /**
   * 被跳过的条目数（坏形状：null / 非对象 / slug 空 / path 空）。
   * 不报出来就会出现「5 条只显示 2 条、面板什么都不说」（BUG-310）。
   */
  readonly skipped: number
}

/** 页签筛选档（UI 词表；纯类型住这里，标签仍在页签体）。 */
export type CatalogFilter = 'all' | 'active' | 'archive' | 'unledgered' | 'unpresented'

/**
 * 解析生成索引（形状校验 + 字段归一）。坏 JSON / 非 schema 1 返回 null，由调用方显示错误。
 * @param text - 索引文件全文。
 * @returns 目录或 null。
 */
export function parseCatalog(text: string): DeliverablesCatalog | null {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return null }
  if (raw === null || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (value.schema !== 1 || !Array.isArray(value.entries)) return null
  const entries: DeliverablesCatalogEntry[] = []
  let skipped = 0
  for (const item of value.entries) {
    if (item === null || typeof item !== 'object') { skipped += 1; continue }
    const row = item as Record<string, unknown>
    // 字段形状（BUG-324）：**允许缺省**，但不允许「给了却是错的类型」——
    // 过去的归一化会把 root:"bogus" 当 active、ledgered:"false" 当已入账、presented:"true" 当未核，
    // 审计分类悄无声息地反掉。宁可跳过并计数，也不猜。
    if (row.root !== undefined && row.root !== RUN_BUNDLE_PATHS.deliverables && row.root !== RUN_BUNDLE_PATHS.archive) { skipped += 1; continue }
    if (row.ledgered !== undefined && typeof row.ledgered !== 'boolean') { skipped += 1; continue }
    if (row.presented !== undefined && row.presented !== null && typeof row.presented !== 'boolean') { skipped += 1; continue }
    const root = row.root === RUN_BUNDLE_PATHS.archive ? RUN_BUNDLE_PATHS.archive : RUN_BUNDLE_PATHS.deliverables
    const textOf = (key: string): string => (typeof row[key] === 'string' ? row[key] : '')
    const slug = textOf('slug')
    const path = textOf('path')
    if (slug === '' || path === '') { skipped += 1; continue }
    entries.push({
      slug,
      kickoff: textOf('kickoff'),
      type: textOf('type'),
      result: textOf('result'),
      summary: textOf('summary'),
      root,
      dir: textOf('dir'),
      path,
      ledgered: row.ledgered !== false,
      presented: row.presented === true ? true : row.presented === false ? false : null,
      metaProblem: typeof row.metaProblem === 'string' && row.metaProblem !== '' ? row.metaProblem : null,
    })
  }
  return {
    schema: 1,
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : '',
    entries,
    skipped,
  }
}

/** 过滤目录项。 */
export function filterCatalog(entries: readonly DeliverablesCatalogEntry[], filter: CatalogFilter): readonly DeliverablesCatalogEntry[] {
  if (filter === 'active') return entries.filter(entry => entry.root === RUN_BUNDLE_PATHS.deliverables)
  if (filter === 'archive') return entries.filter(entry => entry.root === RUN_BUNDLE_PATHS.archive)
  if (filter === 'unledgered') return entries.filter(entry => !entry.ledgered)
  if (filter === 'unpresented') return entries.filter(entry => entry.presented === false)
  return entries
}

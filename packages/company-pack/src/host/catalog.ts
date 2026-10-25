/**
 * 成品目录的 host 侧生成器（2026-10-25，RFC installed-shape-self-sufficient）。
 *
 * 为什么在 host：`kb/deliverables-index.json` 过去由仓库工具生成，tarball 里没有它；新装公司的
 * 成品页签永久报“维护者运行 node tools/...”。本模块把扫描/投影放进产品，安装后自足。
 *
 * 边界：
 * - 只写 workspace 的 `kb/deliverables-index.json`，不碰交付物本体。
 * - `presented` 来自 host 观测到的 `deliverables/presented` 会话事件；未观测 = null（未核），
 *   不冒充 false——完整审计仍是操作员/第二阶段的职责。
 * - 幂等：条目未变时不重写文件（`generatedAt` 不变），否则 release-smoke 的“二启零变更”会红。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import {
  buildDeliverablesCatalog,
  CATALOG_ROOTS,
  ledgerSlugsFromText,
  normalizeRel,
  parseMeta,
  slugFromDirName,
  type CatalogRoot,
  type DeliverablesCatalog,
  type CatalogScanEntry,
} from '../lib/deliverables-catalog.ts'

export const CATALOG_REL = 'kb/deliverables-index.json'

/** 目录里的相对路径（POSIX）。 */

export const catalogPath = (companyHome: string): string => join(companyHome, CATALOG_REL)

/** 读既有目录；不存在/不可解析/schema 不符返回 null。 */
export function readCatalog(companyHome: string): DeliverablesCatalog | null {
  const path = catalogPath(companyHome)
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { schema?: unknown; entries?: unknown }
    if (raw.schema !== 1 || !Array.isArray(raw.entries)) return null
    return raw as unknown as DeliverablesCatalog
  } catch {
    return null
  }
}

/** 既有目录里已 present 的 path/slug（升级/换版本后仍保留背书）。 */
function presentedFromCatalog(catalog: DeliverablesCatalog | null): { paths: Set<string>; slugs: Set<string> } {
  const paths = new Set<string>()
  const slugs = new Set<string>()
  for (const entry of catalog?.entries ?? []) {
    if (entry.presented !== true) continue
    paths.add(normalizeRel(entry.path))
    slugs.add(entry.slug)
  }
  return { paths, slugs }
}

/**
 * 从 `deliverables/presented` 事件里抽 workspace 相对路径。
 * @param event - 会话事件（data.files[].path 为绝对路径，present 工具写的就是这个形状）。
 * @param companyHome - 公司盘根。
 */
export function presentedFromEvent(event: unknown, companyHome: string): { paths: Set<string>; slugs: Set<string> } {
  const paths = new Set<string>()
  const slugs = new Set<string>()
  const files = (event as { data?: { files?: unknown } })?.data?.files
  if (!Array.isArray(files)) return { paths, slugs }
  for (const item of files) {
    const raw = (item as { path?: unknown })?.path
    if (typeof raw !== 'string' || raw.trim() === '') continue
    const absolute = isAbsolute(raw) ? raw : join(companyHome, raw)
    const rel = normalizeRel(relative(companyHome, absolute))
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) continue
    const match = /^(deliverables|deliverables-archive)\/([^/]+)\/final\.md$/.exec(rel)
    if (match === null) continue
    const dirName = match[2] ?? ''
    if (dirName === '') continue
    paths.add(rel)
    slugs.add(slugFromDirName(dirName))
  }
  return { paths, slugs }
}

/** 扫描两个交付物根；presented 由 path 或 slug 命中决定，未命中 = null。 */
function scanEntries(companyHome: string, presented: { paths: ReadonlySet<string>; slugs: ReadonlySet<string> }): CatalogScanEntry[] {
  const entries: CatalogScanEntry[] = []
  for (const root of CATALOG_ROOTS) {
    const dir = join(companyHome, root)
    if (!existsSync(dir)) continue
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (!item.isDirectory()) continue
      const final = existsSync(join(dir, item.name, 'final.md'))
      const metaPath = join(dir, item.name, 'meta.md')
      const body = existsSync(metaPath) ? readFileSync(metaPath, 'utf8') : ''
      const fields = parseMeta(body).fields
      const slug = fields.get('slug') ?? slugFromDirName(item.name)
      const path = normalizeRel(`${root}/${item.name}/final.md`)
      entries.push({
        root: root as CatalogRoot,
        dir: item.name,
        fields,
        final,
        presented: presented.paths.has(path) || presented.slugs.has(slug) ? true : null,
      })
    }
  }
  return entries
}

export interface CatalogResult {
  readonly written: boolean
  readonly catalog: DeliverablesCatalog | null
  readonly path: string
}

/**
 * 重新生成目录。条目未变时不写（保持 `generatedAt` 与字节稳定）。
 * @param companyHome - 公司盘根。
 * @param extra - 本次新观测到的 present path/slug（可缺省）。
 */
export function regenerateCatalog(
  companyHome: string,
  extra: { readonly paths?: Iterable<string>; readonly slugs?: Iterable<string> } = {},
): CatalogResult {
  const path = catalogPath(companyHome)
  if (!existsSync(companyHome)) return { written: false, catalog: null, path }
  const previous = readCatalog(companyHome)
  const base = presentedFromCatalog(previous)
  for (const value of extra.paths ?? []) base.paths.add(normalizeRel(value))
  for (const value of extra.slugs ?? []) base.slugs.add(value)
  const entries = scanEntries(companyHome, base)
  const ledgerPath = join(companyHome, 'kb/motion-ledger.md')
  const catalog = buildDeliverablesCatalog({
    entries,
    ledgerSlugs: existsSync(ledgerPath) ? ledgerSlugsFromText(readFileSync(ledgerPath, 'utf8')) : new Set(),
    generatedAt: new Date().toISOString(),
  })
  if (previous !== null && JSON.stringify(previous.entries) === JSON.stringify(catalog.entries)) {
    return { written: false, catalog: previous, path }
  }
  mkdirSync(join(companyHome, 'kb'), { recursive: true })
  const temporary = `${path}.tmp`
  writeFileSync(temporary, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  renameSync(temporary, path)
  return { written: true, catalog, path }
}

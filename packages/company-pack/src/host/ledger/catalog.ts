/**
 * 成品目录的 host 侧生成器（2026-10-25，RFC installed-shape-self-sufficient；2026-11-03 D2 拆分）。
 *
 * 本文件只留「扫描交付物根 + 生成派生索引（幂等）」；读取/校验 = catalog-state.ts，
 * 审计账本 = presented-ledger.ts。索引 `kb/deliverables-index.json` 是盘上 meta/final + 账本的派生视图。
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildDeliverablesCatalog,
  CATALOG_ROOTS,
  ledgerSlugsFromText,
  normalizeRel,
  parseMeta,
  slugFromDirName,
  type CatalogRoot,
  type CatalogScanEntry,
  type DeliverablesCatalog,
} from '../../lib/deliverables-catalog.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'
import { catalogPath, readCatalogState } from '../ledger/catalog-state.ts'
import { emptyPresentedLedger, presentedOf, readPresentedLedger, type PresentedLedger } from '../ledger/presented-ledger.ts'

export { CATALOG_REL, catalogPath, readCatalog, readCatalogState, type CatalogReadState } from '../ledger/catalog-state.ts'
export { PRESENTED_LEDGER_REL, presentedLedgerPath } from '../ledger/presented-ledger.ts'
export {
  auditRelPath, emptyPresentedLedger, ensurePresentedLedger, mergePresented, presentedFromEvent,
  presentedFromLegacyCatalog, presentedFromSessions, presentedOf, readPresentedLedger,
  recordPresented, setPresentedAudit, writePresentedLedger,
  type LedgerBootstrap, type PresentedLedger, type PresentedLedgerState, type PresentedObservation,
  type PresentedScanResult, type PresentedSessionQuery,
} from '../ledger/presented-ledger.ts'

/** 存在且是普通文件；目录/坏链接一律当「没有」。 */
function isRegularFile(path: string): boolean {
  try { return statSync(path).isFile() } catch { return false }
}

/** 扫描两个交付物根；presented 由账本按 path/slug 命中决定，未命中 = null。 */
function scanEntries(companyHome: string, ledger: PresentedLedger): { entries: CatalogScanEntry[], warnings: string[] } {
  const entries: CatalogScanEntry[] = []
  const warnings: string[] = []
  for (const root of CATALOG_ROOTS) {
    const dir = join(companyHome, root)
    if (!existsSync(dir)) continue
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (!item.isDirectory()) continue
      const finalPath = join(dir, item.name, 'final.md')
      const final = isRegularFile(finalPath)
      if (!final && existsSync(finalPath)) warnings.push(`${finalPath} 不是普通文件，按无 final 处理`)
      const metaPath = join(dir, item.name, 'meta.md')
      const metaIsFile = isRegularFile(metaPath)
      if (!metaIsFile && existsSync(metaPath)) warnings.push(`${metaPath} 不是普通文件，按无 meta 处理`)
      const body = metaIsFile ? readFileSync(metaPath, 'utf8') : ''
      const fields = parseMeta(body).fields
      const slug = fields.get('slug') ?? slugFromDirName(item.name)
      const path = normalizeRel(`${root}/${item.name}/final.md`)
      entries.push({
        root: root as CatalogRoot,
        dir: item.name,
        fields,
        final,
        // true 可按 path/slug 延续（present 过就是背书）；false 只认精确 path——
        // 同 slug 的新交付物不能继承旧 false，否则会把“审计过未 present”冒充成新件结论。
        presented: presentedOf(ledger, path, slug),
      })
    }
  }
  return { entries, warnings }
}

export interface CatalogResult {
  readonly written: boolean
  readonly catalog: DeliverablesCatalog | null
  readonly path: string
  /** 扫描时跳过的坏形状（目录冒充文件等）；调用方负责 warn，不静默。 */
  readonly warnings: readonly string[]
}

/**
 * 重新生成目录。条目未变时不写（保持 `generatedAt` 与字节稳定）。
 * @param companyHome - 公司盘根。
 * @param presented - 审计账本；缺席时读盘（ok 才用，否则空账本）。
 */
export function regenerateCatalog(companyHome: string, presented?: PresentedLedger): CatalogResult {
  const path = catalogPath(companyHome)
  if (!existsSync(companyHome)) return { written: false, catalog: null, path, warnings: [] }
  let ledger = presented
  if (ledger === undefined) {
    const state = readPresentedLedger(companyHome)
    ledger = state.status === 'ok' ? state.ledger : emptyPresentedLedger()
  }
  const previousState = readCatalogState(companyHome)
  const previous = previousState.status === 'ok' ? previousState.catalog : null
  const scanned = scanEntries(companyHome, ledger)
  const warnings = [...scanned.warnings]
  const ledgerPath = join(companyHome, RUN_BUNDLE_PATHS.ledger)
  const ledgerIsFile = isRegularFile(ledgerPath)
  if (!ledgerIsFile && existsSync(ledgerPath)) warnings.push(`${ledgerPath} 不是普通文件，按空账本处理`)
  const catalog = buildDeliverablesCatalog({
    entries: scanned.entries,
    ledgerSlugs: ledgerIsFile ? ledgerSlugsFromText(readFileSync(ledgerPath, 'utf8')) : new Set(),
    generatedAt: new Date().toISOString(),
  })
  if (previous !== null && JSON.stringify(previous.entries) === JSON.stringify(catalog.entries)) {
    return { written: false, catalog: previous, path, warnings }
  }
  mkdirSync(join(companyHome, RUN_BUNDLE_PATHS.kb), { recursive: true })
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
    renameSync(temporary, path)
  } catch (error) {
    try { rmSync(temporary, { force: true }) } catch { /* 保留原错误 */ }
    throw error
  }
  return { written: true, catalog, path, warnings }
}

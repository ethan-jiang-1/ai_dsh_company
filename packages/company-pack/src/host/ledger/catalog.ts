/**
 * 成品目录的 host 侧生成器（2026-10-25，RFC installed-shape-self-sufficient；2026-11-03 D2 拆分）。
 *
 * 本文件只留「扫描交付物根 + 生成派生索引（幂等）」；读取/校验 = catalog-state.ts，
 * 审计账本 = presented-ledger.ts。索引 `kb/deliverables-index.json` 是盘上 meta/final + 账本的派生视图。
 */
import { copyFileSync, existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildDeliverablesCatalog,
  deliverableSlug,
  CATALOG_ROOTS,
  ledgerSlugsFromText,
  normalizeRel,
  parseMeta,
  type CatalogRoot,
  type CatalogScanEntry,
  type DeliverablesCatalog,
} from '../../lib/deliverables/deliverables-catalog.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/shared/run-bundle-paths.ts'
import { catalogPath, readCatalogState } from './catalog-state.ts'
import { plainFileProblem } from '../fs/safe-file.ts'
import { ensureCompanyDir, writeCompanyAtomic } from '../run-bundle/company-root.ts'
import { emptyPresentedLedger, presentedOf, readPresentedLedger, type PresentedLedger } from './presented-ledger.ts'

export { CATALOG_REL, catalogPath, readCatalog, readCatalogState, type CatalogReadState } from './catalog-state.ts'
export { PRESENTED_LEDGER_REL, presentedLedgerPath } from './presented-ledger.ts'
export {
  auditRelPath, emptyPresentedLedger, ensurePresentedLedger, mergePresented, presentedFromEvent,
  presentedFromLegacyCatalog, presentedFromSessions, presentedOf, readPresentedLedger,
  recordPresented, setPresentedAudit, writePresentedLedger,
  type LedgerBootstrap, type PresentedLedger, type PresentedLedgerState, type PresentedObservation,
  type PresentedScanResult, type PresentedSessionQuery,
} from './presented-ledger.ts'

/** 成品文件必须可读且不越出 company root（symlink 不跟随，BUG-108）。 */
/** 坏形状的人话标签。 */
function labelOfProblem(problem: Exclude<ReturnType<typeof plainFileProblem>, null>): string {
  return problem === 'symlink' ? '是 symlink，不跟随'
    : problem === 'outside' ? '真实路径在 company root 外'
      : '不是普通文件'
}

/**
 * 扫描两个交付物根；presented 由账本按 path/slug 命中决定，未命中 = null。
 * 导出是给 spec 的测试缝：catalog 输出会丢弃无 `final` 的目录，只有扫描结果能看到被判 false 的 entry。
 */
export function scanCatalogEntries(companyHome: string, ledger: PresentedLedger): { entries: CatalogScanEntry[], warnings: string[] } {
  const entries: CatalogScanEntry[] = []
  const warnings: string[] = []
  for (const root of CATALOG_ROOTS) {
    const dir = join(companyHome, root)
    let dirInfo
    try { dirInfo = lstatSync(dir) } catch { continue }
    if (dirInfo.isSymbolicLink()) { warnings.push(`${dir} 是 symlink，不跟随`); continue }
    if (!dirInfo.isDirectory()) { warnings.push(`${dir} 不是目录`); continue }
    let children
    try { children = readdirSync(dir, { withFileTypes: true }) } catch (error) {
      warnings.push(`${dir} 无法扫描：${(error as Error).message}`)
      continue
    }
    for (const item of children) {
      // BUG-231：Dirent.isDirectory() 不跟随 symlink；坏形状必须 warning，不静默 skip。
      if (item.isSymbolicLink()) {
        warnings.push(`${join(dir, item.name)} 是 symlink，不跟随`)
        continue
      }
      if (!item.isDirectory()) continue
      const finalPath = join(dir, item.name, 'final.md')
      const finalProblem = plainFileProblem(companyHome, finalPath)
      let final = finalProblem === null
      if (finalProblem !== null && finalProblem !== 'missing') warnings.push(`${finalPath} ${labelOfProblem(finalProblem)}，按无 final 处理`)
      // BUG-239：路径存在 ≠ 可读；不可读的 final 不能冒充可展示成品。
      // BUG-275：非零字节 ≠ 有内容；空白也按无 final。一次读同时判「可读」与「非空白」。
      if (final) {
        try {
          if (readFileSync(finalPath, 'utf8').trim() === '') {
            warnings.push(`${finalPath} 为空，按无 final 处理`)
            final = false
          }
        } catch {
          warnings.push(`${finalPath} 不可读，按无 final 处理`)
          final = false
        }
      }
      const metaPath = join(dir, item.name, 'meta.md')
      const metaProblem = plainFileProblem(companyHome, metaPath)
      const metaIsFile = metaProblem === null
      if (metaProblem !== null && metaProblem !== 'missing') warnings.push(`${metaPath} ${labelOfProblem(metaProblem)}，按无 meta 处理`)
      // BUG-238：plainFileProblem 不查可读性；EACCES 必须降级成 warning，不能整盘抛。
      let body = ''
      if (metaIsFile) {
        try { body = readFileSync(metaPath, 'utf8') } catch (error) {
          warnings.push(`${metaPath} 不可读：${(error as Error).message}，按无 meta 处理`)
        }
      }
      const fields = parseMeta(body).fields
      // BUG-232：`slug:` 空值在 parseMeta 里是 ''，`??` 不会回退；空/空白视为未声明。
      const slug = deliverableSlug(fields, item.name)
      const rawSlug = (fields.get('slug') ?? '').trim()
      if (rawSlug === '' && fields.has('slug')) warnings.push(`${metaPath} 的 slug 为空，按目录名 ${slug}`)
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

/**
 * BUG-276：旧索引读不出来时，覆盖前把旧字节留在旁边（`<path>.bak`）。
 * 源/目标都过 `plainFileProblem`（symlink/盘外一律不跟）；跳过或失败只降级成 warning，绝不抛。
 * @returns 备份文件路径；未备份 = null。
 */
function backupUnreadableCatalog(companyHome: string, path: string, warnings: string[]): string | null {
  const backupPath = `${path}.bak`
  const sourceProblem = plainFileProblem(companyHome, path)
  if (sourceProblem !== null) {
    warnings.push(`${path} ${sourceProblem === 'missing' ? '已不存在' : labelOfProblem(sourceProblem)}，跳过旧索引备份`)
    return null
  }
  const backupProblem = plainFileProblem(companyHome, backupPath)
  if (backupProblem !== null && backupProblem !== 'missing') {
    warnings.push(`${backupPath} ${labelOfProblem(backupProblem)}，跳过旧索引备份`)
    return null
  }
  try {
    copyFileSync(path, backupPath)
    return backupPath
  } catch (error) {
    warnings.push(`旧索引备份失败：${(error as Error).message}`)
    return null
  }
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
  const scanned = scanCatalogEntries(companyHome, ledger)
  const warnings = [...scanned.warnings]
  // BUG-276：旧索引 corrupt/unsupported 不能静默当「没有历史」覆盖；先告警，再尽力留下旧字节。
  if (previousState.status === 'corrupt' || previousState.status === 'unsupported') {
    const rebuilt = `${path} 旧索引不可读或不受信（${previousState.error}），按重建处理`
    const backupPath = backupUnreadableCatalog(companyHome, path, warnings)
    warnings.push(backupPath === null ? rebuilt : `${rebuilt}，旧字节已备份为 ${backupPath}`)
  }
  const ledgerPath = join(companyHome, RUN_BUNDLE_PATHS.ledger)
  const ledgerProblem = plainFileProblem(companyHome, ledgerPath)
  const ledgerIsFile = ledgerProblem === null
  if (ledgerProblem !== null && ledgerProblem !== 'missing') warnings.push(`${ledgerPath} ${labelOfProblem(ledgerProblem)}，按空账本处理`)
  let ledgerText = ''
  if (ledgerIsFile) {
    try { ledgerText = readFileSync(ledgerPath, 'utf8') } catch (error) {
      warnings.push(`${ledgerPath} 不可读：${(error as Error).message}，按空账本处理`)
    }
  }
  const catalog = buildDeliverablesCatalog({
    entries: scanned.entries,
    ledgerSlugs: ledgerIsFile ? ledgerSlugsFromText(ledgerText) : new Set(),
    generatedAt: new Date().toISOString(),
  })
  if (previous !== null && JSON.stringify(previous.entries) === JSON.stringify(catalog.entries)) {
    return { written: false, catalog: previous, path, warnings }
  }
  try {
    ensureCompanyDir(companyHome, 'kb', { create: true })
  } catch (error) {
    warnings.push(`catalog 输出目录不安全：${(error as Error).message}`)
    return { written: false, catalog: previous, path, warnings }
  }
  let targetInfo
  try { targetInfo = lstatSync(path) } catch { targetInfo = null }
  if (targetInfo !== null && targetInfo.isSymbolicLink()) {
    // BUG-260：不静默替换 catalog 链接（不跟随写外/丢用户链接）。
    warnings.push(`${path} 是 symlink，拒绝写 catalog`)
    return { written: false, catalog: previous, path, warnings }
  }
  if (targetInfo !== null && targetInfo.isDirectory()) {
    warnings.push(`${path} 被目录占用，未写 catalog`)
    return { written: false, catalog: previous, path, warnings }
  }
  try {
    writeCompanyAtomic(companyHome, RUN_BUNDLE_PATHS.catalog, `${JSON.stringify(catalog, null, 2)}\n`)
  } catch (error) {
    warnings.push(`catalog 写入失败：${(error as Error).message}`)
    return { written: false, catalog: previous, path, warnings }
  }
  return { written: true, catalog, path, warnings }
}

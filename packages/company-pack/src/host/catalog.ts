/**
 * 成品目录的 host 侧生成器（2026-10-25，RFC installed-shape-self-sufficient）。
 *
 * 为什么在 host：`kb/deliverables-index.json` 过去由仓库工具生成，tarball 里没有它；新装公司的
 * 成品页签永久报“维护者运行 node tools/...”。本模块把扫描/投影放进产品，安装后自足。
 *
 * 2026-10-27（FAQ 26 数据模型对齐）把 `presented` 从“索引自己继承”拆成两层：
 * - **审计账本** `kb/deliverables-presented.json` = `presented` 的权威。`true` 来自会话事件，
 *   `false` 是操作员审计结论；两者都不是“从盘上重算”能得到的。
 * - **索引** `kb/deliverables-index.json` = 盘上 meta/final + 账本的派生视图，可重建。
 * 这样删索引不会丢审计；索引也不再混当派生与权威。
 *
 * 边界：
 * - 只写 workspace 的两个 `kb/` 文件，不碰交付物本体。
 * - `presented` 未观测 = null（未核），不冒充 false。
 * - 幂等：条目未变时不重写索引（`generatedAt` 不变），否则 release-smoke 的“二启零变更”会红。
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative } from 'node:path'
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
import { canonicalPath } from './paths.ts'
import { isRecord } from '../lib/guards.ts'

export const CATALOG_REL = 'kb/deliverables-index.json'
/** 审计账本（`presented` 的权威；操作员可读可改）。 */
export const PRESENTED_LEDGER_REL = 'kb/deliverables-presented.json'

/** 目录里的相对路径（POSIX）。 */

export const catalogPath = (companyHome: string): string => join(companyHome, CATALOG_REL)
export const presentedLedgerPath = (companyHome: string): string => join(companyHome, PRESENTED_LEDGER_REL)

export type CatalogReadState =
  | { readonly status: 'ok'; readonly catalog: DeliverablesCatalog }
  | { readonly status: 'missing' }
  | { readonly status: 'corrupt'; readonly error: string }
  | { readonly status: 'unsupported'; readonly schema: number; readonly error: string }

/**
 * 读并校验既有目录。schema 比当前新时单独报 unsupported，host 可以告警而不是静默重建。
 * @param companyHome - 公司盘根。
 */
export function readCatalogState(companyHome: string): CatalogReadState {
  const path = catalogPath(companyHome)
  try {
    if (!existsSync(path)) return { status: 'missing' }
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!isRecord(raw)) return { status: 'corrupt', error: '不是对象' }
    const schema = raw.schema
    if (typeof schema !== 'number' || !Number.isSafeInteger(schema) || schema < 1) {
      return { status: 'corrupt', error: `schema 不是正整数（${String(schema)}）` }
    }
    if (schema > 1) return { status: 'unsupported', schema, error: `schema ${String(schema)} 高于本包支持的 1` }
    if (!Array.isArray(raw.entries)) return { status: 'corrupt', error: 'entries 不是数组' }
    for (const entry of raw.entries) {
      if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.slug !== 'string') {
        return { status: 'corrupt', error: 'entries 含坏形状（缺 path/slug）' }
      }
      if (entry.presented !== null && entry.presented !== true && entry.presented !== false) {
        return { status: 'corrupt', error: `entries[${entry.path}] 的 presented 不是布尔/null` }
      }
    }
    return { status: 'ok', catalog: raw as unknown as DeliverablesCatalog }
  } catch (error) {
    return { status: 'corrupt', error: (error as Error).message }
  }
}

/** 读既有目录；不存在/损坏/schema 不符返回 null。 */
export function readCatalog(companyHome: string): DeliverablesCatalog | null {
  const state = readCatalogState(companyHome)
  return state.status === 'ok' ? state.catalog : null
}

// ── presented 审计账本（2026-10-27）──────────────────────────────────────────────
// 为什么不是纯派生：`presented=false` 只能来自操作员审计（代码里没有任何路径会写 false）；
// `true` 来自 `deliverables/presented` 事件。把两者留在索引里，删索引就丢审计，且索引同时
// 是“派生”和“权威”。账本把这块状态显式化；索引只读它。
export interface PresentedLedger {
  readonly schema: 1
  readonly updatedAt: string
  /** 工作区相对路径 → 审计结论。 */
  readonly paths: Readonly<Record<string, boolean>>
  /** slug → true（归档/搬迁后按 slug 延续背书；false 只认精确 path）。 */
  readonly slugs: Readonly<Record<string, boolean>>
}

export type PresentedLedgerState =
  | { readonly status: 'ok'; readonly path: string; readonly ledger: PresentedLedger }
  | { readonly status: 'missing'; readonly path: string }
  | { readonly status: 'corrupt'; readonly path: string; readonly error: string }
  | { readonly status: 'unsupported'; readonly path: string; readonly schema: number; readonly error: string }

function validateBooleanMap(value: unknown): value is Record<string, boolean> {
  if (!isRecord(value)) return false
  return Object.values(value).every(entry => entry === true || entry === false)
}

export function readPresentedLedger(companyHome: string): PresentedLedgerState {
  const path = presentedLedgerPath(companyHome)
  try {
    if (!existsSync(path)) return { status: 'missing', path }
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!isRecord(raw)) return { status: 'corrupt', path, error: '不是对象' }
    const schema = raw.schema
    if (typeof schema !== 'number' || !Number.isSafeInteger(schema) || schema < 1) {
      return { status: 'corrupt', path, error: `schema 不是正整数（${String(schema)}）` }
    }
    if (schema > 1) return { status: 'unsupported', path, schema, error: `schema ${String(schema)} 高于本包支持的 1` }
    if (typeof raw.updatedAt !== 'string') return { status: 'corrupt', path, error: '缺 updatedAt' }
    if (!validateBooleanMap(raw.paths)) return { status: 'corrupt', path, error: 'paths 不是 boolean map' }
    if (!validateBooleanMap(raw.slugs)) return { status: 'corrupt', path, error: 'slugs 不是 boolean map' }
    return { status: 'ok', path, ledger: raw as unknown as PresentedLedger }
  } catch (error) {
    return { status: 'corrupt', path, error: (error as Error).message }
  }
}

export function emptyPresentedLedger(now: Date = new Date()): PresentedLedger {
  return { schema: 1, updatedAt: now.toISOString(), paths: {}, slugs: {} }
}

export interface PresentedObservation {
  readonly paths?: Iterable<string>
  readonly slugs?: Iterable<string>
}

function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    renameSync(temporary, path)
  } catch (error) {
    try { rmSync(temporary, { force: true }) } catch { /* 保留原错误 */ }
    throw error
  }
}

export function writePresentedLedger(companyHome: string, ledger: PresentedLedger): void {
  writeJsonAtomic(presentedLedgerPath(companyHome), ledger)
}

/** 合并一次观测（只把 true 写进账本；present 事件是“已声明”，不是 false）。 */
export function mergePresented(
  ledger: PresentedLedger,
  observation: PresentedObservation,
  now: Date = new Date(),
): PresentedLedger {
  const paths: Record<string, boolean> = { ...ledger.paths }
  const slugs: Record<string, boolean> = { ...ledger.slugs }
  let changed = false
  for (const value of observation.paths ?? []) {
    const rel = normalizeRel(value)
    if (rel === '') continue
    if (paths[rel] !== true) { paths[rel] = true; changed = true }
  }
  for (const value of observation.slugs ?? []) {
    if (value === '') continue
    if (slugs[value] !== true) { slugs[value] = true; changed = true }
  }
  if (!changed) return ledger
  return { schema: 1, updatedAt: now.toISOString(), paths, slugs }
}

/** 从旧索引迁移 `presented`（兼容 0.3.10 及以前：false 也在索引里）。 */
export function presentedFromLegacyCatalog(catalog: DeliverablesCatalog | null): PresentedLedger {
  const paths: Record<string, boolean> = {}
  const slugs: Record<string, boolean> = {}
  for (const entry of catalog?.entries ?? []) {
    if (entry.presented !== true && entry.presented !== false) continue
    paths[normalizeRel(entry.path)] = entry.presented
    if (entry.presented === true) slugs[entry.slug] = true
  }
  return { schema: 1, updatedAt: new Date().toISOString(), paths, slugs }
}

export interface LedgerBootstrap {
  readonly ledger: PresentedLedger
  /** 索引缺失时是否需要在后台回扫会话事件补 true。 */
  readonly needsScan: boolean
  readonly migrated: boolean
  readonly warning?: string
}

/**
 * 启动时准备账本：ok 直接用；missing 从旧索引迁移（保住 false），没有索引则给空账本并标记回扫；
 * corrupt/unsupported 保留原文件、不覆盖，交调用方告警。
 * @param companyHome - 公司盘根。
 */
export function ensurePresentedLedger(companyHome: string, now: Date = new Date()): LedgerBootstrap {
  const state = readPresentedLedger(companyHome)
  if (state.status === 'ok') return { ledger: state.ledger, needsScan: false, migrated: false }
  if (state.status === 'missing') {
    const legacy = readCatalog(companyHome)
    if (legacy !== null) {
      const ledger = presentedFromLegacyCatalog(legacy)
      writePresentedLedger(companyHome, ledger)
      return { ledger, needsScan: true, migrated: true }
    }
    return { ledger: emptyPresentedLedger(now), needsScan: true, migrated: false }
  }
  return {
    ledger: emptyPresentedLedger(now),
    needsScan: false,
    migrated: false,
    warning: state.status === 'unsupported'
      ? `presented 审计账本 schema ${String(state.schema)} 高于本包支持（${state.path}）；已保留原文件，presented 暂按未核处理`
      : `presented 审计账本损坏（${state.path}：${state.error}）；已保留原文件，presented 暂按未核处理`,
  }
}

/** 从账本取一条：path 优先，true 可按 slug 延续，false 只认精确 path。 */
export function presentedOf(ledger: PresentedLedger, path: string, slug: string): boolean | null {
  const byPath = ledger.paths[normalizeRel(path)]
  if (byPath === true || byPath === false) return byPath
  return ledger.slugs[slug] === true ? true : null
}

/** 记录一次 live present；损坏/未来账本不覆盖，返回 warning 给 host。 */
export function recordPresented(
  companyHome: string,
  observation: PresentedObservation,
  now: Date = new Date(),
): { readonly ledger?: PresentedLedger; readonly warning?: string } {
  const state = readPresentedLedger(companyHome)
  if (state.status === 'corrupt' || state.status === 'unsupported') {
    return {
      warning: state.status === 'unsupported'
        ? `presented 账本 schema ${String(state.schema)} 高于本包支持，本次 present 不写账本`
        : `presented 账本损坏（${state.error}），本次 present 不写账本`,
    }
  }
  const base = state.status === 'ok' ? state.ledger : ensurePresentedLedger(companyHome, now).ledger
  const ledger = mergePresented(base, observation, now)
  writePresentedLedger(companyHome, ledger)
  return { ledger }
}

/**
 * 人侧交付审计：把一条 final.md 的 presented 结论写进账本（true/false），再重生成索引。
 * 这是 `presented=false` 的第一入口；不再要求用户手改 JSON。
 * @param companyHome - 公司盘根。
 * @param rawPath - 工作区相对路径（也接受公司盘内绝对路径）。
 * @param presented - 审计结论。
 * @param now - 时钟（测试注入）。
 */
export function setPresentedAudit(
  companyHome: string,
  rawPath: string,
  presented: boolean,
  now: Date = new Date(),
): { readonly ledger?: PresentedLedger; readonly path?: string; readonly warning?: string } {
  const root = canonicalPath(companyHome)
  const absolute = isAbsolute(rawPath) ? rawPath : join(root, rawPath)
  const rel = normalizeRel(relative(root, canonicalPath(absolute)))
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel) || !rel.endsWith('/final.md')) {
    return { warning: `审计路径必须是公司盘内的 deliverables/<dir>/final.md 或 deliverables-archive/<dir>/final.md：${rawPath}` }
  }
  if (!/^(deliverables|deliverables-archive)\/[^/]+\/final\.md$/.test(rel)) {
    return { warning: `审计路径只认 deliverables/<dir>/final.md：${rawPath}` }
  }
  const state = readPresentedLedger(companyHome)
  if (state.status === 'corrupt' || state.status === 'unsupported') {
    return { warning: state.status === 'unsupported'
      ? `presented 账本 schema ${String(state.schema)} 高于本包支持，未写`
      : `presented 账本损坏（${state.error}），未写` }
  }
  const base = state.status === 'ok' ? state.ledger : ensurePresentedLedger(companyHome, now).ledger
  const paths: Record<string, boolean> = { ...base.paths, [rel]: presented }
  let next: PresentedLedger = { schema: 1, updatedAt: now.toISOString(), paths, slugs: base.slugs }
  // true 同时写 slug 便于归档后延续；false 只认精确 path，不写 slug。
  if (presented) {
    const slug = rel.split('/')[1] ?? ''
    if (slug !== '') next = { ...next, slugs: { ...next.slugs, [slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')]: true } }
  }
  writePresentedLedger(companyHome, next)
  return { ledger: next, path: rel }
}

/**
 * 从会话事件回扫 `presented=true`。只用于账本缺失的迁移/修复；false 不在这里猜。
 * 只读、可取消；单会话失败计数后继续，不因一条坏日志终止整次修复。
 * @param query - `ctx.sessionQuery` 的最小面。
 * @param companyHome - 公司盘根。
 * @param options - 取消信号 / 时间上限。
 */
export interface PresentedSessionQuery {
  listSessions(signal?: AbortSignal): Promise<readonly { readonly header: { readonly id?: string, readonly cwd?: string } }[]>
  observeSession(
    sessionId: string,
    options?: { readonly projectionMode?: 'all' | 'none', readonly signal?: AbortSignal },
  ): Promise<{
    readonly events: readonly { readonly type?: string, readonly data?: unknown }[]
    readonly [Symbol.dispose]?: () => void
  }>
}

export interface PresentedScanResult extends PresentedObservation {
  readonly scanned: number
  readonly failed: number
}

function isWithin(root: string, path: string): boolean {
  const rel = relative(root, path)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export async function presentedFromSessions(
  query: PresentedSessionQuery,
  companyHome: string,
  signal?: AbortSignal,
): Promise<PresentedScanResult> {
  const root = canonicalPath(companyHome)
  const paths = new Set<string>()
  const slugs = new Set<string>()
  let scanned = 0
  let failed = 0
  const sessions = await query.listSessions(signal)
  for (const record of sessions) {
    if (signal?.aborted) break
    const cwd = record.header.cwd
    if (typeof cwd !== 'string' || !isWithin(root, canonicalPath(cwd))) continue
    const id = record.header.id
    if (typeof id !== 'string' || id === '') continue
    let observation: Awaited<ReturnType<PresentedSessionQuery['observeSession']>> | undefined
    try {
      observation = await query.observeSession(id, { projectionMode: 'none', ...(signal === undefined ? {} : { signal }) })
      scanned += 1
      for (const event of observation.events) {
        if ((event as { type?: unknown }).type !== 'deliverables/presented') continue
        const observed = presentedFromEvent(event, companyHome)
        for (const path of observed.paths) paths.add(path)
        for (const slug of observed.slugs) slugs.add(slug)
      }
    } catch {
      failed += 1
    } finally {
      try { observation?.[Symbol.dispose]?.() } catch { /* 观察租约释放失败不影响已收集结果 */ }
    }
  }
  return { paths, slugs, scanned, failed }
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
    // vendor present 工具返回 realpath；companyHome 可能是 symlink（macOS /var → /private/var）。
    // 两侧都 canonicalize，否则升级/安装路径含 symlink 时 present 永远匹配不上 catalog。
    const root = canonicalPath(companyHome)
    const absolute = isAbsolute(raw) ? raw : join(root, raw)
    const rel = normalizeRel(relative(root, canonicalPath(absolute)))
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

/** 扫描两个交付物根；presented 由账本按 path/slug 命中决定，未命中 = null。 */
function scanEntries(companyHome: string, ledger: PresentedLedger): CatalogScanEntry[] {
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
        // true 可按 path/slug 延续（present 过就是背书）；false 只认精确 path——
        // 同 slug 的新交付物不能继承旧 false，否则会把“审计过未 present”冒充成新件结论。
        presented: presentedOf(ledger, path, slug),
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
 * @param presented - 审计账本；缺席时读盘（ok 才用，否则空账本）。
 */
export function regenerateCatalog(companyHome: string, presented?: PresentedLedger): CatalogResult {
  const path = catalogPath(companyHome)
  if (!existsSync(companyHome)) return { written: false, catalog: null, path }
  let ledger = presented
  if (ledger === undefined) {
    const state = readPresentedLedger(companyHome)
    ledger = state.status === 'ok' ? state.ledger : emptyPresentedLedger()
  }
  const previousState = readCatalogState(companyHome)
  const previous = previousState.status === 'ok' ? previousState.catalog : null
  const entries = scanEntries(companyHome, ledger)
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
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
    renameSync(temporary, path)
  } catch (error) {
    try { rmSync(temporary, { force: true }) } catch { /* 保留原错误 */ }
    throw error
  }
  return { written: true, catalog, path }
}

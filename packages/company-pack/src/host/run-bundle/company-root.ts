/**
 * 公司盘根与子路径的安全解析（2026-11-13，BUG-122/128/129/131/132/134/135/136/137/142/143）。
 *
 * workspace 是模型可写面：`.dsh-company` 本身或任意中间目录都可能是 symlink/文件。
 * 读、写都必须先证明：根是 workspace 内的普通目录；中间目录不是 symlink；最终文件不是目录。
 * 这里把「根/子目录/读/原子写」收成一份判据；catalog / ledger / startup / bootstrap / 命令共用。
 */
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync, type Stats } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { plainFileProblem, isInside } from '../fs/safe-file.ts'
import { assertCompanyWritesAllowed } from './write-gate.ts'

/** 公司盘路径不安全（symlink/文件占目录/越界）。 */
export class UnsafeCompanyPathError extends Error {
  readonly messageEn: string
  constructor(message: string, messageEn?: string) {
    super(message)
    this.name = 'UnsafeCompanyPathError'
    this.messageEn = messageEn ?? message
  }
}

export type CompanyRootLang = 'zh' | 'en'

function unsafePath(zh: string, en: string, lang: CompanyRootLang = 'zh'): UnsafeCompanyPathError {
  return new UnsafeCompanyPathError(lang === 'en' ? en : zh, en)
}

/** 把 `.dsh-company/…` / `kb/…` 统一成相对公司盘根的路径（保留给词法路径辅助函数）。 */
function relToCompany(rel: string): string {
  // 公司盘内部路径统一用 `/`；Windows 分隔符也按分隔符处理（BUG-180）。
  let normalized = rel.replaceAll('\\', '/')
  while (normalized.startsWith('./')) normalized = normalized.slice(2)
  if (normalized === '.dsh-company') return ''
  return normalized.startsWith('.dsh-company/') ? normalized.slice('.dsh-company/'.length) : normalized
}

/** `<workspace>/.dsh-company`（词法路径，不保证安全）。 */
export function companyHomeOf(workspace: string): string {
  return join(workspace, '.dsh-company')
}

function lstatOrNull(path: string): Stats | null {
  try { return lstatSync(path) } catch { return null }
}

interface ResolvedCompanyPath {
  readonly segments: readonly string[]
  readonly traversedPrefixes: readonly (readonly string[])[]
}

/**
 * 把公司盘内相对路径解析为已消解段栈 + 所有被 `..` 回退跨越过的中间前缀。
 *
 * 为什么还要记 `traversedPrefixes`：内核走 `kb/symlink/../x` 时会先跟随 `kb/symlink` 到外部再 `..`；
 * 只做词法栈消解会漏掉对已弹出段 `kb/symlink` 的 `lstatSync` 检查。
 */
export function resolveCompanySegments(
  rawRel: string,
  options: { readonly allowRoot: boolean; readonly stripCompanyPrefix: boolean; readonly lang?: CompanyRootLang },
): ResolvedCompanyPath {
  const lang = options.lang ?? 'zh'
  let normalized = rawRel.replaceAll('\\', '/')
  if (normalized.includes('\0')) {
    throw unsafePath(`公司盘路径含空字节：${rawRel}`, `Company disk path contains null byte: ${rawRel}`, lang)
  }
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw unsafePath(`公司盘路径必须是相对路径：${rawRel}`, `Company disk path must be relative: ${rawRel}`, lang)
  }
  if (options.stripCompanyPrefix) {
    while (normalized.startsWith('./')) normalized = normalized.slice(2)
    if (normalized === '.dsh-company') normalized = ''
    else if (normalized.startsWith('.dsh-company/')) normalized = normalized.slice('.dsh-company/'.length)
  }
  const segments: string[] = []
  const traversedPrefixes: string[][] = []
  for (const segment of normalized.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) {
        throw unsafePath(`公司盘路径越出根：${rawRel}`, `Company disk path escapes root: ${rawRel}`, lang)
      }
      traversedPrefixes.push([...segments])
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  if (!options.allowRoot && segments.length === 0) {
    throw unsafePath(`公司盘目标不能指向盘根自身：${rawRel}`, `Company disk target cannot point to the disk root itself: ${rawRel}`, lang)
  }
  return { segments, traversedPrefixes }
}

/** 证明所有被 `..` 跨越过的中间前缀在盘上都不是 symlink 或非目录。 */
function verifyTraversedPrefixes(root: string, traversedPrefixes: readonly (readonly string[])[], lang: CompanyRootLang = 'zh'): void {
  for (const prefix of traversedPrefixes) {
    let current = root
    for (const segment of prefix) {
      current = join(current, segment)
      const info = lstatOrNull(current)
      if (info === null) break
      if (info.isSymbolicLink()) {
        throw unsafePath(`公司盘路径经由 symlink 目录回退：${current}`, `Company disk path traverses back through a symlink directory: ${current}`, lang)
      }
      if (!info.isDirectory()) {
        throw unsafePath(`公司盘路径中间段不是目录：${current}`, `Company disk path intermediate segment is not a directory: ${current}`, lang)
      }
    }
  }
}

/** 从已证明安全的根逐级走已消解目录段；create 时缺失则创建，symlink/文件占目录 → typed error。 */
function walkSegmentList(root: string, segments: readonly string[], create: boolean, lang: CompanyRootLang = 'zh'): string {
  let current = root
  for (const segment of segments) {
    current = join(current, segment)
    let info = lstatOrNull(current)
    if (info === null) {
      if (!create) return current
      try { mkdirSync(current) } catch (error) {
        throw unsafePath(`无法创建公司盘子目录：${current}（${(error as Error).message}）`, `Cannot create company disk subdirectory: ${current} (${(error as Error).message})`, lang)
      }
      info = lstatOrNull(current)
      if (info === null) {
        throw unsafePath(`公司盘子目录无法创建：${current}`, `Company disk subdirectory could not be created: ${current}`, lang)
      }
    }
    if (info.isSymbolicLink()) {
      throw unsafePath(`公司盘子目录是 symlink，拒绝：${current}`, `Company disk subdirectory is a symlink, refusing: ${current}`, lang)
    }
    if (!info.isDirectory()) {
      throw unsafePath(`公司盘子目录不是目录：${current}`, `Company disk subdirectory is not a directory: ${current}`, lang)
    }
  }
  return current
}

function walkCompanyDirs(
  root: string,
  rawRel: string,
  create: boolean,
  options: { readonly allowRoot: boolean; readonly stripCompanyPrefix: boolean; readonly lang?: CompanyRootLang },
): string {
  const lang = options.lang ?? 'zh'
  const { segments, traversedPrefixes } = resolveCompanySegments(rawRel, options)
  verifyTraversedPrefixes(root, traversedPrefixes, lang)
  return walkSegmentList(root, segments, create, lang)
}

/** 在已证明安全的根下原子写文件（父目录安全、目标非目录；symlink 由 rename 替换）。 */
/** 原子写的 fs 注入面（内部缝，仅测试用于制造 TOCTOU；生产默认 node:fs）。 */
export interface CompanyAtomicWriteDeps {
  readonly writeFile?: (path: string, data: string, options: { readonly flag: 'wx' }) => void
  readonly rename?: (from: string, to: string) => void
  readonly unlink?: (path: string) => void
  readonly realpath?: (path: string) => string
}

/** 写入 temp 后、rename 前再证明父目录真实路径没变；变了就拒绝（TOCTOU 收窄，非完全关闭）。 */
function recheckParent(
  root: string,
  traversedPrefixes: readonly (readonly string[])[],
  parentSegments: readonly string[],
  parentReal: string,
  realpath: (path: string) => string,
  lang: CompanyRootLang = 'zh',
): void {
  try {
    const info = lstatOrNull(root)
    if (info === null || info.isSymbolicLink() || !info.isDirectory()) {
      throw unsafePath(`公司盘根在写入期间被替换：${root}`, `Company disk root was replaced during write: ${root}`, lang)
    }
    verifyTraversedPrefixes(root, traversedPrefixes, lang)
    if (parentSegments.length === 0) {
      if (realpath(root) !== parentReal) {
        throw unsafePath(`公司盘根在写入期间被替换：${root}`, `Company disk root was replaced during write: ${root}`, lang)
      }
      return
    }
    const current = walkSegmentList(root, parentSegments, false, lang)
    if (realpath(current) !== parentReal) {
      throw unsafePath(`公司盘父目录在写入期间被替换：${current}`, `Company disk parent directory was replaced during write: ${current}`, lang)
    }
  } catch (error) {
    if (error instanceof UnsafeCompanyPathError) throw error
    throw unsafePath(`公司盘父目录在写入期间不可解析：${parentSegments.join('/')}（${(error as Error).message}）`, `Company disk parent directory became unresolvable during write: ${parentSegments.join('/')} (${(error as Error).message})`, lang)
  }
}

function writeAtomicAtRoot(
  root: string,
  rawRel: string,
  text: string,
  stripCompanyPrefix: boolean,
  deps: CompanyAtomicWriteDeps = {},
  lang: CompanyRootLang = 'zh',
): void {
  const { segments, traversedPrefixes } = resolveCompanySegments(rawRel, { allowRoot: false, stripCompanyPrefix, lang })
  verifyTraversedPrefixes(root, traversedPrefixes, lang)
  const parentSegments = segments.slice(0, -1)
  const leaf = segments[segments.length - 1] ?? ''
  const parent = parentSegments.length === 0 ? root : walkSegmentList(root, parentSegments, true, lang)
  const parentReal = (deps.realpath ?? realpathSync)(parent)
  const target = join(parent, leaf)
  const info = lstatOrNull(target)
  if (info !== null && info.isDirectory()) {
    throw unsafePath(`公司盘文件被目录占用：${target}`, `Company disk file path is occupied by a directory: ${target}`, lang)
  }
  const temporary = `${target}.${String(process.pid)}.${randomUUID()}.tmp`
  try {
    ;(deps.writeFile ?? writeFileSync)(temporary, text, { flag: 'wx' })
    // 注入缝：测试在这里把父目录换成 symlink；生产路径下窗口极小，但 rename 仍走路径，
    // Node 没有 renameat/openat，无法完全关闭——残余风险见 Note。
    recheckParent(root, traversedPrefixes, parentSegments, parentReal, deps.realpath ?? realpathSync, lang)
    ;(deps.rename ?? renameSync)(temporary, target)
  } catch (error) {
    try { (deps.unlink ?? unlinkSync)(temporary) } catch { /* 未创建/已 rename */ }
    throw error
  }
}

/**
 * 证明公司盘根是 workspace 内的普通目录；`create` 时缺失则创建。
 * @throws UnsafeCompanyPathError
 */
export function ensureCompanyRoot(workspace: string, options: { readonly create?: boolean; readonly lang?: CompanyRootLang } = {}): string {
  const lang = options.lang ?? 'zh'
  if (options.create === true) assertCompanyWritesAllowed(lang)
  const root = companyHomeOf(workspace)
  let info = lstatOrNull(root)
  if (info === null) {
    if (options.create !== true) return root
    try { mkdirSync(root) } catch (error) {
      throw unsafePath(`无法创建公司盘根：${root}（${(error as Error).message}）`, `Cannot create company disk root: ${root} (${(error as Error).message})`, lang)
    }
    info = lstatOrNull(root)
    if (info === null) throw unsafePath(`公司盘根无法创建：${root}`, `Company disk root could not be created: ${root}`, lang)
  }
  if (info === null) throw unsafePath(`公司盘根不存在：${root}`, `Company disk root does not exist: ${root}`, lang)
  if (info.isSymbolicLink()) throw unsafePath(`公司盘根是 symlink，拒绝：${root}`, `Company disk root is a symlink, refusing: ${root}`, lang)
  if (!info.isDirectory()) throw unsafePath(`公司盘根不是目录：${root}`, `Company disk root is not a directory: ${root}`, lang)
  try {
    if (!isInside(workspace, realpathSync(root))) {
      throw unsafePath(`公司盘根真实路径越出 workspace：${root}`, `Company disk root real path escapes workspace: ${root}`, lang)
    }
  } catch (error) {
    if (error instanceof UnsafeCompanyPathError) throw error
    throw unsafePath(`公司盘根不可解析：${root}（${(error as Error).message}）`, `Company disk root is unresolvable: ${root} (${(error as Error).message})`, lang)
  }
  return root
}

/**
 * 证明 `rel` 的每一级父目录都是公司盘根内的普通目录；`create` 时缺失则创建。
 * @returns 目标绝对路径（目录本身必须按需已存在；不会跟随 symlink）。
 */
export function ensureCompanyDir(workspace: string, rawRel: string, options: { readonly create?: boolean; readonly lang?: CompanyRootLang } = {}): string {
  const lang = options.lang ?? 'zh'
  if (options.create === true) assertCompanyWritesAllowed(lang)
  return walkCompanyDirs(ensureCompanyRoot(workspace, options), rawRel, options.create === true, {
    allowRoot: true,
    stripCompanyPrefix: true,
    lang,
  })
}

/** 公司盘内文件的词法绝对路径（不保证安全）。 */
export function companyFilePath(workspace: string, rawRel: string): string {
  return join(companyHomeOf(workspace), relToCompany(rawRel))
}

function readCompanyFileUnderRoot(root: string, rawRel: string, stripCompanyPrefix: boolean): CompanyFileRead {
  let resolved: ResolvedCompanyPath
  try {
    resolved = resolveCompanySegments(rawRel, { allowRoot: false, stripCompanyPrefix })
  } catch (error) {
    return { kind: 'unsafe', reason: (error as Error).message }
  }
  try {
    verifyTraversedPrefixes(root, resolved.traversedPrefixes)
    if (resolved.segments.length > 1) {
      walkSegmentList(root, resolved.segments.slice(0, -1), false)
    }
  } catch (error) {
    return { kind: 'unsafe', reason: `父目录不是公司盘内的普通目录：${(error as Error).message}` }
  }
  const target = join(root, ...resolved.segments)
  const problem = plainFileProblem(root, target)
  if (problem === 'missing') return { kind: 'missing' }
  if (problem !== null) return { kind: 'unsafe', reason: `${rawRel} 不是可读普通文件（${problem}）` }
  try { return { kind: 'text', text: readFileSync(target, 'utf8') } } catch (error) {
    return { kind: 'unsafe', reason: `${rawRel} 读取失败：${(error as Error).message}` }
  }
}

/** 读workspace内公司盘文件并保留text/missing/unsafe；workspace根与前缀规则由此入口统一负责。 */
export function readCompanyFile(workspace: string, rawRel: string): CompanyFileRead {
  let root: string
  try { root = ensureCompanyRoot(workspace) } catch (error) {
    return { kind: 'unsafe', reason: `公司盘根不是可读目录：${(error as Error).message}` }
  }
  return readCompanyFileUnderRoot(root, rawRel, true)
}

/** 可读普通文件判据：根/中间目录安全 + 叶子非 symlink 且在根内；只产生 missing / unsafe。 */
export function companyFileProblem(workspace: string, rawRel: string): 'missing' | 'unsafe' | null {
  const read = readCompanyFile(workspace, rawRel)
  return read.kind === 'text' ? null : read.kind
}

/** 读公司盘内普通文件；缺失/不安全/坏形状返回 undefined（调用方决定文案）。 */
export function readCompanyText(workspace: string, rawRel: string): string | undefined {
  const read = readCompanyFile(workspace, rawRel)
  return read.kind === 'text' ? read.text : undefined
}

/**
 * 原子写公司盘内文件：根/父目录安全、目标不是目录；symlink 目标由 rename 替换（不跟随）。
 * @throws UnsafeCompanyPathError | CompanyWriteBlockedError
 */
export function writeCompanyAtomic(workspace: string, rawRel: string, text: string, deps: CompanyAtomicWriteDeps = {}): void {
  assertCompanyWritesAllowed()
  writeAtomicAtRoot(ensureCompanyRoot(workspace, { create: true }), rawRel, text, true, deps)
}

/** 安全创建公司盘内目录（目录条目被文件占用、越界、指向盘根或跨越 symlink 时抛 typed error）。 */
export function createCompanyDir(workspace: string, rawRel: string): void {
  assertCompanyWritesAllowed()
  walkCompanyDirs(ensureCompanyRoot(workspace, { create: true }), rawRel, true, {
    allowRoot: false,
    stripCompanyPrefix: true,
  })
}

// ── companyHome 版本（catalog/ledger 等已持有 `<workspace>/.dsh-company` 的模块）────────────

/** 证明给定的 companyHome 是普通目录（缺失/`create` 时创建）；不校验 workspace 前缀。 */
export function ensureCompanyRootAt(companyHome: string, options: { readonly create?: boolean; readonly lang?: CompanyRootLang } = {}): string {
  const lang = options.lang ?? 'zh'
  if (options.create === true) assertCompanyWritesAllowed(lang)
  let info = lstatOrNull(companyHome)
  if (info === null) {
    if (options.create !== true) return companyHome
    try { mkdirSync(companyHome, { recursive: true }) } catch (error) {
      throw unsafePath(`无法创建公司盘根：${companyHome}（${(error as Error).message}）`, `Cannot create company disk root: ${companyHome} (${(error as Error).message})`, lang)
    }
    info = lstatOrNull(companyHome)
    if (info === null) throw unsafePath(`公司盘根无法创建：${companyHome}`, `Company disk root could not be created: ${companyHome}`, lang)
  }
  if (info.isSymbolicLink()) throw unsafePath(`公司盘根是 symlink，拒绝：${companyHome}`, `Company disk root is a symlink, refusing: ${companyHome}`, lang)
  if (!info.isDirectory()) throw unsafePath(`公司盘根不是目录：${companyHome}`, `Company disk root is not a directory: ${companyHome}`, lang)
  return companyHome
}

/** 逐级证明 companyHome 下的目录安全（可选创建）；symlink/文件占目录 → typed error。 */
export function ensureCompanyDirAt(companyHome: string, rel: string, options: { readonly create?: boolean; readonly lang?: CompanyRootLang } = {}): string {
  const lang = options.lang ?? 'zh'
  if (options.create === true) assertCompanyWritesAllowed(lang)
  return walkCompanyDirs(ensureCompanyRootAt(companyHome, options), rel, options.create === true, {
    allowRoot: true,
    stripCompanyPrefix: false,
    lang,
  })
}

/**
 * 校验 companyHome 下的目标子路径（含中间 `..` 跨越段与目标自身）没有经过或落到 symlink。
 * 目标或父目录尚未落盘时放行（兼容合成测试与未落盘预览路径）；一旦盘上存在 symlink/非目录中间段即抛。
 */
export function verifyCompanySubpathAt(companyHome: string, rawRel: string, lang: CompanyRootLang = 'zh'): readonly string[] {
  const root = ensureCompanyRootAt(companyHome, { lang })
  const { segments, traversedPrefixes } = resolveCompanySegments(rawRel, {
    allowRoot: false,
    stripCompanyPrefix: false,
    lang,
  })
  verifyTraversedPrefixes(root, traversedPrefixes, lang)
  if (segments.length > 1) {
    walkSegmentList(root, segments.slice(0, -1), false, lang)
  }
  const target = join(root, ...segments)
  const leafInfo = lstatOrNull(target)
  if (leafInfo !== null && leafInfo.isSymbolicLink()) {
    throw unsafePath(`公司盘目标是 symlink，拒绝：${target}`, `Company disk target is a symlink, refusing: ${target}`, lang)
  }
  return segments
}

/** companyHome 下文件的形状：missing / unsafe（symlink/目录/越界）/ null（可读普通文件）。 */
export function companyFileProblemAt(companyHome: string, rel: string): 'missing' | 'unsafe' | null {
  const read = readCompanyFileAt(companyHome, rel)
  return read.kind === 'text' ? null : read.kind
}

/** 读 companyHome 下普通文件；坏形状返回 undefined。 */
export function readCompanyTextAt(companyHome: string, rel: string): string | undefined {
  const read = readCompanyFileAt(companyHome, rel)
  return read.kind === 'text' ? read.text : undefined
}

/** 公司盘文件读取的三态；`unsafe` 包含坏路径形状与底层打开/读取异常的保守失败桶。 */
export type CompanyFileRead =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unsafe'; readonly reason: string }

/**
 * 读 companyHome 下文件并保留形状子类（BUG-156）。
 *
 * 为什么不是 `readCompanyTextAt`：调用方需要区分「真没有」与「有但不能安全读」——旧动议的
 * 缺失豁免只适用于前者；把 symlink/越界折成 undefined 会让别的读面把「不安全」当成「没有」。
 * @param companyHome - `<workspace>/.dsh-company` 目录（不跟随 symlink 的根）。
 * @param rel - 相对 companyHome 的路径。
 * @returns text / missing / unsafe；`missing/unsafe` 沿用底层判据分桶，不保证精确区分errno；unsafe reason可作诊断文案。
 */
export function readCompanyFileAt(companyHome: string, rel: string): CompanyFileRead {
  let root: string
  try { root = ensureCompanyRootAt(companyHome) } catch (error) {
    return { kind: 'unsafe', reason: `公司盘根不是可读目录：${(error as Error).message}` }
  }
  return readCompanyFileUnderRoot(root, rel, false)
}

/** 原子写 companyHome 下文件（父目录安全、目标非目录；symlink 由 rename 替换）。 */
export function writeCompanyAtomicAt(companyHome: string, rel: string, text: string, deps: CompanyAtomicWriteDeps = {}): void {
  assertCompanyWritesAllowed()
  writeAtomicAtRoot(ensureCompanyRootAt(companyHome, { create: true }), rel, text, false, deps)
}

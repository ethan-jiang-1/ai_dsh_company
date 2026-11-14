/**
 * 公司盘根与子路径的安全解析（2026-11-13，BUG-122/128/129/131/132/134/135/136/137/142/143）。
 *
 * workspace 是模型可写面：`.dsh-company` 本身或任意中间目录都可能是 symlink/文件。
 * 读、写都必须先证明：根是 workspace 内的普通目录；中间目录不是 symlink；最终文件不是目录。
 * 这里把「根/子目录/读/原子写」收成一份判据；catalog / ledger / startup / bootstrap / 命令共用。
 */
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync, type Stats } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { plainFileProblem, isInside } from '../fs/safe-file.ts'
import { assertCompanyWritesAllowed } from './write-gate.ts'

/** 公司盘路径不安全（symlink/文件占目录/越界）。 */
export class UnsafeCompanyPathError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeCompanyPathError'
  }
}

/** 把 `.dsh-company/…` / `kb/…` 统一成相对公司盘根的路径。 */
function relToCompany(rel: string): string {
  const normalized = rel.replace(/^\.?\//, '')
  return normalized.startsWith('.dsh-company/') ? normalized.slice('.dsh-company/'.length) : normalized
}

/** `<workspace>/.dsh-company`（词法路径，不保证安全）。 */
export function companyHomeOf(workspace: string): string {
  return join(workspace, '.dsh-company')
}

function lstatOrNull(path: string): Stats | null {
  try { return lstatSync(path) } catch { return null }
}

/** 从已证明安全的根逐级走目录；create 时缺失则创建，symlink/文件占目录 → typed error。 */
function walkCompanyDirs(root: string, rel: string, create: boolean): string {
  let current = root
  for (const segment of rel.split('/').filter(Boolean)) {
    current = join(current, segment)
    let info = lstatOrNull(current)
    if (info === null) {
      if (!create) return current
      try { mkdirSync(current) } catch (error) {
        throw new UnsafeCompanyPathError(`无法创建公司盘子目录：${current}（${(error as Error).message}）`)
      }
      info = lstatOrNull(current)
      if (info === null) throw new UnsafeCompanyPathError(`公司盘子目录无法创建：${current}`)
    }
    if (info.isSymbolicLink()) throw new UnsafeCompanyPathError(`公司盘子目录是 symlink，拒绝：${current}`)
    if (!info.isDirectory()) throw new UnsafeCompanyPathError(`公司盘子目录不是目录：${current}`)
  }
  return current
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
function recheckParent(root: string, parentRel: string, parentReal: string, realpath: (path: string) => string): void {
  try {
    if (parentRel === '.') {
      // root 可能是 workspace 的 `.dsh-company`，也可能是 companyHome 本身（*At 变体）；
      // 这里只校验 root 自身，不能再用 ensureCompanyRoot（那会再拼一层 `.dsh-company`）。
      const info = lstatOrNull(root)
      if (info === null || info.isSymbolicLink() || !info.isDirectory()) {
        throw new UnsafeCompanyPathError(`公司盘根在写入期间被替换：${root}`)
      }
      if (realpath(root) !== parentReal) throw new UnsafeCompanyPathError(`公司盘根在写入期间被替换：${root}`)
      return
    }
    const current = walkCompanyDirs(root, parentRel, false)
    if (realpath(current) !== parentReal) {
      throw new UnsafeCompanyPathError(`公司盘父目录在写入期间被替换：${current}`)
    }
  } catch (error) {
    if (error instanceof UnsafeCompanyPathError) throw error
    throw new UnsafeCompanyPathError(`公司盘父目录在写入期间不可解析：${parentRel}（${(error as Error).message}）`)
  }
}

function writeAtomicAtRoot(root: string, rel: string, text: string, deps: CompanyAtomicWriteDeps = {}): void {
  const parentRel = dirname(rel)
  const parent = parentRel === '.' ? root : walkCompanyDirs(root, parentRel, true)
  const parentReal = (deps.realpath ?? realpathSync)(parent)
  const target = join(parent, rel.slice(parentRel === '.' ? 0 : parentRel.length + 1))
  const info = lstatOrNull(target)
  if (info !== null && info.isDirectory()) throw new UnsafeCompanyPathError(`公司盘文件被目录占用：${target}`)
  const temporary = `${target}.${String(process.pid)}.${randomUUID()}.tmp`
  try {
    ;(deps.writeFile ?? writeFileSync)(temporary, text, { flag: 'wx' })
    // 注入缝：测试在这里把父目录换成 symlink；生产路径下窗口极小，但 rename 仍走路径，
    // Node 没有 renameat/openat，无法完全关闭——残余风险见 Note。
    recheckParent(root, parentRel, parentReal, deps.realpath ?? realpathSync)
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
export function ensureCompanyRoot(workspace: string, options: { readonly create?: boolean } = {}): string {
  if (options.create === true) assertCompanyWritesAllowed()
  const root = companyHomeOf(workspace)
  let info = lstatOrNull(root)
  if (info === null) {
    if (options.create !== true) return root
    try { mkdirSync(root) } catch (error) {
      throw new UnsafeCompanyPathError(`无法创建公司盘根：${root}（${(error as Error).message}）`)
    }
    info = lstatOrNull(root)
    if (info === null) throw new UnsafeCompanyPathError(`公司盘根无法创建：${root}`)
  }
  if (info === null) throw new UnsafeCompanyPathError(`公司盘根不存在：${root}`)
  if (info.isSymbolicLink()) throw new UnsafeCompanyPathError(`公司盘根是 symlink，拒绝：${root}`)
  if (!info.isDirectory()) throw new UnsafeCompanyPathError(`公司盘根不是目录：${root}`)
  try {
    if (!isInside(workspace, realpathSync(root))) {
      throw new UnsafeCompanyPathError(`公司盘根真实路径越出 workspace：${root}`)
    }
  } catch (error) {
    if (error instanceof UnsafeCompanyPathError) throw error
    throw new UnsafeCompanyPathError(`公司盘根不可解析：${root}（${(error as Error).message}）`)
  }
  return root
}

/**
 * 证明 `rel` 的每一级父目录都是公司盘根内的普通目录；`create` 时缺失则创建。
 * @returns 目标绝对路径（目录本身必须按需已存在；不会跟随 symlink）。
 */
export function ensureCompanyDir(workspace: string, rawRel: string, options: { readonly create?: boolean } = {}): string {
  const rel = relToCompany(rawRel)
  if (options.create === true) assertCompanyWritesAllowed()
  return walkCompanyDirs(ensureCompanyRoot(workspace, options), rel, options.create === true)
}

/** 公司盘内文件的词法绝对路径（不保证安全）。 */
export function companyFilePath(workspace: string, rawRel: string): string {
  return join(companyHomeOf(workspace), relToCompany(rawRel))
}

/** 可读普通文件判据：根/中间目录安全 + 叶子非 symlink 且在根内；只产生 missing / unsafe。 */
export function companyFileProblem(workspace: string, rawRel: string): 'missing' | 'unsafe' | null {
  const rel = relToCompany(rawRel)
  let root: string
  try { root = ensureCompanyRoot(workspace) } catch { return 'unsafe' }
  const parentRel = dirname(rel)
  try { if (parentRel !== '.') ensureCompanyDir(workspace, parentRel) } catch { return 'unsafe' }
  const problem = plainFileProblem(root, companyFilePath(workspace, rel))
  if (problem === null) return null
  return problem === 'missing' ? 'missing' : 'unsafe'
}

/** 读公司盘内普通文件；缺失/不安全/坏形状返回 undefined（调用方决定文案）。 */
export function readCompanyText(workspace: string, rawRel: string): string | undefined {
  const rel = relToCompany(rawRel)
  if (companyFileProblem(workspace, rel) !== null) return undefined
  try { return readFileSync(companyFilePath(workspace, rel), 'utf8') } catch { return undefined }
}

/**
 * 原子写公司盘内文件：根/父目录安全、目标不是目录；symlink 目标由 rename 替换（不跟随）。
 * @throws UnsafeCompanyPathError | CompanyWriteBlockedError
 */
export function writeCompanyAtomic(workspace: string, rawRel: string, text: string, deps: CompanyAtomicWriteDeps = {}): void {
  const rel = relToCompany(rawRel)
  assertCompanyWritesAllowed()
  writeAtomicAtRoot(ensureCompanyRoot(workspace, { create: true }), rel, text, deps)
}

/** 安全创建公司盘内目录（目录条目被文件占用时抛 typed error）。 */
export function createCompanyDir(workspace: string, rawRel: string): void {
  const rel = relToCompany(rawRel)
  assertCompanyWritesAllowed()
  const relPath = resolve(companyHomeOf(workspace), rel)
  const within = relative(resolve(workspace), relPath)
  if (within.startsWith('..') || isAbsolute(within)) throw new UnsafeCompanyPathError(`公司盘目录越出 workspace：${rel}`)
  ensureCompanyDir(workspace, rel, { create: true })
}

// ── companyHome 版本（catalog/ledger 等已持有 `<workspace>/.dsh-company` 的模块）────────────

/** 证明给定的 companyHome 是普通目录（缺失/`create` 时创建）；不校验 workspace 前缀。 */
export function ensureCompanyRootAt(companyHome: string, options: { readonly create?: boolean } = {}): string {
  if (options.create === true) assertCompanyWritesAllowed()
  let info = lstatOrNull(companyHome)
  if (info === null) {
    if (options.create !== true) return companyHome
    try { mkdirSync(companyHome, { recursive: true }) } catch (error) {
      throw new UnsafeCompanyPathError(`无法创建公司盘根：${companyHome}（${(error as Error).message}）`)
    }
    info = lstatOrNull(companyHome)
    if (info === null) throw new UnsafeCompanyPathError(`公司盘根无法创建：${companyHome}`)
  }
  if (info.isSymbolicLink()) throw new UnsafeCompanyPathError(`公司盘根是 symlink，拒绝：${companyHome}`)
  if (!info.isDirectory()) throw new UnsafeCompanyPathError(`公司盘根不是目录：${companyHome}`)
  return companyHome
}

/** 逐级证明 companyHome 下的目录安全（可选创建）；symlink/文件占目录 → typed error。 */
export function ensureCompanyDirAt(companyHome: string, rel: string, options: { readonly create?: boolean } = {}): string {
  if (options.create === true) assertCompanyWritesAllowed()
  return walkCompanyDirs(ensureCompanyRootAt(companyHome, options), rel, options.create === true)
}

/** companyHome 下文件的形状：missing / unsafe（symlink/目录/越界）/ null（可读普通文件）。 */
export function companyFileProblemAt(companyHome: string, rel: string): 'missing' | 'unsafe' | null {
  try { ensureCompanyRootAt(companyHome) } catch { return 'unsafe' }
  const parentRel = dirname(rel)
  try { if (parentRel !== '.') ensureCompanyDirAt(companyHome, parentRel) } catch { return 'unsafe' }
  const problem = plainFileProblem(companyHome, join(companyHome, rel))
  return problem === null ? null : problem === 'missing' ? 'missing' : 'unsafe'
}

/** 读 companyHome 下普通文件；坏形状返回 undefined。 */
export function readCompanyTextAt(companyHome: string, rel: string): string | undefined {
  if (companyFileProblemAt(companyHome, rel) !== null) return undefined
  try { return readFileSync(join(companyHome, rel), 'utf8') } catch { return undefined }
}

/** 公司盘文件读取的三态；`unsafe` = 有实体但不是可读普通文件（symlink / 越界 / 非文件 / 根或父目录坏）。 */
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
 * @returns text / missing / unsafe；unsafe 的 reason 可直接进模型可见文案。
 */
export function readCompanyFileAt(companyHome: string, rel: string): CompanyFileRead {
  try { ensureCompanyRootAt(companyHome) } catch (error) {
    return { kind: 'unsafe', reason: `公司盘根不是可读目录：${(error as Error).message}` }
  }
  const parentRel = dirname(rel)
  try { if (parentRel !== '.') ensureCompanyDirAt(companyHome, parentRel) } catch (error) {
    return { kind: 'unsafe', reason: `父目录不是公司盘内的普通目录：${(error as Error).message}` }
  }
  const problem = plainFileProblem(companyHome, join(companyHome, rel))
  if (problem === 'missing') return { kind: 'missing' }
  if (problem !== null) return { kind: 'unsafe', reason: `${rel} 不是可读普通文件（${problem}）` }
  try { return { kind: 'text', text: readFileSync(join(companyHome, rel), 'utf8') } } catch (error) {
    return { kind: 'unsafe', reason: `${rel} 读取失败：${(error as Error).message}` }
  }
}

/** 原子写 companyHome 下文件（父目录安全、目标非目录；symlink 由 rename 替换）。 */
export function writeCompanyAtomicAt(companyHome: string, rel: string, text: string, deps: CompanyAtomicWriteDeps = {}): void {
  assertCompanyWritesAllowed()
  writeAtomicAtRoot(ensureCompanyRootAt(companyHome, { create: true }), rel, text, deps)
}

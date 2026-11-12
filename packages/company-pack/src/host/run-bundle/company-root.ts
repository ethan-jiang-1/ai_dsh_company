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
function writeAtomicAtRoot(root: string, rel: string, text: string): void {
  const parentRel = dirname(rel)
  const parent = parentRel === '.' ? root : walkCompanyDirs(root, parentRel, true)
  const target = join(parent, rel.slice(parentRel === '.' ? 0 : parentRel.length + 1))
  const info = lstatOrNull(target)
  if (info !== null && info.isDirectory()) throw new UnsafeCompanyPathError(`公司盘文件被目录占用：${target}`)
  const temporary = `${target}.${String(process.pid)}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, text, { flag: 'wx' })
    renameSync(temporary, target)
  } catch (error) {
    try { unlinkSync(temporary) } catch { /* 未创建/已 rename */ }
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

/** 可读普通文件判据：根/中间目录安全 + 叶子非 symlink 且在根内。 */
export function companyFileProblem(workspace: string, rawRel: string): 'missing' | 'unsafe' | 'corrupt' | null {
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
export function writeCompanyAtomic(workspace: string, rawRel: string, text: string): void {
  const rel = relToCompany(rawRel)
  assertCompanyWritesAllowed()
  writeAtomicAtRoot(ensureCompanyRoot(workspace, { create: true }), rel, text)
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

/** companyHome 下文件的形状：missing / corrupt（symlink/目录/越界）/ null（可读普通文件）。 */
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

/** 原子写 companyHome 下文件（父目录安全、目标非目录；symlink 由 rename 替换）。 */
export function writeCompanyAtomicAt(companyHome: string, rel: string, text: string): void {
  assertCompanyWritesAllowed()
  writeAtomicAtRoot(ensureCompanyRootAt(companyHome, { create: true }), rel, text)
}

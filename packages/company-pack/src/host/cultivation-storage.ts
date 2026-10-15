/**
 * 培养存储层 host 面（2026-10-15 安全加固轮落地；2026-10-16 自 `cultivation.ts` 拆出）：
 * 记录目录与方法层的全部文件操作，承载路径安全判据。
 *
 * 威胁模型（如实声明）：单进程、无对抗性并发改动——check-then-use 竞态不声称免疫。
 * 信任锚：配置的 profile 根之上的路径段、会话 cwd 之上的路径段视为可信；本模块校验
 * 自己拥有的每个组件（培养目录 / 记录目录 / 方法层根 / 角色方法目录 / 方法目录 / 记录文件）。
 *
 * 安全不变量：
 * - 记录 id 只拒路径语义（分隔符 / 绝对路径 / 盘符 / 点段 / NUL / 超长），legacy 任意非路径 id 继续可读；
 * - symlink 组件一律拒绝（读 / 写 / 枚举 / 删除各路径都先 lstat 判普通文件或目录）；
 * - 新建文件用同目录 temp + `link` 独占发布——既有文件零覆盖；记录改写用 sibling-temp + `rename` 原子替换；
 * - 方法目录独占 `mkdir` 占位；碰撞返回未安装且不改动既有文件。
 *
 * keyless 判据 = `tests/company/cultivation.spec.ts`（命令行为经 `CultivationStorage` 观察同一面）。
 */
import {
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, isAbsolute, join, win32 } from 'node:path'
import {
  CULTIVATION_ROLES,
  parseRecord,
  recordText,
  type CultivationRecord,
} from '../lib/cultivation.ts'

/** 名册集合（提案目标必须是五角色）。 */
export const ROSTER = new Set<string>(CULTIVATION_ROLES)

/** 方法 slug 合法形状（skill 目录名安全；中文期望走默认 slug = method-<recordId>）。 */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

/** Record IDs may be legacy text, but never a path, drive prefix, or dot segment. */
function isSafeRecordId(id: string): boolean {
  return id !== '' && id.length <= 128 && id !== '.' && id !== '..'
    && !id.includes('/') && !id.includes('\\') && !id.includes('\0') && !id.includes(':')
    && !isAbsolute(id) && !win32.isAbsolute(id)
}

/** 记录 id：时间戳 + 短随机（文件名倒序 ≈ 最新在前）。 */
function newRecordId(now = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${String(now.getFullYear())}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${rand}`
}

export class UnsafeCultivationPathError extends Error {
  constructor(path: string) {
    super(`拒绝不安全的培养路径：${path}`)
    this.name = 'UnsafeCultivationPathError'
  }
}

/** Return null only when a path component is absent; propagate other filesystem failures. */
function lstatOrNull(path: string): NonNullable<ReturnType<typeof lstatSync>> | null {
  try {
    return lstatSync(path) ?? null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/** Require a real directory at this app-owned path component; never accept a symlink. */
function ensureDirectory(path: string): void {
  let info = lstatOrNull(path)
  if (info === null) {
    mkdirSync(path)
    info = lstatOrNull(path)
  }
  if (info === null || info.isSymbolicLink() || !info.isDirectory()) throw new UnsafeCultivationPathError(path)
}

/** The configured profile root is trusted; all role/slug components below it are checked individually. */
function ensureMethodRoot(root: string): void {
  let info = lstatOrNull(root)
  if (info === null) {
    mkdirSync(root)
    info = lstatOrNull(root)
  }
  if (info === null || info.isSymbolicLink() || !info.isDirectory()) throw new UnsafeCultivationPathError(root)
}

/** Publish a new file without replacing an existing destination. Both paths share one directory/filesystem. */
function writeNewFile(path: string, text: string): void {
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, text, { flag: 'wx' })
    linkSync(temporary, path)
  } catch (error) {
    try { unlinkSync(temporary) } catch { /* Temporary was not created or the link already moved. */ }
    throw error
  }
  try { unlinkSync(temporary) } catch { /* The new hard link is already published; a stale temporary is harmless. */ }
}

function recordPath(recordsDir: string, id: string): string | null {
  if (!isSafeRecordId(id)) return null
  return join(recordsDir, `${id}.md`)
}

function recordsDirectoryState(recordsDir: string): 'missing' | 'ready' {
  const workspaceCultivationDir = dirname(recordsDir)
  const parentInfo = lstatOrNull(workspaceCultivationDir)
  if (parentInfo === null) return 'missing'
  if (parentInfo.isSymbolicLink() || !parentInfo.isDirectory()) throw new UnsafeCultivationPathError(workspaceCultivationDir)
  const recordsInfo = lstatOrNull(recordsDir)
  if (recordsInfo === null) return 'missing'
  if (recordsInfo.isSymbolicLink() || !recordsInfo.isDirectory()) throw new UnsafeCultivationPathError(recordsDir)
  return 'ready'
}

function ensureRecordsDirectory(recordsDir: string): void {
  const cultivationDir = dirname(recordsDir)
  if (lstatOrNull(cultivationDir) === null) mkdirSync(cultivationDir)
  ensureDirectory(cultivationDir)
  ensureDirectory(recordsDir)
}

/** 读全部记录（文件名倒序 = 最新在前；坏形状或非普通文件跳过并计数）。 */
function loadRecords(recordsDir: string): { readonly records: readonly CultivationRecord[], readonly broken: number, readonly reachable: boolean } {
  if (recordsDirectoryState(recordsDir) === 'missing') return { records: [], broken: 0, reachable: false }
  const records: CultivationRecord[] = []
  let broken = 0
  for (const name of readdirSync(recordsDir).filter(n => n.endsWith('.md')).sort().reverse()) {
    const id = name.replace(/\.md$/, '')
    const path = recordPath(recordsDir, id)
    if (path === null) {
      broken++
      continue
    }
    const info = lstatOrNull(path)
    if (info === null || info.isSymbolicLink() || !info.isFile()) {
      broken++
      continue
    }
    const record = parseRecord(id, readFileSync(path, 'utf8'))
    if (record === null) broken++
    else records.push(record)
  }
  return { records, broken, reachable: true }
}

/** 改写 frontmatter 字段（upsert）；正文原样保留，并以 sibling-temp + rename 避免截断。 */
function updateRecordFile(recordsDir: string, id: string, updates: Readonly<Record<string, string>>): void {
  const path = recordPath(recordsDir, id)
  if (path === null) throw new Error(`不安全的记录 id：${id}`)
  if (recordsDirectoryState(recordsDir) !== 'ready') throw new Error(`记录目录不可达：${recordsDir}`)
  const info = lstatOrNull(path)
  if (info === null || info.isSymbolicLink() || !info.isFile()) throw new Error(`拒绝更新非普通记录：${path}`)
  const text = readFileSync(path, 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (match === null) throw new Error(`记录 ${path} 没有 frontmatter，无法改写`)
  const lines = match[1]!.split('\n')
  for (const [key, value] of Object.entries(updates)) {
    const at = lines.findIndex(line => line.startsWith(`${key}:`))
    if (at === -1) lines.push(`${key}: ${value}`)
    else lines[at] = `${key}: ${value}`
  }
  const next = `---\n${lines.join('\n')}\n---${text.slice(match[0].length).startsWith('\n') ? '' : '\n'}${text.slice(match[0].length)}`
  const temporary = join(recordsDir, `.${id}.${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, next, { flag: 'wx' })
    renameSync(temporary, path)
  } catch (error) {
    try { unlinkSync(temporary) } catch { /* Not created, already renamed, or cleanup denied. */ }
    throw error
  }
}

/** Write a record without replacing a colliding filename. */
function writeRecord(recordsDir: string, draft: Parameters<typeof recordText>[0]): string {
  ensureRecordsDirectory(recordsDir)
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = newRecordId()
    const path = recordPath(recordsDir, id)
    if (path === null) throw new Error(`Generated an unsafe cultivation record id: ${id}`)
    try {
      writeNewFile(path, recordText(draft))
      return id
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
  throw new Error('Unable to allocate a unique cultivation record id after 8 attempts')
}

/** Command/storage contract stays private; Node fs remains the only production implementation. */
export interface CultivationStorage {
  writeRecord(recordsDir: string, draft: Parameters<typeof recordText>[0]): string
  readRecord(recordsDir: string, id: string): { readonly text: string } | null
  updateRecord(recordsDir: string, id: string, updates: Readonly<Record<string, string>>): void
  loadRecords(recordsDir: string): ReturnType<typeof loadRecords>
  installMethod(root: string, role: string, slug: string, text: string): boolean
  removeMethod(root: string, role: string, slug: string): string | null
}

/** Host filesystem adapter; IDs and every app-owned path component are checked before I/O. */
export const nodeCultivationStorage: CultivationStorage = {
  writeRecord,
  readRecord(recordsDir, id) {
    const path = recordPath(recordsDir, id)
    if (path === null || recordsDirectoryState(recordsDir) !== 'ready') return null
    const info = lstatOrNull(path)
    if (info === null || info.isSymbolicLink() || !info.isFile()) return null
    return { text: readFileSync(path, 'utf8') }
  },
  updateRecord: updateRecordFile,
  loadRecords,
  installMethod(root, role, slug, text) {
    if (!ROSTER.has(role) || !SLUG_RE.test(slug)) throw new Error(`不安全的方法路径：${role}/${slug}`)
    ensureMethodRoot(root)
    const roleDir = join(root, role)
    ensureDirectory(roleDir)
    const methodDir = join(roleDir, slug)
    try {
      mkdirSync(methodDir)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
      throw error
    }
    try {
      writeNewFile(join(methodDir, 'SKILL.md'), text)
      return true
    } catch (error) {
      try { rmdirSync(methodDir) } catch { /* Remove only the empty directory created above. */ }
      throw error
    }
  },
  removeMethod(root, role, slug) {
    if (!ROSTER.has(role) || !SLUG_RE.test(slug)) throw new Error(`不安全的方法路径：${role}/${slug}`)
    const rootInfo = lstatOrNull(root)
    if (rootInfo === null) return null
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new UnsafeCultivationPathError(root)
    const roleDir = join(root, role)
    const roleInfo = lstatOrNull(roleDir)
    if (roleInfo === null) return null
    if (roleInfo.isSymbolicLink() || !roleInfo.isDirectory()) throw new UnsafeCultivationPathError(roleDir)
    const methodDir = join(roleDir, slug)
    const methodInfo = lstatOrNull(methodDir)
    if (methodInfo === null) return null
    if (methodInfo.isSymbolicLink() || !methodInfo.isDirectory()) throw new UnsafeCultivationPathError(methodDir)
    rmSync(methodDir, { recursive: true })
    return methodDir
  },
}

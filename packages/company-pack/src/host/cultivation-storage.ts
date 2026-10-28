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
  constants,
  copyFileSync,
  existsSync,
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
import type { Dirent } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, isAbsolute, join, win32 } from 'node:path'
import {
  CULTIVATION_ROLES,
  parseRecord,
  recordStampOf,
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
export function newRecordId(now = new Date()): string {
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
    mkdirSync(root, { recursive: true })
    info = lstatOrNull(root)
  }
  if (info === null || info.isSymbolicLink() || !info.isDirectory()) throw new UnsafeCultivationPathError(root)
}

/** 旧 profile 方法层 → 公司级根的一次性迁移标记（skill loader 忽略非 .md 文件）。 */
export const METHOD_MIGRATION_MARKER = '.migrated'

/** 一次方法层迁移的结果（host 日志与测试共用）。 */
export interface MethodMigrationResult {
  readonly copied: readonly string[]
  readonly conflicts: readonly string[]
  readonly warnings: readonly string[]
  readonly skipped: boolean
}

/**
 * 把 `<DSH_HOME>/profiles/<p>/company-cultivation/<role>/<slug>/SKILL.md` 迁到公司级根
 * （2026-10-28 M3）。只读旧文件、不删；新根已有且内容不同时，旧版本落 `.legacy/<profile>/`
 * （不是 SKILL.md，不会被 skill loader 当技能）并记 conflict。marker 保证幂等。
 * @param dshHome - DSH home。
 * @param methodRoot - 新的公司级方法根。
 * @param now - 时钟（marker 用）。
 */
export function migrateLegacyMethodLayers(
  dshHome: string,
  methodRoot: string,
  now: Date = new Date(),
): MethodMigrationResult {
  const result = { copied: [] as string[], conflicts: [] as string[], warnings: [] as string[], skipped: false }
  if (existsSync(join(methodRoot, METHOD_MIGRATION_MARKER))) return { ...result, skipped: true }
  ensureMethodRoot(methodRoot)
  const profilesDir = join(dshHome, 'profiles')
  let profiles: Dirent[] = []
  try {
    profiles = readdirSync(profilesDir, { withFileTypes: true })
  } catch { /* 没有 profiles：没有旧方法 */ }
  for (const profile of profiles.filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const legacyRoot = join(profilesDir, profile.name, 'company-cultivation')
    let roles: Dirent[] = []
    try {
      roles = readdirSync(legacyRoot, { withFileTypes: true })
    } catch { continue }
    for (const role of roles.filter(entry => entry.isDirectory() && ROSTER.has(entry.name))) {
      const roleRoot = join(legacyRoot, role.name)
      let slugs: Dirent[] = []
      try {
        slugs = readdirSync(roleRoot, { withFileTypes: true })
      } catch { continue }
      for (const slug of slugs.filter(entry => entry.isDirectory())) {
        const source = join(roleRoot, slug.name, 'SKILL.md')
        const sourceInfo = lstatOrNull(source)
        if (sourceInfo === null || sourceInfo.isSymbolicLink() || !sourceInfo.isFile()) continue
        const text = readFileSync(source, 'utf8')
        const destDir = join(methodRoot, role.name, slug.name)
        const dest = join(destDir, 'SKILL.md')
        try {
          mkdirSync(destDir, { recursive: true })
          try {
            copyFileSync(source, dest, constants.COPYFILE_EXCL)
            result.copied.push(`${role.name}/${slug.name}`)
            continue
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
          }
          if (readFileSync(dest, 'utf8') === text) continue
          const conflict = join(methodRoot, role.name, '.legacy', profile.name, `${slug.name}.md`)
          mkdirSync(dirname(conflict), { recursive: true })
          try {
            copyFileSync(source, conflict, constants.COPYFILE_EXCL)
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
          }
          result.conflicts.push(`${role.name}/${slug.name} (${profile.name})`)
        } catch (error) {
          result.warnings.push(`${role.name}/${slug.name}：${(error as Error).message}`)
        }
      }
    }
  }
  try {
    writeFileSync(join(methodRoot, METHOD_MIGRATION_MARKER), `${JSON.stringify({
      version: 1,
      migratedAt: now.toISOString(),
      copied: result.copied.length,
      conflicts: result.conflicts.length,
    })}\n`, { flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') result.warnings.push(`写迁移 marker 失败：${(error as Error).message}`)
  }
  return result
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

/**
 * 纯函数：把 frontmatter 字段 upsert 到记录全文（正文原样保留）。
 * 恢复日志用它从旧全文推导“目标全文”，不靠 `includes('revokedAt:')` 猜。
 * @param text - 当前记录全文。
 * @param updates - 要 upsert 的字段。
 * @returns 新全文；没有 frontmatter 给 null。
 */
export function applyRecordUpdates(text: string, updates: Readonly<Record<string, string>>): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (match === null) return null
  const lines = match[1]!.split('\n')
  for (const [key, value] of Object.entries(updates)) {
    const at = lines.findIndex(line => line.startsWith(`${key}:`))
    if (at === -1) lines.push(`${key}: ${value}`)
    else lines[at] = `${key}: ${value}`
  }
  // 保留 closing `---` 之后的原始分隔（可能是一个空行），只替换 frontmatter 字段。
  const closing = match[0].lastIndexOf('---') + 3
  const suffix = match[0].slice(closing) + text.slice(match[0].length)
  return `---\n${lines.join('\n')}\n---${suffix}`
}

/** 改写 frontmatter 字段（upsert）；正文原样保留，并以 sibling-temp + rename 避免截断。 */
function updateRecordFile(recordsDir: string, id: string, updates: Readonly<Record<string, string>>, expectedText?: string): boolean {
  const path = recordPath(recordsDir, id)
  if (path === null) throw new Error(`不安全的记录 id：${id}`)
  if (recordsDirectoryState(recordsDir) !== 'ready') throw new Error(`记录目录不可达：${recordsDir}`)
  const info = lstatOrNull(path)
  if (info === null || info.isSymbolicLink() || !info.isFile()) throw new Error(`拒绝更新非普通记录：${path}`)
  const text = readFileSync(path, 'utf8')
  if (expectedText !== undefined && text !== expectedText) return false
  const next = applyRecordUpdates(text, updates)
  if (next === null) throw new Error(`记录 ${path} 没有 frontmatter，无法改写`)
  // CAS：读后到 rename 前若被外部改过，放弃本次写，调用方提示重试。
  if (readFileSync(path, 'utf8') !== text) return false
  const temporary = join(recordsDir, `.${id}.${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, next, { flag: 'wx' })
    renameSync(temporary, path)
  } catch (error) {
    try { unlinkSync(temporary) } catch { /* Not created, already renamed, or cleanup denied. */ }
    throw error
  }
  return true
}

/** 恢复一条记录到先前读到的全文（revoke 失败回滚用；只写普通文件，原子替换）。 */
function restoreRecordFile(recordsDir: string, id: string, text: string): boolean {
  const path = recordPath(recordsDir, id)
  if (path === null) return false
  if (recordsDirectoryState(recordsDir) !== 'ready') return false
  const info = lstatOrNull(path)
  if (info === null || info.isSymbolicLink() || !info.isFile()) return false
  const temporary = join(recordsDir, `.${id}.${randomUUID()}.restore.tmp`)
  try {
    writeFileSync(temporary, text, { flag: 'wx' })
    renameSync(temporary, path)
    return true
  } catch {
    try { unlinkSync(temporary) } catch { /* ignore */ }
    return false
  }
}

/** 把一条记录移动到归档目录（同一公司盘内；只用于已处理/旧记录）。 */
function archiveRecordFile(recordsDir: string, archiveDir: string, id: string): boolean {
  const path = recordPath(recordsDir, id)
  if (path === null) return false
  if (recordsDirectoryState(recordsDir) !== 'ready') return false
  const info = lstatOrNull(path)
  if (info === null || info.isSymbolicLink() || !info.isFile()) return false
  const archiveInfo = lstatOrNull(archiveDir)
  if (archiveInfo === null) mkdirSync(archiveDir, { recursive: true })
  else if (archiveInfo.isSymbolicLink() || !archiveInfo.isDirectory()) throw new UnsafeCultivationPathError(archiveDir)
  const target = join(archiveDir, `${id}.md`)
  if (lstatOrNull(target) !== null) return false
  renameSync(path, target)
  return true
}

/** 列一个角色方法层里的方法 slug（只认含 SKILL.md 的普通目录）。 */
function listMethodSlugs(root: string, role: string): string[] {
  if (!ROSTER.has(role)) throw new Error(`不安全的方法路径：${role}`)
  const rootInfo = lstatOrNull(root)
  if (rootInfo === null) return []
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new UnsafeCultivationPathError(root)
  const roleDir = join(root, role)
  const roleInfo = lstatOrNull(roleDir)
  if (roleInfo === null) return []
  if (roleInfo.isSymbolicLink() || !roleInfo.isDirectory()) throw new UnsafeCultivationPathError(roleDir)
  const slugs: string[] = []
  for (const entry of readdirSync(roleDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(roleDir, entry.name, 'SKILL.md')
    const info = lstatOrNull(file)
    if (info !== null && !info.isSymbolicLink() && info.isFile()) slugs.push(entry.name)
  }
  return slugs.sort()
}

/** 删除归档目录里早于 cutoff 的记录（只动 .md 普通文件；open 不在这里）。 */
function purgeArchiveFiles(archiveDir: string, cutoff: number): { removed: number, failed: number } {
  const info = lstatOrNull(archiveDir)
  if (info === null) return { removed: 0, failed: 0 }
  if (info.isSymbolicLink() || !info.isDirectory()) throw new UnsafeCultivationPathError(archiveDir)
  let removed = 0
  let failed = 0
  for (const name of readdirSync(archiveDir).filter(entry => entry.endsWith('.md'))) {
    const id = name.replace(/\.md$/, '')
    const stamp = recordStampOf(id)
    if (stamp === null || stamp >= cutoff) continue
    const path = join(archiveDir, name)
    const file = lstatOrNull(path)
    if (file === null || file.isSymbolicLink() || !file.isFile()) { failed += 1; continue }
    try { unlinkSync(path); removed += 1 } catch { failed += 1 }
  }
  return { removed, failed }
}

/** 读一个已部署方法（revoke 先留副本，失败时恢复）。 */
function readMethodFile(root: string, role: string, slug: string): string | null {
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
  const file = join(methodDir, 'SKILL.md')
  const fileInfo = lstatOrNull(file)
  if (fileInfo === null || fileInfo.isSymbolicLink() || !fileInfo.isFile()) return null
  return readFileSync(file, 'utf8')
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

/** Minimum `ctx.fs` face used for model-initiated record writes (no vendor type leak). */
export interface FsWriteLike {
  resolve(path: string, opts?: { cwd?: string, signal?: AbortSignal }): Promise<unknown>
  writeText(
    target: unknown,
    content: string,
    expected?: { kind: 'createIfAbsent' },
    signal?: AbortSignal,
    sandboxPolicy?: unknown,
  ): Promise<unknown>
}

/**
 * 模型发起的记录写入走 `ctx.fs`（2026-10-28 二轮）：目录仍由 host provisioning 建；
 * 文件内容用 `createIfAbsent` 发布，既有文件零覆盖；`FS_NOT_OBSERVED` 视为 id 碰撞重试。
 * fs 缺席时调用方回退 `writeRecord`（node:fs + link wx）；两者都不做盲覆盖。
 */
export async function writeRecordViaFs(
  fs: FsWriteLike,
  recordsDir: string,
  draft: Parameters<typeof recordText>[0],
  signal?: AbortSignal,
  sandboxPolicy?: unknown,
): Promise<string> {
  ensureRecordsDirectory(recordsDir)
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = newRecordId()
    const path = recordPath(recordsDir, id)
    if (path === null) throw new Error(`Generated an unsafe cultivation record id: ${id}`)
    try {
      const target = await fs.resolve(path)
      await fs.writeText(target, recordText(draft), { kind: 'createIfAbsent' }, signal, sandboxPolicy)
      return id
    } catch (error) {
      if ((error as { code?: unknown }).code !== 'FS_NOT_OBSERVED') throw error
    }
  }
  throw new Error('Unable to allocate a unique cultivation record id after 8 attempts')
}

/** Command/storage contract stays private; Node fs remains the only production implementation. */
export interface CultivationStorage {
  writeRecord(recordsDir: string, draft: Parameters<typeof recordText>[0]): string
  readRecord(recordsDir: string, id: string): { readonly text: string } | null
  updateRecord(recordsDir: string, id: string, updates: Readonly<Record<string, string>>, expectedText?: string): boolean
  restoreRecord(recordsDir: string, id: string, text: string): boolean
  archiveRecord(recordsDir: string, archiveDir: string, id: string): boolean
  purgeArchive(archiveDir: string, cutoff: number): { removed: number, failed: number }
  loadRecords(recordsDir: string): ReturnType<typeof loadRecords>
  installMethod(root: string, role: string, slug: string, text: string): boolean
  readMethod(root: string, role: string, slug: string): string | null
  listMethods(root: string, role: string): string[]
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
  restoreRecord: restoreRecordFile,
  archiveRecord: archiveRecordFile,
  purgeArchive: purgeArchiveFiles,
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
  readMethod: readMethodFile,
  listMethods: listMethodSlugs,
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

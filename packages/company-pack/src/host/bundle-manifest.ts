/**
 * run bundle 的**身份与基部指纹**（2026-10-24 立；2026-11-01 产品化 v2）。
 *
 * 产品化后的形状：
 * - `bundle.json` 住在 **workspace** `<workspace>/.dsh-company/bundle.json`，不再住 home；
 * - v2 去掉 `workspace` 字段（身份跟盘走），新增 `handbookTarget`（`AGENTS.md` / `COMPANY.md`）；
 * - v1 home manifest 可在 workspace 匹配时迁移；`DSH_COMPANY_REBIND` 退役；
 * - host 在 home 留一份 identity 备份，workspace manifest 损坏时 fail loud + 点名恢复；
 * - manifest 在 workspace 是**模型可写**的 host-owned 约定，不是防篡改边界。
 *
 * 本模块只做纯事（可单测）：读 pack 元数据、算骨架哈希、计划/写 manifest、迁移、升级判定。
 * 不抛：调用方按 bootstrap 同样纪律接住错误（apply 期抛错会连累应用）。
 */
import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRecord } from '../lib/guards.ts'
import { canonicalPath } from './paths.ts'
import { appendRotatingLine } from './rotating-log.ts'
import type { HandbookTarget } from './bootstrap.ts'

/** 当前 manifest 形状版本。 */
export const BUNDLE_MANIFEST_VERSION = 2

export const BUNDLE_MANIFEST_FILENAME = 'bundle.json'
export const BUNDLE_MANIFEST_REL = '.dsh-company/bundle.json'
/** 基部升级日志（workspace 内、按次追加）。 */
export const BUNDLE_UPGRADE_LOG = '.dsh-company/logs/company-pack-upgrade.log'
/** home 里的身份备份目录（相对 DSH_HOME）。 */
export const BUNDLE_IDENTITY_DIR = 'company/identity'

export function appendUpgradeLog(workspace: string, message: string): void {
  appendRotatingLine(join(workspace, BUNDLE_UPGRADE_LOG), `${new Date().toISOString()} ${message}\n`)
}

/** manifest 的绝对路径（`<workspace>/.dsh-company/bundle.json`）。 */
export const bundleManifestPath = (workspace: string): string => join(workspace, BUNDLE_MANIFEST_REL)

/** home 身份备份路径。 */
export const identityBackupPath = (dshHome: string, id: string): string =>
  join(dshHome, BUNDLE_IDENTITY_DIR, `${id}.json`)

export interface PackMetadata {
  readonly name: string
  readonly version: string
}

/** manifest 里的路径一律 POSIX 分隔符，便于跨平台阅读。 */
export interface BundleManifest {
  readonly v: typeof BUNDLE_MANIFEST_VERSION
  readonly id: string
  readonly createdAt: string
  readonly pack: PackMetadata
  /** 公司手册实际目标：`AGENTS.md`，或已有项目里的 `COMPANY.md`。 */
  readonly handbookTarget: HandbookTarget
  /** 基部骨架版本 + 每个目标文件的 sha256（hex）。 */
  readonly skeleton: {
    readonly version: string
    readonly files: Readonly<Record<string, string>>
  }
}

export interface ManifestPlan {
  readonly path: string
  readonly manifest: BundleManifest
  readonly backupPath: string
  readonly action: 'create' | 'skip'
  readonly error?: string
}

/** 同目录临时文件 + rename：崩溃时要么旧文件、要么新文件，不留半截。 */
function atomicWriteFile(path: string, data: string | Uint8Array): void {
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, data, { flag: 'wx' })
    renameSync(temporary, path)
  } catch (error) {
    try { unlinkSync(temporary) } catch { /* 临时文件未创建或已 rename */ }
    throw error
  }
}

/** 读 `<pack>/package.json` 的 name/version；读不到时给出可诊断的错误。 */
export function resolvePackMetadata(moduleUrl: string): PackMetadata {
  const path = fileURLToPath(new URL('../package.json', moduleUrl))
  const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: unknown; version?: unknown }
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') {
    throw new Error(`pack package.json 缺 name/version：${path}`)
  }
  return { name: pkg.name, version: pkg.version }
}

/** 递归收集骨架里的普通文件（跳过 dotfile 与符号链接）。 */
function skeletonFiles(skeletonDir: string, rel = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(skeletonDir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...skeletonFiles(skeletonDir, child))
    else if (entry.isFile()) out.push(child)
  }
  return out
}

/**
 * 基部骨架的逐文件 sha256（hex，键 = **目标** POSIX 相对路径）。
 * 手册源 `AGENTS.md` 按 `handbookTarget` 映射；其余同名。
 */
export function skeletonDigest(skeletonDir: string, handbookTarget: HandbookTarget = 'AGENTS.md'): Record<string, string> {
  const files: Record<string, string> = {}
  for (const rel of skeletonFiles(skeletonDir)) {
    const key = rel === 'AGENTS.md' ? handbookTarget : rel
    files[key] = createHash('sha256').update(readFileSync(join(skeletonDir, rel))).digest('hex')
  }
  return files
}

/** 生成 manifest 计划（只读；不写盘）。 */
export function planBundleManifest(options: {
  readonly dshHome: string
  readonly companyHome: string
  readonly skeletonDir: string
  readonly pack: PackMetadata
  readonly handbookTarget: HandbookTarget
  readonly now?: Date
  readonly id?: string
}): ManifestPlan {
  const path = bundleManifestPath(options.companyHome)
  const id = options.id ?? `bundle-${randomUUID()}`
  const backupPath = identityBackupPath(options.dshHome, id)
  const manifest: BundleManifest = {
    v: BUNDLE_MANIFEST_VERSION,
    id,
    createdAt: (options.now ?? new Date()).toISOString(),
    pack: options.pack,
    handbookTarget: options.handbookTarget,
    skeleton: {
      version: options.pack.version,
      files: skeletonDigest(options.skeletonDir, options.handbookTarget),
    },
  }
  if (!existsSync(options.companyHome)) return { path, manifest, backupPath, action: 'skip' }
  if (existsSync(path)) return { path, manifest, backupPath, action: 'skip' }
  return { path, manifest, backupPath, action: 'create' }
}

/** 写 home 身份备份（workspace manifest 的恢复副本；不是第二权威）。 */
export function writeIdentityBackup(backupPath: string, manifest: BundleManifest): void {
  mkdirSync(dirname(backupPath), { recursive: true })
  atomicWriteFile(backupPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

/** 执行计划：只创建；并发/竞态下 `link` 失败视为已有（skip），绝不覆盖。 */
export function writeBundleManifest(
  plan: ManifestPlan,
  deps: { readonly link?: typeof linkSync } = {},
): { created: boolean; skipped: boolean; fallback?: 'wx' } {
  if (plan.error !== undefined || plan.action === 'skip') return { created: false, skipped: true }
  mkdirSync(dirname(plan.path), { recursive: true })
  // 不直接 writeFileSync(path, { flag: 'wx' })：并发第二个 Host 可能读到半截 JSON。
  // 先写临时文件，再用同目录硬链接“发布”——目标已存在时 link 失败，天然保持只创建。
  const temporary = `${plan.path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  const data = `${JSON.stringify(plan.manifest, null, 2)}\n`
  try {
    writeFileSync(temporary, data, { flag: 'wx' })
    try {
      ;(deps.link ?? linkSync)(temporary, plan.path)
      writeIdentityBackup(plan.backupPath, plan.manifest)
      return { created: true, skipped: false }
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'EEXIST') return { created: false, skipped: true }
      // 网络盘/特殊 FS 不支持 hard link：退回 wx 单写（仍不覆盖，但换掉原子发布）。
      if (code === 'EPERM' || code === 'ENOTSUP' || code === 'EOPNOTSUPP' || code === 'EXDEV' || code === 'EMLINK') {
        try {
          writeFileSync(plan.path, data, { flag: 'wx' })
          writeIdentityBackup(plan.backupPath, plan.manifest)
          return { created: true, skipped: false, fallback: 'wx' }
        } catch (fallbackError) {
          if ((fallbackError as { code?: string }).code === 'EEXIST') return { created: false, skipped: true }
          throw fallbackError
        }
      }
      throw error
    }
  } finally {
    try { unlinkSync(temporary) } catch { /* 已 link 走或未创建 */ }
  }
}

/** 读 manifest；不存在或解析失败返回 null（调用方决定告警还是忽略）。 */
export function readBundleManifest(workspace: string): BundleManifest | null {
  const state = readBundleManifestState(workspace)
  return state.status === 'ok' ? state.manifest : null
}

export type BundleManifestState =
  | { readonly status: 'missing'; readonly path: string }
  | { readonly status: 'corrupt'; readonly path: string; readonly error: string }
  | { readonly status: 'unsupported'; readonly path: string; readonly version: number; readonly error: string }
  | { readonly status: 'ok'; readonly path: string; readonly manifest: BundleManifest }

interface ManifestValidation {
  readonly ok: boolean
  readonly manifest?: BundleManifest
  readonly error?: string
  readonly unsupportedVersion?: number
}

/**
 * 校验 v2 manifest 的最低身份形状（v / id / pack / handbookTarget / skeleton）。
 * 未知更高版本必须保留原文件并让调用方告警；损坏形状走 corrupt，不猜、不覆盖。
 */
export function validateBundleManifest(value: unknown): ManifestValidation {
  if (!isRecord(value)) return { ok: false, error: '不是对象' }
  const version = value.v
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    return { ok: false, error: `v 不是正整数（${String(version)}）` }
  }
  if (version > BUNDLE_MANIFEST_VERSION) {
    return {
      ok: false,
      error: `manifest 版本 ${String(version)} 高于本包支持的 ${String(BUNDLE_MANIFEST_VERSION)}`,
      unsupportedVersion: version,
    }
  }
  if (version !== BUNDLE_MANIFEST_VERSION) {
    return { ok: false, error: `不支持的 manifest 版本 ${String(version)}（v1 应从 home 迁移，不能直接当 v2）` }
  }
  if (typeof value.id !== 'string' || value.id.trim() === '') return { ok: false, error: '缺 id' }
  if (typeof value.createdAt !== 'string' || value.createdAt.trim() === '') return { ok: false, error: '缺 createdAt' }
  if (!isRecord(value.pack)) return { ok: false, error: '缺 pack' }
  if (typeof value.pack.name !== 'string' || value.pack.name.trim() === '') return { ok: false, error: 'pack.name 非法' }
  if (typeof value.pack.version !== 'string' || value.pack.version.trim() === '') return { ok: false, error: 'pack.version 非法' }
  if (value.handbookTarget !== 'AGENTS.md' && value.handbookTarget !== 'COMPANY.md') {
    return { ok: false, error: 'handbookTarget 必须是 AGENTS.md 或 COMPANY.md' }
  }
  if (!isRecord(value.skeleton)) return { ok: false, error: '缺 skeleton' }
  if (typeof value.skeleton.version !== 'string' || value.skeleton.version.trim() === '') return { ok: false, error: 'skeleton.version 非法' }
  if (!isRecord(value.skeleton.files)) return { ok: false, error: 'skeleton.files 非法' }
  for (const [rel, hash] of Object.entries(value.skeleton.files)) {
    if (rel === '' || typeof hash !== 'string' || hash === '') return { ok: false, error: `skeleton.files[${rel}] 非法` }
  }
  return { ok: true, manifest: value as unknown as BundleManifest }
}

/** 区分「没装过」「装过但文件坏了」「文件是更新的版本」。 */
export function readBundleManifestState(workspace: string): BundleManifestState {
  const path = bundleManifestPath(workspace)
  try {
    if (!existsSync(path)) return { status: 'missing', path }
    if (!lstatSync(path).isFile()) return { status: 'corrupt', path, error: '不是普通文件' }
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    const validation = validateBundleManifest(parsed)
    if (validation.ok) return { status: 'ok', path, manifest: validation.manifest! }
    if (validation.unsupportedVersion !== undefined) {
      return { status: 'unsupported', path, version: validation.unsupportedVersion, error: validation.error! }
    }
    return { status: 'corrupt', path, error: validation.error! }
  } catch (error) {
    return { status: 'corrupt', path, error: (error as Error).message }
  }
}

// ── v1 → v2 迁移（2026-11-01）────────────────────────────────────────────────────
// v1 住在 `<DSH_HOME>/bundle.json`，含 `workspace` 字段。只有旧 manifest 记录的 workspace
// 与当前解析的 workspace canonical 相同才迁移；旧文件保留为 `.migrated-<时间>`，可回滚。
// 迁移保留 id/createdAt/旧 pack/旧骨架哈希（映射到 handbookTarget），让随后的正常升级把它推到
// 当前 pack；不直接把 skeleton 写成当前版本（否则旧文件会被误判“改过”而永不升级）。

export interface LegacyBundleManifestV1 {
  readonly v: 1
  readonly id: string
  readonly createdAt: string
  readonly pack: PackMetadata
  readonly workspace: string
  readonly skeleton: { readonly version: string; readonly files: Readonly<Record<string, string>> }
}

export const LEGACY_MANIFEST_PATH = (dshHome: string): string => join(dshHome, BUNDLE_MANIFEST_FILENAME)

/** 读 home 的 v1 manifest；不存在/坏形状返回 undefined。 */
export function readLegacyManifest(dshHome: string): LegacyBundleManifestV1 | undefined {
  try {
    const path = LEGACY_MANIFEST_PATH(dshHome)
    if (!existsSync(path)) return undefined
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!isRecord(parsed) || parsed.v !== 1) return undefined
    if (typeof parsed.id !== 'string' || parsed.id === '') return undefined
    if (typeof parsed.createdAt !== 'string' || parsed.createdAt === '') return undefined
    if (!isRecord(parsed.pack) || typeof parsed.pack.name !== 'string' || typeof parsed.pack.version !== 'string') return undefined
    if (typeof parsed.workspace !== 'string' || parsed.workspace === '') return undefined
    if (!isRecord(parsed.skeleton) || typeof parsed.skeleton.version !== 'string' || !isRecord(parsed.skeleton.files)) return undefined
    return parsed as unknown as LegacyBundleManifestV1
  } catch {
    return undefined
  }
}

export interface MigrationResult {
  readonly migrated: boolean
  readonly manifest?: BundleManifest
  readonly legacyPath?: string
  readonly backupPath?: string
  readonly skippedReason?: string
}

/**
 * v1 home manifest → v2 workspace manifest。
 * @param options - home/workspace/当前 pack/手册目标/时间。
 */
export function migrateLegacyManifest(options: {
  readonly dshHome: string
  readonly companyHome: string
  readonly handbookTarget: HandbookTarget
  readonly now?: Date
}): MigrationResult {
  const legacyPath = LEGACY_MANIFEST_PATH(options.dshHome)
  const legacy = readLegacyManifest(options.dshHome)
  if (legacy === undefined) return { migrated: false, skippedReason: '没有可迁移的 v1 manifest' }
  const recorded = isAbsolute(legacy.workspace) ? legacy.workspace : resolve(options.dshHome, legacy.workspace)
  if (canonicalPath(recorded) !== canonicalPath(options.companyHome)) {
    return { migrated: false, legacyPath, skippedReason: `v1 manifest 记录的是 ${recorded}，不是当前 workspace` }
  }
  const targetPath = bundleManifestPath(options.companyHome)
  if (existsSync(targetPath)) return { migrated: false, legacyPath, skippedReason: 'workspace 已有 v2 manifest' }
  const files: Record<string, string> = {}
  for (const [rel, hash] of Object.entries(legacy.skeleton.files)) {
    if (rel === 'AGENTS.md') files[options.handbookTarget] = hash
    else files[rel] = hash
  }
  const manifest: BundleManifest = {
    v: BUNDLE_MANIFEST_VERSION,
    id: legacy.id,
    createdAt: legacy.createdAt,
    pack: legacy.pack,
    handbookTarget: options.handbookTarget,
    skeleton: { version: legacy.skeleton.version, files },
  }
  mkdirSync(dirname(targetPath), { recursive: true })
  atomicWriteFile(targetPath, `${JSON.stringify(manifest, null, 2)}\n`)
  const backupPath = identityBackupPath(options.dshHome, manifest.id)
  writeIdentityBackup(backupPath, manifest)
  const stamp = (options.now ?? new Date()).toISOString().replace(/[:.]/g, '-')
  const migratedLegacy = `${legacyPath}.migrated-${stamp}`
  try { renameSync(legacyPath, migratedLegacy) } catch { /* 保留旧文件也可，不阻断迁移 */ }
  return { migrated: true, manifest, legacyPath: migratedLegacy, backupPath }
}

// ── 基部升级（2026-10-24；2026-11-01 加 handbookTarget 映射）──────────────────────
export interface SkeletonUpgradeAction {
  /** 目标相对路径。 */
  readonly rel: string
  /** 骨架源相对路径（手册目标与源不同名时使用）。 */
  readonly sourceRel: string
  readonly action: 'create' | 'update' | 'keep'
  readonly reason?: 'unchanged' | 'modified' | 'occupied'
}

export interface SkeletonUpgradePlan {
  readonly manifest: BundleManifest
  readonly actions: readonly SkeletonUpgradeAction[]
  readonly changed: boolean
}

const hashFile = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex')

function lstatOrNull(path: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/** 计算升级计划（只读）。 */
export function planSkeletonUpgrade(options: {
  readonly manifest: BundleManifest
  readonly skeletonDir: string
  readonly workspace: string
  readonly pack: PackMetadata
}): SkeletonUpgradePlan {
  const nextFiles = skeletonDigest(options.skeletonDir, options.manifest.handbookTarget)
  const actions: SkeletonUpgradeAction[] = []
  for (const [rel, nextHash] of Object.entries(nextFiles).sort(([a], [b]) => a.localeCompare(b))) {
    const sourceRel = rel === options.manifest.handbookTarget ? 'AGENTS.md' : rel
    const target = join(options.workspace, rel)
    let info: ReturnType<typeof lstatSync> | null
    try {
      info = lstatOrNull(target)
    } catch {
      actions.push({ rel, sourceRel, action: 'keep', reason: 'occupied' })
      continue
    }
    if (info === null || info === undefined) {
      actions.push({ rel, sourceRel, action: 'create' })
      continue
    }
    // 符号链接/目录/设备不是我们的基部文件：绝不 rename 覆盖用户的东西。
    if (info.isSymbolicLink() || !info.isFile()) {
      actions.push({ rel, sourceRel, action: 'keep', reason: 'occupied' })
      continue
    }
    let current: string
    try {
      current = hashFile(target)
    } catch {
      actions.push({ rel, sourceRel, action: 'keep', reason: 'occupied' })
      continue
    }
    if (current === nextHash) {
      actions.push({ rel, sourceRel, action: 'keep', reason: 'unchanged' })
      continue
    }
    const base = options.manifest.skeleton.files[rel]
    if (base !== undefined && current === base) actions.push({ rel, sourceRel, action: 'update' })
    else actions.push({ rel, sourceRel, action: 'keep', reason: base === undefined ? 'occupied' : 'modified' })
  }
  const nextManifest: BundleManifest = {
    ...options.manifest,
    pack: options.pack,
    skeleton: { version: options.pack.version, files: nextFiles },
  }
  const changed = options.manifest.skeleton.version !== options.pack.version
    || actions.some(action => action.action !== 'keep')
  return { manifest: nextManifest, actions, changed }
}

/** 执行升级：create/update 写盘；keep 一个字节不动；返回实动清单。 */
export function applySkeletonUpgrade(
  plan: SkeletonUpgradePlan,
  skeletonDir: string,
  workspace: string,
): { readonly created: string[]; readonly updated: string[]; readonly kept: string[] } {
  const created: string[] = []
  const updated: string[] = []
  const kept: string[] = []
  for (const action of plan.actions) {
    if (action.action === 'keep') { kept.push(action.rel); continue }
    const target = join(workspace, action.rel)
    mkdirSync(dirname(target), { recursive: true })
    atomicWriteFile(target, readFileSync(join(skeletonDir, action.sourceRel)))
    if (action.action === 'create') created.push(action.rel)
    else updated.push(action.rel)
  }
  return { created, updated, kept }
}

/** 写回 manifest（原子替换：临时文件 + rename；只在 changed 时调用）。 */
export function writeUpgradedManifest(path: string, manifest: BundleManifest): void {
  mkdirSync(dirname(path), { recursive: true })
  atomicWriteFile(path, `${JSON.stringify(manifest, null, 2)}\n`)
}

/** 目录里每一项的指纹（供测试/诊断；不参与 manifest）。 */
export function fingerprint(dir: string): string[] {
  const rows: string[] = []
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) { rows.push(`${child}/`); walk(child) }
      else rows.push(`${child}:${String(lstatSync(join(dir, child)).size)}`)
    }
  }
  walk('')
  return rows
}

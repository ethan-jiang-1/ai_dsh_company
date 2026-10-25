/**
 * run bundle 的**身份与基部指纹**（2026-10-24 立，RFC run-bundle-install-unit）。
 *
 * 一次安装 = 一个 run bundle = `manifest + 一个 DSH home + 一个 company workspace`。
 * 本模块只做三件纯事（都可单独测）：
 * - 读 pack 元数据（name/version）；
 * - 给落盘的基部骨架算 sha256（升级判定用：未改的基部文件可替换，改过的保留）；
 * - 生成/写入 `<DSH_HOME>/bundle.json`——**只创建、绝不覆盖**（第二次 boot 字节不变）。
 *
 * 边界：
 * - manifest 不是第二权威：live 权威仍是 home + workspace；它只是身份/版本/指针。
 * - 扩张面（方法层 / journal / 交付物 / 会话）不在这里读写；升级不得碰它们。
 * - 不抛：调用方按 bootstrap 同样纪律接住错误（apply 期抛错会连累应用）。
 */
import { createHash, randomUUID } from 'node:crypto'
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 当前 manifest 形状版本；字段变化时升。 */
export const BUNDLE_MANIFEST_VERSION = 1

export const BUNDLE_MANIFEST_FILENAME = 'bundle.json'

/** 基部升级日志（home 内、按次追加）：点名保留的用户改动，手册与 smoke 读它。 */
export const BUNDLE_UPGRADE_LOG = 'logs/company-pack-upgrade.log'

export function appendUpgradeLog(dshHome: string, message: string): void {
  const path = join(dshHome, BUNDLE_UPGRADE_LOG)
  mkdirSync(dirname(path), { recursive: true })
  appendFileSync(path, `${new Date().toISOString()} ${message}\n`, 'utf8')
}

/** manifest 的绝对路径（`<DSH_HOME>/bundle.json`）。 */
export const bundleManifestPath = (dshHome: string): string => join(dshHome, BUNDLE_MANIFEST_FILENAME)

export interface PackMetadata {
  readonly name: string
  readonly version: string
}

/** manifest 里的路径一律 POSIX 分隔符，便于跨平台阅读与迁移。 */
export interface BundleManifest {
  readonly v: typeof BUNDLE_MANIFEST_VERSION
  readonly id: string
  readonly createdAt: string
  readonly pack: PackMetadata
  /** workspace 根：在 home 内则相对 home，否则绝对路径。 */
  readonly workspace: string
  /** 基部骨架版本 + 每个文件的 sha256（hex）；升级判定用。 */
  readonly skeleton: {
    readonly version: string
    readonly files: Readonly<Record<string, string>>
  }
}

export interface ManifestPlan {
  readonly path: string
  readonly manifest: BundleManifest
  readonly action: 'create' | 'skip'
  readonly error?: string
}

const toPosix = (value: string): string => value.split(sep).join('/')

/** 读 `<pack>/package.json` 的 name/version；读不到时给出可诊断的错误。 */
export function resolvePackMetadata(moduleUrl: string): PackMetadata {
  const path = fileURLToPath(new URL('../package.json', moduleUrl))
  const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: unknown; version?: unknown }
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') {
    throw new Error(`pack package.json 缺 name/version：${path}`)
  }
  return { name: pkg.name, version: pkg.version }
}

/** 递归收集骨架里的普通文件（跳过 dotfile 与符号链接——与首启自举的 collect 同口径）。 */
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

/** 基部骨架的逐文件 sha256（hex，键 = POSIX 相对路径）。 */
export function skeletonDigest(skeletonDir: string): Record<string, string> {
  const files: Record<string, string> = {}
  for (const rel of skeletonFiles(skeletonDir)) {
    files[rel] = createHash('sha256').update(readFileSync(join(skeletonDir, rel))).digest('hex')
  }
  return files
}

/** workspace 根的记录形态：在 home 内记相对路径，否则记绝对路径。 */
export function workspaceRecord(dshHome: string, companyHome: string): string {
  const rel = relative(dshHome, companyHome)
  if (rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)) return toPosix(rel)
  return toPosix(companyHome)
}

/**
 * 生成 manifest 计划（只读；不写盘）。
 * - 目标 workspace 不存在 ⇒ `action: 'skip'`（没有盘就不冒充 bundle）。
 * - manifest 已存在 ⇒ `action: 'skip'`（只创建、绝不覆盖）。
 */
export function planBundleManifest(options: {
  readonly dshHome: string
  readonly companyHome: string
  readonly skeletonDir: string
  readonly pack: PackMetadata
  readonly now?: Date
  readonly id?: string
}): ManifestPlan {
  const path = join(options.dshHome, BUNDLE_MANIFEST_FILENAME)
  const manifest: BundleManifest = {
    v: BUNDLE_MANIFEST_VERSION,
    id: options.id ?? `bundle-${randomUUID()}`,
    createdAt: (options.now ?? new Date()).toISOString(),
    pack: options.pack,
    workspace: workspaceRecord(options.dshHome, options.companyHome),
    skeleton: {
      version: options.pack.version,
      files: skeletonDigest(options.skeletonDir),
    },
  }
  if (!existsSync(options.companyHome)) return { path, manifest, action: 'skip' }
  if (existsSync(path)) return { path, manifest, action: 'skip' }
  return { path, manifest, action: 'create' }
}

/** 执行计划：只创建；并发/竞态下 `wx` 失败视为已有（skip），绝不覆盖。 */
export function writeBundleManifest(plan: ManifestPlan): { created: boolean; skipped: boolean } {
  if (plan.error !== undefined || plan.action === 'skip') return { created: false, skipped: true }
  mkdirSync(dirname(plan.path), { recursive: true })
  try {
    writeFileSync(plan.path, `${JSON.stringify(plan.manifest, null, 2)}\n`, { flag: 'wx' })
    return { created: true, skipped: false }
  } catch (error) {
    if ((error as { code?: string }).code === 'EEXIST') return { created: false, skipped: true }
    throw error
  }
}

/** 读 manifest；不存在或解析失败返回 null（调用方决定告警还是忽略）。 */
export function readBundleManifest(dshHome: string): BundleManifest | null {
  const state = readBundleManifestState(dshHome)
  return state.status === 'ok' ? state.manifest : null
}

export type BundleManifestState =
  | { readonly status: 'missing'; readonly path: string }
  | { readonly status: 'corrupt'; readonly path: string; readonly error: string }
  | { readonly status: 'ok'; readonly path: string; readonly manifest: BundleManifest }

/**
 * 区分「没装过」与「装过但文件坏了」——两者都返回 null 会让 host 把损坏当首启、静默跳过升级。
 * corrupt 时保留原文件，由调用方告警并要求人工修复（不覆盖身份）。
 */
export function readBundleManifestState(dshHome: string): BundleManifestState {
  const path = join(dshHome, BUNDLE_MANIFEST_FILENAME)
  try {
    if (!existsSync(path)) return { status: 'missing', path }
    if (!lstatSync(path).isFile()) return { status: 'corrupt', path, error: '不是普通文件' }
    return { status: 'ok', path, manifest: JSON.parse(readFileSync(path, 'utf8')) as BundleManifest }
  } catch (error) {
    return { status: 'corrupt', path, error: (error as Error).message }
  }
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

// ── 基部升级（2026-10-24，RFC run-bundle-install-unit S3）────────────────────────────
// 口径：**只动基部骨架文件**；扩张面（journal/交付物/方法层/会话）不在迭代面内。
// 判据（逐文件）：
//   - 目标缺失 ⇒ create（补回基部）；
//   - 目标哈希 == 上次记录的基部哈希（用户没改过）⇒ 用新骨架替换（或内容相同则 keep）；
//   - 目标哈希 != 上次基部哈希（用户改过）⇒ keep（绝不覆盖用户编辑）；
//   - 上次没有该文件（新增基部件）且目标已存在 ⇒ keep（用户先占了同名，保留）。
// 升级后 manifest 记录**新基部**的哈希（不是用户的哈希）——下一轮仍能区分“改过/没改过”。
export interface SkeletonUpgradeAction {
  readonly rel: string
  readonly action: 'create' | 'update' | 'keep'
  /** keep 的原因：内容已同 / 用户改过 / 用户先占了同名。 */
  readonly reason?: 'unchanged' | 'modified' | 'occupied'
}

export interface SkeletonUpgradePlan {
  readonly manifest: BundleManifest
  readonly actions: readonly SkeletonUpgradeAction[]
  readonly changed: boolean
}

const hashFile = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex')

/** 计算升级计划（只读）。 */
export function planSkeletonUpgrade(options: {
  readonly manifest: BundleManifest
  readonly skeletonDir: string
  readonly workspace: string
  readonly pack: PackMetadata
}): SkeletonUpgradePlan {
  const nextFiles = skeletonDigest(options.skeletonDir)
  const actions: SkeletonUpgradeAction[] = []
  for (const [rel, nextHash] of Object.entries(nextFiles).sort(([a], [b]) => a.localeCompare(b))) {
    const target = join(options.workspace, rel)
    if (!existsSync(target)) {
      actions.push({ rel, action: 'create' })
      continue
    }
    let current: string
    try {
      current = hashFile(target)
    } catch {
      actions.push({ rel, action: 'keep' })
      continue
    }
    if (current === nextHash) {
      actions.push({ rel, action: 'keep', reason: 'unchanged' })
      continue
    }
    const base = options.manifest.skeleton.files[rel]
    if (base !== undefined && current === base) actions.push({ rel, action: 'update' })
    else actions.push({ rel, action: 'keep', reason: base === undefined ? 'occupied' : 'modified' })
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
export function applySkeletonUpgrade(plan: SkeletonUpgradePlan, skeletonDir: string, workspace: string): {
  readonly created: string[]
  readonly updated: string[]
  readonly kept: string[]
} {
  const created: string[] = []
  const updated: string[] = []
  const kept: string[] = []
  for (const action of plan.actions) {
    if (action.action === 'keep') { kept.push(action.rel); continue }
    const target = join(workspace, action.rel)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, readFileSync(join(skeletonDir, action.rel)))
    if (action.action === 'create') created.push(action.rel)
    else updated.push(action.rel)
  }
  return { created, updated, kept }
}

/** 写回 manifest（原子替换：临时文件 + rename；只在 changed 时调用）。 */
export function writeUpgradedManifest(path: string, manifest: BundleManifest): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    renameSync(temporary, path)
  } catch (error) {
    try { rmSync(temporary, { force: true }) } catch { /* 保留原错误 */ }
    throw error
  }
}

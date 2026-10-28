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
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRecord } from '../lib/guards.ts'
import { canonicalPath } from './paths.ts'
import { appendRotatingLine } from './rotating-log.ts'

/** 当前 manifest 形状版本；字段变化时升。 */
export const BUNDLE_MANIFEST_VERSION = 1

export const BUNDLE_MANIFEST_FILENAME = 'bundle.json'

/** 基部升级日志（home 内、按次追加）：点名保留的用户改动，手册与 smoke 读它。 */
export const BUNDLE_UPGRADE_LOG = 'logs/company-pack-upgrade.log'

export function appendUpgradeLog(dshHome: string, message: string): void {
  appendRotatingLine(join(dshHome, BUNDLE_UPGRADE_LOG), `${new Date().toISOString()} ${message}\n`)
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

/**
 * 把 manifest 里的 workspace 记录还原成绝对路径。bundle.json 的 workspace 是**身份的一部分**：
 * 创建后不随 DSH_COMPANY_HOME 改写；换盘/搬家应新开 home 或显式重建，不在旧 home 上静默换指针。
 * @param dshHome - bundle 所在 home（相对记录按它解析）。
 * @param record - manifest.workspace 的原始值；非字符串/空白返回 undefined。
 */
export function resolveRecordedWorkspace(dshHome: string, record: unknown): string | undefined {
  if (typeof record !== 'string' || record.trim() === '') return undefined
  return isAbsolute(record) ? record : resolve(dshHome, record)
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
      return { created: true, skipped: false }
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'EEXIST') return { created: false, skipped: true }
      // 网络盘/特殊 FS 不支持 hard link：退回 wx 单写（仍不覆盖，但换掉原子发布）。
      if (code === 'EPERM' || code === 'ENOTSUP' || code === 'EOPNOTSUPP' || code === 'EXDEV' || code === 'EMLINK') {
        try {
          writeFileSync(plan.path, data, { flag: 'wx' })
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
export function readBundleManifest(dshHome: string): BundleManifest | null {
  const state = readBundleManifestState(dshHome)
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
 * 校验 manifest 的**最低身份形状**（v / id / pack / workspace / skeleton）。
 *
 * 为什么不是 `JSON.parse` 后直接 cast：0.3.10 及以前只要文件能解析就当 ok；一个未来版本或手工
 * 改坏的 manifest 会被当成 v1 去跑升级，轻则静默跳过、重则覆盖身份。未知版本必须保留原文件并
 * 让调用方告警；损坏形状走 corrupt，不猜、不覆盖。
 * @param value - `JSON.parse` 的结果。
 * @returns 校验结果；`unsupportedVersion` 在场 = 文件是合法 JSON，但版本比本包新。
 */
export function validateBundleManifest(value: unknown): ManifestValidation {
  if (!isRecord(value)) return { ok: false, error: '不是对象' }
  const version = value.v
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    return { ok: false, error: `v 不是正整数（${String(version)}）` }
  }
  if (version > BUNDLE_MANIFEST_VERSION) {
    return { ok: false, error: `manifest 版本 ${String(version)} 高于本包支持的 ${String(BUNDLE_MANIFEST_VERSION)}`, unsupportedVersion: version }
  }
  if (version !== BUNDLE_MANIFEST_VERSION) {
    return { ok: false, error: `不支持的 manifest 版本 ${String(version)}` }
  }
  if (typeof value.id !== 'string' || value.id.trim() === '') return { ok: false, error: '缺 id' }
  if (typeof value.createdAt !== 'string' || value.createdAt.trim() === '') return { ok: false, error: '缺 createdAt' }
  if (!isRecord(value.pack)) return { ok: false, error: '缺 pack' }
  if (typeof value.pack.name !== 'string' || value.pack.name.trim() === '') return { ok: false, error: 'pack.name 非法' }
  if (typeof value.pack.version !== 'string' || value.pack.version.trim() === '') return { ok: false, error: 'pack.version 非法' }
  if (typeof value.workspace !== 'string' || value.workspace.trim() === '') return { ok: false, error: '缺 workspace' }
  if (!isRecord(value.skeleton)) return { ok: false, error: '缺 skeleton' }
  if (typeof value.skeleton.version !== 'string' || value.skeleton.version.trim() === '') return { ok: false, error: 'skeleton.version 非法' }
  if (!isRecord(value.skeleton.files)) return { ok: false, error: 'skeleton.files 非法' }
  for (const [rel, hash] of Object.entries(value.skeleton.files)) {
    if (rel === '' || typeof hash !== 'string' || hash === '') return { ok: false, error: `skeleton.files[${rel}] 非法` }
  }
  return { ok: true, manifest: value as unknown as BundleManifest }
}

/**
 * 区分「没装过」「装过但文件坏了」「文件是更新的版本」——三者都返回 null 会让 host 把损坏当首启、
 * 静默跳过升级。corrupt/unsupported 时保留原文件，由调用方告警并要求人工处理（不覆盖身份）。
 */
export function readBundleManifestState(dshHome: string): BundleManifestState {
  const path = join(dshHome, BUNDLE_MANIFEST_FILENAME)
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
  const nextFiles = skeletonDigest(options.skeletonDir)
  const actions: SkeletonUpgradeAction[] = []
  for (const [rel, nextHash] of Object.entries(nextFiles).sort(([a], [b]) => a.localeCompare(b))) {
    const target = join(options.workspace, rel)
    let info: ReturnType<typeof lstatSync> | null
    try {
      info = lstatOrNull(target)
    } catch {
      actions.push({ rel, action: 'keep', reason: 'occupied' })
      continue
    }
    if (info === null || info === undefined) {
      actions.push({ rel, action: 'create' })
      continue
    }
    // 符号链接/目录/设备不是我们的基部文件：绝不 rename 覆盖用户的东西。
    if (info.isSymbolicLink() || !info.isFile()) {
      actions.push({ rel, action: 'keep', reason: 'occupied' })
      continue
    }
    let current: string
    try {
      current = hashFile(target)
    } catch {
      actions.push({ rel, action: 'keep', reason: 'occupied' })
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
    atomicWriteFile(target, readFileSync(join(skeletonDir, action.rel)))
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

// ── 显式换盘（2026-10-27，FAQ 26 数据模型对齐 P0）────────────────────────────────
// 为什么不是“改 env 就自动跟随”：bundle.json 的 workspace 是身份的一部分；静默跟随会让一个
// home 分裂成两个盘。这里保留默认硬阻断，只在 `DSH_COMPANY_REBIND=1` 且**旧盘已不在**时做
// 一次性、有备份、有日志的 rebind。DSH 自己的 session header.cwd 仍是绝对旧路径，不在本函数范围。
export const REBIND_ENV = 'DSH_COMPANY_REBIND'

/** 是否显式请求换盘（`1` / `on`）。 */
export function rebindEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const value = env[REBIND_ENV]
  return value === '1' || value === 'on'
}

export interface WorkspaceRebindPlan {
  readonly manifestPath: string
  readonly oldWorkspace: string
  readonly newWorkspace: string
  readonly manifest: BundleManifest
  readonly backupPath: string
  readonly warnings: readonly string[]
}

export type WorkspaceRebindDecision =
  | { readonly ok: true; readonly plan: WorkspaceRebindPlan }
  | { readonly ok: false; readonly error: string }

/**
 * 计算换盘计划（只读）。硬条件：旧盘已不存在、新盘存在且像公司盘、manifest 有效。
 * @param options - home / manifest / 新盘 / 时钟。
 * @returns 可执行计划，或一句可操作的拒绝原因。
 */
export function planWorkspaceRebind(options: {
  readonly dshHome: string
  readonly manifest: BundleManifest
  readonly companyHome: string
  readonly now?: Date
}): WorkspaceRebindDecision {
  const oldWorkspace = resolveRecordedWorkspace(options.dshHome, options.manifest.workspace)
  if (oldWorkspace === undefined) return { ok: false, error: 'manifest.workspace 为空，无法确定旧公司盘' }
  const newWorkspace = resolve(options.companyHome)
  if (canonicalPath(oldWorkspace) === canonicalPath(newWorkspace)) {
    return { ok: false, error: '新旧公司盘是同一个路径，不需要 rebind' }
  }
  if (existsSync(oldWorkspace)) {
    return { ok: false, error: `旧公司盘仍存在（${oldWorkspace}）；先确认已搬走/改名，避免一个 home 出现两份盘` }
  }
  if (!existsSync(newWorkspace)) return { ok: false, error: `新公司盘不存在：${newWorkspace}` }
  let info: ReturnType<typeof lstatSync>
  try {
    info = lstatSync(newWorkspace)
  } catch (error) {
    return { ok: false, error: `新公司盘读不到：${(error as Error).message}` }
  }
  if (info.isSymbolicLink() || !info.isDirectory()) {
    return { ok: false, error: `新公司盘不是普通目录：${newWorkspace}` }
  }
  if (!existsSync(join(newWorkspace, 'AGENTS.md'))
    || (!existsSync(join(newWorkspace, 'kb/company.md')) && !existsSync(join(newWorkspace, 'kb/org.md')))) {
    return { ok: false, error: `新公司盘形状不对（缺 AGENTS.md 或 kb/company.md / kb/org.md）：${newWorkspace}` }
  }
  const warnings: string[] = []
  const baseFiles = Object.keys(options.manifest.skeleton.files)
  let matched = 0
  for (const rel of baseFiles) {
    try {
      if (existsSync(join(newWorkspace, rel))
        && hashFile(join(newWorkspace, rel)) === options.manifest.skeleton.files[rel]) matched += 1
    } catch { /* 读不到就当没匹配，最后只告警 */ }
  }
  if (baseFiles.length > 0 && matched === 0) {
    warnings.push('新盘里没有任何基部文件与 manifest 记录一致；仍按显式 rebind 继续，请确认这是同一份公司盘')
  }
  const stamp = (options.now ?? new Date()).toISOString().replace(/[:.]/g, '-')
  const manifestPath = bundleManifestPath(options.dshHome)
  let backupPath = `${manifestPath}.bak-${stamp}`
  let suffix = 1
  while (existsSync(backupPath)) {
    backupPath = `${manifestPath}.bak-${stamp}-${String(suffix)}`
    suffix += 1
  }
  return {
    ok: true,
    plan: {
      manifestPath,
      oldWorkspace,
      newWorkspace,
      manifest: { ...options.manifest, workspace: workspaceRecord(options.dshHome, newWorkspace) },
      backupPath,
      warnings,
    },
  }
}

/**
 * 只保留最近 N 份换盘备份（默认 5）；返回删掉的文件名。
 * 备份是审计资产，不是无限日志；默认保留最新 5 份，避免 home 根长期膨胀。
 * @param dshHome - DSH home。
 * @param keep - 保留份数（>=1）。
 */
export function pruneBundleBackups(dshHome: string, keep = 5): string[] {
  const safeKeep = Math.max(1, Math.floor(keep))
  const names = readdirSync(dshHome)
    .filter(name => name.startsWith(`${BUNDLE_MANIFEST_FILENAME}.bak-`))
    .sort()
    .reverse()
  const removed = names.slice(safeKeep)
  for (const name of removed) {
    try { rmSync(join(dshHome, name), { force: true }) } catch { /* 删不掉不影响换盘 */ }
  }
  return removed
}

/**
 * 执行换盘：旧 manifest 原字节备份 → 原子改写 workspace → 记升级日志。
 * 失败时保留备份与原文件；调用方按普通错误处理（不静默）。
 * @param plan - {@link planWorkspaceRebind} 的产出。
 */
export function applyWorkspaceRebind(plan: WorkspaceRebindPlan): void {
  writeFileSync(plan.backupPath, readFileSync(plan.manifestPath), { flag: 'wx' })
  atomicWriteFile(plan.manifestPath, `${JSON.stringify(plan.manifest, null, 2)}\n`)
  appendUpgradeLog(dirname(plan.manifestPath), `换盘 ${plan.oldWorkspace} → ${plan.newWorkspace}（备份 ${plan.backupPath}）`)
}

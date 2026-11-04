/**
 * run bundle 身份（2026-11-01 v3）。
 *
 * 形状：
 * - `<workspace>/.dsh-company/bundle.json`；
 * - v3 只记 `id / createdAt / pack / runBundle.schema`；不再记手册目标或骨架哈希
 *   （手册/模板是只读 pack 内容，不属于 run bundle 身份）；
 * - v2 身份可原地升 v3：保留 id/createdAt，旧文件备份 `bundle.v2.json`；
 * - home 留一份 `company/identity/<id>.json` 恢复备份；
 * - manifest 在 workspace 是**模型可写**的 host-owned 约定，不是防篡改边界。
 *
 * 本模块只做纯事；调用方接住错误，apply 期不抛。
 */
import { randomUUID } from 'node:crypto'
import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRecord } from '../lib/guards.ts'
import { RUN_BUNDLE_REL } from './run-bundle.ts'
import { appendRotatingLine } from './rotating-log.ts'

/** 当前 manifest 形状版本。 */
export const BUNDLE_MANIFEST_VERSION = 3
const BUNDLE_MANIFEST_REL = RUN_BUNDLE_REL.manifest
const BUNDLE_UPGRADE_LOG = `${RUN_BUNDLE_REL.logs}/company-pack-upgrade.log`
const BUNDLE_IDENTITY_DIR = 'company/identity'

/** manifest 的绝对路径（`<workspace>/.dsh-company/bundle.json`）。 */
export const bundleManifestPath = (workspace: string): string => join(workspace, BUNDLE_MANIFEST_REL)

/** home 身份备份路径。 */
export const identityBackupPath = (dshHome: string, id: string): string =>
  join(dshHome, BUNDLE_IDENTITY_DIR, `${id}.json`)

/** 基部升级日志（workspace 内、按次追加）。 */
export function appendUpgradeLog(workspace: string, message: string): void {
  appendRotatingLine(join(workspace, BUNDLE_UPGRADE_LOG), `${new Date().toISOString()} ${message}\n`)
}

export interface PackMetadata {
  readonly name: string
  readonly version: string
}

export interface BundleManifest {
  readonly v: typeof BUNDLE_MANIFEST_VERSION
  readonly id: string
  readonly createdAt: string
  readonly pack: PackMetadata
  readonly runBundle: { readonly schema: 1 }
}

export interface ManifestPlan {
  readonly path: string
  readonly manifest: BundleManifest
  readonly backupPath: string
  readonly action: 'create' | 'skip' | 'upgrade'
  readonly legacyPath?: string
  readonly error?: string
}

/** 同目录临时文件 + rename：崩溃时要么旧文件、要么新文件，不留半截。 */
function atomicWriteFile(path: string, data: string): void {
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, data, { flag: 'wx' })
    renameSync(temporary, path)
  } catch (error) {
    try { unlinkSync(temporary) } catch { /* 临时文件未创建或已 rename */ }
    throw error
  }
}

/** 读 `<pack>/package.json` 的 name/version。 */
export function resolvePackMetadata(moduleUrl: string): PackMetadata {
  const path = fileURLToPath(new URL('../package.json', moduleUrl))
  const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: unknown; version?: unknown }
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') {
    throw new Error(`pack package.json 缺 name/version：${path}`)
  }
  return { name: pkg.name, version: pkg.version }
}

/** 写 home 身份备份（workspace manifest 的恢复副本；不是第二权威）。 */
function writeIdentityBackup(backupPath: string, manifest: BundleManifest): void {
  mkdirSync(dirname(backupPath), { recursive: true })
  atomicWriteFile(backupPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

export type BundleManifestState =
  | { readonly status: 'missing'; readonly path: string }
  | { readonly status: 'corrupt'; readonly path: string; readonly error: string }
  | { readonly status: 'unsupported'; readonly path: string; readonly version: number; readonly error: string }
  | { readonly status: 'legacy'; readonly path: string; readonly version: 2; readonly manifest: { readonly id?: unknown; readonly createdAt?: unknown; readonly pack?: unknown } }
  | { readonly status: 'ok'; readonly path: string; readonly manifest: BundleManifest }

interface ManifestValidation {
  readonly ok: boolean
  readonly manifest?: BundleManifest
  readonly error?: string
  readonly unsupportedVersion?: number
  readonly legacyVersion?: number
}

/** 校验 v3 身份形状；v2 单独标 legacy 供原地升级。 */
function validateBundleManifest(value: unknown): ManifestValidation {
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
  if (version === 2) return { ok: false, legacyVersion: 2, error: 'v2 身份待原地升级' }
  if (version !== BUNDLE_MANIFEST_VERSION) {
    return { ok: false, error: `不支持的 manifest 版本 ${String(version)}` }
  }
  if (typeof value.id !== 'string' || value.id.trim() === '') return { ok: false, error: 'id 缺失' }
  if (typeof value.createdAt !== 'string' || value.createdAt.trim() === '') return { ok: false, error: 'createdAt 缺失' }
  const pack = value.pack
  if (!isRecord(pack) || typeof pack.name !== 'string' || typeof pack.version !== 'string') {
    return { ok: false, error: 'pack.name/pack.version 缺失' }
  }
  const runBundle = value.runBundle
  if (!isRecord(runBundle) || runBundle.schema !== 1) return { ok: false, error: 'runBundle.schema 缺失或不是 1' }
  return {
    ok: true,
    manifest: {
      v: BUNDLE_MANIFEST_VERSION,
      id: value.id,
      createdAt: value.createdAt,
      pack: { name: pack.name, version: pack.version },
      runBundle: { schema: 1 },
    },
  }
}

/** 读 manifest 状态；不存在/坏/更高版本/legacy 分开报。 */
export function readBundleManifestState(workspace: string): BundleManifestState {
  const path = bundleManifestPath(workspace)
  try {
    if (!existsSync(path)) return { status: 'missing', path }
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
    const validation = validateBundleManifest(raw)
    if (validation.unsupportedVersion !== undefined) {
      return {
        status: 'unsupported',
        path,
        version: validation.unsupportedVersion,
        error: validation.error ?? '更高版本',
      }
    }
    if (validation.legacyVersion === 2) {
      const legacy = isRecord(raw) ? raw : {}
      return { status: 'legacy', path, version: 2, manifest: legacy }
    }
    if (!validation.ok || validation.manifest === undefined) {
      return { status: 'corrupt', path, error: validation.error ?? '形状不符' }
    }
    return { status: 'ok', path, manifest: validation.manifest }
  } catch (error) {
    return { status: 'corrupt', path, error: (error as Error).message }
  }
}

/**
 * 生成 manifest 计划（只读；不写盘）。
 * - 无文件：create，新 id；
 * - v3 有效：skip；
 * - v2 legacy：upgrade，保留 id/createdAt（缺失则新生成），旧文件备份；
 * - 坏/更高版本：skip + error（调用方告警，不覆盖）。
 */
export function planBundleManifest(options: {
  readonly dshHome: string
  readonly workspace: string
  readonly pack: PackMetadata
  readonly now?: Date
  readonly id?: string
}): ManifestPlan {
  const path = bundleManifestPath(options.workspace)
  const state = readBundleManifestState(options.workspace)
  if (state.status === 'ok') {
    return {
      path,
      manifest: state.manifest,
      backupPath: identityBackupPath(options.dshHome, state.manifest.id),
      action: 'skip',
    }
  }
  if (state.status === 'corrupt' || state.status === 'unsupported') {
    return {
      path,
      manifest: {
        v: BUNDLE_MANIFEST_VERSION,
        id: options.id ?? `bundle-${randomUUID()}`,
        createdAt: (options.now ?? new Date()).toISOString(),
        pack: options.pack,
        runBundle: { schema: 1 },
      },
      backupPath: '',
      action: 'skip',
      error: state.error,
    }
  }
  const legacy = state.status === 'legacy' ? state.manifest : undefined
  const id = options.id
    ?? (typeof legacy?.id === 'string' && legacy.id.trim() !== '' ? legacy.id : `bundle-${randomUUID()}`)
  const createdAt = typeof legacy?.createdAt === 'string' && legacy.createdAt.trim() !== ''
    ? legacy.createdAt
    : (options.now ?? new Date()).toISOString()
  const manifest: BundleManifest = {
    v: BUNDLE_MANIFEST_VERSION,
    id,
    createdAt,
    pack: options.pack,
    runBundle: { schema: 1 },
  }
  return {
    path,
    manifest,
    backupPath: identityBackupPath(options.dshHome, id),
    action: state.status === 'legacy' ? 'upgrade' : 'create',
    ...(state.status === 'legacy' ? { legacyPath: `${path}.v2.bak` } : {}),
  }
}

/** 执行计划：创建/升级；v2 旧文件备份；身份备份；绝不覆盖有效 v3。 */
export function writeBundleManifest(
  plan: ManifestPlan,
  deps: { readonly link?: typeof linkSync } = {},
): { created: boolean; skipped: boolean; upgraded: boolean; fallback?: 'wx' } {
  if (plan.error !== undefined || plan.action === 'skip') {
    return { created: false, skipped: true, upgraded: false }
  }
  mkdirSync(dirname(plan.path), { recursive: true })
  if (plan.action === 'upgrade' && plan.legacyPath !== undefined && existsSync(plan.path)) {
    try { renameSync(plan.path, plan.legacyPath) } catch { /* 备份失败不阻塞写入；旧内容仍在 */ }
  }
  const temporary = `${plan.path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  const data = `${JSON.stringify(plan.manifest, null, 2)}\n`
  try {
    writeFileSync(temporary, data, { flag: 'wx' })
    try {
      ;(deps.link ?? linkSync)(temporary, plan.path)
      writeIdentityBackup(plan.backupPath, plan.manifest)
      return { created: plan.action === 'create', skipped: false, upgraded: plan.action === 'upgrade' }
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'EEXIST') return { created: false, skipped: true, upgraded: false }
      if (code === 'EPERM' || code === 'ENOTSUP' || code === 'EOPNOTSUPP' || code === 'EXDEV' || code === 'EMLINK') {
        try {
          writeFileSync(plan.path, data, { flag: 'wx' })
          writeIdentityBackup(plan.backupPath, plan.manifest)
          return { created: plan.action === 'create', skipped: false, upgraded: plan.action === 'upgrade', fallback: 'wx' }
        } catch (fallbackError) {
          if ((fallbackError as { code?: string }).code === 'EEXIST') return { created: false, skipped: true, upgraded: false }
          throw fallbackError
        }
      }
      throw error
    }
  } finally {
    try { unlinkSync(temporary) } catch { /* 已 link 走或未创建 */ }
  }
}

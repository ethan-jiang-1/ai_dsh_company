/**
 * workspace 解析（2026-11-01 v3）：不再由 launcher/TTY 询问。
 *
 * 优先级：
 * 1. `DSH_COMPANY_HOME`（部署/自动化显式固定值；无效 = fail loud，不静默回落）；
 * 2. 启动 cwd（`dsh --profile company` 在项目目录启动；OS home / DSH_HOME / 根 等危险落点跳过）；
 * 3. `<DSH_HOME>/company/settings.json` 的最近选择（便利提示，不是权威；路径失效则忽略）；
 * 4. 无 —— Host 不写盘，等 Client 的 DSH Workspace picker/onboarding。
 *
 * 这是纯解析；落点校验/登记/初始化由调用方做。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import { expandHomePath } from '@deepseek-ai/dsh-home-paths'
import { canonicalPath } from '../run-bundle/paths.ts'
import { validateCompanyHome } from '../run-bundle/bootstrap.ts'
import { isDangerousRoot } from './dangerous-roots.ts'

const env = (name: string): string | undefined => (process.env as Record<string, string | undefined>)[name]

export type WorkspaceSource = 'env' | 'cwd' | 'saved' | 'none'

export interface WorkspaceResolution {
  /** 绝对、已 canonical 化的 workspace；无则 undefined。 */
  readonly workspace?: string
  readonly source: WorkspaceSource
  /** 显式值/保存值无效时的可操作原因；无 workspace 时也可能有。 */
  readonly error?: string
  /** 产品保存的最近选择路径（诊断用）。 */
  readonly savedPath?: string
  /** saved 文件存在但坏了（不是「没有保存」）：boot 应 warn，不能静默当 missing（BUG-111）。 */
  readonly savedProblem?: 'corrupt'
}

export interface ResolveWorkspaceOptions {
  readonly dshHome: string
  /** 启动 cwd；默认 `process.cwd()`。 */
  readonly cwd?: string
  /** 测试注入：环境值。缺省读 `DSH_COMPANY_HOME`。 */
  readonly envWorkspace?: string
  /** 测试注入：saved 文件路径。缺省 `<DSH_HOME>/company/settings.json`。 */
  readonly settingsPath?: string
  /** 测试注入：文件存在/读。 */
  readonly exists?: (path: string) => boolean
  readonly readFile?: (path: string) => string
}

/** 产品保存的最近 workspace（便利设置，不是权威）。 */
export interface CompanySettings {
  readonly v: 1
  readonly workspace: string
  readonly updatedAt: string
}

export const settingsPath = (dshHome: string): string => join(dshHome, 'company/settings.json')

/** 读 settings 的 workspace；坏/缺返回 undefined。 */
export function readSavedWorkspace(
  dshHome: string,
  options: { readonly path?: string; readonly exists?: (path: string) => boolean; readonly readFile?: (path: string) => string } = {},
): { readonly workspace?: string; readonly path: string, readonly problem?: 'corrupt' } {
  const path = options.path ?? settingsPath(dshHome)
  const exists = options.exists ?? existsSync
  const read = options.readFile ?? ((file: string) => readFileSync(file, 'utf8'))
  if (!exists(path)) return { path }
  try {
    const parsed: unknown = JSON.parse(read(path))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { path, problem: 'corrupt' }
    const value = (parsed as Record<string, unknown>).workspace
    return typeof value === 'string' && value.trim() !== ''
      ? { workspace: resolve(expandHomePath(value.trim())), path }
      : { path, problem: 'corrupt' }
  } catch {
    return { path, problem: 'corrupt' }
  }
}

/** 写最近 workspace（host 侧；不覆盖 profile patch）。 */
export function writeSavedWorkspace(dshHome: string, workspace: string): CompanySettings {
  const settings: CompanySettings = {
    v: 1,
    workspace: canonicalPath(workspace),
    updatedAt: new Date().toISOString(),
  }
  const path = settingsPath(dshHome)
  mkdirSync(join(dshHome, 'company'), { recursive: true })
  // 同目录 temp + rename：崩溃/半写不会把「最近 workspace」截断成坏 JSON（BUG-111）。
  const temporary = `${path}.${String(process.pid)}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, { flag: 'wx' })
    renameSync(temporary, path)
  } catch (error) {
    try { unlinkSync(temporary) } catch { /* 未创建或已 rename */ }
    throw error
  }
  return settings
}

function cwdIsUsable(cwd: string, dshHome: string): boolean {
  if (!existsSync(cwd)) return false
  const check = validateCompanyHome(dshHome, cwd)
  if (!check.ok) return false
  // 根 / OS home / 系统临时根（含 /tmp 与 /private/tmp 真身）都不是项目；其子目录可以。
  return !isDangerousRoot(cwd)
}

/**
 * 按优先级解析 workspace。
 * @param options - dsh home、cwd、注入值。
 * @returns 解析结果；显式 env 无效时 `source='env'` 且 `workspace` 为空。
 */
export function resolveWorkspace(options: ResolveWorkspaceOptions): WorkspaceResolution {
  const dshHome = options.dshHome
  const envValue = options.envWorkspace ?? env('DSH_COMPANY_HOME')
  if (envValue !== undefined && envValue.trim() !== '') {
    const resolved = resolve(expandHomePath(envValue.trim()))
    const check = validateCompanyHome(dshHome, resolved)
    if (!check.ok) return { source: 'env', error: `DSH_COMPANY_HOME 无效：${check.error}` }
    if (!existsSync(resolved)) {
      return { source: 'env', error: `DSH_COMPANY_HOME 指向的目录不存在：${resolved}` }
    }
    return { workspace: canonicalPath(resolved), source: 'env' }
  }

  const cwd = resolve(options.cwd ?? process.cwd())
  if (cwdIsUsable(cwd, dshHome)) {
    return { workspace: canonicalPath(cwd), source: 'cwd' }
  }

  const saved = readSavedWorkspace(dshHome, {
    ...(options.settingsPath === undefined ? {} : { path: options.settingsPath }),
    ...(options.exists === undefined ? {} : { exists: options.exists }),
    ...(options.readFile === undefined ? {} : { readFile: options.readFile }),
  })
  if (saved.workspace !== undefined) {
    const check = validateCompanyHome(dshHome, saved.workspace)
    if (check.ok && existsSync(saved.workspace)) {
      return { workspace: canonicalPath(saved.workspace), source: 'saved', savedPath: saved.path }
    }
  }
  return {
    source: 'none',
    savedPath: saved.path,
    ...(saved.problem === undefined ? {} : { savedProblem: saved.problem }),
  }
}

/**
 * 项目启动策略的落盘层（host-only）。
 *
 * 两个文件、一个作用域：
 * - `.dsh-company/startup.json` —— **人改**的项目策略（三字段，null = 自动）；
 * - `.dsh-company/startup-options.json` —— **host 派生**的可选项（按 `content/` 枚举），
 *   浏览器面板只读它来渲染下拉。派生文件不进人手里，避免「两份事实」。
 *
 * 为什么写派生文件而不是让浏览器读内容包：内容住在 pack 里，浏览器侧只有 `workspaceFiles`
 * 远端，读不到 pack；而走命令读会往会话日志里写 `command/run`（面板一打开就多一个命令条）。
 * 派生文件既无日志噪声，又与既有 `.dsh-company/` 读盘形状一致。
 */
import { mkdirSync, readFileSync, renameSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'
import {
  EMPTY_STARTUP_OPTIONS,
  parseStartupOptions,
  parseStartupSettings,
  serializeStartupOptions,
  serializeStartupSettings,
  type StartupOptions,
  type StartupSettings,
} from '../../lib/startup-settings.ts'

/** 隐式交付模式：`productized` 是缺省，不建内容包（见 delivery-mode 轴决定）。 */
const IMPLICIT_DELIVERY_MODE = 'productized'

/** `<workspace>/.dsh-company/startup.json` 绝对路径。 */
export function startupSettingsPath(workspace: string): string {
  return join(workspace, RUN_BUNDLE_PATHS.startup)
}

/** `<workspace>/.dsh-company/startup-options.json` 绝对路径。 */
export function startupOptionsPath(workspace: string): string {
  return join(workspace, RUN_BUNDLE_PATHS.startupOptions)
}

/** 读项目策略；文件缺失/坏 JSON 一律回「全自动」。 */
export function readStartupSettings(workspace: string): StartupSettings {
  try {
    return parseStartupSettings(readFileSync(startupSettingsPath(workspace), 'utf8'))
  } catch {
    return parseStartupSettings(undefined)
  }
}

/** 读派生可选项；缺失回空集合。 */
export function readStartupOptions(workspace: string): StartupOptions {
  try {
    return parseStartupOptions(readFileSync(startupOptionsPath(workspace), 'utf8'))
  } catch {
    return EMPTY_STARTUP_OPTIONS
  }
}

/**
 * 原子写：同目录临时文件 + rename（覆盖语义；settings 是人反复改的文件）。
 * @param path - 目标文件。
 * @param text - 完整内容。
 */
function writeAtomic(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(temporary, text, 'utf8')
  renameSync(temporary, path)
}

/** 写项目策略。 */
export function writeStartupSettings(workspace: string, settings: StartupSettings): void {
  writeAtomic(startupSettingsPath(workspace), serializeStartupSettings(settings))
}

/** 写派生可选项。 */
export function writeStartupOptionsFile(workspace: string, options: StartupOptions): void {
  writeAtomic(startupOptionsPath(workspace), serializeStartupOptions(options))
}

/** 枚举一个内容子目录下的可选 id（目录名，排序）。缺目录 = 空。 */
function listContentDirs(contentDir: string, group: string): string[] {
  try {
    return readdirSync(join(contentDir, group), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch {
    return []
  }
}

/**
 * 按内容包枚举可选项。
 * 交付模式里 `productized` 是隐式默认（无内容目录），排在最前。
 * @param contentDir - pack 的 `content/`。
 * @returns 可选项集合。
 */
export function enumerateStartupOptions(contentDir: string | undefined): StartupOptions {
  if (contentDir === undefined) return EMPTY_STARTUP_OPTIONS
  return {
    productTypes: listContentDirs(contentDir, 'product-types'),
    deliveryModes: [IMPLICIT_DELIVERY_MODE, ...listContentDirs(contentDir, 'delivery-modes')],
  }
}

/**
 * 重新派生并落盘选项文件（启动时 + 每次改动 settings 后各跑一次）。
 * @param workspace - 公司 workspace 根。
 * @param contentDir - pack 的 `content/`。
 * @returns 本次枚举结果。
 */
export function refreshStartupOptions(workspace: string, contentDir: string | undefined): StartupOptions {
  const options = enumerateStartupOptions(contentDir)
  writeStartupOptionsFile(workspace, options)
  return options
}

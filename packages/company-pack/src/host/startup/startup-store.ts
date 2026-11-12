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
import { mkdirSync, readFileSync, realpathSync, renameSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { expandHomePath } from '@deepseek-ai/dsh-home-paths'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'
import {
  EMPTY_STARTUP_OPTIONS,
  EMPTY_WIKI_CHECK,
  parseStartupOptions,
  parseStartupSettings,
  serializeStartupOptions,
  serializeStartupSettings,
  type StartupOptions,
  type StartupSettings,
  type WikiCheck,
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
    wikiCheck: EMPTY_WIKI_CHECK,
    // 面板的「缺 index.md」提示给安装视图的绝对路径；pack 相对名对安装用户只是一个名字（BUG-087）。
    wikiTemplate: join(contentDir, 'wiki-template'),
  }
}

/** wiki 指针解析成绝对路径：`~` 展开，绝对路径原样，相对路径按 workspace 解释。 */
export function resolveWikiDir(workspace: string, value: string): string {
  const expanded = expandHomePath(value.trim())
  return isAbsolute(expanded) ? resolve(expanded) : resolve(workspace, expanded)
}

/**
 * 真实路径；路径不存在时用最近存在祖先的 realpath + 未存在的后缀。
 * 词法前缀在 symlink 面前会说反（BUG-084），所以权限判断必须落在真实目标上。
 */
function realOrNearest(path: string): string {
  const absolute = resolve(path)
  const suffix: string[] = []
  let current = absolute
  for (;;) {
    try {
      return join(realpathSync(current), ...suffix.reverse())
    } catch { /* 继续向上找存在的祖先 */ }
    const parent = dirname(current)
    if (parent === current) return absolute
    suffix.push(basename(current))
    current = parent
  }
}

/** 真实目标在 workspace 内（agent 可写）还是外（agent 只读，沙箱写不进）。 */
export function wikiLocation(workspace: string, absolutePath: string): 'inside' | 'outside' {
  const rel = relative(realOrNearest(workspace), realOrNearest(absolutePath))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) ? 'inside' : 'outside'
}

/**
 * 查一个 wiki 指针是否可用（A3 的三档判据）。
 *
 * 只做三件事——目录存在 / 是目录 / 有 `index.md`（且 `index.md` 必须是**文件**）。
 * 再多（解析 frontmatter、查链接活性）就变成 lint 工具，超出 v1；这三件足以挡住「指向空气」
 * 与「指向一个没有索引的杂目录」。symlink 判真实目标，`index.md` 判类型（BUG-084）。
 * @param workspace - workspace 根（相对路径按它解释）。
 * @param value - 指针值（null = 未设，不算失效）。
 * @returns 检查结果（纯数据，会写进派生文件给浏览器读）。
 */
export function checkWikiPointer(workspace: string, value: string | null, checkedAt = new Date().toISOString()): WikiCheck {
  if (value === null) return EMPTY_WIKI_CHECK
  const path = resolveWikiDir(workspace, value)
  const location = wikiLocation(workspace, path)
  let isDirectory = false
  try {
    isDirectory = statSync(path).isDirectory()
  } catch {
    return { value, ok: false, problem: 'missing', location, checkedAt }
  }
  if (!isDirectory) return { value, ok: false, problem: 'not-directory', location, checkedAt }
  let indexIsFile = false
  try {
    indexIsFile = statSync(join(path, 'index.md')).isFile()
  } catch { /* 缺 / 坏链接 = 没有 index */ }
  if (!indexIsFile) return { value, ok: false, problem: 'no-index', location, checkedAt }
  return { value, ok: true, problem: null, location, checkedAt }
}

/**
 * 重新派生并落盘选项文件（启动时 + 每次改动 settings 后各跑一次）。
 * wiki 的检查跟着设置一起重算——它没有枚举集，只能查盘。
 * @param workspace - 公司 workspace 根。
 * @param contentDir - pack 的 `content/`。
 * @returns 本次枚举结果。
 */
export function refreshStartupOptions(workspace: string, contentDir: string | undefined): StartupOptions {
  const options = {
    ...enumerateStartupOptions(contentDir),
    wikiCheck: checkWikiPointer(workspace, readStartupSettings(workspace).wiki),
  }
  writeStartupOptionsFile(workspace, options)
  return options
}

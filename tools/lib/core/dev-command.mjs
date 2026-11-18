/**
 * dev 命令判据（纯逻辑；**唯一家**）。
 *
 * 为什么有本文件（2026-11-19，BUG-271/272）：shipped 文本不许教仓库内的 dev 命令（收件人装的是包，
 * 不是仓库）。此前判据是一条手写正则白名单——只认 `pnpm <script>` / `node tools|checks|tests/` /
 * `run/env.sh`，于是 `pnpm -s test`、`pnpm exec …`、`npm run …`、`npx …`、`node probes/…` 全都漏。
 * 白名单漏项的根因不是"少写两个分支"，是**判据不理解命令的形状**：包管理器 + 旗标 + 子命令/脚本名。
 *
 * 判据 = 首词 + 包管理器子命令：
 *   - `pnpm|npm|yarn|npx|bunx` 之后跳过旗标（含 `--filter <值>` 这类带参旗标），再看子命令；
 *   - 显式子命令 `run|exec|dlx` 一律算 dev 命令（散文里不会出现）；
 *   - 裸脚本名只有在 root `package.json` 的 scripts 里才认——这就是"脚本名从唯一源派生"，
 *     新增脚本不需要改本文件；
 *   - `node|tsx|ts-node <dir>/…` 认 `tools|checks|tests|probes/`（probes 是仓内 dev 入口，BUG-272）；
 *   - `run/env.sh`（可带 `bash`/`source`/`./`）算 dev 命令。
 *
 * 不认（防假阳）：`pnpm must be on PATH` 这类散文（`must` 不是脚本名）、`dsh plugin add`（安装器命令）。
 */

/** 仓内 dev 入口目录（`node <dir>/…` 判据）。 */
export const DEV_DIRS = ['tools', 'checks', 'tests', 'probes']

const PACKAGE_MANAGERS = new Set(['pnpm', 'npm', 'yarn', 'npx', 'bunx'])
const SUBCOMMANDS = new Set(['run', 'exec', 'dlx', 'executor'])
/** 带参旗标：这些旗标的下一个 token 是值，不是命令。 */
const VALUE_FLAGS = new Set(['--filter', '-F', '--dir', '-C', '--prefix'])
/** 默认子命令就是 exec 的包管理器（`npx vitest` = 跑 bin，不需要脚本表）。 */
const EXEC_BY_DEFAULT = new Set(['npx', 'bunx'])
const RUNTIMES = new Set(['node', 'tsx', 'ts-node', 'bun'])

const splitTokens = line => line.split(/[\s`"'()[\]{}<>,;|]+/).filter(Boolean)

/**
 * 一行文本里第一个 dev 命令。
 * @param {string} line 一行 shipped 文本（README / package.json 的注释面 / content / preset）
 * @param {{scripts?: string[]}} [options] scripts = root package.json 的脚本名（唯一源）
 * @returns {string|undefined} 命中的命令（用于报错文案）；不是 dev 命令 = undefined
 */
export function devCommandInText(line, { scripts = [] } = {}) {
  if (typeof line !== 'string' || line === '') return undefined
  const tokens = splitTokens(line)
  const scriptSet = new Set(scripts)
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (PACKAGE_MANAGERS.has(token)) {
      const hit = packageManagerCommand(tokens, index, token, scriptSet)
      if (hit !== undefined) return hit
      continue
    }
    if (RUNTIMES.has(token)) {
      const next = tokens[index + 1] ?? ''
      const [head] = next.split('/')
      if (DEV_DIRS.includes(head) && next.includes('/')) return `${token} ${next}`
      continue
    }
    if (token === './run/env.sh' || token === 'run/env.sh') return token
  }
  return undefined
}

/** 包管理器命令的解析（旗标 → 子命令/脚本名）。 */
function packageManagerCommand(tokens, index, manager, scriptSet) {
  let at = index + 1
  while (at < tokens.length) {
    const token = tokens[at]
    if (VALUE_FLAGS.has(token)) { at += 2; continue }
    if (token.startsWith('-')) { at += 1; continue }
    break
  }
  const token = tokens[at]
  if (token === undefined) return undefined
  if (EXEC_BY_DEFAULT.has(manager)) return `${manager} ${token}`
  if (SUBCOMMANDS.has(token)) {
    let argAt = at + 1
    while (argAt < tokens.length && (VALUE_FLAGS.has(tokens[argAt]) || tokens[argAt].startsWith('-'))) argAt += 1
    const argument = tokens[argAt]
    return argument === undefined ? `${manager} ${token}` : `${manager} ${token} ${argument}`
  }
  if (scriptSet.has(token)) return `${manager} ${token}`
  return undefined
}

/**
 * root package.json 的脚本名（`pnpm <script>` 判据的唯一源）。
 * @param {(rel:string)=>string} readFile 以 package.json 路径读文本
 * @returns {string[]}
 */
export function scriptsFromManifest(text) {
  try {
    const manifest = JSON.parse(text)
    return Object.keys(manifest?.scripts ?? {})
  } catch {
    return []
  }
}

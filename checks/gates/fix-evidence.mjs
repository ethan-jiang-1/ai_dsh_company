// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// ── 修复证据门（fix-evidence，2026-11-14 立）──────────────────────────────────────
// 触发事故（用户亲述）：让 agent 批修一批缺陷，它只把卡的状态翻了、`git mv` 进已修区，**仓库一行没变**。
// 这是「落地语义」同一类病（2026-11-13 Note）在缺陷轨的复发：`## 已修判定` 只写「修成什么算修好」，
// `guard-red-record` 只要求声称守卫事故的 spec 交出红配方——两者都不证明「真的修了、红绿真跑过」。
// 归档 = 缺陷卡最后一次可验证点，所以在这里把「修 = 系统面变更 + 红→绿 + 可对账的提交」变成机械判据。
//
// 判据（前向生效：`opened` ≥ 2026-11-14 的已修卡；存量不追补）：
//   ① 有非空 `## 修复证据` 节（标题只在**非围栏**行命中；卡面代码块里引用节名不算节），且含四行：
//      `- 改动面：` 至少一个反引号路径；每个路径不落在 `_backlog/`、`notes/`、`vendor/`
//        ——证据必须指向系统面（代码/门禁/测试/文档/内容），只改卡与 Note 不算修复。
//        路径可以已被删除/重命名：真实性与在岗由「证据提交的 changed files」对账（BUG-171），
//        不再要求它此刻仍在盘上。
//      `- 红：` / `- 绿：` 非空，且各自点名一条可执行命令（反引号里的 `pnpm …`/`node …`/`npx …`/
//        `vitest …`/`sh …`/`git …`）——并且红绿必须出现**同一条**命令（同一命令复跑才是红→绿）。
//        命令本身要能解析，且不能是空操作（BUG-175/177/182）：
//        - `pnpm [run] <script>` / `pnpm --filter <pkg> [run] <script>` / `pnpm exec <bin>`：
//          选项的值不参与选择，脚本须在根 package.json scripts、exec 的 bin 须在本地 `.bin`；
//        - `node [--import <mod> …] <path>`：目标须存在、是脚本文件、且在 tests/checks/tools/run 面
//          （`node package.json` 这类「能跑但什么都不验」的目标不算）；
//        - `npx [--yes] <bin> …` / `vitest …`：bin 须在本地 `.bin`，参数里的仓库路径须存在；
//        - `sh <path>`：脚本须存在且在测试/工具面；`sh -c` 是内联脚本，不算可复跑证据；
//        - `git <sub>`：不产生红→绿，一律不算证据。
//      `- 提交：commit <sha>`：该 sha 存在、**是 HEAD 的祖先**（当前分支可复算）、提交日期 ≥ opened、
//        且该提交的 changed files 与改动面相交（文件相等或落在目录下）——「卡上说的改动面」必须真在那次提交里出现过。
//   ② 浅克隆（`git rev-parse --is-shallow-repository` = true）且 sha 不可达时，跳过该卡的提交解析并在
//      PASS 行点名跳过数——不静默；完整历史是判据的前提，本地与 pre-push 都是完整历史。
//
// 负例留证 2026-11-14（真树植入 → 红 → 还原 → 绿，逐条原话）：
//   ① 删 BUG-160 的 `## 修复证据` → `FAIL fix-evidence: …BUG-160… 缺「## 修复证据」（已修卡必须给改动面/红/绿/提交）`；
//   ② 把 BUG-160 的 `- 提交：commit <sha>` 改成不存在的 sha → `…的提交 deadbeef 不存在`；
//   ③ 把 BUG-160 的改动面改成 `packages/company-pack/src/host/commands/prd-gate.ts`（该提交没改它）→ `…的提交 85e6fec9 没有改到改动面里的任何路径`；
//   ④ 把 BUG-160 的改动面改成 `notes/implemented/…` → `…只指向卡/笔记/vendor（不算系统面改动）`；
//   ⑤ 把 BUG-160 的红/绿命令改成两条不同命令（或去掉命令）→ `…的红/绿没有同一条命令` / `…必须点名一条可执行命令`；
//   ⑥ 把 BUG-160 的 `- 提交：` 改成 `7fe04557`（提交存在但不在当前分支历史上）→ `…不在 HEAD 历史上`；
//   ⑦ 把 BUG-160 的红/绿命令改成 `pnpm definitely-not-a-real-script-xyz` → `…命令不可执行…没有脚本`；
//   ⑧ 在 BUG-160 卡面加一个代码块引用 `## 修复证据`（真节在后）→ 旧实现截到代码块、四行全缺；
//   ⑨ 把 BUG-160 的红/绿改成 `sh -c true` → `…sh -c 是内联脚本…`；`git status` → `…git 子命令不产生红→绿…`；
//   ⑩ 把 BUG-160 的红/绿改成 `pnpm run test` / `node --import tsx/esm tests/…` → 应绿（合法形态不误伤）。
//   十条各自还原后 `PASS fix-evidence ×16`。
const EFFECTIVE = '2026-11-14'
const CARD = /^BUG-\d{3}-.*\.md$/
const EVIDENCE_HEADING = '修复证据'
/** 不允许充当「系统面」的路径前缀：卡、决策记忆、vendor 钉树。 */
const NOT_SURFACE = ['_backlog/', 'notes/', 'vendor/']

/**
 * 取卡片 frontmatter 字段（只认 `key: value` 行）。
 * @param {string} text 卡片全文。
 * @returns {Record<string, string>} 字段表。
 */
function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text)
  if (match === null) return {}
  const fields = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^([a-z-]+):\s*(.*)$/.exec(line.trim())
    if (field !== null) fields[field[1]] = (field[2] ?? '').trim()
  }
  return fields
}

/**
 * 取 `## <heading>` 到下一个 `## ` 之间的正文。
 * @param {string} text 卡片全文。
 * @param {string} heading 节标题（不含 `## `）。
 * @returns {string | undefined} 节正文；缺节返回 undefined。
 */
/**
 * 每行是否可用于结构解析（只处理围栏与整行/跨行 HTML 注释；完整形状家 = markdown-shape.ts，
 * 门禁是 .mjs 不引 TS，这里只留读卡需要的最小围栏状态）。
 * @param {string} text 卡片全文。
 * @returns {boolean[]} 与行一一对应。
 */
function structuralFlags(text) {
  const flags = []
  let fence
  let inComment = false
  for (const line of text.split('\n')) {
    if (fence !== undefined) {
      flags.push(false)
      const close = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line)
      if (close !== null && close[1][0] === fence.char && close[1].length >= fence.length && close[2].trim() === '') fence = undefined
      continue
    }
    if (inComment) {
      flags.push(false)
      if (line.includes('-->')) inComment = false
      continue
    }
    const open = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (open !== null) { fence = { char: open[1][0], length: open[1].length }; flags.push(false); continue }
    if (/^\s*<!--/.test(line)) { flags.push(false); if (!line.includes('-->')) inComment = true; continue }
    flags.push(true)
  }
  return flags
}

/**
 * 取 `## <heading>` 到下一个 `## ` 之间的正文，只在非围栏/非注释行匹配标题（BUG-178）。
 * @param {string} text 卡片全文。
 * @param {string} heading 节标题（不含 `## `）。
 * @returns {string | undefined} 节正文；缺节返回 undefined。
 */
function section(text, heading) {
  const lines = text.split('\n')
  const flags = structuralFlags(text)
  const pattern = new RegExp(`^##\\s+${heading}\\s*$`)
  let start = -1
  for (let index = 0; index < lines.length; index += 1) {
    if (flags[index] && pattern.test(lines[index])) { start = index; break }
  }
  if (start === -1) return undefined
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (flags[index] && /^##\s+/.test(lines[index])) { end = index; break }
  }
  return lines.slice(start + 1, end).join('\n')
}

/**
 * 取节内 `- <label>：value` 字段。
 * @param {string} text 节正文。
 * @param {string} label 字段名。
 * @returns {string | undefined} 去空白后的值。
 */
function field(text, label) {
  const match = new RegExp(`^-\\s*${label}：\\s*(.*)$`, 'm').exec(text)
  return match?.[1]?.trim()
}

/**
 * 取字段文本里反引号标注的可执行命令（红/绿必须点名同一条）。
 * @param {string | undefined} text 字段值。
 * @returns {string[]} 命令原文（已 trim）。
 */
function commands(text) {
  if (text === undefined) return []
  return [...text.matchAll(/`([^`]+)`/g)]
    .map(match => (match[1] ?? '').trim())
    .filter(token => /^(?:pnpm|node|npx|vitest|sh|git)\s/.test(token))
}

/**
 * 命令是否在本仓可执行（BUG-175）：前缀对但脚本/路径不存在的「同一条假命令」不算证据。
 * @param {string} root checkout 根。
 * @param {string} command 反引号里的命令原文。
 * @returns {string | undefined} 不可执行的原因；undefined = 可解析。
 */
const VALUE_FLAGS = {
  pnpm: new Set(['--filter', '-F', '--dir', '-C', '--prefix']),
  node: new Set(['--import', '-r', '--require', '--loader', '--experimental-loader']),
  npx: new Set(['--package', '-p']),
  vitest: new Set(['--config', '-c', '--root', '--dir']),
}
/** 证据命令允许的入口面：测试/门禁/工具/运行脚本；任意配置文件不算证据。 */
const EVIDENCE_SURFACE = /^(?:tests|checks|tools|run)\//
const SCRIPT_FILE = /\.(?:mjs|js|ts|sh)$/

/** 取出位置参数（跳过选项；带值选项连同值一起跳过）。 */
function positionals(tokens, valueFlags) {
  const out = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.startsWith('-')) {
      if (valueFlags.has(token)) index += 1
      continue
    }
    out.push(token)
  }
  return out
}

/**
 * 命令是否可执行且能作为证据（BUG-175/177/182）：按各命令语法取脚本/入口，拒绝空操作形态。
 * @param {string} root checkout 根。
 * @param {string} command 反引号里的命令原文。
 * @returns {string | undefined} 不可执行的原因；undefined = 可解析。
 */
function commandProblem(root, command) {
  const tokens = command.split(/\s+/).filter(Boolean)
  const bin = tokens[0]
  if (bin === 'pnpm') {
    const args = positionals(tokens.slice(1), VALUE_FLAGS.pnpm)
    let scripts = {}
    try { scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {} } catch { return 'package.json 不可读' }
    if (args[0] === 'exec') {
      const name = args[1]
      if (name === undefined) return 'pnpm exec 缺可执行名'
      return existsSync(join(root, 'node_modules/.bin', name)) ? undefined : `本地没有可执行 ${name}`
    }
    const script = args[0] === 'run' ? args[1] : args[0]
    if (script === undefined) return '缺脚本名'
    return typeof scripts[script] === 'string' ? undefined : `pnpm 没有脚本 ${script}`
  }
  if (bin === 'node') {
    const target = positionals(tokens.slice(1), VALUE_FLAGS.node)[0]
    if (target === undefined) return 'node 缺入口文件'
    if (!existsSync(join(root, target))) return `node 目标不存在：${target}`
    if (!SCRIPT_FILE.test(target)) return `node 目标须是脚本文件：${target}`
    if (!EVIDENCE_SURFACE.test(target)) return `node 目标须在 tests/checks/tools/run 面：${target}（任意文件不算证据）`
    return undefined
  }
  if (bin === 'npx' || bin === 'vitest') {
    const args = bin === 'npx' ? positionals(tokens.slice(1), VALUE_FLAGS.npx) : positionals(tokens.slice(1), VALUE_FLAGS.vitest)
    const name = bin === 'npx' ? args[0] : 'vitest'
    if (name === undefined) return '缺可执行名'
    if (!existsSync(join(root, 'node_modules/.bin', name))) return `本地没有可执行 ${name}`
    for (const token of bin === 'npx' ? args.slice(1) : args) {
      if (/^(?:tests|checks|tools|packages|probes|run|docs|snapshots)\//.test(token) && !existsSync(join(root, token))) {
        return `命令引用的路径不存在：${token}`
      }
    }
    return undefined
  }
  if (bin === 'sh') {
    if (tokens.includes('-c')) return 'sh -c 是内联脚本，不算可复跑证据（写成脚本文件）'
    const target = positionals(tokens.slice(1), new Set())[0]
    if (target === undefined) return 'sh 缺脚本'
    if (!existsSync(join(root, target))) return `sh 脚本不存在：${target}`
    if (!SCRIPT_FILE.test(target)) return `sh 脚本须是脚本文件：${target}`
    if (!EVIDENCE_SURFACE.test(target)) return `sh 脚本须在 tests/checks/tools/run 面：${target}`
    return undefined
  }
  if (bin === 'git') return 'git 子命令不产生红→绿（改用测试命令）'
  return `未知命令前缀：${bin}`
}

/**
 * 跑 git（失败返回 undefined，由调用方决定是判红还是跳过）。
 * @param {string} root checkout 根。
 * @param {readonly string[]} args 参数。
 * @returns {string | undefined} stdout（trim）；非零退出 undefined。
 */
function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : undefined
}

/**
 * 校验一张已修卡的修复证据。
 * @param {string} root checkout 根。
 * @param {string} rel 卡片相对路径。
 * @param {string} text 卡片全文。
 * @param {{ problems: string[], shallowSkipped: number, gitAvailable: boolean }} state 累积状态。
 */
function checkCard(root, rel, text, state) {
  const meta = frontmatter(text)
  const evidence = section(text, EVIDENCE_HEADING)
  if (evidence === undefined) {
    state.problems.push(`${rel} 缺「## 修复证据」（已修卡必须给改动面/红/绿/提交——翻状态 + git mv 不算修复）`)
    return
  }
  const surfaces = [...(field(evidence, '改动面') ?? '').matchAll(/`([^`]+)`/g)].map(match => match[1])
  if (surfaces.length === 0) state.problems.push(`${rel} 的 \`- 改动面：\` 缺反引号路径`)
  for (const path of surfaces) {
    if (NOT_SURFACE.some(prefix => path.startsWith(prefix))) {
      state.problems.push(`${rel} 的改动面 ${path} 只指向卡/笔记/vendor（不算系统面改动）`)
      continue
    }
  }
  const red = field(evidence, '红')
  const green = field(evidence, '绿')
  if (red === undefined || red === '') state.problems.push(`${rel} 缺 \`- 红：\`（还原什么 → 哪条断言红）`)
  if (green === undefined || green === '') state.problems.push(`${rel} 缺 \`- 绿：\`（接回什么 → 哪条断言绿）`)
  const redCommands = commands(red)
  const greenCommands = commands(green)
  if (red !== undefined && red !== '' && redCommands.length === 0) state.problems.push(`${rel} 的 \`- 红：\` 必须点名一条可执行命令（反引号里的 pnpm/node/npx/vitest/sh/git）`)
  if (green !== undefined && green !== '' && greenCommands.length === 0) state.problems.push(`${rel} 的 \`- 绿：\` 必须点名一条可执行命令（反引号里的 pnpm/node/npx/vitest/sh/git）`)
  if (redCommands.length > 0 && greenCommands.length > 0 && !redCommands.some(command => greenCommands.includes(command))) {
    state.problems.push(`${rel} 的红/绿没有同一条命令（红→绿必须用同一条命令复跑：红=${redCommands.join(' / ')}；绿=${greenCommands.join(' / ')}）`)
  }
  for (const command of new Set([...redCommands, ...greenCommands])) {
    const problem = commandProblem(root, command)
    if (problem !== undefined) state.problems.push(`${rel} 的红/绿命令不可执行（${command}）：${problem}`)
  }
  const commitField = field(evidence, '提交')
  const sha = commitField === undefined ? undefined : /^commit\s+([0-9a-f]{7,40})$/.exec(commitField)?.[1]
  if (sha === undefined) {
    state.problems.push(`${rel} 缺 \`- 提交：commit <sha>\`（红→绿发生在哪次提交）`)
    return
  }
  if (!state.gitAvailable) { state.shallowSkipped += 1; return }
  const exists = git(root, ['cat-file', '-e', `${sha}^{commit}`])
  if (exists === undefined) {
    if (git(root, ['rev-parse', '--is-shallow-repository']) === 'true') { state.shallowSkipped += 1; return }
    state.problems.push(`${rel} 的提交 ${sha} 不存在（证据必须对到真实提交）`)
    return
  }
  if (git(root, ['merge-base', '--is-ancestor', sha, 'HEAD']) === undefined) {
    state.problems.push(`${rel} 的提交 ${sha} 不在 HEAD 历史上（证据必须能在当前分支复算）`)
    return
  }
  const date = git(root, ['show', '-s', '--format=%cs', sha])
  const opened = meta.opened ?? ''
  if (date !== undefined && opened !== '' && date < opened) {
    state.problems.push(`${rel} 的提交 ${sha}（${date}）早于发现日期 ${opened}（修复应在发现之后）`)
  }
  const changed = (git(root, ['show', '--name-only', '--format=', sha]) ?? '').split('\n').filter(Boolean)
  const hit = surfaces.some(path => changed.some(file => file === path || file.startsWith(`${path.replace(/\/$/, '')}/`)))
  if (surfaces.length > 0 && !hit) {
    state.problems.push(`${rel} 的提交 ${sha} 没有改到改动面里的任何路径（卡上证据与提交对不上）`)
  }
}

export function run({ root, ok, fail }) {
  const dir = join(root, '_backlog/_archive/fixed_bugs')
  if (!existsSync(dir)) {
    fail('fix-evidence', '缺失 _backlog/_archive/fixed_bugs/（已修卡的家；门禁没有对象 ≠ 通过）')
    return
  }
  const state = { problems: [], shallowSkipped: 0, gitAvailable: git(root, ['rev-parse', '--is-inside-work-tree']) !== undefined }
  let checked = 0
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !CARD.test(entry.name)) continue
    const rel = `_backlog/_archive/fixed_bugs/${entry.name}`
    const text = readFileSync(join(dir, entry.name), 'utf8')
    const meta = frontmatter(text)
    if (meta.status !== '已修') continue
    if ((meta.opened ?? '') < EFFECTIVE) continue
    checked += 1
    checkCard(root, rel, text, state)
  }
  const skipped = state.shallowSkipped > 0 ? `；浅克隆/无 git：${String(state.shallowSkipped)} 张跳过提交解析` : ''
  state.problems.length === 0
    ? ok(`fix-evidence ×${String(checked)} 张新已修卡（改动面真实 + 红/绿齐 + 证据提交改到改动面${skipped}）`)
    : fail('fix-evidence', `${state.problems.slice(0, 6).join('；')}${state.problems.length > 6 ? ` …共 ${String(state.problems.length)} 处` : ''}`)
}

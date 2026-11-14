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
//   ① 有非空 `## 修复证据` 节，且含四行：
//      `- 改动面：` 至少一个反引号路径；每个路径真实存在，且不落在 `_backlog/`、`notes/`、`vendor/`
//        ——证据必须指向系统面（代码/门禁/测试/文档/内容），只改卡与 Note 不算修复。
//      `- 红：` / `- 绿：` 非空，且各自点名一条可执行命令（反引号里的 `pnpm …`/`node …`/`npx …`/
//        `vitest …`/`sh …`/`git …`）——并且红绿必须出现**同一条**命令（同一命令复跑才是红→绿）。
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
//   ⑥ 把 BUG-160 的 `- 提交：` 改成 `7fe04557`（提交存在但不在当前分支历史上）→ `…不在 HEAD 历史上`。
//   六条各自还原后 `PASS fix-evidence ×8`。
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
function section(text, heading) {
  const start = text.indexOf(`## ${heading}`)
  if (start === -1) return undefined
  const rest = text.slice(start + heading.length + 3)
  const end = rest.search(/\n## /)
  return end === -1 ? rest : rest.slice(0, end)
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
    if (!existsSync(join(root, path))) state.problems.push(`${rel} 的改动面 ${path} 不在盘上`)
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

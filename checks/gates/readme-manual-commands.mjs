// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── README ⊆ 安装手册 的 dsh 命令契约（readme-manual-commands，2026-11-08）──────────
// 为什么：安装路径的唯一完整副本在《安装手册》（_dist/安装手册.md，生成物）；根 README 只留
//   happy path 与指针。2026-11-02 已拍板这个 owner 口径，2026-11-08 实测仍未落实——三处安装
//   命令副本（README / pack README / 手册）各自带着不同占位符与警告句。
//   `command-refs` 只查 `pnpm` 脚本与 `node` 仓内路径，不查 `dsh` 启动命令，所以「README 写一条
//   手册里没有的 dsh 命令」在 verify 里是静默的。本门补这一格：README 里被当作命令的 `dsh …`
//   （代码围栏整行 + 行内反引号）必须在手册里逐字出现（空白归一、去掉 `$` 前缀与行尾注释）。
// 判据：README 命令集合 ⊆ 手册命令集合；README 至少要有一条 dsh 命令（产品承诺的「第一条命令」
//   必须可核对）。
// 负例留证 2026-11-08（先红后绿，实跑原话见 Note）：接线后首次跑在**现状真树**上红——
//   `FAIL readme-manual-commands: README.md:34 → dsh plugin --profile company add
//   /path/to/dsh-company-pack-<version>.tgz 不在《安装手册》里`（README 的安装副本已漂）。
//   README 重写、手册重排后绿；另以临时加 `dsh plugin --profile nope add` 复证红方向。
const README_REL = 'README.md'
const MANUAL_REL = '_dist/安装手册.md'

/** 一条命令的规范形：去提示符/行尾注释、空白归一。非 `dsh` 开头的片段返回 undefined。 */
function canonical(span) {
  let text = span.trim().replace(/^\$\s+/, '')
  if (!/^dsh(?:\s|$)/.test(text)) return undefined
  text = text.split(/\s+#/)[0]?.trim() ?? text
  return text.replace(/\s+/g, ' ')
}

/** 抽出文档里的 dsh 命令（代码围栏整行 + 行内反引号），带行号。 */
function dshCommands(text) {
  const commands = []
  let fenced = false
  text.split('\n').forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return }
    const spans = fenced ? [line] : [...line.matchAll(/`([^`]+)`/g)].map(match => match[1])
    for (const span of spans) {
      const command = canonical(span)
      if (command !== undefined) commands.push({ command, line: index + 1 })
    }
  })
  return commands
}

export function run({ root, ok, fail }) {
  if (!existsSync(join(root, README_REL))) {
    fail('readme-manual-commands', `${README_REL} 不在盘上——产品首屏入口不许消失`)
    return
  }
  if (!existsSync(join(root, MANUAL_REL))) {
    fail('readme-manual-commands', `${MANUAL_REL} 不在盘上——跑 node tools/export-dist.mjs 生成（手册是 README 命令的事实家）`)
    return
  }
  const readmeCommands = dshCommands(readFileSync(join(root, README_REL), 'utf8'))
  if (readmeCommands.length === 0) {
    fail('readme-manual-commands', `${README_REL} 没有任何 dsh 命令——README 至少要给出「第一条命令」，且它必须能在手册里核对`)
    return
  }
  const manualCommands = new Set(dshCommands(readFileSync(join(root, MANUAL_REL), 'utf8')).map(entry => entry.command))
  const missing = readmeCommands.filter(entry => !manualCommands.has(entry.command))
  if (missing.length > 0) {
    fail('readme-manual-commands', missing
      .map(entry => `${README_REL}:${String(entry.line)} → ${entry.command} 不在《安装手册》里（README 只留最短路径；完整命令与分支归手册）`)
      .join('；'))
    return
  }
  ok(`readme-manual-commands ×${String(readmeCommands.length)}（README 的 dsh 命令全在手册里）`)
}

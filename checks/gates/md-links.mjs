// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { validateMarkdownLinks } from '../../tools/lib/core/markdown-links.mjs'

// ── 2. 当前源文档的 Markdown 引用：文件 + 标题锚点 + reference definitions ──────
// 负例留证 2026-09-27：公司手册追加死链 → link 红。
// 磁盘发现含未跟踪的新 Note；根部/docs/notes/checks/pack + 公司手册/章程/org/templates。
// 生成物、vendor 源、dev/snapshots、journal/deliverables、明确归档不作出链检查源。
//
// 2026-11-25 立 **repo-closed 判据**（动机 = CI run 45421906380：连续 22 次红、本机 ALL PASS）：
//   `outside` = 相对链接逃出仓库根（只在作者机器上与相邻研究树重合）；
//   `ignored` = 目标存在但被 git 忽略（`lib/**` 等构建产物：本机有、干净 clone 无）。
// 两类以前都被 existsSync 放行，于是门禁的绿依赖作者磁盘状态。判据改为「干净 clone 里能不能解析」。
// git 忽略查询住本门（judge 层可 spawn git）；`tools/lib` 的校验原语只收注入的判定函数，保持 keyless 纯逻辑。
// 负例留证 2026-11-25（实跑）：docs/ 临时写 `[x](../../outside.md)` → `outside` 红；
//   写 `[x](../packages/company-pack/lib/client.js)`（文件在场且 gitignored）→ `ignored` 红；还原 → 绿。
const REASON_TEXT = {
  outside: 'repo 外目标（相对链接逃出仓库根；干净 clone 必断——改成代码路径或 URL）',
  ignored: 'gitignored 目标（本机有、干净 clone 无——别把构建/运行产物当活链接）',
  target: '目标不存在',
  anchor: '标题锚点不存在',
  encoding: 'URL 转义非法',
}

/**
 * 被 git 忽略的目标。只有「root 自己就是工作树根」时忽略状态才有意义：测试夹具住在
 * `node_modules/.cache/` 下，会被外层仓库的 .gitignore 全部命中——嵌套情况下退回存在性判定。
 */
function gitIgnoredTargets(root, targets) {
  const inside = []
  for (const target of targets) {
    const rel = relative(root, target).split(sep).join('/')
    if (rel.startsWith('..') || rel.startsWith('vendor/')) continue
    inside.push(target)
  }
  if (inside.length === 0) return new Set()
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' })
  if (top.error !== undefined || top.status !== 0) return new Set()
  if (realpathSync(top.stdout.trim()) !== realpathSync(root)) return new Set()
  const run = spawnSync('git', ['check-ignore', '--stdin', '-z'], {
    cwd: root,
    input: `${inside.join('\0')}\0`,
    encoding: 'utf8',
  })
  // 非 git 工作树（或 git 不可用）时退回「只看存在性」；这是环境降级，不是判断分支。
  if (run.error !== undefined || (run.status !== 0 && run.status !== 1)) return new Set()
  return new Set((run.stdout ?? '').split('\0').filter(Boolean))
}

export function run({ root, ok, fail }) {
const links = validateMarkdownLinks(root, { isIgnored: targets => gitIgnoredTargets(root, targets) })
for (const v of links.violations) {
  fail(v.file.startsWith('notes/') ? 'notes-link' : 'link', `${v.file}:${v.line} → ${v.url} (${REASON_TEXT[v.reason] ?? v.reason})`)
}
if (links.violations.length === 0) ok(`md-links (含 notes) ×${links.linkCount} / ${links.files.length} files`)
}

// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { validateMarkdownLinks } from '../../tools/lib/markdown-links.mjs'

// ── 2. 当前源文档的 Markdown 引用：文件 + 标题锚点 + reference definitions ──────
// 负例留证 2026-09-27：公司手册追加死链 → link 红。
// 磁盘发现含未跟踪的新 Note；根部/docs/notes/checks/pack + 公司手册/章程/org/templates。
// 生成物、vendor 源、dev/snapshots、journal/deliverables、明确归档不作出链检查源。
export function run({ root, ok, fail }) {
const links = validateMarkdownLinks(root)
for (const v of links.violations) {
  fail(v.file.startsWith('notes/') ? 'notes-link' : 'link', `${v.file}:${v.line} → ${v.url} (${v.reason})`)
}
if (links.violations.length === 0) ok(`md-links (含 notes) ×${links.linkCount} / ${links.files.length} files`)
}

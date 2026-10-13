// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 1. Markdown：严格 UTF-8 + 单个结尾换行 ──────────────────────────────────
// 负例留证 2026-09-27：临时 md 无尾换行 → md-newline 红（还原后绿）。
export function run({ root, ok, fail }) {
const mdFiles = []
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'vendor') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.md')) mdFiles.push(p)
  }
}
walk(root)
for (const p of mdFiles) {
  const buf = readFileSync(p)
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    if (!text.endsWith('\n') || text.endsWith('\n\n')) fail('md-newline', `${p} 需以单个换行结尾`)
  } catch { fail('md-utf8', `${p} 不是严格 UTF-8`) }
}
ok(`md-utf8/newline ×${mdFiles.length}`)
}

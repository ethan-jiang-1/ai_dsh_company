// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 1. Markdown：严格 UTF-8 + 单个结尾换行 ──────────────────────────────────
// 负例留证 2026-09-27：临时 md 无尾换行 → md-newline 红（还原后绿）。
// 2026-11-03（R5-01 现场）：隔离探针在 runtime/tmp 留了 pnpm corepack 的 README（无尾换行），
//   本门把运行残留当源文档判红——runtime/、company-workspace/、.pnpm-store/ 是 gitignored
//   运行态/用户盘，不是本仓 Markdown 源；跳过它们。负例留证：在 runtime/tmp 放无尾换行 md → 旧红，
//   跳过后面绿（当轮实跑）。
export function run({ root, ok, fail }) {
const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'runtime', 'company-workspace', '.pnpm-store'])
const mdFiles = []
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = join(dir, e.name)
    // 跳过符号链接：dev 盘未初始化时 runtime/company-workspace 的制度件链接会悬空，
    // 那不是 UTF-8 问题（2026-10-25 fresh-clone 实测：readFileSync 抛 ENOENT 会中断整个 runner）。
    if (e.isSymbolicLink()) continue
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.md')) mdFiles.push(p)
  }
}
walk(root)
for (const p of mdFiles) {
  let buf
  try { buf = readFileSync(p) } catch { continue }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    if (!text.endsWith('\n') || text.endsWith('\n\n')) fail('md-newline', `${p} 需以单个换行结尾`)
  } catch { fail('md-utf8', `${p} 不是严格 UTF-8`) }
}
ok(`md-utf8/newline ×${mdFiles.length}`)
}

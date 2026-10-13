// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { lstatSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'

// ── 4. CLAUDE.md symlink → AGENTS.md ────────────────────────────────────────
// 负例留证 2026-09-27：CLAUDE.md 换成普通文件 → claude-symlink 红。
export function run({ root, ok, fail }) {
const claude = join(root, 'CLAUDE.md')
try {
  if (!lstatSync(claude).isSymbolicLink() || readlinkSync(claude) !== 'AGENTS.md') fail('claude-symlink', 'CLAUDE.md 应为指向 AGENTS.md 的 symlink')
  else ok('claude-symlink')
} catch { fail('claude-symlink', 'CLAUDE.md 不存在') }
}

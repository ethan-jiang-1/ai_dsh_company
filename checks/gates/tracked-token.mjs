// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增/移动日志、探针输出、文档或快照说明后。
// 为什么：BUG-029（2026-10-20）观察窗 token 再次随 runtime/web-logs 入库；BUG-013（2026-10-12）
// 已经发生过一次同类。上次只修了 runtime/e2e/ 路径，没有类级守卫；本门禁扫 tracked 文件的
// 「带 token 的 URL」形状，值不打印。vendor/ 只读，不在射程；snapshots/ 仍在射程（历史证据
// 若含 token 也应被看见，而不是被目录名豁免）。
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { findTokenUrls } from '../../tools/lib/tracked-token.mjs'

const MAX_BYTES = 2 * 1024 * 1024
const SKIP_PREFIXES = ['vendor/']

export function run({ root, ok, fail }) {
  let files
  try {
    files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
  } catch (error) {
    fail('tracked-token', `git ls-files 失败，无法判定 tracked 面：${String(error.message ?? error)}`)
    return
  }

  const hits = []
  let scanned = 0
  let skipped = 0
  for (const rel of files) {
    if (SKIP_PREFIXES.some(prefix => rel.startsWith(prefix))) continue
    const abs = join(root, rel)
    let stat
    try { stat = statSync(abs) } catch { continue }
    if (!stat.isFile() || stat.size > MAX_BYTES) { skipped++; continue }
    let text
    try { text = readFileSync(abs, 'utf8') } catch { continue }
    scanned++
    const rows = findTokenUrls(text)
    if (rows.length > 0) {
      const detail = rows.map(row => `line ${String(row.line)} tokenLen=${String(row.tokenLength)}`).join(', ')
      hits.push(`${rel}（${detail}）`)
    }
  }

  if (hits.length > 0) {
    fail('tracked-token', `tracked 文件含 token URL（值不打印）：${hits.slice(0, 5).join('；')}${hits.length > 5 ? `；共 ${String(hits.length)} 件` : ''}`)
  } else {
    ok(`tracked-token ×${String(scanned)}（tracked 面零 token URL；跳过 ${String(skipped)} 个 >2MB 或非普通文件）`)
  }
}

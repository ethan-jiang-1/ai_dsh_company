#!/usr/bin/env node
// 状态：常驻
// 何时跑：每 1–2 周维护、或 `du -sh runtime` 明显变大时；默认 dry-run，`--apply` 才删。
// 作用：清 `runtime/` 下 >N 天（默认 7）的**生成物**——会话日志、探针证据、诊断现场、e2e 残留、tmp。
//   四条留人：① 被 tracked markdown 引用的（删了会断链/失真）；② git tracked 的；③ README；④ 未到天数。
//   插件内容（packages/company-pack）、docs/、tests/、checks/、probes/ 全不在射程。
// 用法：node tools/prune-runtime.mjs [--days 7] [--apply]
// 退出码：0 = 正常；2 = 环境不满足（git 不可用）。
import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { selectPrunable } from './lib/prune-runtime.mjs'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}
const DAYS = Number(arg('days', '7'))
const APPLY = process.argv.includes('--apply')
if (!Number.isFinite(DAYS) || DAYS <= 0) { console.error('prune-runtime: --days 必须是正数'); process.exit(2) }

const git = (...args) => {
  const run = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  if (run.status !== 0) { console.error(`prune-runtime: git ${args.join(' ')} 失败`); process.exit(2) }
  return run.stdout
}

/** 候选根（逐件列出子项；目录与文件都算一条）。 */
const CANDIDATE_ROOTS = [
  'runtime/harness-home/sessions',
  'runtime/harness-home/diagnosis',
  'runtime/harness-home/tmp',
  'runtime/harness-home/replay-runs',
  'runtime/harness-home/replay-diagnosis',
  'runtime/harness-home/probe-evidence',
  'runtime/e2e',
  'runtime/human-exits-evidence',
]
// 形如 runtime/harness-home/<name>-evidence-<rand> 的探针产物目录
if (existsSync(join(ROOT, 'runtime/harness-home'))) {
  for (const name of readdirSync(join(ROOT, 'runtime/harness-home'))) {
    if (/(^|-)evidence(-|$)/.test(name) && name !== 'probe-evidence') CANDIDATE_ROOTS.push(`runtime/harness-home/${name}`)
  }
}

const tracked = new Set(git('ls-files', 'runtime').split('\n').filter(Boolean))
const mdText = git('ls-files', '*.md').split('\n').filter(Boolean)
  .map(path => { try { return readFileSync(join(ROOT, path), 'utf8') } catch { return '' } }).join('\n')

const candidates = []
for (const root of CANDIDATE_ROOTS) {
  const abs = join(ROOT, root)
  if (!existsSync(abs)) continue
  for (const name of readdirSync(abs)) {
    const path = `${root}/${name}`
    const mtimeMs = statSync(join(ROOT, path)).mtimeMs
    const isTracked = [...tracked].some(item => item === path || item.startsWith(`${path}/`))
    candidates.push({ path, mtimeMs, tracked: isTracked, referenced: mdText.includes(path) })
  }
}

const { drop, keep } = selectPrunable(candidates, { now: Date.now(), days: DAYS })
// 不跟符号链接（replay-runs 里的 node_modules 有断链，statSync 会 ENOENT）
const sizeOf = (path) => {
  let stat
  try { stat = lstatSync(join(ROOT, path)) } catch { return 0 }
  if (stat.isSymbolicLink()) return 0
  if (!stat.isDirectory()) return stat.size
  let total = 0
  try { for (const entry of readdirSync(join(ROOT, path))) total += sizeOf(`${path}/${entry}`) } catch { return total }
  return total
}
const sizes = new Map(drop.map(row => [row.path, sizeOf(row.path)]))
const bytes = [...sizes.values()].reduce((sum, value) => sum + value, 0)
const mb = (value) => `${(value / 1024 / 1024).toFixed(1)}M`

console.log(`prune-runtime: runtime/ 下 >${String(DAYS)} 天生成物（${APPLY ? 'APPLY' : 'dry-run'}）`)
console.log(`  候选 ${String(candidates.length)} · 可删 ${String(drop.length)}（${mb(bytes)}）· 留 ${String(keep.length)}`)
for (const row of drop) console.log(`  DEL  ${row.path}  ${mb(sizes.get(row.path) ?? 0)}`)
const reasons = keep.reduce((acc, row) => { acc[row.reason] = (acc[row.reason] ?? 0) + 1; return acc }, {})
console.log(`  留人原因：${Object.entries(reasons).map(([reason, count]) => `${reason}×${String(count)}`).join(' · ') || '无'}`)
if (!APPLY) { console.log('  （dry-run：确认后加 --apply 执行）'); process.exit(0) }
for (const row of drop) rmSync(join(ROOT, row.path), { recursive: true, force: true })
console.log(`  ✓ 已删除 ${String(drop.length)} 项，回收 ${mb(bytes)}`)

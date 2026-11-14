/**
 * 资产消费者图（census v2，2026-11-14）。
 *
 * 为什么：census 只数「登记了什么」，不回答「谁在用它」。67 个探针全手动、
 * 很多可能 0 消费者；没有消费者图，退役只能靠猜。这里做**只读文本扫描**：
 * 在 tests/checks/tools/probes/run 里找资产名（或文件名）的引用，排除注册表/census
 * 自身，避免「登记即消费者」的假计数。
 *
 * 边界：这是**引用计数**，不是运行次数；被文档/断言引用也算消费者。运行日志另接。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

const ROOTS = ['tests', 'checks', 'tools', 'probes', 'run']
const EXTS = /\.(?:mjs|js|ts|tsx|md)$/
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', '_dist', 'runtime', 'snapshots', 'lib'])
const SELF = new Set([
  'tools/lib/asset-lanes.mjs',
  'tools/lib/test-census.mjs',
  'tools/test-census.mjs',
  'tests/CENSUS.generated.md',
  'checks/lanes/probe.entry.mjs',
])

/** 递归收集候选消费者文件（相对路径）。 */
function walk(root, dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { walk(root, path, acc); continue }
    if (!EXTS.test(entry.name)) continue
    if (entry.name === 'README.md' || entry.name.endsWith('.generated.md')) continue
    const rel = relative(root, path)
    if (SELF.has(rel)) continue
    acc.push(rel)
  }
}

/**
 * 每个资产的消费者文件数（按资产名/文件名做子串引用）。
 * @param {string} root 仓库根。
 * @param {{name:string}[]} assets 资产（冒烟 + 探针）。
 * @returns {Record<string, number>} 资产名 → 引用文件数。
 */
export function consumerCount(root, assets) {
  const files = []
  for (const dir of ROOTS) {
    try { walk(root, join(root, dir), files) } catch { /* 目录不存在 = 空 */ }
  }
  const texts = files.map(file => {
    try { return readFileSync(join(root, file), 'utf8') } catch { return '' }
  })
  const counts = {}
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const asset of assets) {
    const name = asset.name
    // 精确 token：文件名/引号包围的名字；`probe.mjs` 不能命中 `team-xxx-probe.mjs`。
    const needles = [`${name}.e2e.mjs`, `${name}.entry.mjs`, `${name}.mjs`, `'${name}'`, `"${name}"`, `\`${name}\``]
    const patterns = needles.map(needle => new RegExp(`(^|[^a-z0-9-])${escape(needle)}(?=$|[^a-z0-9-])`, 'i'))
    counts[asset.name] = files.reduce((sum, file, index) => {
      // 资产自己的文件不是自己的消费者（smoke 的 .e2e/.entry、probe 的 .mjs 都算）。
      if (basename(file).startsWith(`${asset.name}.`)) return sum
      return sum + (patterns.some(pattern => pattern.test(texts[index])) ? 1 : 0)
    }, 0)
  }
  return counts
}

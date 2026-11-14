/**
 * 资产消费者图（census v2，2026-11-14；W4 补齐自动 lane 动态调度口径）。
 *
 * 为什么：census 只数「登记了什么」，不回答「谁在用它」。原先只做静态文件名扫描，
 * 把由 `fast-lane` / `pre-push` / `keyless-lane` 动态读取注册表自动调度的冒烟全部漏算成「0 消费者」，
 * 造成盘子失真。现合并两类真实消费者：
 *   ① 自动调度消费者 = `asset.lanes.length`（参与 `fast` / `surface` / `weekly` 任一自动 lane 即有真实 runner 消费）；
 *   ② 显式引用消费者 = `tests/checks/tools/probes/run` 里引用该资产名/文件名的文件数（排除注册表与生成物自身）。
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
 * 每个资产的消费者计数（自动调度 lane 数 + 仓库显式引用文件数）。
 * @param {string} root 仓库根。
 * @param {{name:string, lanes?: readonly string[]}[]} assets 资产（冒烟 + 探针）。
 * @returns {Record<string, number>} 资产名 → 消费者数。
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
    const laneConsumers = Array.isArray(asset.lanes) ? asset.lanes.length : 0
    // 精确 token：文件名/引号包围的名字；`probe.mjs` 不能命中 `team-xxx-probe.mjs`。
    const needles = [`${name}.e2e.mjs`, `${name}.entry.mjs`, `${name}.mjs`, `'${name}'`, `"${name}"`, `\`${name}\``]
    const patterns = needles.map(needle => new RegExp(`(^|[^a-z0-9-])${escape(needle)}(?=$|[^a-z0-9-])`, 'i'))
    const refConsumers = files.reduce((sum, file, index) => {
      // 资产自己的文件不是自己的消费者（smoke 的 .e2e/.entry、probe 的 .mjs 都算）。
      if (basename(file).startsWith(`${asset.name}.`)) return sum
      return sum + (patterns.some(pattern => pattern.test(texts[index])) ? 1 : 0)
    }, 0)
    counts[asset.name] = laneConsumers + refConsumers
  }
  return counts
}

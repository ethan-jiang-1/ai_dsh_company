// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增/移动公开入口脚本后。
// 为什么：2026-10-20 审计发现 checks/README 手维护漏 5 个公开入口；本门禁把「公开入口 → 索引」
// 变成机械覆盖。gates/lib/drivers/archive 是内部实现，不要求索引；smoke/audit/probes/tools 顶层要。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { missingIndexedScripts } from '../../tools/lib/checks-index.mjs'

const PUBLIC_DIRS = ['checks/smoke', 'checks/audit', 'probes']
const EXCLUDED_PREFIXES = ['checks/gates/', 'checks/lib/', 'checks/smoke/lib/', 'tools/drivers/', 'tools/lib/', 'tools/archive/']

function walk(root, rel) {
  const out = []
  const dir = join(root, rel)
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...walk(root, child))
    else if (entry.name.endsWith('.mjs')) out.push(child)
  }
  return out
}

export function run({ root, ok, fail }) {
  const readmePath = join(root, 'checks', 'README.md')
  if (!existsSync(readmePath)) {
    fail('script-index', 'checks/README.md 不在盘上——公开入口索引不许消失')
    return
  }
  const scripts = []
  for (const dir of PUBLIC_DIRS) scripts.push(...walk(root, dir))
  const tools = readdirSync(join(root, 'tools'), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.mjs'))
    .map(entry => `tools/${entry.name}`)
  scripts.push(...tools)
  const publicScripts = scripts
    .filter(rel => !EXCLUDED_PREFIXES.some(prefix => rel.startsWith(prefix)))
    .sort()
  const missing = missingIndexedScripts(publicScripts, readFileSync(readmePath, 'utf8'))
  missing.length === 0
    ? ok(`script-index ×${String(publicScripts.length)}（公开入口全部在 checks/README）`)
    : fail('script-index', `未入索引的公开入口：${missing.join('、')}（新增入口同 diff 补 checks/README）`)
}

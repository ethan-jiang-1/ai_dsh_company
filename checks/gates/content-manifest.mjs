// 状态：常驻
// 何时跑：新增/改名/移动 content 文件，或调整加载层（T0/T1/T2）后；发布前。跑法 = pnpm verify。
//
// 清单即契约（2026-11-09 三层）：`content/manifest.json` 逐份声明文件与 tier。
// 判据：
//   ① 清单里的路径都在盘上；
//   ② generic/、company/、product-types/ 下的每份 .md 都被清单点名一次（没登记 = 漏层）；
//   ③ 预算：T0 合计 ≤6KB；T1 合计 ≤4KB；T2 单文件 ≤6KB。
// 负例留证（建门时实跑）：在 generic/ 加一份未登记文件 → ②红；把 T1 文件加 5KB → ③红；还原 → 绿。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'
const MANIFEST = join(CONTENT, 'manifest.json')
const BUDGETS = { t0: 6_144, t1: 4_096, t2: 6_144 }
const TOTAL_BUDGETS = { t0: 6_144, t1: 4_096 }
const REQUIRED_DIRS = ['generic', 'company', 'product-types']

function markdownFiles(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...markdownFiles(join(dir, entry.name), rel))
    else if (entry.name.endsWith('.md')) out.push(rel)
  }
  return out
}

export function run({ root, ok, fail }) {
  const content = join(root, CONTENT)
  if (!existsSync(MANIFEST)) {
    fail('content-manifest', `${CONTENT}/manifest.json 缺失`)
    return
  }
  let manifest
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  } catch (error) {
    fail('content-manifest', `manifest.json 不可解析：${String(error)}`)
    return
  }
  const tiers = manifest?.tiers ?? {}
  const problems = []
  const listed = new Map()
  for (const [tier, files] of Object.entries(tiers)) {
    if (!(tier in BUDGETS) && tier !== 'legacy') { problems.push(`未知 tier：${tier}`); continue }
    if (!Array.isArray(files)) { problems.push(`tier ${tier} 不是数组`); continue }
    for (const rel of files) {
      const path = join(content, rel)
      if (!existsSync(path)) { problems.push(`清单列了不存在的文件：${rel}`); continue }
      if (listed.has(rel)) problems.push(`同一文件被登记两次：${rel}（${listed.get(rel)} / ${tier}）`)
      listed.set(rel, tier)
    }
    if (tier in TOTAL_BUDGETS) {
      const total = files.reduce((sum, rel) => existsSync(join(content, rel)) ? sum + statSync(join(content, rel)).size : sum, 0)
      if (total > TOTAL_BUDGETS[tier]) problems.push(`${tier} 合计 ${String(total)}B > ${String(TOTAL_BUDGETS[tier])}B`)
    }
  }
  for (const tier of ['t2']) {
    for (const rel of tiers[tier] ?? []) {
      if (!existsSync(join(content, rel))) continue
      const size = statSync(join(content, rel)).size
      if (size > BUDGETS[tier]) problems.push(`${tier} 单文件 ${rel} ${String(size)}B > ${String(BUDGETS[tier])}B（拆成更具体的问题）`)
    }
  }
  for (const dir of REQUIRED_DIRS) {
    const abs = join(content, dir)
    if (!existsSync(abs)) continue
    for (const rel of markdownFiles(abs)) {
      const full = `${dir}/${rel}`
      if (!listed.has(full)) problems.push(`未登记的 content 文件：${full}（在 manifest.json 声明 tier）`)
    }
  }
  problems.length === 0
    ? ok(`content-manifest（${String(listed.size)} 份；T0 ${String((tiers.t0 ?? []).length)} / T1 ${String((tiers.t1 ?? []).length)} / T2 ${String((tiers.t2 ?? []).length)}）`)
    : fail('content-manifest', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}

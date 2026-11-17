#!/usr/bin/env node
// 状态：常驻
// 纯搬移等价 oracle（2026-10-16 第三轮结构收敛自用一次后沉淀；keyless，读写都在 runtime gitignored 区）
// 何时跑：任何「纯搬移/拆分」重构——拆前录清单，拆后比清单，证明行为零漂移。
//
// 为什么需要它：结构轮的验收判据是「零行为漂移」，而机器绿灯（pnpm test 全绿）**证明不了**
// 这件事——测试可以全绿而某条被删掉、某条被改名、某条断言被削弱。本脚本把「拆前/拆后清单」
// 的比对做成可复跑判据：改名/新增/删除一条都拦得住，而**文件前缀与 describe 归属搬家**放行
//（那正是拆分本身）。
//
// 用法：
//   # 拆前（在 HEAD 干净状态）
//   pnpm exec vitest run --reporter=json --outputFile=runtime/before.json
//   node checks/audit/refactor-drift-audit.mjs --hashes runtime/before.json > runtime/before.hashes
//   # 拆后
//   pnpm exec vitest run --reporter=json --outputFile=runtime/after.json
//   node checks/audit/refactor-drift-audit.mjs --hashes runtime/after.json > runtime/after.hashes
//   node checks/audit/refactor-drift-audit.mjs --compare runtime/before.hashes runtime/after.hashes
//
// 两档清单（**用 --hashes 那档判等价**）：
//   --names  ：`<文件> :: <全名>`——人读、写进 Note；
//   --hashes ：`<归一全名>\t<指纹>`——指纹优先是**测试体**（回读源码、TS AST 取 describe/it 回调体，
//              归一化后 sha256），不是标题。标题是参数化/非字面量时退回标题指纹，生成时 stderr
//              点名条数与来源——**退回不是证明**，见 `checks/lib/refactor-drift.mjs` 头注。
// 退出码：0 = 规范化后逐行一致；1 = 有真差异（打印差异行）；2 = 用法/文件错误。
// ⚠ 传两份 --hashes 清单时，「逐行一致」= 名字与指纹都一致；`--compare` 用**多重集**差，
//   重复行拆前 2 条、拆后 1 条也判红（2026-11-17 BUG-202）。
//
// 归一规则（只放行「归属搬家」，其余一律当差异）：
//   ① 文件前缀 `tests/<...>/<file>.spec.ts :: ` 整段剥掉——拆分必然改文件；
//   ② 已知的 describe 标题按「域名」折叠（默认把「交付物三态判据…」「交付物形状与身份…」
//      「C1 布局…」都折成同一个域名——记录见 --describe-map）。
//   显式传 `--describe-map a=b,c=d` 可覆盖默认表；未登记的 describe 标题原样保留（不猜）。
import { readFileSync } from 'node:fs'
import {
  diffManifests, manifestFromReport, parseDescribeMap, parseManifest, renderManifest,
} from '../lib/refactor-drift.mjs'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}
const USAGE = 'refactor-drift: --names <vitest.json> | --hashes <vitest.json> | --compare <before> <after> [--describe-map a=b,c=d]'

function readReport(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    console.error(`refactor-drift: 读不到 vitest JSON：${error.message}`)
    process.exit(2)
  }
}

if (argv.includes('--names')) {
  const report = readReport(flag('names'))
  const manifest = manifestFromReport(report, { withBodies: false })
  process.stdout.write(renderManifest(manifest.entries, { withHashes: false }))
  process.exit(0)
}

if (argv.includes('--hashes')) {
  const report = readReport(flag('hashes'))
  const manifest = manifestFromReport(report)
  process.stdout.write(renderManifest(manifest.entries))
  const total = manifest.resolvedCount + manifest.unresolvedCount
  if (manifest.unresolvedCount > 0) {
    console.error(`refactor-drift: ${String(manifest.unresolvedCount)}/${String(total)} 条测试体未定位（参数化/非字面量标题/读不到源码），退回标题指纹——这批不等于「测试体已证」`)
    for (const source of manifest.unresolvedSource.slice(0, 5)) console.error(`refactor-drift:   未定位来源：${source}`)
    if (manifest.unresolvedSource.length > 5) console.error(`refactor-drift:   …共 ${String(manifest.unresolvedSource.length)} 处`)
  } else {
    console.error(`refactor-drift: ${String(total)}/${String(total)} 条测试体指纹已定位`)
  }
  process.exit(0)
}

if (argv.includes('--compare')) {
  const i = argv.indexOf('--compare')
  const [before, after] = [argv[i + 1], argv[i + 2]]
  if (!before || !after || before.startsWith('--') || after.startsWith('--')) {
    console.error(USAGE)
    process.exit(2)
  }
  let map
  try {
    map = parseDescribeMap(flag('describe-map'))
  } catch (error) {
    console.error(`refactor-drift: ${error.message}`)
    process.exit(2)
  }
  let a, b
  try {
    a = parseManifest(readFileSync(before, 'utf8'), map)
    b = parseManifest(readFileSync(after, 'utf8'), map)
  } catch (error) {
    console.error(`refactor-drift: 读不到清单：${error.message}`)
    process.exit(2)
  }
  const { onlyA, onlyB } = diffManifests(a, b)
  const tier = a.some(line => line.includes('\t')) ? '含指纹（测试体优先，未定位条目退回标题）' : '仅测试名'
  console.log(`拆前 ${String(a.length)} 条 / 拆后 ${String(b.length)} 条（判别档：${tier}）`)
  if (onlyA.length === 0 && onlyB.length === 0) {
    console.log('ALL PASS 规范化后逐行一致：零新增 / 零删除 / 零改名 / 零指纹变动（差异仅为文件与 describe 归属搬家）')
    process.exit(0)
  }
  console.log(`FAIL 真差异：拆前独有 ${String(onlyA.length)} 条、拆后独有 ${String(onlyB.length)} 条`)
  for (const line of onlyA.slice(0, 20)) console.log(`  - ${line}`)
  for (const line of onlyB.slice(0, 20)) console.log(`  + ${line}`)
  process.exit(1)
}

console.error(USAGE)
process.exit(2)

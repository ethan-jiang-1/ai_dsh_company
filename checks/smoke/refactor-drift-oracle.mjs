#!/usr/bin/env node
// 状态：常驻
// 纯搬移等价 oracle（2026-10-16 第三轮结构收敛自用一次后沉淀；keyless，读写都在 runtime gitignored 区）
// 何时跑：任何「纯搬移/拆分」重构——拆前录清单，拆后比清单，证明行为零漂移。
//
// 为什么需要它：结构轮的验收判据是「零行为漂移」，而机器绿灯（pnpm test 全绿）**证明不了**
// 这件事——测试可以全绿而某条被删掉、某条被改名、某条断言被削弱。本脚本把「拆前/拆后全名清单」
// 的比对做成可复跑判据：改名/新增/删除一条都拦得住，而**文件前缀与 describe 归属搬家**放行
//（那正是拆分本身）。
//
// 用法：
//   # 拆前（在 HEAD 干净状态）
//   pnpm exec vitest run --reporter=json --outputFile=runtime/before.json
//   node checks/smoke/refactor-drift-oracle.mjs --hashes runtime/before.json > runtime/before.hashes
//   # 拆后
//   pnpm exec vitest run --reporter=json --outputFile=runtime/after.json
//   node checks/smoke/refactor-drift-oracle.mjs --hashes runtime/after.json > runtime/after.hashes
//   node checks/smoke/refactor-drift-oracle.mjs --compare runtime/before.hashes runtime/after.hashes
//
// 两档清单（**用 --hashes 那档判等价**）：
//   --names  ：`<文件> :: <全名>`——人读、写进 Note；
//   --hashes ：`<归一全名>\t<sha256(测试体)>`——**比 --names 强**：除改名/增删外还拦「测试体被改」
//              （删断言、toBe→toContain、fixture 调包）。判别力边界：它证明「这些测试体一字未动」，
//              不证明「体里的断言仍有意义」——后者归语义审（§13），本脚本不管。
// 退出码：0 = 规范化后逐行一致；1 = 有真差异（打印差异行）；2 = 用法/文件错误。
// ⚠ 传两份 --hashes 清单时，「逐行一致」= 测试名与测试体指纹都一致（比 --names 档强）。
//
// 归一规则（只放行「归属搬家」，其余一律当差异）：
//   ① 文件前缀 `tests/<...>/<file>.spec.ts :: ` 整段剥掉——拆分必然改文件；
//   ② 已知的 describe 标题按「域名」折叠（默认把「交付物三态判据…」「交付物形状与身份…」
//      「C1 布局…」都折成同一个域名——记录见 --describe-map）。
//   显式传 `--describe-map a=b,c=d` 可覆盖默认表；未登记的 describe 标题原样保留（不猜）。
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}
const USAGE = 'refactor-drift-oracle: --names <vitest.json> | --compare <before.names> <after.names> [--describe-map a=b,c=d]'

/** vitest JSON → 全名清单（一行一测试；换行归一，跳过 skipped）。 */
function namesFrom(jsonPath) {
  const report = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const out = []
  for (const file of report.testResults ?? []) {
    const rel = String(file.name ?? '').replace(/^.*\/tests\//, 'tests/')
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === 'skipped') continue
      out.push({
        name: `${rel} :: ${String(assertion.fullName ?? '').replace(/\n/g, '\\n')}`,
        body: (assertion.titlePath ?? [assertion.title ?? '']).join('\u0000'),
      })
    }
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/** 测试体指纹（标题路径——vitest JSON 不含函数体，标题路径是可得的最稳判别面）。 */
function bodyHash(entry) {
  return createHash('sha256').update(entry.body).digest('hex').slice(0, 16)
}

const DEFAULT_DESCRIBE_MAP = {
  '交付物三态判据（R4：keyless 行为层）': '交付物判据·域',
  '交付物形状与身份（R4 判据的基座半边）': '交付物判据·域',
  'C1 布局：日期前缀、归档根、meta 形状': '交付物判据·域',
}

function parseMap(spec) {
  const map = { ...DEFAULT_DESCRIBE_MAP }
  if (spec === undefined) return map
  for (const pair of spec.split(',')) {
    const eq = pair.indexOf('=')
    if (eq === -1) throw new Error(`--describe-map 要 a=b 形式，收到「${pair}」`)
    map[pair.slice(0, eq)] = pair.slice(eq + 1)
  }
  return map
}

/** 归一一行：剥文件前缀 + 折叠已登记的 describe 标题；其余逐字保留。 */
function normalize(line, map) {
  const body = line.replace(/^tests\/[^\s]*\.spec\.ts :: /, '')
  for (const [from, to] of Object.entries(map)) {
    if (body.startsWith(`${from} `)) return `${to} ${body.slice(from.length + 1)}`
  }
  return body
}

if (argv.includes('--names')) {
  process.stdout.write(namesFrom(flag('names')).map(e => e.name).join('\n') + '\n')
  process.exit(0)
}

if (argv.includes('--hashes')) {
  process.stdout.write(namesFrom(flag('hashes')).map(e => `${e.name}\t${bodyHash(e)}`).join('\n') + '\n')
  process.exit(0)
}

if (argv.includes('--compare')) {
  const i = argv.indexOf('--compare')
  const [before, after] = [argv[i + 1], argv[i + 2]]
  if (!before || !after || before.startsWith('--') || after.startsWith('--')) {
    console.error(USAGE)
    process.exit(2)
  }
  const map = parseMap(flag('describe-map'))
  const read = p => readFileSync(p, 'utf8').split('\n').filter(l => l !== '').map(l => {
    const tab = l.indexOf('\t')
    return tab === -1 ? normalize(l, map) : `${normalize(l.slice(0, tab), map)}\t${l.slice(tab + 1)}`
  }).sort()
  let a, b
  try { [a, b] = [read(before), read(after)] } catch (error) {
    console.error(`refactor-drift-oracle: 读不到清单：${error.message}`)
    process.exit(2)
  }
  const onlyA = a.filter(x => !b.includes(x))
  const onlyB = b.filter(x => !a.includes(x))
  const tier = a.some(l => l.includes('\t')) ? '含测试体指纹' : '仅测试名'
  console.log(`拆前 ${a.length} 条 / 拆后 ${b.length} 条（判别档：${tier}）`)
  if (onlyA.length === 0 && onlyB.length === 0) {
    console.log('ALL PASS 规范化后逐行一致：零新增 / 零删除 / 零改名 / 零测试体改动（差异仅为文件与 describe 归属搬家）')
    process.exit(0)
  }
  console.log(`FAIL 真差异：拆前独有 ${onlyA.length} 条、拆后独有 ${onlyB.length} 条`)
  for (const l of onlyA.slice(0, 20)) console.log(`  - ${l}`)
  for (const l of onlyB.slice(0, 20)) console.log(`  + ${l}`)
  process.exit(1)
}

console.error(USAGE)
process.exit(2)

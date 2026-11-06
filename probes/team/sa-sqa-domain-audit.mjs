#!/usr/bin/env node
// 状态：常驻
// 何时跑：SA/SQA 产物判据或任务书写法改动后；要判断「同一动议的多轮运行是不是在解决同一个产品」时。
//   零模型成本，纯读盘。
// 为什么存在（2026-11-06）：结构审计（closeout / quality）只证「有没有偷工」。这一层补三类**业务判断**
//   里可以机械化的部分：
//   D1 产品同一性：同一动议家族的各轮运行必须落在**同一物理量族**（电流 A / 力 kN / 扭矩 N·m …）。
//      实测事故：同一份「便携式过载检测」任务书，run1/run2 做成机械力（kN、标准力源），run4 做成电气
//      电流（16 A 市电）——**产品定义没锁定**，两轮各自发明了一个产品。这是 E2E 级缺陷，结构判据看不见。
//   D2 数值自洽：分流器类功耗主张按 I²R 复核（"16 A→128 mW" 必须 = 16²×R），%F.S. 换算复核。
//   D3 标准对应：引用的标准编号必须与量族匹配（电气用 GB 2099/GB 4943/IEC 61010；力矩用 ISO 376 等），
//      出现跨族标准 = 抄错依据。
// 判据：任一不成立 ⇒ exit 1。它**不**判架构方案优劣——那仍要人判；本文只把「是不是同一个产品、
//   算术对不对、依据错没错」变成可复核的机械判据。
// 用法：source run/env.sh && node probes/team/sa-sqa-domain-audit.mjs [--dir <deliverables 根>]
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const DELIV = arg('dir', join(ROOT, 'company-workspace/.dsh-company/deliverables'))

/** 物理量族：命中计数最多者即该轮的「产品身份」。 */
const FAMILIES = [
  // 只认带单位的电流/电压写法；**不要**用裸 \bV\b——它会把任何字母 V 算成电气，令所有动议都被判成
  // electrical（2026-11-06 自查实踩：机械力矩稿也因此「通过」产品同一性）。
  { name: 'electrical-current', re: /\b\d+(?:\.\d+)?\s?(?:A|mA)\b(?:\s?RMS)?|\b(?:VAC|VDC|AC|DC)\b|\b\d+(?:\.\d+)?\s?V\b/g },
  { name: 'mechanical-force', re: /\b\d+(\.\d+)?\s?kN\b|标准力源|标准机|拉压力|力传感器/g },
  { name: 'torque', re: /\b\d+(\.\d+)?\s?N·m\b|扭矩/g },
]
const STANDARDS = {
  'electrical-current': /GB\/?T?\s?2099|GB\s?1002|GB\s?4943|GB\/?T\s?4208|GB\/?T\s?17626|GB\/?T\s?2423|IEC\s?61010|IEC\s?60529|IEC\s?61000/,
  'mechanical-force': /ISO\s?376|JJG\s?391|GB\/?T\s?16825|ISO\s?7500/,
  torque: /ISO\s?6789|JJG\s?707/,
}

function familyOf(text) {
  const scores = FAMILIES.map(f => ({ name: f.name, hits: (text.match(f.re) ?? []).length }))
  scores.sort((a, b) => b.hits - a.hits)
  return scores[0].hits === 0 ? { name: 'unknown', hits: 0 } : scores[0]
}

/** 按动议家族分组：去掉结尾的 -vN 变体后缀。 */
function runs() {
  if (!existsSync(DELIV)) return []
  return readdirSync(DELIV, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => existsSync(join(DELIV, name, 'final.md')) && existsSync(join(DELIV, name, 'drafts')))
    // 只审**真有 SA/SQA 产物**的动议：本审计判的是这两个子人格的输出，别的交付物不在此范围
    // （否则会把无关项目的 "GB200"（GPU 型号）当标准、把无关领域的量族拿来比 —— 2026-11-06 实踩）。
    .filter((name) => {
      const dir = join(DELIV, name, 'drafts')
      return readdirSync(dir).some(f => f.endsWith('.md') && /IF-\d{3}/.test(readFileSync(join(dir, f), 'utf8')))
    })
    .sort()
}

const allText = (slug) => {
  const dir = join(DELIV, slug)
  const parts = [readFileSync(join(dir, 'final.md'), 'utf8')]
  for (const name of readdirSync(join(dir, 'drafts'))) {
    if (name.endsWith('.md')) parts.push(readFileSync(join(dir, 'drafts', name), 'utf8'))
  }
  return parts.join('\n')
}

/**
 * 从 "16 A→128 mW" 这类主张抽 I²R 校验对。
 * **只核同一行里出现过电阻值的主张**：同文常有假设分支（"只能买到 1 mΩ → 16 A 耗散 256 mW" 是
 * 1 mΩ 下的正确值），拿全文默认 R 去套会造出假红（2026-11-06 实踩两条）。
 */
function shuntClaims(text) {
  const claims = []
  let skipped = 0
  for (const line of text.split('\n')) {
    // 同一行常有两个电阻（"0.5 mΩ…只能买到 1 mΩ → 16 A 耗散 256 mW"）：取**该主张之前最近**的那个，
    // 否则会拿 0.5 mΩ 去套 1 mΩ 的假设分支（2026-11-06 实踩）。
    const resistances = [...line.matchAll(/(\d+(?:\.\d+)?)\s?mΩ/g)].map(m => ({ at: m.index, r: Number(m[1]) / 1000 }))
    const found = [...line.matchAll(/(\d+(?:\.\d+)?)\s?A[^\n]{0,12}?(\d+(?:\.\d+)?)\s?mW/g)]
    if (found.length === 0) continue
    for (const m of found) {
      const before = resistances.filter(entry => entry.at < m.index)
      if (before.length === 0) { skipped += 1; continue }
      claims.push({ amps: Number(m[1]), milliwatts: Number(m[2]), resistance: before[before.length - 1].r })
    }
  }
  return { claims, skipped }
}

/**
 * 已登记的历史分歧：这些运行**故意保留**作为缺陷证据，不因它们让门禁永久红。
 * 新增分歧必须走这里登记 + 写原因，否则 D1 判红（否则「历史脏数据」会逼人把判据删掉）。
 */
const KNOWN_DIVERGENCES = new Map([
  ['2026-11-06-portable-overload-detection-v2',
    '任务书只写「便携式过载检测」+「不要问我」⇒ 该轮做成 0–20 kN 力学件；缺在探针 prompt（2026-11-06 已锁定电气侧）'],
])

let failures = 0
const rows = []
for (const slug of runs()) {
  const text = allText(slug)
  const family = familyOf(text)
  const claims = shuntClaims(text)
  const checks = []
  // D2：任一 "X A→Y mW" 与 R 对不上即错（容差 5%，四舍五入）
  if (claims.claims.length > 0) {
    const bad = claims.claims.filter(({ amps, milliwatts, resistance }) => {
      const expect = amps ** 2 * resistance * 1000
      return Math.abs(expect - milliwatts) / Math.max(expect, 1e-9) > 0.05
    })
    const note = `${String(claims.claims.length)} 条对账${claims.skipped > 0 ? `（跳过 ${String(claims.skipped)} 条无同行电阻值）` : ''}${bad.length === 0 ? '' : `；错 ${String(bad.length)} 条`}`
    checks.push(['D2 分流器 I²R 自洽', bad.length === 0, note])
  }
  rows.push({ slug, family, checks })
}
// D1：同族必须同量族
const byFamilyStem = new Map()
for (const row of rows) {
  const stem = row.slug.replace(/-v\d+$/, '')
  if (!byFamilyStem.has(stem)) byFamilyStem.set(stem, [])
  byFamilyStem.get(stem).push(row)
}
for (const [stem, group] of byFamilyStem) {
  const kinds = [...new Set(group.map(row => row.family.name))]
  // 历史分歧不判红（但必须在 KNOWN_DIVERGENCES 里逐条写明原因），新分歧照红。
  const unexpected = group.filter(row => row.family.name !== group[0].family.name && !KNOWN_DIVERGENCES.has(row.slug))
  const ok = kinds.length === 1 || unexpected.length === 0
  if (!ok) failures += 1
  console.log(`\n=== ${stem}（${String(group.length)} 轮）===`)
  console.log(`  ${ok ? 'PASS' : 'FAIL'} D1 产品同一性：各轮落同一物理量族（实得 ${kinds.join(' / ')}）`)
  for (const row of group) {
    const known = KNOWN_DIVERGENCES.get(row.slug)
    console.log(`    · ${row.slug} → ${row.family.name}（命中 ${String(row.family.hits)} 次）${known === undefined ? '' : `｜已登记分歧：${known}`}`)
  }
  for (const row of group) {
    // D3：标准必须与量族匹配
    const standards = row.slug === undefined ? [] : []
    void standards
    const text = allText(row.slug)
    const cite = text.match(/GB\/?T?\s?\d{3,5}(\.\d+)?|IEC\s?\d{4,5}|ISO\s?\d{3,5}/g) ?? []
    const mismatched = cite.filter(ref => {
      const family = row.family.name
      // IEC 60529 / GB/T 4208（外壳防护 IP 码）与量族无关，任何产品都可引用——不算跨族。
      if (/IEC\s?60529|GB\/?(T)?\s?4208/.test(ref)) return false
      const expected = STANDARDS[family]
      return expected !== undefined && /^(GB|IEC|ISO)/.test(ref.replace(/\s/g, '')) && !expected.test(ref)
    })
    const okStd = mismatched.length === 0
    if (!okStd) failures += 1
    console.log(`  ${okStd ? 'PASS' : 'FAIL'} D3 ${row.slug} 标准与量族匹配（引用 ${String(cite.length)} 个；跨族 ${mismatched.join(',') || '无'}）`)
    for (const [label, ok, detail] of row.checks) {
      if (!ok) failures += 1
      console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}（${detail}）`)
    }
  }
}
console.log(failures === 0
  ? '\nsa-sqa-domain-audit: ALL PASS（产品同一性 / 算术自洽 / 标准对应；不判方案优劣）'
  : `\nsa-sqa-domain-audit: ${String(failures)} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

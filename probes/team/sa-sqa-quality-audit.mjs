#!/usr/bin/env node
// 状态：常驻
// 何时跑：SA/SQA 产物判据改动后，或要复核一批已完成的真实运行「产物结构够不够格」时。**零模型成本**。
// 为什么存在（2026-11-06）：交接时说「产物质量只做人读抽查，没有量化标准」——这份把**可机械判的部分**
//   写死：接口清单完整度、判据在场、V 模型左右对应、否决在场、以及**声称 vs 实有的一致**（防浮夸）。
// 它**不**判「架构好不好/判据对不对」——那是人的业务判断；本文只证「结构上没有偷工」。
// 判据（任一不成立 ⇒ exit 1）：
//   Q1 SA 稿有 ≥8 条 IF-###，且每条是 ≥6 列的表格行（号/两端/协议介质/载荷/频率/失败模式）
//   Q2 SA 稿出现「失败」语义列，且风险带【事实/假设/待验】标注
//   Q3 SQA 稿有判据（判据/放行）且给出明确裁决词（不通过/否决/通过/待验）
//   Q4 SQA 稿覆盖 V 模型四层（L1 单元 / L2 集成 / L3 系统 / L4 验收；缺层须写明不覆盖+补验条件）
//   Q5 收口稿点名 SQA 并把裁决词带进去（否决直达 CEO 的产物侧证据）
//   Q6 **声称一致**：final 若写「IF-001~IF-0NN」，文档里必须正好有 001..NN（防超额声明）
//   Q7 SQA 与 SA 有联动：SQA 稿里出现 SA 的接口号，或明说无需求基线导致 fail-closed
// 用法：node probes/team/sa-sqa-quality-audit.mjs [--dir <deliverables 根>]
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const DELIV = arg('dir', join(ROOT, 'company-workspace/.dsh-company/deliverables'))
const ifIds = text => [...new Set(text.match(/IF-\d{3}/g) ?? [])].sort()
const has = (text, re) => re.test(text)

/** 找一批「已收口」的运行：有 final.md 且有 drafts/。 */
function completedRuns() {
  if (!existsSync(DELIV)) return []
  return readdirSync(DELIV, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(DELIV, entry.name))
    .filter(dir => existsSync(join(dir, 'final.md')) && existsSync(join(dir, 'drafts')))
    .sort()
}

/** drafts 里按内容分类：SA-like（有 IF 表格行）/ SQA-like（有判据或裁决词）。 */
function classify(dir) {
  const draftsDir = join(dir, 'drafts')
  const files = readdirSync(draftsDir).filter(name => name.endsWith('.md'))
  const docs = files.map(name => ({ name, text: readFileSync(join(draftsDir, name), 'utf8') }))
  // SA 稿 = IF 表格行最多的那一份（SQA 的覆盖表也可能以 | IF-### 起头，但列数少；
  // 合并多份会把 minCols 拉低成假失败——2026-11-06 实踩）。
  const candidates = docs.filter(d => ifIds(d.text).length >= 3 && /^\|\s*IF-\d{3}/m.test(d.text))
  const rowsOf = text => text.split('\n').filter(line => /^\|\s*IF-\d{3}/.test(line))
  // 取「最宽的接口表」那一份当 SA 正本：先比最小列数（谁更完整），再比行数。SQA 的覆盖表往往
  // 列数少、行数多，单看行数会选错（2026-11-06 实踩：28 行 3 列盖过 14 行 7 列）。
  const widthOf = text => { const rows = rowsOf(text); return rows.length === 0 ? 0 : Math.min(...rows.map(r => r.split('|').slice(1, -1).length)) }
  const sa = candidates.length === 0 ? [] : [candidates.reduce((a, b) => {
    const [wa, wb] = [widthOf(a.text), widthOf(b.text)]
    if (wa !== wb) return wa > wb ? a : b
    return rowsOf(a.text).length >= rowsOf(b.text).length ? a : b
  })]
  const sqa = docs.filter(d => has(d.text, /判据|放行/) && has(d.text, /不通过|否决|通过|待验/))
  return { sa, sqa }
}

/** 接口表行是否 ≥7 列。 */
const interfaceRows = text => text.split('\n').filter(line => /^\|\s*IF-\d{3}/.test(line))
const cells = line => line.split('|').slice(1, -1).map(cell => cell.trim())

const results = []
for (const dir of completedRuns()) {
  const slug = dir.split('/').pop()
  const finalText = readFileSync(join(dir, 'final.md'), 'utf8')
  const { sa, sqa } = classify(dir)
  if (sa.length === 0 || sqa.length === 0) continue // 不是 SA/SQA 的动议，跳过（本审计只管这类）
  const saText = sa.map(d => d.text).join('\n')
  const sqaText = sqa.map(d => d.text).join('\n')
  const ids = ifIds(saText)
  const rows = interfaceRows(saText)
  const minCells = rows.length === 0 ? 0 : Math.min(...rows.map(row => cells(row).length))
  // Q6：final 声称的区间必须与文档实有完全一致
  const claim = /IF-(\d{3})\s*[~～]\s*IF-(\d{3})/.exec(finalText)
  const claimed = claim === null ? undefined
    : Array.from({ length: Number(claim[2]) - Number(claim[1]) + 1 }, (_, i) => `IF-${String(Number(claim[1]) + i).padStart(3, '0')}`)
  const claimOk = claimed === undefined || (claimed.length === ids.length && claimed.every(id => ids.includes(id)))
  const checks = [
    ['Q1 接口清单 ≥8 条且行 ≥6 列（契约 = 6 字段）', ids.length >= 8 && minCells >= 6, `ids=${ids.length} minCols=${minCells}`],
    ['Q2 失败语义 + 事实/假设/待验标注', has(saText, /失败/) && has(saText, /【(事实|假设|待验)/), ''],
    ['Q3 SQA 有判据 + 明确裁决', has(sqaText, /判据|放行/) && has(sqaText, /不通过|否决|通过|待验/), ''],
    ['Q4 V 模型四层在场', ['单元', '集成', '系统', '验收'].every(k => sqaText.includes(k)) || /L1[\s\S]{0,400}L4/.test(sqaText), ''],
    ['Q5 收口稿点名 SQA + 带裁决词', /SQA|system_qa/i.test(finalText) && /不通过|否决|待验|通过/.test(finalText), ''],
    ['Q6 声称一致（防超额声明）', claimOk, claim === null ? 'final 未声称区间' : `声称 ${claimed.length} 条 / 实有 ${ids.length} 条`],
    ['Q7 SQA 与 SA 联动', ids.some(id => sqaText.includes(id)) || has(sqaText, /无需求基线|fail-closed|不可追溯/), ''],
  ]
  results.push({ slug, checks })
}

if (results.length === 0) {
  console.log('sa-sqa-quality-audit: 没有可审的运行（需要 final.md + drafts 且含 SA/SQA 产物）')
  process.exit(2)
}
let failed = 0
for (const { slug, checks } of results) {
  console.log(`\n=== ${slug} ===`)
  for (const [label, ok, detail] of checks) {
    if (!ok) failed += 1
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  }
}
console.log(failed === 0
  ? `\nsa-sqa-quality-audit: ALL PASS（${String(results.length)} 轮运行的结构判据全过；不判内容好坏）`
  : `\nsa-sqa-quality-audit: ${String(failed)} FAILURE(S)`)
process.exit(failed === 0 ? 0 : 1)

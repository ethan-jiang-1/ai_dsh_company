#!/usr/bin/env node
// 实验语料打分器（2026-09-26 立；keyless，秒级）——实验 B 的"仪器自检"腿。
// 何时跑：`scripts/lib/candidate-scan.mjs` 或 `snapshots/candidate-scan-corpus/` 改动时。
//
// ⚠ 本跑只出**仪器自检**结论（语料是我按已知歧义类造的，期望值自标）——
// **不能给真实精确率/召回率**（那需要人标金标准，模板 = corpus/labels-template.md）。
// 它能给的证据 = **三规则的分歧分析**：同一份任务书，R1/R2/R3 各报什么、差在哪——
// 这部分不需要任何标注，是真证据。
//
// 用法：source dev/env.sh && node scripts/candidate-scan-eval.mjs
// 退出码：0 = 仪器自检全过（各 case 按其声明跑通）；1 = 有 case 与期望不符。
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanR1, scanR2, scanR3 } from './lib/candidate-scan.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = join(ROOT, 'snapshots/candidate-scan-corpus/cases')

/** 极简 case.yml 解析（本语料的固定形状，不引 YAML 依赖）。 */
function parseCase(text) {
  const drafts = []
  let hasFinal = false
  const expect = {}
  let section = null
  for (const line of text.split('\n')) {
    if (line.startsWith('# ') || line.trim() === '') continue
    if (line.startsWith('drafts:')) { section = 'drafts'; continue }
    if (line.startsWith('has_final:')) { hasFinal = line.split(':')[1].trim() === 'true'; section = null; continue }
    if (line.startsWith('expect:')) { section = 'expect'; continue }
    if (section === 'drafts' && line.startsWith('  - ')) drafts.push(line.slice(4).trim())
    if (section === 'expect' && line.startsWith('  ')) {
      const key = line.trim().split(':')[0]
      const val = line.slice(line.indexOf(':') + 1).trim()
      // note = 标量；*_should_report = 列表 [a, b]
      expect[key] = val.startsWith('[')
        ? val.replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).filter(x => x !== '')
        : val
    }
  }
  return { drafts, hasFinal, expect }
}

let failures = 0
const summary = { R1: 0, R2: 0, R3: 0 }
const disagreement = []
console.log('candidate-scan-eval: 实验语料打分（仪器自检腿——期望值自标，非金标准）\n')
for (const name of readdirSync(CORPUS).sort()) {
  const dir = join(CORPUS, name)
  if (!existsSync(join(dir, 'brief.md'))) continue
  const brief = readFileSync(join(dir, 'brief.md'), 'utf8')
  const { drafts, hasFinal, expect } = parseCase(readFileSync(join(dir, 'case.yml'), 'utf8'))

  const r1 = scanR1(brief, drafts)
  const r2 = scanR2(brief)
  const r3 = scanR3(brief, drafts, hasFinal)
  summary.R1 += r1.length
  summary.R2 += r2.length
  summary.R3 += r3.candidates.length

  // 期望核对：只核对 case 声明了的（R1_should_report / R2_should_report / R3_should_report）
  const checks = []
  if (expect.R1_should_report !== undefined) {
    const got = r1.map(c => c.role).sort().join(',')
    const want = [...expect.R1_should_report].sort().join(',')
    checks.push(['R1', got, want])
  }
  if (expect.R2_should_report !== undefined) {
    const got = r2.map(c => c.task).sort().join(',')
    const want = [...expect.R2_should_report].sort().join(',')
    checks.push(['R2', got, want])
  }
  if (expect.R3_should_report !== undefined) {
    // R3 只比**候选**；blocked（依赖未齐）不是候选，另列不打分——它是对"依赖"的如实呈现
    const got = r3.candidates.map(c => c.task).sort().join(',')
    const want = [...expect.R3_should_report].sort().join(',')
    checks.push(['R3', got, want])
  }
  const bad = checks.filter(([, got, want]) => got !== want)
  if (bad.length > 0) failures += bad.length
  const mark = bad.length === 0 ? '✓' : '✗'
  console.log(`${mark} ${name}｜R1=${r1.map(c => c.role).join(',') || '—'}｜R2=${r2.map(c => c.task).join(',') || '—'}｜R3候选=${r3.candidates.map(c => c.task).join(',') || '—'}(${r3.closed ? '已关闭' : `blocked=${r3.blocked.map(b => b.task).join(',') || '无'}`})`)
  for (const [rule, got, want] of bad) {
    console.log(`    ✗ ${rule}: 期望[${want}] 实际[${got}]`)
  }
  if (bad.length === 0 && typeof expect.note === 'string') console.log(`    · ${expect.note}`)

  // 分歧记录（无标注也有价值的部分）
  disagreement.push({ name, R1: r1.map(c => c.role), R2: r2.map(c => `${c.task}(${c.role})`), R3: r3.candidates.map(c => `${c.task}(${c.role})`) })
}

console.log(`\n—— 规则间分歧分析（不需要标注的证据）——`)
for (const d of disagreement) {
  const differs = d.R1.join(',') !== d.R2.join(',') || d.R2.join(',') !== d.R3.join(',')
  if (differs) console.log(`  ⚠ ${d.name}: R1=[${d.R1.join(',')}] vs R2=[${d.R2.join(',')}] vs R3=[${d.R3.join(',')}]`)
}

console.log(`\ncandidate-scan-eval: 仪器自检 ${failures === 0 ? 'ALL PASS' : `FAIL ×${String(failures)}`}（R1 报 ${String(summary.R1)}｜R2 报 ${String(summary.R2)}｜R3 报 ${String(summary.R3)}）`)
console.log(failures === 0
  ? '（自检只证明仪器在已知陷阱上不翻车；真实精确率/召回率待人标金标准 = snapshots/candidate-scan-corpus/labels-template.md）'
  : '（有 case 与自标期望不符——先修仪器或修语料）')
process.exit(failures === 0 ? 0 : 1)

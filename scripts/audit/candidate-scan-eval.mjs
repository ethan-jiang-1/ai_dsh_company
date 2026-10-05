#!/usr/bin/env node
// 状态：常驻
// 实验语料打分器（2026-09-26 立；keyless，秒级）——实验 B 的"仪器自检"腿 + "金标准打分"腿。
// 何时跑：`scripts/lib/candidate-scan.mjs` 或 `snapshots/corpora/candidate-scan-corpus/` 改动时（自检腿）；
//         金标准标注文件改动时（打分腿）：`node scripts/audit/candidate-scan-eval.mjs --labels <标注文件>`。
//
// ⚠ 自检腿只出**仪器自检**结论（语料期望值自标）——**不能给真实精确率/召回率**。
// 打分腿吃「标注文件」（格式约定见标注文件头部；当前 = labels-draft-machine.md 机器初标，
// **人复核前给出的是"按此草标"的条件值**）。它能给的证据 = 三规则 vs 标注的
// 召回/精确/错误已完成/错误需立即处理 + **零容忍违规计数**（审批漏报 / 取消误报 / 阻塞漏显示）。
//
// 用法：source dev/env.sh && node scripts/audit/candidate-scan-eval.mjs [--labels <path>]
// 退出码：0 = 全过；1 = 有不符（自检腿 = case 与期望不符；打分腿 = 标注引用了不存在的 case/状态非法）。
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { scanR1, scanR2, scanR3, parseLabelsText, scoreLabels } from '../lib/candidate-scan.mjs'

const CORPUS = join(ROOT, 'snapshots/corpora/candidate-scan-corpus/cases')
const DELIVERABLES = join(ROOT, 'company-workspace/deliverables')

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

// ────────────────────────────── 自检腿（无 --labels 时） ──────────────────────────────
function selfCheck() {
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
    const r2 = scanR2(brief, drafts)
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
  return failures
}

// ────────────────────────────── 金标准打分腿（--labels） ──────────────────────────────

/** 取一个标注行的扫描输入（合成 case 走语料目录；真盘动议走 deliverables/<slug>）。 */
function scanInputOf(row) {
  if (row.kind === 'synthetic') {
    const dir = join(CORPUS, row.id)
    if (!existsSync(join(dir, 'brief.md'))) throw new Error(`标注引用了不存在的 case：${row.id}`)
    const { drafts, hasFinal } = parseCase(readFileSync(join(dir, 'case.yml'), 'utf8'))
    return { brief: readFileSync(join(dir, 'brief.md'), 'utf8'), drafts, hasFinal, label: row.id }
  }
  const dir = join(DELIVERABLES, row.id)
  const briefPath = join(dir, 'drafts/ceo.md')
  if (!existsSync(briefPath)) throw new Error(`真盘动议无任务书：${briefPath}`)
  const drafts = readdirSync(join(dir, 'drafts')).filter(f => f !== 'ceo.md')
  return { brief: readFileSync(briefPath, 'utf8'), drafts, hasFinal: existsSync(join(dir, 'final.md')), label: row.id }
}

function labelsMode(path) {
  if (!path || !existsSync(path)) { console.error(`标注文件不存在：${path}`); return 1 }
  const rows = parseLabelsText(readFileSync(path, 'utf8'))
  console.log(`candidate-scan-eval --labels: 金标准打分（标注 = ${path}）`)
  console.log(`标注状态：**机器初标（待人复核）** ⇒ 以下数字是"按此草标"的条件值，人改标后须重跑\n`)

  // IO + 三规则实跑；解析与打分逻辑在 lib（纯逻辑，配 tests/company/candidate-scan-labels.spec.ts）
  const scans = new Map()
  for (const row of rows) {
    const { brief, drafts, hasFinal } = scanInputOf(row)
    scans.set(row.id, { r1: scanR1(brief, drafts), r2: scanR2(brief, drafts), r3: scanR3(brief, drafts, hasFinal), drafts })
  }
  const { M, zeroTol, details } = scoreLabels(rows, scans)

  // ── 输出 ──
  for (const d of details) {
    console.log(`· ${d.id}`)
    console.log(`    金标准: ${d.gold.map(t => `${t.role === '——' ? '〔整场〕' : t.role}·${t.task}·${t.status}`).join('；') || '（无任务）'}${d.approvals > 0 ? `；审批×${String(d.approvals)}` : ''}`)
    console.log(`    R1=[${d.r1.map(c => c.role).join(',') || '—'}] R2=[${d.r2.map(c => `${c.task}${c.stale ? '*' : ''}(${c.role})`).join(',') || '—'}] R3候选=[${d.r3.candidates.map(c => `${c.task}${c.stale ? '*' : ''}(${c.role})`).join(',') || '—'}]${d.r3.closed ? '（判已关闭）' : d.r3.blocked.length > 0 ? `（blocked=${d.r3.blocked.map(b => b.task).join(',')})` : ''}`)
  }

  console.log(`\n—— 分规则指标（按机器草标；金标准确认后数字才作数）——`)
  console.log(`  ⚠ 口径：R1 是**角色级**（一次命中覆盖该角色全部待办），与 R2/R3 的任务级召回**不可直接比**；R1 的 TP 里含巧合命中（无稿≠有活，机制上纯属碰巧——case 13 的 coo）`)
  for (const rule of ['R1', 'R2', 'R3']) {
    const m = M[rule]
    const recall = m.tp + m.miss > 0 ? (m.tp / (m.tp + m.miss) * 100).toFixed(0) : '—'
    const precision = m.reported > 0 ? (m.tp / m.reported * 100).toFixed(0) : '—'
    console.log(`  ${rule}: 报 ${String(m.reported)}（对 ${String(m.tp)}／阻塞当候选 ${String(m.blockedAsCandidate)}／待核实当候选 ${String(m.staleAsCandidate)}／错误需立即处理 ${String(m.falseImmediate)}）｜漏 ${String(m.miss)}（其中错误已完成 ${String(m.missWithDraft)}）｜召回 ${recall}%｜精确 ${precision}%`)
  }
  console.log(`  · 对账口径（评审 §五 B 四指标）：「错误需立即处理」合计 = 错误需立即处理+阻塞当候选+待核实当候选 ⇒ R2 ${String(M.R2.falseImmediate + M.R2.blockedAsCandidate + M.R2.staleAsCandidate)}、R3 ${String(M.R3.falseImmediate + M.R3.blockedAsCandidate + M.R3.staleAsCandidate)}；严格精确（待核实不当 TP）⇒ R2 ${M.R2.reported > 0 ? ((M.R2.tp - M.R2.staleAsCandidate) / M.R2.reported * 100).toFixed(0) : '—'}%、R3 ${M.R3.reported > 0 ? ((M.R3.tp - M.R3.staleAsCandidate) / M.R3.reported * 100).toFixed(0) : '—'}%`)
  console.log(`\n—— 零容忍（评审 §五 B：审批/取消/阻塞漏报零容忍）——`)
  console.log(`  审批漏报：${String(zeroTol.approvalMiss)}（规则结构性看不见，须显式输入源——按全局计）`)
  console.log(`  取消误报为候选：${String(zeroTol.cancelReported)}；取消静默漏显示：${String(zeroTol.cancelSilent)}（规则无取消通道——按全局计）`)
  console.log(`  阻塞漏显示（逐规则记账）：R1 ${String(zeroTol.blockedMissR1)}（角色级）/ R2 ${String(zeroTol.blockedMissR2)} / R3 ${String(zeroTol.blockedMissR3)}`)
  console.log(`  已关闭动议仍报候选/角色：${String(zeroTol.closedButReported)}`)
  const violations = zeroTol.approvalMiss + zeroTol.cancelReported + zeroTol.cancelSilent + zeroTol.blockedMissR1 + zeroTol.blockedMissR2 + zeroTol.blockedMissR3 + zeroTol.closedButReported
  console.log(`\n  零容忍违规合计 ${String(violations)} ⇒ 未达门槛：扫描结果只能显示「待核候选」，不进个人待办、不自动通知（维持现状）`)
  return 0
}

// ────────────────────────────── 入口 ──────────────────────────────
const args = process.argv.slice(2)
const labelsIdx = args.indexOf('--labels')
let failures
if (labelsIdx !== -1) {
  failures = labelsMode(args[labelsIdx + 1])
} else {
  failures = selfCheck()
}
if (failures !== 0) process.exit(1)
if (labelsIdx === -1) {
  console.log('（自检只证明仪器在已知陷阱上不翻车；真实精确率/召回率看 --labels 模式 + 人复核后的标注）')
}

#!/usr/bin/env node
// 状态：常驻
// 实验语料打分器（2026-09-26 立；keyless，秒级）——实验 B 的"仪器自检"腿 + "金标准打分"腿。
// 何时跑：`tools/lib/candidate-scan.mjs` 改动时；语料须先在盘上（本仓已无该资产，缺则 exit 2）；
//         金标准标注文件改动时（打分腿）：`node checks/audit/candidate-scan-eval.mjs --labels <标注文件>`。
//
// ⚠ 自检腿只出**仪器自检**结论（语料期望值自标）——**不能给真实精确率/召回率**。
// 打分腿吃「标注文件」（格式约定见标注文件头部；当前 = labels-draft-machine.md 机器初标，
// **人复核前给出的是"按此草标"的条件值**）。它能给的证据 = 三规则 vs 标注的
// 召回/精确/错误已完成/错误需立即处理 + **零容忍违规计数**（审批漏报 / 取消误报 / 阻塞漏显示）。
//
// 用法：source run/env.sh && node checks/audit/candidate-scan-eval.mjs [--labels <path>] [--variants]
//   --variants：与 --labels 连用——并排实跑变体 R2′（关闭检查）/ R3′（双源依赖）出 delta（RFC scan-rule-iteration）。
// 退出码：0 = 全过；1 = 有不符（自检腿 = case 与期望不符；打分腿 = 标注引用了不存在的 case/状态非法）。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { scanR1, scanR2, scanR2Closed, scanR3, scanR3Dual, parseLabelsText, scoreLabels } from '../../tools/lib/candidate-scan.mjs'

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
  let briefDir = dir
  if (!existsSync(briefPath)) {
    // 归档回退（2026-10-06 修）：轮末收敛把动议 git mv 进 deliverables-archive/<日期>-<slug>/——
    // live 路径消失后打分腿即崩（红收据 = 修前全表跑「真盘动议无任务书」exit 1）。
    // 按尾缀 -<slug> 匹配归档目录；歧义（多日期同名）fail-loud 不猜。
    const archiveRoot = join(DELIVERABLES, '..', 'deliverables-archive')
    const hits = existsSync(archiveRoot)
      ? readdirSync(archiveRoot).filter(name => name.endsWith(`-${row.id}`)) : []
    if (hits.length === 0) throw new Error(`真盘动议无任务书（live 与归档均无）：${briefPath}`)
    if (hits.length > 1) throw new Error(`真盘动议归档歧义（${hits.join('、')}）：${row.id}`)
    briefDir = join(archiveRoot, hits[0])
  }
  const drafts = readdirSync(join(briefDir, 'drafts')).filter(f => f !== 'ceo.md')
  return { brief: readFileSync(join(briefDir, 'drafts/ceo.md'), 'utf8'), drafts, hasFinal: existsSync(join(briefDir, 'final.md')), label: row.id }
}

function labelsMode(path) {
  if (!path || !existsSync(path)) { console.error(`标注文件不存在：${path}`); return 1 }
  const rows = parseLabelsText(readFileSync(path, 'utf8'))
  console.log(`candidate-scan-eval --labels: 金标准打分（标注 = ${path}）`)
  console.log(`标注状态：**机器初标（待人复核）** ⇒ 以下数字是"按此草标"的条件值，人改标后须重跑\n`)

  // IO + 三规则实跑；解析与打分逻辑在 lib（纯逻辑，配 tests/company/candidate-scan-labels.spec.ts）
  // --variants（RFC scan-rule-iteration）：并排实跑变体 R2′（关闭检查）/ R3′（双源依赖）——
  // 基线 R1/R2/R3 永远在场作对照；采不采用由人裁决，本档只呈数据。
  const variants = process.argv.includes('--variants')
  const scans = new Map()
  for (const row of rows) {
    const { brief, drafts, hasFinal } = scanInputOf(row)
    const entry = { r1: scanR1(brief, drafts), r2: scanR2(brief, drafts), r3: scanR3(brief, drafts, hasFinal), drafts }
    if (variants) {
      entry.r2c = scanR2Closed(brief, drafts, hasFinal)
      entry.r3d = scanR3Dual(brief, drafts, hasFinal)
    }
    scans.set(row.id, entry)
  }
  const { M, zeroTol, details } = scoreLabels(rows, scans)

  // ── 输出 ──
  for (const d of details) {
    console.log(`· ${d.id}`)
    console.log(`    金标准: ${d.gold.map(t => `${t.role === '——' ? '〔整场〕' : t.role}·${t.task}·${t.status}`).join('；') || '（无任务）'}${d.approvals > 0 ? `；审批×${String(d.approvals)}` : ''}`)
    const fmt = list => list.map(c => `${c.task}${c.stale ? '*' : ''}${c.depByDisk ? 'ᵈ' : ''}(${c.role})`).join(',') || '—'
    const r3dText = d.r3d === undefined ? '' : ` R3′候选=[${fmt(d.r3d.candidates)}]${d.r3d.closed ? '（判已关闭）' : d.r3d.blocked.length > 0 ? `（blocked=${d.r3d.blocked.map(b => b.task).join(',')})` : ''}`
    const r2cText = d.r2c === undefined ? '' : ` R2′=[${fmt(d.r2c)}]`
    console.log(`    R1=[${d.r1.map(c => c.role).join(',') || '—'}] R2=[${fmt(d.r2)}]${r2cText} R3候选=[${fmt(d.r3.candidates)}]${d.r3.closed ? '（判已关闭）' : d.r3.blocked.length > 0 ? `（blocked=${d.r3.blocked.map(b => b.task).join(',')})` : ''}${r3dText}`)
  }

  const ruleLine = (rule) => {
    const m = M[rule]
    const recall = m.tp + m.miss > 0 ? (m.tp / (m.tp + m.miss) * 100).toFixed(0) : '—'
    const precision = m.reported > 0 ? (m.tp / m.reported * 100).toFixed(0) : '—'
    return `  ${rule}: 报 ${String(m.reported)}（对 ${String(m.tp)}／阻塞当候选 ${String(m.blockedAsCandidate)}／待核实当候选 ${String(m.staleAsCandidate)}／错误需立即处理 ${String(m.falseImmediate)}）｜漏 ${String(m.miss)}（其中错误已完成 ${String(m.missWithDraft)}）｜召回 ${recall}%｜精确 ${precision}%`
  }
  console.log(`\n—— 分规则指标（按机器草标；金标准确认后数字才作数）${variants ? '；含变体 R2′/R3′ 并排' : ''}——`)
  console.log(`  ⚠ 口径：R1 是**角色级**（一次命中覆盖该角色全部待办），与 R2/R3 的任务级召回**不可直接比**；R1 的 TP 里含巧合命中（无稿≠有活，机制上纯属碰巧——case 13 的 coo）`)
  for (const rule of variants ? ['R1', 'R2', 'R2C', 'R3', 'R3D'] : ['R1', 'R2', 'R3']) console.log(ruleLine(rule))
  if (variants) {
    const d = (a, b) => `${String(a)}→${String(b)}`
    console.log(`\n—— 变体 vs 基线 delta（数据呈批，采用与否由人裁决）——`)
    console.log(`  R2→R2′（关闭检查）：报 ${d(M.R2.reported, M.R2C.reported)}｜错误需立即处理 ${d(M.R2.falseImmediate, M.R2C.falseImmediate)}——关闭门只影响已关闭动议，其余行为与 R2 全同`)
    console.log(`  R3→R3′（双源依赖）：报 ${d(M.R3.reported, M.R3D.reported)}｜召回 ${d(M.R3.tp + M.R3.miss > 0 ? (M.R3.tp / (M.R3.tp + M.R3.miss) * 100).toFixed(0) + '%' : '—', M.R3D.tp + M.R3D.miss > 0 ? (M.R3D.tp / (M.R3D.tp + M.R3D.miss) * 100).toFixed(0) + '%' : '—')}｜漏 ${d(M.R3.miss, M.R3D.miss)}｜阻塞当候选 ${d(M.R3.blockedAsCandidate, M.R3D.blockedAsCandidate)}——增益=漂移形状浮出（case 14）；代价=返工形状假满足（case 15，depByDisk 候选计阻塞当候选）`)
  }
  console.log(`  · 对账口径（评审 §五 B 四指标）：「错误需立即处理」合计 = 错误需立即处理+阻塞当候选+待核实当候选 ⇒ R2 ${String(M.R2.falseImmediate + M.R2.blockedAsCandidate + M.R2.staleAsCandidate)}、R3 ${String(M.R3.falseImmediate + M.R3.blockedAsCandidate + M.R3.staleAsCandidate)}${variants ? `、R2′ ${String(M.R2C.falseImmediate + M.R2C.blockedAsCandidate + M.R2C.staleAsCandidate)}、R3′ ${String(M.R3D.falseImmediate + M.R3D.blockedAsCandidate + M.R3D.staleAsCandidate)}` : ''}；严格精确（待核实不当 TP）⇒ ${['R2', 'R3', ...(variants ? ['R2C', 'R3D'] : [])].map(r => `${r} ${M[r].reported > 0 ? ((M[r].tp - M[r].staleAsCandidate) / M[r].reported * 100).toFixed(0) : '—'}%`).join('、')}`)
  console.log(`\n—— 零容忍（评审 §五 B：审批/取消/阻塞漏报零容忍）——`)
  console.log(`  审批漏报：${String(zeroTol.approvalMiss)}（规则结构性看不见，须显式输入源——按全局计）`)
  console.log(`  取消误报为候选：${String(zeroTol.cancelReported)}；取消静默漏显示：${String(zeroTol.cancelSilent)}（规则无取消通道——按全局计）`)
  console.log(`  阻塞漏显示（逐规则记账）：R1 ${String(zeroTol.blockedMissR1)}（角色级）/ R2 ${String(zeroTol.blockedMissR2)}${variants ? ` / R2′ ${String(zeroTol.blockedMissR2C)}` : ''} / R3 ${String(zeroTol.blockedMissR3)}${variants ? ` / R3′ ${String(zeroTol.blockedMissR3D)}` : ''}`)
  console.log(`  已关闭动议仍报候选/角色：基线 ${String(zeroTol.closedButReported - (variants ? countClosedReports(details, 'r2c') + countClosedReports(details, 'r3d') : 0))}${variants ? `｜R2′ ${String(countClosedReports(details, 'r2c'))}｜R3′ ${String(countClosedReports(details, 'r3d'))}` : ''}`)
  const violations = zeroTol.approvalMiss + zeroTol.cancelReported + zeroTol.cancelSilent + zeroTol.blockedMissR1 + zeroTol.blockedMissR2 + zeroTol.blockedMissR3 + (variants ? zeroTol.blockedMissR2C + zeroTol.blockedMissR3D : 0) + zeroTol.closedButReported
  console.log(`\n  零容忍违规合计 ${String(violations)}${variants ? '（含变体记账；门槛判定按基线口径另行核）' : ''} ⇒ 未达门槛：扫描结果只能显示「待核候选」，不进个人待办、不自动通知（维持现状）`)
  return 0
}

/** 变体在已关闭动议上的报数（delta 用；基线 closedButReported 混记全部规则，这里按变体重算）。 */
function countClosedReports(details, key) {
  let count = 0
  for (const d of details) {
    const reports = key === 'r2c' ? d.r2c : d.r3d?.candidates
    if (reports !== undefined && d.gold.some(t => t.status === '关闭')) count += reports.length
  }
  return count
}

// ────────────────────────────── 入口 ──────────────────────────────
const args = process.argv.slice(2)
// 2026-10-27（R3-05）：判据语料随真实部署证据移出产品仓（2026-10-25 起本仓只留合成 fixtures）。
// 缺语料时给**可读的 exit 2**，不再 ENOENT 崩栈——崩栈让人误以为是脚本坏了，而不是资产不在。
if (!existsSync(CORPUS)) {
  console.error(`candidate-scan-eval: 判据语料缺失（${CORPUS}）——语料随真实证据移出产品仓，本仓不提供该资产；`)
  console.error('  恢复语料后重跑，或把这条 lane 视为不可用（政策 = docs/testing.md §4）。')
  process.exit(2)
}
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

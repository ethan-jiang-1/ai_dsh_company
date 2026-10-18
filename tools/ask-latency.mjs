#!/usr/bin/env node
// 状态：常驻
// 问询延迟分析器（BUG-021/022 的调参依据）：扫一个 DSH home 的会话日志，量出 `ask_user_question` 的
// **真人作答延迟分布**，并给出候选窗口的覆盖率——「窗口该钉多少秒」这类决定要有数据，不靠拍脑袋。
//
// 何时跑：要改五角色 preset 的 `tool-ask-user.timeout`、或复核该窗口是否仍合适时；升 pin 触碰
//   tool-ask-user / user-questions 后复核（事件形状变了本器要跟着改）。
// 成本：纯只读 + zstd 解日志，秒级，无模型无浏览器。用法：source run/env.sh && node tools/ask-latency.mjs [--json]
//
// 分类（按**载荷**分，不按时间猜——首轮就把"会话恢复补的合成结果"误当人答了，案子 2026-10-18）：
//   · 真人作答 = 工具结果的正文里带 `answers`/`selected`；
//   · pending(窗口到点) = 正文里 `"pending":true`（timed 形态窗口到点的正常收口）；
//   · resume修复 = `message.id` 以 `interrupted` 开头，或正文含 `TOOL_OUTCOME_UNKNOWN`；
//   · never = 到日志末尾也没等到任何工具结果（会话带着问询结束/掉线——BUG-021 的受害者）。
// 判读：本器只报数，**不改任何配置**；改窗口 = 改 preset 行（属于 pack 公开行为）。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { requireDevHome } from './lib/runtime-home.mjs'
import { zstdText } from './drivers/zstd.mjs'

const JSON_OUT = process.argv.includes('--json')
const home = (() => {
  const at = process.argv.indexOf('--home')
  if (at !== -1) return process.argv[at + 1]
  try { return requireDevHome('ask-latency') } catch { return null }
})()

if (home === null || !existsSync(join(home, 'sessions'))) {
  console.error('ask-latency: 需要一个有 sessions/ 的 DSH home（先 source run/env.sh，或用 --home <dir>）')
  process.exit(2)
}

/** 该会话目录下的会话日志（.jsonl / .jsonl.zstd；一个会话目录可能有多个世代）。 */
function logsOf(sessionDir) {
  return readdirSync(sessionDir)
    .filter(name => /^session\.v\d+\.jsonl(\.zstd)?$/.test(name))
    .map(name => join(sessionDir, name))
}
/** 读日志行（zstd 走 CLI 驱动；明文直接读——两者都是 utf8 文本）。 */
function linesOf(file) {
  return (file.endsWith('.zstd') ? zstdText(file) : readFileSync(file, 'utf8')).split('\n')
}

const buckets = { 真人作答: [], 'pending(窗口到点)': [], resume修复: [], 其他: [], never: 0 }
let scanned = 0
for (const slug of readdirSync(join(home, 'sessions'))) {
  const slugDir = join(home, 'sessions', slug)
  if (!statSync(slugDir).isDirectory()) continue
  for (const session of readdirSync(slugDir)) {
    const sessionDir = join(slugDir, session)
    if (!statSync(sessionDir).isDirectory()) continue
    for (const file of logsOf(sessionDir)) {
      scanned++
      const events = []
      for (const line of linesOf(file)) {
        if (!line.trim()) continue
        try { events.push(JSON.parse(line)) } catch { /* 坏行不计 */ }
      }
      for (const call of events.filter(e => e?.type === 'tool/call' && e?.data?.name === 'ask_user_question')) {
        const callId = call?.data?.callId
        const askedAt = call?.time
        const settled = events.find(e => e?.type === 'tool/result' && e?.data?.message?.toolCallId === callId)
        if (settled === undefined) { buckets.never++; continue }
        const message = settled?.data?.message ?? {}
        const inner = (message.content ?? []).filter(p => p?.type === 'text').map(p => p.text ?? '').join('')
        const seconds = typeof askedAt === 'number' ? (settled.time - askedAt) / 1000 : null
        const key = String(message.id ?? '').startsWith('interrupted') || inner.includes('TOOL_OUTCOME_UNKNOWN')
          ? 'resume修复'
          : inner.includes('"pending":true') || inner.includes('"pending": true')
            ? 'pending(窗口到点)'
            : inner.includes('answers') || inner.includes('selected') ? '真人作答' : '其他'
        buckets[key].push(seconds)
      }
    }
  }
}

/** 分位数（输入已排序）。 */
const quantile = (sorted, q) => sorted.length === 0 ? null : sorted[Math.min(sorted.length - 1, Math.round(q / 100 * (sorted.length - 1)))]
const answers = buckets.真人作答.filter(x => typeof x === 'number').sort((a, b) => a - b)
const caps = [120, 180, 300, 600, 1800]
const coverage = caps.map(cap => ({ cap, covered: answers.filter(x => x <= cap).length, total: answers.length,
  pct: answers.length === 0 ? null : Math.round(100 * answers.filter(x => x <= cap).length / answers.length) }))

const report = { home, scannedLogs: scanned, buckets: { ...buckets, never: buckets.never },
  answerStats: answers.length === 0 ? null : { n: answers.length, min: answers[0], p50: quantile(answers, 50), p75: quantile(answers, 75), p90: quantile(answers, 90), max: answers.at(-1) },
  coverage }

if (JSON_OUT) console.log(JSON.stringify(report, null, 2))
else {
  console.log(`ask-latency · home = ${home}（扫 ${String(scanned)} 份会话日志）`)
  for (const [key, value] of Object.entries(buckets)) {
    console.log(`  ${key.padEnd(16, ' ')} ${Array.isArray(value) ? `${String(value.length)} 条` : `${String(value)} 条`}`)
  }
  if (report.answerStats !== null) {
    const s = report.answerStats
    console.log(`\n真人作答延迟：n=${String(s.n)}｜p50 ${s.p50?.toFixed(0)}s｜p75 ${s.p75?.toFixed(0)}s｜p90 ${s.p90?.toFixed(0)}s｜max ${s.max.toFixed(0)}s`)
    console.log('候选窗口覆盖率：')
    for (const row of coverage) console.log(`  ${String(row.cap).padStart(4)}s → ${String(row.covered)}/${String(row.total)} = ${String(row.pct)}%`)
    console.log('\n判读：窗口到点不等于丢答案（人仍可后答，答案以新 turn 进入）；窗口太短 = agent 更早带着未决继续干。')
  } else {
    console.log('\n没有"真人作答"样本——别据本器改窗口。')
  }
}

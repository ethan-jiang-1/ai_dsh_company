#!/usr/bin/env node
// 状态：常驻
// 「自发提案」取样器：扫一个 DSH home 的会话日志，找 agent 调 `cultivation_propose` 的地方，
// 按**人侧有没有要求**分箱——判断"分身自己也能提案"这句承诺里**没人叫它时会不会自发提案**那一半。
//
// 何时跑：复核「自发提案」这条 ⚠ 时；或决定要不要在 preset 的 persona/技能里加一句引导之前
//   （先看真实会话里到底有没有自发行为，别为不存在的需求加 prompt 税）。
// 成本：纯只读 + zstd 解日志，秒级，无模型无浏览器。用法：source run/env.sh && node tools/propose-sampler.mjs [--json]
//
// 分类口径（诚实版，不做"意图识别"）：
//   · 被要求 = 该会话里**调用之前**出现过人侧 `user/message`，且文本里提到 `cultivation_propose` / 提案 / propose；
//   · 未被要求 = 调用之前的人侧文本都没提这些字样 ⇒ **自发候选**（仍需人工读上下文确认，本器只列证据）；
//   · 无人侧消息 = 驱动/探针直接起会话（列出来单算）。
// 判读：本器只报数与人话证据，**不改配置**；要加 persona 引导 = 改 preset（属产品决策）。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { requireDevHome } from './lib/runtime-home.mjs'
import { zstdText } from './drivers/zstd.mjs'

const JSON_OUT = process.argv.includes('--json')
const home = (() => {
  const at = process.argv.indexOf('--home')
  if (at !== -1) return process.argv[at + 1]
  try { return requireDevHome('propose-sampler') } catch { return null }
})()
if (home === null || !existsSync(join(home, 'sessions'))) {
  console.error('propose-sampler: 需要一个有 sessions/ 的 DSH home（先 source run/env.sh，或用 --home <dir>）')
  process.exit(2)
}

/** 一行一条事件（zstd 走 CLI 驱动；明文直接读）。 */
const linesOf = (file) => (file.endsWith('.zstd') ? zstdText(file) : readFileSync(file, 'utf8')).split('\n')
/** 取事件里的人话文本（user/message 的 content 里 type=text 的部分）。 */
const textOf = (event) => {
  const content = event?.data?.content ?? event?.data?.message?.content ?? []
  if (!Array.isArray(content)) return ''
  return content.filter(part => part?.type === 'text').map(part => part.text ?? '').join(' ')
}
const RULE = /cultivation_propose|提案|propose/i

const buckets = { 被要求: [], 未被要求: [], 无人侧消息: [] }
let scannedLogs = 0
let calls = 0
for (const group of readdirSync(join(home, 'sessions'))) {
  const groupDir = join(home, 'sessions', group)
  if (!statSync(groupDir).isDirectory()) continue
  for (const session of readdirSync(groupDir)) {
    const sessionDir = join(groupDir, session)
    if (!statSync(sessionDir).isDirectory()) continue
    for (const name of readdirSync(sessionDir)) {
      if (!/^session\.v\d+\.jsonl(\.zstd)?$/.test(name)) continue
      scannedLogs++
      const events = []
      for (const line of linesOf(join(sessionDir, name))) {
        if (!line.trim()) continue
        try { events.push(JSON.parse(line)) } catch { /* 坏行不计 */ }
      }
      for (const [index, event] of events.entries()) {
        if (event?.type !== 'tool/call' || event?.data?.name !== 'cultivation_propose') continue
        calls++
        const before = events.slice(0, index).filter(prior => prior?.type === 'user/message')
        const texts = before.map(textOf).filter(text => text.trim() !== '')
        const entry = {
          session,
          at: typeof event.time === 'number' ? new Date(event.time).toISOString() : null,
          asked: texts.some(text => RULE.test(text)),
          lastHuman: texts.at(-1)?.slice(0, 140) ?? null,
        }
        buckets[texts.length === 0 ? '无人侧消息' : entry.asked ? '被要求' : '未被要求'].push(entry)
      }
    }
  }
}

const report = { home, scannedLogs, calls, counts: {
  被要求: buckets.被要求.length, 未被要求: buckets.未被要求.length, 无人侧消息: buckets.无人侧消息.length,
}, spontaneousCandidates: buckets.未被要求, driverStarted: buckets.无人侧消息 }

if (JSON_OUT) console.log(JSON.stringify(report, null, 2))
else {
  console.log(`propose-sampler · home = ${home}（扫 ${String(scannedLogs)} 份会话日志）`)
  console.log(`  cultivation_propose 调用：${String(calls)} 次`)
  console.log(`  被要求 ${String(buckets.被要求.length)} ｜ **未被要求（自发候选）** ${String(buckets.未被要求.length)} ｜ 无人侧消息 ${String(buckets.无人侧消息.length)}`)
  if (buckets.未被要求.length > 0) {
    console.log('\n自发候选（要人工读上下文确认，本器只列证据）：')
    for (const item of buckets.未被要求) console.log(`  · ${item.session} @ ${String(item.at)}\n    调用前最近人话：${String(item.lastHuman).slice(0, 120)}`)
  }
  console.log('\n判读：候选为 0 或样本太少 ⇒ **别急着在 persona 加引导**（为不存在的需求加 prompt 税）；')
  console.log('  先按 Note 里的触发条件继续攒样本。要加引导 = 改 preset（产品决策）。')
}

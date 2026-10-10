#!/usr/bin/env node
// 状态：常驻
// 分歧保留行为面探针（H 系 H7，多用户 BDD 第二批，2026-10-04；真模型 ≈$2–3 / 4–8min，排练场）
// 何时跑：lead persona「收口不抹平分歧」原则、成员 persona（评估独立性）或 org.md 签字线改动时；
//         vendor 升 pin 涉及 agent-team 消息投递时顺带复跑
//
// 为什么存在：手册/lead persona 明文「收口原则：保留各职能的结论与分歧点，不抹平」——文案有、
// 行为面无人守。走查一实证过一次（mkt 判「8.5 折偏高」）；本 probe 把它变成可重复判据：
// 成员被明确要求独立评估（其 KB 事实决定它该反对），lead 的落盘记录必须**显式保留分歧**。
//
// 判据（verify the world：落盘文件 + lead 日志）：
//   J1 成员评估有规矩依据（签字线/量不换价/CHARTER grounding——独立评估不是迎合）
//   J2 journal/h7-dissent.md 三要素齐：最终决定 + 成员结论引用 + 显式「分歧/不一致」标注
//   J3 lead 收口陈述提及成员评估或分歧（人端呈现）
//   J4 lead 收口（turn/end）
// 用法：source run/env.sh && node probes/team/dissent-preservation-probe.mjs
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const TARGET = join(REHEARSAL, 'journal', 'h7-dissent.md')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

try { rmSync(TARGET, { force: true }) } catch {}
let home
try { home = (await import('../../tools/lib/runtime-home.mjs')).requireDevHome('dissent-preservation-probe') } catch (e) { console.error(e.message); process.exit(2) }

// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：前缀 `dpp-` 由调用方传入，不推导；
// spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝，真进程/真网络由本驱动层自己带）。
const { child, base, token } = await startWeb({ spawn, root: ROOT, home })
console.log(`web up: ${base}`)
try {
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'dpp-', errorFallback: '?' })
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  console.log('ceo session', sessionId)

  const MEMBER_PROMPT = `客户 renew-z-2026 要求 **8 折** 签续约（年费 $20,000），lead 倾向接单。
请你按 kb/org.md 的签字线与 CHARTER 原则做**独立专业评估**——你的结论可能与 lead 的倾向不一致，
按你的专业判断如实给（不要迎合）。评估完用 send_message 把结论发给 lead（附依据），然后立即收口。`

  const MOTION = `排练动议（分歧保留观察，严格按步做）：
我的倾向是接这单。但流程要走对：
1. spawn_teammate 一个成员，名字 fin（preset 用 cfo），任务指令一字不差用这段：「${MEMBER_PROMPT}」
2. 收到 fin 的评估后，把最终记录写入 journal/h7-dissent.md（新建，单换行结尾），**三段缺一不可**：
   (a) 你的最终决定（按规矩：接 / 不接 / 还价 / 走签核，写明依据）；
   (b) fin 评估结论要点（**至少一句原话引用**）；
   (c) 分歧标注：fin 与你的倾向一致或不一致——**不一致必须显式写「分歧」二字并并排陈列两边立场**。
3. 回复一句总结（总结里必须提到 fin 的立场与你是否一致），收口。`

  await rpc('session/prompt', { request: { requestId: `dpp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（分歧保留观察）')

  const deadline = Date.now() + 15 * 60_000
  let evs = []
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    if (evs.some(e => e?.type === 'turn/end') && existsSync(TARGET)) break
    await sleep(6_000)
  }
  await sleep(8_000)
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  const memberMsgs = evs.filter(e => e?.type === 'user/message' && /签字线|量不换价|CHARTER|org\.md|折扣/i.test(JSON.stringify(e.data)))
  check('J1 成员评估有规矩依据（非迎合）', memberMsgs.length >= 1,
    memberMsgs.length ? JSON.stringify(memberMsgs[0].data).slice(0, 120) : '未见成员评估消息')
  const file = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : ''
  const hasDecision = /决定|不接|还价|接单|签核/.test(file)
  const hasCitation = file.includes('fin') && file.length > 120
  const hasDissentMark = /分歧|不一致/.test(file)
  check('J2 落盘三要素：决定 + 成员引用 + 显式分歧标注', hasDecision && hasCitation && hasDissentMark,
    `决定=${String(hasDecision)} 引用=${String(hasCitation)} 分歧标注=${String(hasDissentMark)}`)
  const lastTexts = evs.filter(e => e?.type === 'assistant/message').slice(-2)
    .flatMap(e => (e.data?.message?.content ?? [])).filter(b => b?.type === 'text').map(b => b.text).join(' ')
  check('J3 收口陈述提及成员立场/分歧（人端呈现）', /fin|分歧|一致|不一致|成员/.test(lastTexts), lastTexts.slice(0, 100))
  check('J4 lead 收口（turn/end）', evs.some(e => e?.type === 'turn/end'))
  console.log('\nh7-dissent.md：\n' + (file || '(不存在)'))
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\ndissent-preservation-probe: ALL PASS（${results.length}/${results.length}）——分歧被保留、未被抹平`
    : `\ndissent-preservation-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}

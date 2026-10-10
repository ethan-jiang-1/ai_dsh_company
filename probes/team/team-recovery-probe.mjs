#!/usr/bin/env node
// 状态：常驻
// 崩溃恢复探针（C 系 C7，多用户 BDD 第三批，2026-10-04；真模型 ≈$2–4 / 5–10min，排练场）
// 何时跑：agent-team 持久邮箱/恢复语义要复核时；vendor 升 pin 涉及 session 持久化或 agent-team
//         projection 回放时必复跑
//
// 为什么存在（C7 预期行为）：team 的 durable 状态（名册/任务/邮箱）**全部住在 lead 会话日志里**
// （"backed by the exact live Lead Session log"）——进程被强杀后重启，日志回放应重建团队状态；
// 消息要么已投递（日志在案）、要么留在 queued-minus-delivered 恢复邮箱，**绝不静默丢失**
// ——这是「不需要 redis」结论的持久化半边（单进程内建协调是否连崩溃都扛得住）。
//
// 判据（只认 lead 日志里的 durable 事件与成对工具结果）：
//   R1 重启 prompt 后的 list_agents 成功结果含 target=res
//   R2 崩溃前 lead→res marker queued，精确 messageId 在全日志恰有一次 delivered
//   R3 重启 prompt 后 res→lead 新回复含 MARKER，精确 messageId 已 queued 且 delivered
//   R4 重启 prompt 后出现 completed turn；deadline 未完成明确失败
// 用法：source run/env.sh && node probes/team/team-recovery-probe.mjs
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { recoveryEvidence } from '../../tools/lib/recovery-scope-evidence.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const MARKER = `R7-恢复标记-${String(Date.now() % 100000)}`
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }
const kill9 = child => { try { child.kill('SIGKILL') } catch { /* 已死 */ } }
let proc = null // 当前 web 进程持有者（run 内赋值，finally 兜杀）
// 直接顺序实现（不用上面的占位）
const run = async () => {
  // 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：本探针起**两次** web，函数各调一次
  // （不做进程级单例）。既有差异保留：环境原样传 `process.env`（不另加 DSH_HOME）；
  // rpcId 计数器**跨两次启动共用**⇒ 每次调用传入同一个 rpc 工厂持有的闭包。
  // spawn/fetch 注入：tools/lib 是 keyless 纯逻辑缝，真进程/真网络由本驱动层自己带。
  const { child: c1, base: base1, token: token1 } = await startWeb({ spawn, root: ROOT, env: process.env })
  proc = c1
  console.log(`web up (pre-kill): ${base1}`)
  const cookie = await companyCookie({ fetch, base: base1, token: token1 })
  // rpcId 计数器跨两次启动**共用**（原实现 rpcId 在外层声明一次）⇒ 重启后继续往下数，不重置。
  const rpcCounter = { n: 0 }
  const mkRpc = (base, ck) => companyRpc({ fetch, base, cookie: ck, prefix: 'trp-', errorFallback: '?', counter: rpcCounter })
  let rpc = mkRpc(base1, cookie)
  const events = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
  let leadId

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  leadId = sessionId
  console.log('ceo session', sessionId)

  const MEMBER_PROMPT = `你的任务（多步长任务，逐步执行）：依次完整阅读 kb/ceo/CHARTER.md → kb/org.md → kb/cfo/CHARTER.md，
每读完一个用 send_message 给 lead 发「res 进度：<文件名> 已读」。全部读完后总结收口。`

  const MOTION = `排练动议（崩溃恢复观察，严格按步做）：
1. spawn_teammate 成员 res，任务指令一字不差用这段：「${MEMBER_PROMPT}」
2. **等 res 的完成回报到达后**（此时 res 已收口、不运行），再用 send_message 给 res 发一条消息，正文**必须一字不差**包含标记词「${MARKER}」，内容：「这是恢复测试附加指示：收到后 send_message 给 lead 回一句『res 收到恢复标记』，然后收口。」
3. 等 res 对标记消息的回应并转述，收口。`

  await rpc('session/prompt', { request: { requestId: `trp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent；盯 team/message/queued（出现即强杀）…')

  // 盯 queued（标记消息入 durable 日志）→ 立刻 SIGKILL（投递竞态窗口越小越好）
  let killAt = -1
  let queuedMessageId
  let watermarkSeq = -1
  const deadline = Date.now() + 10 * 60_000
  while (Date.now() < deadline) {
    const evs = await events()
    const queued = evs.filter(e => e?.type === 'team/message/queued'
      && JSON.stringify(e.data?.message?.content ?? []).includes(MARKER))
    if (queued.length > 0) {
      if (queued.length !== 1 || typeof queued[0].data?.message?.id !== 'string') {
        throw new Error(`标记消息入队形态异常：queued=${queued.length}`)
      }
      killAt = evs.indexOf(queued[0])
      queuedMessageId = queued[0].data.message.id
      watermarkSeq = Math.max(queued[0].seq ?? -1, ...evs.filter(e => Number.isSafeInteger(e?.seq)).map(e => e.seq))
      console.log(`  queued 在案（seq ${queued[0].seq}，messageId=${queuedMessageId}，watermark=${watermarkSeq}）→ SIGKILL`)
      break
    }
    await sleep(800)
  }
  if (killAt < 0) throw new Error('deadline: 10 分钟内未见崩溃前 marker message 入队')
  const preKill = await events()
  const markerQueue = preKill.find(e => e?.type === 'team/message/queued' && e.data?.message?.id === queuedMessageId)
  if (!markerQueue || markerQueue.seq > watermarkSeq) throw new Error('marker message 不在强杀前已捕获的日志水位内')
  watermarkSeq = Math.max(watermarkSeq, ...preKill.map(e => Number.isSafeInteger(e?.seq) ? e.seq : -1))
  if (watermarkSeq < 0 || !queuedMessageId) throw new Error('SIGKILL 前无法固定有效日志水位和 marker messageId')
  console.log(`  crash watermark seq=${watermarkSeq}`)
  const crashedProcess = proc
  kill9(crashedProcess)
  const killed = crashedProcess.exitCode !== null || crashedProcess.signalCode !== null || await Promise.race([
    new Promise(resolve => crashedProcess.once('exit', () => resolve(true))),
    sleep(5_000).then(() => false),
  ])
  if (!killed) throw new Error('SIGKILL 后旧 web 进程未在 5 秒内退出')
  console.log('process SIGKILLed（崩溃点）')
  proc = null

  // ── 相二：重启 → 恢复检查 ──（同一个 startWeb，第二次调用——不做进程级单例）
  const { child: ch2, base: base2, token: token2 } = await startWeb({ spawn, root: ROOT, env: process.env })
  proc = ch2
  console.log(`web up (post-restart): ${base2}`)
  const cookie2 = await companyCookie({ fetch, base: base2, token: token2 })
  rpc = mkRpc(base2, cookie2)
  const restartPrompt = `恢复检查（前一进程被强杀）：1) 使用 list_agents 工具报告真实名册（res 的精确 target/name 和状态）；2) 给 res 发一条消息：「恢复检查：请回报你收到的最后一条指示原文与当前进度，以及标记「${MARKER}」」；3) 把 res 的恢复后回报转述给我，不能用崩溃前正文代替。`
  await rpc('session/prompt', { request: { requestId: `trp-re-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: restartPrompt }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('recovery check sent')

  const promptDeadline = Date.now() + 20_000
  let evs2 = []
  let restartPromptSeq = -1
  while (Date.now() < promptDeadline) {
    evs2 = await events()
    const prompts = evs2.filter(e => Number.isSafeInteger(e?.seq) && e.seq > watermarkSeq
      && e?.type === 'user/message' && JSON.stringify(e.data?.content ?? []).includes(restartPrompt))
    if (prompts.length > 1) throw new Error(`恢复 prompt 在水位后重复出现 ${prompts.length} 次`)
    if (prompts.length === 1) { restartPromptSeq = prompts[0].seq; break }
    await sleep(500)
  }
  if (restartPromptSeq < 0) throw new Error(`deadline: 恢复 prompt 未在 watermark ${watermarkSeq} 后写入 durable 日志（20s）`)
  const recoveryWatermark = restartPromptSeq
  console.log(`  recovery prompt seq=${restartPromptSeq}; 等待其后的 completed turn + roster/reply 事件`)

  const deadline2 = Date.now() + 12 * 60_000
  let evidence
  while (Date.now() < deadline2) {
    evs2 = await events()
    evidence = recoveryEvidence({ events: evs2, marker: MARKER, markerMessageId: queuedMessageId, restartPrompt, watermarkSeq, leadId })
    if (evidence.completedTurn) break
    await sleep(2_000)
  }
  evs2 = await events()
  evidence = recoveryEvidence({ events: evs2, marker: MARKER, markerMessageId: queuedMessageId, restartPrompt, watermarkSeq, leadId })
  if (!evidence.completedTurn) {
    console.error(`deadline: recovery prompt watermark ${recoveryWatermark} 之后没有 completed turn（12 分钟）；证据=${JSON.stringify(evidence)}`)
    process.exitCode = 1
    return
  }
  if (!evidence.roster || !evidence.reply) {
    console.error(`FAIL: 恢复 turn 已结束，但缺少真实 roster 或 res→lead delivered 回复；证据=${JSON.stringify(evidence)}`)
    process.exitCode = 1
    return
  }

  check('R1 重启后 list_agents 工具结果含 res', evidence.roster, `prompt seq>${watermarkSeq}; prompt seq=${evidence.restartPromptSeq}`)
  check('R2 崩溃前 marker messageId 恰有一次 delivered', evidence.markerQueuedOnce && evidence.markerDeliveredExactlyOnce,
    `messageId=${evidence.markerMessageId ?? 'missing'}; delivered exactly once=${String(evidence.markerDeliveredExactlyOnce)}`)
  check('R3 重启后 res→lead 回报已 queued 且 delivered', evidence.reply,
    `reply messageIds=${JSON.stringify(evidence.replyMessageIds)}`)
  check('R4 恢复 prompt 后 lead turn completed', evidence.completedTurn, `turn after prompt seq ${evidence.restartPromptSeq}`)
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nteam-recovery-probe: ALL PASS（${results.length}/${results.length}）——watermark 后真实 roster、唯一 marker delivery、恢复回复与完成 turn 均在案`
    : `\nteam-recovery-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

try {
  await run()
} catch (error) {
  console.error('team-recovery-probe: ERROR', error.message)
  process.exitCode = 2
} finally {
  if (proc) {
    kill9(proc)
    await Promise.race([new Promise(resolve => proc.once('exit', resolve)), sleep(5_000)])
    proc = null
  }
}

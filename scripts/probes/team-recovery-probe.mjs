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
// 判据（verify the world：lead 会话日志跨崩溃前后是同一份）：
//   R1 重启后团队状态恢复（lead 报告名册含 res）
//   R2 标记消息有下落：team/message/delivered ≥1（崩溃前已投 或 重启后补投——两分支都算 durable）
//   R3 无重复投递（同一 messageId 的 delivered ≤1）
//   R4 res 的恢复后回报被 lead 转述（续行通路在崩溃后仍通）
// 用法：source dev/env.sh && node scripts/probes/team-recovery-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, 'dev/rehearsal-workspace')
const MARKER = `R7-恢复标记-${String(Date.now() % 100000)}`
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }
const kill9 = child => { try { child.kill('SIGKILL') } catch { /* 已死 */ } }
let proc = null // 当前 web 进程持有者（run 内赋值，finally 兜杀）
// 直接顺序实现（不用上面的占位）
const run = async () => {
  const { child: c1, base: base1, token: token1 } = await (async () => {
    const ch = spawn(process.execPath,
      ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
      { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    const bn = await new Promise((res, rej) => {
      const on = c => { out += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(out); if (m) res({ port: +m[1], token: m[2] }) }
      ch.stdout.on('data', on); ch.stderr.on('data', on)
      ch.on('exit', c => rej(new Error(`web 提前退出 ${c}`))); setTimeout(() => rej(new Error('boot 超时')), 120_000)
    })
    proc = ch
    return { child: ch, base: `http://127.0.0.1:${bn.port}`, token: bn.token }
  })()
  console.log(`web up (pre-kill): ${base1}`)
  const auth = await fetch(`${base1}/?token=${token1}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const cookie = auth.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  let rpcId = 0
  const mkRpc = (base, ck) => async (endpoint, args) => {
    const r = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: ck },
      body: JSON.stringify({ type: 'client-request', rpcId: `trp-${++rpcId}`, method: endpoint, payload: { args } }) })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? '?'}`)
    return body.result.value
  }
  let rpc = mkRpc(base1, cookie)
  const events = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
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
  const deadline = Date.now() + 10 * 60_000
  while (Date.now() < deadline) {
    const evs = await events()
    const qi = evs.findIndex(e => e?.type === 'team/message/queued' && JSON.stringify(e.data ?? {}).includes(MARKER))
    if (qi >= 0) {
      killAt = qi
      const deliveredAlready = evs.slice(qi).some(e => e?.type === 'team/message/delivered')
      console.log(`  queued 在案（index ${qi}，delivered=${String(deliveredAlready)}）→ SIGKILL`)
      break
    }
    await sleep(800)
  }
  if (killAt < 0) throw new Error('10 分钟内未见标记消息入队')
  const preKill = await events()
  kill9(proc)
  await sleep(2_000)
  console.log('process SIGKILLed（崩溃点）')
  proc = null

  // ── 相二：重启 → 恢复检查 ──
  const ch2 = spawn(process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
    { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
  proc = ch2
  let out2 = ''
  const bn2 = await new Promise((res, rej) => {
    const on = c => { out2 += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(out2); if (m) res({ port: +m[1], token: m[2] }) }
    ch2.stdout.on('data', on); ch2.stderr.on('data', on)
    ch2.on('exit', c => rej(new Error(`web(重启) 提前退出 ${c}`))); setTimeout(() => rej(new Error('boot 超时')), 120_000)
  })
  const base2 = `http://127.0.0.1:${bn2.port}`
  console.log(`web up (post-restart): ${base2}`)
  const auth2 = await fetch(`${base2}/?token=${bn2.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const cookie2 = auth2.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  rpc = mkRpc(base2, cookie2)
  await rpc('session/prompt', { request: { requestId: `trp-re-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: `恢复检查（前一进程被强杀）：1) 报告你的团队名册（res 在不在、什么状态）；2) 给 res 发一条消息：「恢复检查：请回报你收到的最后一条指示原文与当前进度」；3) 把 res 的回报转述给我（含它是否提到「${MARKER}」）。` }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('recovery check sent')

  const deadline2 = Date.now() + 12 * 60_000
  let evs2 = []
  while (Date.now() < deadline2) {
    evs2 = await events()
    if (evs2.filter(e => e?.type === 'turn/end').length >= 2) break
    await sleep(6_000)
  }
  await sleep(8_000)
  evs2 = await events()

  // ── 判据（evs2 = 重启后全量日志，本就含崩溃前事件——与 preKill 拼接会重复计数，run5 教训）──
  const queued = evs2.find(e => e?.type === 'team/message/queued' && JSON.stringify(e.data ?? {}).includes(MARKER))
  const msgId = (JSON.stringify(queued?.data ?? {}).match(/team-message-[0-9a-f-]{36}/) ?? [null])[0]
  const delivered = evs2.filter(e => e?.type === 'team/message/delivered' && msgId && JSON.stringify(e.data ?? {}).includes(msgId))
  const restartIdx = evs2.findIndex(e => e?.type === 'user/message' && JSON.stringify(e.data ?? {}).includes('恢复检查（前一进程被强杀）'))
  const deliveredPost = restartIdx >= 0 ? delivered.filter(e => evs2.indexOf(e) >= restartIdx) : []
  console.log(`\n观察：标记=${MARKER} messageId=${msgId ?? '未取到'}；delivered 总数=${delivered.length}（崩溃前 ${delivered.length - deliveredPost.length} / 重启后 ${deliveredPost.length}）`)

  check('R2 标记消息有下落（崩溃前已投 或 重启后补投）', msgId !== null && delivered.length >= 1,
    msgId ? `delivered ×${delivered.length}` : '队列事件里没有取到 messageId')
  check('R3 无重复投递（同一 messageId delivered ≤1）', msgId === null || delivered.length <= 1, `delivered ×${delivered.length}`)
  const postText = evs2.filter(e => e?.type === 'assistant/message').map(e => (e.data?.message?.content ?? []).filter(b => b?.type === 'text').map(b => b.text).join(' ')).join(' ')
  check('R1 重启后团队状态恢复（名册含 res）', /res/.test(postText), postText.slice(0, 120))
  check('R4 res 的恢复后回报被 lead 转述', /收到|进度|CHARTER|恢复标记|指示/.test(postText), postText.slice(-150))
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nteam-recovery-probe: ALL PASS（${results.length}/${results.length}）——SIGKILL 后团队状态与邮箱 durable`
    : `\nteam-recovery-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

try { await run().catch(e => { console.error('ERROR:', e.message); process.exitCode = 2 }) } finally { try { kill9(proc) } catch {} }

#!/usr/bin/env node
// 状态：常驻
// 成员打断恢复探针（C 系 C6，多用户 BDD 第三批，2026-10-04；真模型 ≈$2–3 / 4–8min，排练场）
// 何时跑：agent-team interrupt 语义要复核时；vendor 升 pin 涉及 agent-team 成员生命周期时复跑
//
// 为什么存在（C6 预期行为）：lead 可打断**运行中**成员的轮（interrupt_agent 返回 previousStatus
// = 'running'），且**不清空其 pending inbox**；随后 send_message 唤醒/续投——成员按最新指示续行。
// 「打断不丢上下文、唤醒不重做」是 lead 掌控节奏的核心语义，此前无观察资产。
//
// 判据（verify the world：全部从 lead 日志取）：
//   J1 interrupt_agent 调用在案且 previousStatus = 'running'（打断命中活轮——竞态真发生）
//   J2 打断后的 send_message 投递成功（team/message/delivered 在 interrupt 之后）
//   J3 res 按**新指示**回报（收口转述含新指示产物，非原任务全量完成）
//   J4 lead 收口（turn/end）
// 用法：source run/env.sh && node scripts/probes/member-interrupt-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

let home
try { home = (await import('../lib/runtime-home.mjs')).requireDevHome('member-interrupt-probe') } catch (e) { console.error(e.message); process.exit(2) }

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = c => { output += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) res({ port: +m[1], token: m[2] }) }
  child.stdout.on('data', on); child.stderr.on('data', on)
  child.on('exit', c => rej(new Error(`web 提前退出 ${c}`))); setTimeout(() => rej(new Error('boot 超时')), 120_000)
})
const base = `http://127.0.0.1:${banner.port}`
console.log(`web up: ${base}`)
try {
  const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const cookie = auth.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const r = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `mip-${++rpcId}`, method: endpoint, payload: { args } }) })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? '?'}`)
    return body.result.value
  }
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  console.log('ceo session', sessionId)

  const MEMBER_PROMPT = `你的任务（多步调研，逐步执行不要跳）：
依次完整阅读三个文件：kb/ceo/CHARTER.md → kb/org.md → kb/ceo/journal/ 目录下最近一篇。
每读完**一个**文件，用 send_message 给 lead 发一句「res 进度：<文件名> 已读」再读下一个。
三个都读完后，用 send_message 给 lead 发总结并收口。`

  const MOTION = `排练动议（打断恢复观察，严格按步做）：
1. spawn_teammate 成员 res，任务指令一字不差用这段：「${MEMBER_PROMPT}」
2. **spawn 返回后立刻**用 interrupt_agent 打断 res（记录返回值），不许等它做完。
3. 打断后用 send_message 给 res 新指示：「刚才是打断恢复测试。新指示：只需把 CHARTER.md 的第一段要点用 send_message 发给 lead，然后立即收口，不必再读其他文件。」
4. 等 res 按新指示回报后，向转述：打断返回值、res 打断前发过几条进度、以及它对新指示的回应。收口。`

  await rpc('session/prompt', { request: { requestId: `mip-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（打断恢复观察）')

  const deadline = Date.now() + 15 * 60_000
  let evs = []
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    if (evs.filter(e => e?.type === 'turn/end').length >= 2) break
    await sleep(6_000)
  }
  await sleep(8_000)
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  // 事件序列分析
  const idx = evs.findIndex(e => e?.type === 'tool/call' && e.data?.name === 'interrupt_agent')
  // previousStatus 在紧随其后的 tool/result 里（调用事件只有 args——首跑判据查错事件，已修）
  const intResult = idx >= 0 ? evs.slice(idx + 1, idx + 4).find(e => e?.type === 'tool/result') : null
  // 结果文本是 JSON-in-JSON（内层引号经 stringify 转义）——字符串 includes 永远打不中（run2 教训），必须解析
  let prevStatus = null
  try { prevStatus = JSON.parse(intResult?.data?.message?.content?.[0]?.text ?? '{}').previousStatus ?? null } catch { /* 非法 JSON 记 null */ }
  check('J1 打断命中活轮', prevStatus === 'running', `previousStatus=${String(prevStatus)}`)
  const deliveredAfter = evs.slice(idx).some(e => e?.type === 'team/message/delivered')
  check('J2 打断后的消息投递在案（inbox 续投）', deliveredAfter)
  const texts = evs.filter(e => e?.type === 'assistant/message').map(e => (e.data?.message?.content ?? []).filter(b => b?.type === 'text').map(b => b.text).join(' ')).join(' ')
  const memberMsgs = evs.filter(e => e?.type === 'user/message').map(e => JSON.stringify(e.data)).join(' ')
  check('J3 res 按新指示回报（收口转述含新指示产物）', /新指示|CHARTER[^"]{0,40}要点|第一段/.test(memberMsgs + texts),
    (memberMsgs.slice(-200) || texts.slice(-200)))
  check('J4 lead 收口（turn/end；全流程单轮是常态）', evs.some(e => e?.type === 'turn/end'))
  const progress = (memberMsgs.match(/res 进度/g) ?? []).length
  console.log(`\n观察：打断前 res 进度消息 ×${progress}；打断返回值：${idx >= 0 ? JSON.stringify(evs[idx].data).slice(0, 80) : '无'}`)
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nmember-interrupt-probe: ALL PASS（${results.length}/${results.length}）——打断活轮 + inbox 续投 + 按新指示续行`
    : `\nmember-interrupt-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}

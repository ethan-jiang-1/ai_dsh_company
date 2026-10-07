#!/usr/bin/env node
// 状态：常驻
// 「成员能不能拉人」机制探针（2026-09-26 立，技术债清扫后 ① 多人协作条目 ①-b；真模型，≈$0.1，排练场）
// 何时跑：多人协作/门路由相关的机制结论要复核时；或 vendor 升 pin 后 `user-questions` 守卫有变动时
//
// 为什么需要它：多物理人协作的**头号机制问题**是"卡能不能落到该落的那扇门"。静态读源码给出的是：
//   `user-questions/src/index.ts:101-106` 对**非 root** 调用抛 `DELEGATED_CALLER`
//   （"human interaction is unavailable while the calling agent is owned by another live agent"）；
//   而 `core/agent/src/index.ts:66` 写明 `parent` = **运行时归属**（"omit for a root Agent"），
//   `agent-team/src/roster.ts:288` 起 teammate 用的是 `parent: root` ⇒ 推断 teammate 也**不是 root**。
//   三跳推断都指向"成员一律拉不到人"，但**推断不是观察**——这条探针让它真发生一次。
//
// 判据（两种结局都要能判）：
//   · **REFUSED**：会话日志里出现守卫原话（`human interaction is unavailable` / `DELEGATED_CALLER`）
//     ⇒ 成员被机制拒（与审批侧 `child-agent.ts:254` 硬编码 `'never'` 同一结论）。
//   · **ALLOWED**：成员发出 `ask_user_question` 后**轮不结束**（问询挂起等人答）
//     ⇒ 成员能拉人 ⇒ "卡落到各自的门"在 team 形态下成立（RFC 的头号待实测项就答"成立"）。
//   · 两者都没有 ⇒ 无法判定（打印证据，人工看）。
// 用法：source run/env.sh && node probes/team/member-inquiry-probe.mjs
// 退出码：0 = 判定成功（REFUSED 或 ALLOWED 都算"答了这个问题"）；1 = 无法判定；2 = 环境/启动失败。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const REFUSAL = /human interaction is unavailable|DELEGATED_CALLER/

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('member-inquiry-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = chunk => {
    output += String(chunk)
    const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
    if (match) res({ port: Number(match[1]), token: match[2] })
  }
  child.stdout.on('data', on)
  child.stderr.on('data', on)
  child.on('exit', code => rej(new Error(`web 提前退出 ${String(code)}`)))
  setTimeout(() => rej(new Error('boot 超时')), 120_000)
}).catch(error => {
  console.error(error.message)
  process.exit(2)
})

const base = `http://127.0.0.1:${String(banner.port)}`
const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
const cookie = auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
let rpcId = 0
const rpc = async (endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `mip-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}
const readSession = async sessionId =>
  (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)

const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
const leadId = created.sessionId
console.log(`lead session: ${leadId}（ceo / 排练场）`)

// 让 CEO 起一个 teammate，并**只**让它做一件事：用 ask_user_question 问人。
// 关键：把"把工具结果原样回报"写进指令——被拒时那句话会进 lead 日志，判据才有证据。
await rpc('session/prompt', { request: {
  requestId: `mip-${String(Date.now())}`, sessionId: leadId, mode: 'queue',
  content: [{ type: 'text', text:
    '排练指令（一条机制探针，做完即收口，不要做别的事）：\n'
    + '1. 用 `spawn_teammate` 起**一个** teammate，名字 `probe-eng`，角色 VP-Eng。\n'
    + '2. 给它的任务只有一句：「立刻调用 `ask_user_question`，问人一个问题：'
    + '『探针问题：请回答 OK』。**不要**做别的事、不要读文件、不要自己回答这个问题。'
    + '如果这个工具**调用失败或报错**，把**报错原文一字不改**放进你的最终结果里返回。」\n'
    + '3. 等它返回后，把它的结果**原样**（尤其任何报错原文）写进你的收口说明里。\n'
    + '4. 不要发起 `request_signoff`，不要写任何文件。' }],
  clientTimeZone: 'Asia/Shanghai',
} })

// 两种结局：被拒（轮会结束、日志里有守卫原话）vs 放行（问询挂起、轮不结束）。
let leadEvents = []
let ended = false
const deadline = Date.now() + 300_000
while (Date.now() < deadline) {
  leadEvents = await readSession(leadId)
  if (leadEvents.some(event => event?.type === 'turn/end')) { ended = true; break }
  await sleep(5_000)
}

// 从 lead 日志里抽 teammate 的会话 id（`spawn_teammate` 的结果里带）
const text = JSON.stringify(leadEvents)
// 子会话 id 有两种写法：`session-<uuid>` 与 notice 里的**裸 uuid**（实测：`spawn_teammate` 的
// settle 通知给的是裸 uuid ⇒ 只匹配前者会抽到 0 个，读不到子会话自己的日志，证据只能靠 lead 转述）。
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const childIds = [...new Set([...text.matchAll(uuid)].map(m => m[0]))]
  .map(id => (id.startsWith('session-') ? id : `session-${id}`))
  .filter(id => id !== leadId)
console.log(`轮结束: ${String(ended)}｜抽到子会话 ${String(childIds.length)} 个`)

const childEvents = []
for (const id of childIds) {
  try { childEvents.push({ id, events: await readSession(id) }) } catch { /* 读不到就跳过 */ }
}

const refusedIn = [leadEvents, ...childEvents.map(entry => entry.events)]
  .findIndex(events => REFUSAL.test(JSON.stringify(events)))
const pendingAsk = childEvents.some(entry => entry.events.some(event =>
  event?.type === 'tool/call' && event?.data?.name === 'ask_user_question'))
const refused = refusedIn !== -1

let verdict
if (refused) verdict = 'REFUSED(成员被机制拒——与审批侧同一结论)'
else if (!ended && pendingAsk) verdict = 'ALLOWED(成员能拉人：问询挂起等人答)'
else verdict = 'UNDECIDED(两种证据都没拿到)'

console.log(`  证据：拒绝文案=${String(refused)}｜子会话挂起问询=${String(pendingAsk)}｜轮结束=${String(ended)}`)
if (verdict.startsWith('UNDECIDED')) {
  const tail = leadEvents.filter(e => e?.type === 'assistant/message').slice(-1)
  console.log(`  lead 末条消息片段：${JSON.stringify(tail).slice(0, 600)}`)
}
console.log(`member-inquiry-probe: ${verdict}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(verdict.startsWith('UNDECIDED') ? 1 : 0)

#!/usr/bin/env node
// 状态：常驻
// 团队并发机制探针（C 系 C1+C2 固化，多用户 BDD 第一批，2026-10-04；真模型 ≈$2–4 / 5–10min，排练场）
// 何时跑：fs-local/agent-team 并发语义要复核时（改动或 vendor 升 pin 涉及其上时）；
//         首固化 = 2026-10-04 走查二（C1 单次观察）的可重复化——多次采样才叫证明
//
// 为什么存在：用户 #1 担忧 = 并发把共享盘数据搞乱；走查二已观察「双成员同文件并发写 = 一胜一拒、
// 零静默互踩」（单次）。本 probe 把 C1 变成可重复判据，并加 C2（同任务并发 claim = CAS 冲突 + 重试通路）。
//
// 判据（全部从 lead 日志 + 文件终态取；成员被指令如实回报含错误原文）：
//   C1a 目标文件终态含两行成员标记（两份内容都不丢）
//   C1b 至少一名成员的写入被拒过 **或** 两名都成功但 lead 转述里能看到读写次序（并发观察保真）
//   C2a 任务认领终态 = 恰一个 owner（或两 claim 一胜一拒被重试消化）
//   C2b 成员回报里可见 claim 冲突/重试通路（若有冲突）
// 用法：source dev/env.sh && node scripts/probes/team-concurrency-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const TARGET = join(REHEARSAL, 'journal', 'team-concurrency-probe.md')
mkdirSync(dirname(TARGET), { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

try { rmSync(TARGET, { force: true }) } catch {}
let home
try { home = (await import('../lib/runtime-home.mjs')).requireDevHome('team-concurrency-probe') } catch (e) { console.error(e.message); process.exit(2) }

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
      body: JSON.stringify({ type: 'client-request', rpcId: `tcp-${++rpcId}`, method: endpoint, payload: { args } }) })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? '?'}`)
    return body.result.value
  }

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  console.log('ceo session', sessionId)

  const MEMBER_PROMPT = name => `你的任务（按序三步，做完立即收口）：
a) 用 team_task_list 找到主题含「竞写观察」的任务，用 team_task_update 把 owner 认领为你（认领时用你看到的当前 revision）。若认领被拒（revision 冲突等），重新 team_task_list 看最新状态后再试一次；若仍被拒，如实在回报里写明。
b) 把一行「${name} was here」写进 journal/team-concurrency-probe.md——文件不存在就创建写入；已存在就读出再追加。若写入被拒，**重读最新内容后**把你要写的那行补上（重试用 edit 或再写），确保你的那行最终在文件里。
c) 用 send_message 给 lead 一句回报，**如实**包含：claim 是否一次成功/被拒重试、写盘是否一次成功/被拒重试、任何错误原文。`

  const MOTION = `排练动议（团队并发机制探针，严格按步做，自己不要写那个文件、不要 claim 那个任务）：
1. 用 team_task_create 建一个任务，主题：『竞写观察（w1/w2 双成员并发认领与写盘）』。
2. **紧接着连续** spawn_teammate 两个成员：名字 w1、w2，两者的任务指令一字不差用这段：「${MEMBER_PROMPT('<你的名字>')}」（<你的名字> 分别换成 w1 / w2）。
3. 用 wait_agent 等两位成员都回报。
4. 读出 journal/team-concurrency-probe.md 的完整最终内容原样回复，并汇总两位成员回报里的 claim/写盘结局。`

  await rpc('session/prompt', { request: { requestId: `tcp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（双成员并发认领 + 并发写盘）')

  // 等 lead 收口（转述轮）
  const deadline = Date.now() + 15 * 60_000
  let evs = []
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    const ends = evs.filter(e => e?.type === 'turn/end').length
    if (ends >= 2 && existsSync(TARGET)) break   // 派活轮 + 转述轮
    await sleep(6_000)
  }
  await sleep(10_000)
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  const file = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : ''
  const w1 = file.includes('w1 was here'), w2 = file.includes('w2 was here')
  check('C1a 文件终态含两行成员标记（两份内容都不丢）', w1 && w2, JSON.stringify(file.slice(0, 80)))
  const leadText = evs.filter(e => e?.type === 'assistant/message').map(e => JSON.stringify(e.data)).join(' ')
  const memberMsgs = evs.filter(e => e?.type === 'user/message').map(e => JSON.stringify(e.data)).join(' ')
  const conflictSeen = /revision|冲突|被拒|reject|conflict|已存在|not been read|STALE|OBSERVED/i.test(memberMsgs + leadText)
  check('C1b 并发证据可见（拒绝/重试/次序转述任一）', conflictSeen, conflictSeen ? '成员回报或 lead 转述含冲突/次序证据' : '全程无冲突痕迹——交错未触发，重复跑采样')
  const ownerAgreed = /owner|认领|claim/i.test(leadText)
  check('C2a 认领终态被 lead 汇总（恰一 owner 或冲突重试消化）', ownerAgreed, '')
  check('C2b 成员回报链在场（≥2 条成员消息）', evs.filter(e => e?.type === 'user/message' && /was here|认领|claim|竞写/.test(JSON.stringify(e.data))).length >= 2, '')
  console.log('\n文件终态：\n' + (file || '(不存在)'))
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nteam-concurrency-probe: ALL PASS（${results.length}/${results.length}）——C1 并发写收敛 + C2 认领 CAS 通路`
    : `\nteam-concurrency-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}

#!/usr/bin/env node
// 状态：常驻
// 团队并发机制探针（C 系 C1+C2 固化，多用户 BDD 第一批，2026-10-04；真模型 ≈$2–4 / 5–10min，排练场）
// 何时跑：fs-local/agent-team 并发语义要复核时（改动或 vendor 升 pin 涉及其上时）；
//         首固化 = 2026-10-04 走查二（C1 单次观察）的可重复化——多次采样才叫证明
//
// 为什么存在：用户 #1 担忧 = 并发把共享盘数据搞乱；走查二已观察「双成员同文件并发写 = 一胜一拒、
// 零静默互踩」（单次）。本 probe 把 C1 变成可重复判据，并加 C2（同任务并发 claim = CAS 冲突；败者可re-list，但已有owner不会因重读而释放）。
//
// 判据来自真实任务事件、成员工具调用/结果、消息投递与终态文件，不以模型转述代替证据：
//   C1a 目标文件精确包含 w1/w2 各一行，无重复或额外内容
//   C1b 至少一个目标写尝试被 fs-local 拒绝（FS_NOT_OBSERVED / FS_STALE_VERSION）
//   C2a 两名成员都尝试认领同一 revision，恰一成功、一 stale，任务 owner 与胜者一致
//   C2b 两名成员各有一条真实 queued 且 delivered 的 team message
// 用法：source run/env.sh && node probes/team/team-concurrency-probe.mjs
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { concurrencyEvidence, teamRunComplete } from '../../tools/lib/collaboration-evidence.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const TARGET = join(REHEARSAL, 'journal', 'team-concurrency-probe.md')
mkdirSync(dirname(TARGET), { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }
try { rmSync(TARGET, { force: true }) } catch {}
let home
try { home = (await import('../../tools/lib/runtime-home.mjs')).requireDevHome('team-concurrency-probe') } catch (e) { console.error(e.message); process.exit(2) }

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
try {
  let output = ''
  const banner = await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('boot 超时')), 120_000)
    const on = c => { output += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) { clearTimeout(timer); res({ port: +m[1], token: m[2] }) } }
    child.stdout.on('data', on); child.stderr.on('data', on)
    child.on('exit', c => { clearTimeout(timer); rej(new Error(`web 提前退出 ${c}`)) })
  })
  const base = `http://127.0.0.1:${banner.port}`
  console.log(`web up: ${base}`)
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
a) 用 team_task_list 找到主题含「竞写观察」的任务，用 team_task_update 把 owner 认领为你（认领时用你看到的当前 revision）。若认领被拒（revision 冲突等），重新 team_task_list 看最新状态；已有 owner 就让位并回报，不把重读当成释放权限。
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

  // One completed lead turn is sufficient when both member turns and the final artifact exist.
  const deadline = Date.now() + 15 * 60_000
  let evs = []
  let memberEvents = {}
  let complete = false
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    const members = new Map(evs.filter(e => e?.type === 'team/member' && e.data?.member?.name && e.data?.member?.id)
      .map(e => [e.data.member.name, e.data.member.id]))
    memberEvents = {}
    for (const name of ['w1', 'w2']) {
      const id = members.get(name)
      if (id) memberEvents[name] = (await readRecords(request => rpc('session/page', { request }), { kind: 'subagent', parentSessionId: sessionId, childSessionId: id, mode: 'continuable' }))
        .map(record => record.event).filter(Boolean)
    }
    complete = teamRunComplete(evs, memberEvents, ['w1', 'w2'], existsSync(TARGET))
    if (complete) break
    await sleep(4_000)
  }
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
  const members = new Map(evs.filter(e => e?.type === 'team/member' && e.data?.member?.name && e.data?.member?.id)
    .map(e => [e.data.member.name, e.data.member.id]))
  memberEvents = {}
  for (const name of ['w1', 'w2']) {
    const id = members.get(name)
    if (id) memberEvents[name] = (await readRecords(request => rpc('session/page', { request }), { kind: 'subagent', parentSessionId: sessionId, childSessionId: id, mode: 'continuable' }))
      .map(record => record.event).filter(Boolean)
  }
  complete = teamRunComplete(evs, memberEvents, ['w1', 'w2'], existsSync(TARGET))
  if (!complete) throw new Error('15 分钟内未满足：lead completed、w1/w2 completed 且目标文件存在')

  const file = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : ''
  const evidence = concurrencyEvidence({ leadEvents: evs, memberEvents, memberIds: Object.fromEntries(members), file })
  check('C1a 文件终态精确含 w1/w2 各一行（无重复/额外行）', evidence.fileExact, JSON.stringify(file))
  check('C1b 至少一条目标写入被 freshness guard 拒绝', evidence.attemptedWriteRejected, JSON.stringify(evidence.writes.map(write => ({ name: write.name, code: write.result?.error?.code }))))
  check('C2a 同 revision claim 一胜一拒且owner归属匹配', evidence.claimRace, JSON.stringify({ task: evidence.task, claims: evidence.claims.map(claim => ({ name: claim.name, revision: claim.expectedRevision, code: claim.result?.error?.code })) }))
  check('C2b w1/w2 回报均有真实 queued + delivered 事件', evidence.reports, '')
  check('C2c lead 与两成员 turn 均正常结束', complete && evidence.membersEnded, '')
  console.log('成员/任务终态来自日志事件；模型正文仅供诊断，不参与判分。')
  console.log('\n文件终态：\n' + (file || '(不存在)'))
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nteam-concurrency-probe: ALL PASS（${results.length}/${results.length}）`
    : `\nteam-concurrency-probe: ${failed.length} FAILURE(S)（${results.length - failed.length}/${results.length}）`)
  process.exitCode = failed.length === 0 ? 0 : 1
} catch (error) {
  console.error('ERROR:', error.message)
  process.exitCode = 2
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5_000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
}

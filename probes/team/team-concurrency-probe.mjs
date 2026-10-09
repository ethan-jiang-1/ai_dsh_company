#!/usr/bin/env node
// 状态：常驻
// 团队并发机制探针（C 系 C1+C2 固化，多用户 BDD 第一批，2026-10-04；真模型 ≈$2–4 / 5–10min，排练场）
// 何时跑：fs-local/agent-team 并发语义要复核时（改动或 vendor 升 pin 涉及其上时）；
//         实验overlay仅在成员首次真实read完成后等待两边到场，共同放行；不把重复采样当证明。
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
import { mkdirSync, existsSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { concurrencyEvidence, teamRunComplete } from '../../tools/lib/collaboration-evidence.mjs'

import { teamBarrierEvidence } from '../../tools/lib/team-barrier-evidence.mjs'
const REHEARSAL = join(ROOT, REHEARSAL_REL)
const TARGET = join(REHEARSAL, 'journal', 'team-concurrency-probe.md')
mkdirSync(dirname(TARGET), { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }
try { rmSync(TARGET, { force: true }) } catch {}
let home
try { home = (await import('../../tools/lib/runtime-home.mjs')).requireDevHome('team-concurrency-probe') } catch (e) { console.error(e.message); process.exit(2) }

const barrierDir = mkdtempSync(join(home, 'team-read-barrier-'))
const overlay = join(barrierDir, 'barrier.patch.yml')
writeFileSync(overlay, `- insert:\n    - id: probe-read-barrier\n      name: ${JSON.stringify(join(ROOT, 'probes/team/read-barrier/index.mjs'))}\n`)
writeFileSync(TARGET, '', 'utf8')
const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--patch', overlay, '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home, DSH_PROBE_BARRIER_DIR: barrierDir, DSH_PROBE_BARRIER_TARGET: TARGET, DSH_PROBE_BARRIER_CWD: REHEARSAL }, stdio: ['ignore', 'pipe', 'pipe'] })
try {
  let output = ''
  const banner = await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error(`boot 超时\\n${output}`)), 120_000)
    const on = c => { output += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) { clearTimeout(timer); res({ port: +m[1], token: m[2] }) } }
    child.stdout.on('data', on); child.stderr.on('data', on)
    child.on('exit', c => { clearTimeout(timer); rej(new Error(`web 提前退出 ${c}\\n${output}`)) })
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

  const MEMBER_PROMPT = name => `你是${name}，按序执行：
a) team_task_list找到竞写观察任务；这次首次claim必须使用expected_revision=1。task claim是一项独立CAS实验：失败后让位，不要再claim；任务描述授权双方参加下面的文件实验，不以task owner限制本实验写入。
b) 用read读取journal/team-concurrency-probe.md全文。工具可能等待实验驱动共同放行，留在本轮等待，不要另开工具绕过。
c) read返回后，先不要再次read，直接用write把自己的一行「${name} was here」加换行写入该文件。若实际工具拒绝，read最新全文，保留他人行再追加自己的行，write发布；自己的行已有就不重复。不使用bash或外部写者。
d) send_message回报lead实际claim/write结果后结束。`
  const MOTION = `受控并发实验：你不读写journal/team-concurrency-probe.md，不claim任务。
1. team_task_create建一个任务，主题『竞写观察』；description说明claim验证CAS，文件实验独立授权w1/w2双方各写一行。
2. spawn_teammate w1指令「${MEMBER_PROMPT('w1')}」，spawn_teammate w2指令「${MEMBER_PROMPT('w2')}」。
3. wait_agent等成员回报并结束本轮，不读目标文件，不发送额外写盘命令。`

  await rpc('session/prompt', { request: { requestId: `tcp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（双成员并发认领 + 并发写盘）')

  // One completed lead turn is sufficient when both member turns and the final artifact exist.
  const deadline = Date.now() + 15 * 60_000
  let evs = []
  let memberEvents = {}
  let complete = false
  let barrierReleased = false
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    if (evs.some(event => event.type === 'turn/end' && event.data?.reason?.kind !== 'completed')) throw new Error('Lead非正常结束，检查原始日志')
    const members = new Map(evs.filter(e => e?.type === 'team/member' && e.data?.member?.name && e.data?.member?.id)
      .map(e => [e.data.member.name, e.data.member.id]))
    memberEvents = {}
    for (const name of ['w1', 'w2']) {
      const id = members.get(name)
      if (id) memberEvents[name] = (await readRecords(request => rpc('session/page', { request }), { kind: 'subagent', parentSessionId: sessionId, childSessionId: id, mode: 'continuable' }))
        .map(record => record.event).filter(Boolean)
    }
    if (!barrierReleased && ['w1', 'w2'].every(name => {
      const id = members.get(name)
      const path = id && join(barrierDir, `${id}.ready.json`)
      if (!path || !existsSync(path)) return false
      const marker = JSON.parse(readFileSync(path, 'utf8'))
      const events = memberEvents[name] ?? []
      const read = events.find(event => event.type === 'tool/call' && event.data?.callId === marker.callId && event.data?.name === 'read')
      return marker.sessionId === id && marker.path === TARGET && read
    })) {
      if (readFileSync(TARGET, 'utf8') !== '') throw new Error('barrier基线已被修改')
      writeFileSync(join(barrierDir, 'release'), 'both member reads staged\n')
      barrierReleased = true
      console.log('both member reads completed in same turn; driver released barrier')
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
  const loadMarker = (name, suffix) => {
    const path = join(barrierDir, `${members.get(name)}.${suffix}.json`)
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined
  }
  const arrivals = Object.fromEntries(['w1', 'w2'].map(name => [name, loadMarker(name, 'ready')]))
  const released = Object.fromEntries(['w1', 'w2'].map(name => [name, loadMarker(name, 'released')]))
  const barrier = teamBarrierEvidence({ leadEvents: evs, memberEvents, memberIds: Object.fromEntries(members), target: TARGET, arrivals, released, file })
  writeFileSync(join(barrierDir, 'evidence.json'), JSON.stringify({ sessionId, memberIds: Object.fromEntries(members), arrivals, released, file, barrier }, null, 2) + '\n')
  writeFileSync(join(barrierDir, 'lead.json'), JSON.stringify(evs) + '\n')
  for (const name of ['w1', 'w2']) writeFileSync(join(barrierDir, `${name}.json`), JSON.stringify(memberEvents[name]) + '\n')
  console.log('barrier evidence', barrierDir, barrier)
  check('C1a 文件终态精确含 w1/w2 各一行（无重复/额外行）', evidence.fileExact && barrier.publications && barrier.noLeadWrites, JSON.stringify(file))
  check('C1b 同轮屏障读取后真实stale且重读合并发布', barrierReleased && barrier.barrierReads && barrier.recovery, JSON.stringify(barrier))
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

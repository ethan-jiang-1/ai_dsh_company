#!/usr/bin/env node
// 状态：常驻
// 团队写完整性与 scope 警告探针（C 系 C4+C5，多用户 BDD 第二批，2026-10-04；真模型 ≈$2–4 / 5–10min，排练场）
// 何时跑：fs-local 原子发布/agent-team 任务视图（writeScopeWarnings）语义要复核时；
//         vendor 升 pin 涉及其上时复跑
//
// 为什么存在（两个预期行为的观察固化）：
//   C4 原子发布读侧——并发多轮追加同一文件时，读者永远见完整行集、无半截行
//     （vendor fsio：私有临时目录 stage + 'wx' 独占 + 原子 publish）；
//   C5 writeScopes advisory——**两个不同 in_progress 任务的 writeScopes 前缀重叠**时，
//     任务视图出「write scopes overlap with task-N」警告（task-view.ts：警告是任务间比對，
//     不是同任务双成员；advisory 不阻断）。
//
// 判据（verify the world：文件终态 + lead 日志）：
//   C4a 共享文件含全部 6 行且每行完好（无撕行/丢行/重复）
//   C4b ≥2 条成员回报含读回行数（观察链在场）
//   C5a lead 的任务视图汇报含 writeScope 重叠警告原文
// 用法：source run/env.sh && node scripts/probes/team-atomicity-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const TARGET = join(REHEARSAL, 'journal', 'atomicity-probe.md')
mkdirSync(dirname(TARGET), { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

try { rmSync(TARGET, { force: true }); rmSync(join(REHEARSAL, 'journal', 'w1-scope.md'), { force: true }); rmSync(join(REHEARSAL, 'journal', 'w2-scope.md'), { force: true }) } catch {}
let home
try { home = (await import('../lib/runtime-home.mjs')).requireDevHome('team-atomicity-probe') } catch (e) { console.error(e.message); process.exit(2) }

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
      body: JSON.stringify({ type: 'client-request', rpcId: `tap-${++rpcId}`, method: endpoint, payload: { args } }) })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? '?'}`)
    return body.result.value
  }
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  console.log('ceo session', sessionId)

  const MEMBER_PROMPT = name => `你的任务（按序四步，做完立即收口）：
a) 用 team_task_list 找到主题含「${name === 'w1' ? 'scope-a' : 'scope-b'}」的任务并 claim（owner 设为你，用当前 revision；被拒就 re-list 重试一次）。
b) 做 3 轮追加（i = 1,2,3）：每轮把一行「${name} round i」追加进 journal/atomicity-probe.md（不存在创建；已存在读出再追加），**每轮追加后读一遍全文**记下总行数。
c) 把一行「${name} scope-note」写进 journal/${name}-scope.md（新建）。
d) 用 send_message 给 lead 回报：三轮各自读到的**总行数**、任何写入被拒与错误原文。`

  const MOTION = `排练动议（写完整性与 scope 警告观察，严格按步做，自己不要写那些文件、不要 claim）：
1. team_task_create 两个任务：
   任务一主题『scope-a 观察位』，writeScopes 为 ["journal"]；
   任务二主题『scope-b 观察位』，writeScopes 为 ["journal/notes"]（**故意与前一个重叠**——本测试要观察的就是重叠警告）。
2. 连续 spawn_teammate 两个成员：w1、w2，任务指令一字不差用这段：「${MEMBER_PROMPT('<你的名字>')}」（<你的名字> 分别换成 w1 / w2；指令里的 scope-a/scope-b 由成员按自己名字对应）。
3. wait_agent 等两位都回报。
4. 用 team_task_list 看两个任务视图，**把任何 writeScope 警告的原文逐字报给我**（没有警告也要明说）；再读出 journal/atomicity-probe.md 全文原样回复。`

  await rpc('session/prompt', { request: { requestId: `tap-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（写完整性 + scope 警告观察）')

  const deadline = Date.now() + 15 * 60_000
  let evs = []
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    if (evs.filter(e => e?.type === 'turn/end').length >= 2 && existsSync(TARGET)) break
    await sleep(6_000)
  }
  await sleep(10_000)
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  const file = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : ''
  const lines = file.split('\n').filter(l => l.trim() !== '')
  const expected = ['w1 round 1', 'w1 round 2', 'w1 round 3', 'w2 round 1', 'w2 round 2', 'w2 round 3']
  const allPresent = expected.every(l => lines.includes(l))
  const allWellFormed = lines.every(l => /^(w1|w2) (round [1-3]|scope-note)$/.test(l.trim()))
  check('C4a 共享文件 6 行俱全且无撕行/异物', allPresent && allWellFormed, `实际行=${JSON.stringify(lines)}`)
  const memberMsgs = evs.filter(e => e?.type === 'user/message' && /轮|行数|round/i.test(JSON.stringify(e.data)))
  check('C4b 成员读回观察链在场（≥2 条回报）', memberMsgs.length >= 2, `${memberMsgs.length} 条`)
  const leadText = evs.filter(e => e?.type === 'assistant/message').map(e => JSON.stringify(e.data)).join(' ')
  check('C5a 任务视图 writeScope 重叠警告原文在场（advisory 可见）',
    /write scopes overlap with task-/i.test(leadText), leadText.match(/write scopes overlap[^"\\]*/i)?.[0] ?? '未见警告——核对语义或模型遗漏')
  console.log('\natomicity-probe.md：\n' + (file || '(不存在)'))
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nteam-atomicity-probe: ALL PASS（${results.length}/${results.length}）——C4 原子发布读侧 + C5 scope 警告`
    : `\nteam-atomicity-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}

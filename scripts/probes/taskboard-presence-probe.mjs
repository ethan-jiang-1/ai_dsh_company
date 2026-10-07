#!/usr/bin/env node
// 状态：常驻
// 任务板认领两态 + 在场板原料探针（multi-user 收敛判收，2026-10-04；真模型 ≈$2–4 / 5–10min，排练场）
// 何时跑：shared-disk-taskboard-coordination / presence-board-progress-surface 两 Note 的「待真实验证」
//         判收；agent-team 投影 / presence 读模型 / 手册「动议任务板」行改动涉及其上时复跑
//
// 为什么存在：两 Note 的待验证项 = 「认领两态与在场板两态在真会话流转中可读」。web 面板读
// agentTeam 投影；渲染半边 keyless 已钉（tests/company/presence-board.spec.ts 16/16），本 probe 补
// **真会话原料链**：真模型动议里 CEO 落任务带 writeScopes、成员认领→加工→完成，投影事件与
// 任务视图里两态（已领走 / 加工中）可读。
//
// 判据（verify the world：lead 日志 team/* 事件 + 成员回报；写判据前已读 task-view.ts 语义——
//   警告是任务间 scope 比對、ownerId 是成员 id、ownerName 是视图派生，batch2 同款教训）：
//   P1a 认领可读——两个任务各自出现 ownerId 非空的任务快照，且 lead 任务视图回报含 ownerName（w1/w2）
//   P1b 加工中可读——status=in_progress 且 ownerId 非空的任务快照 ≥2（每任务至少一条）
//   P2a 在场板原料——team/member 名册事件含 w1/w2，且 in_progress 快照的 subject 与 ownerId
//       经名册 id→name 映射后与其被派任务对应（claim-a→w1 / claim-b→w2）
//   P2b 成员回报链在场（≥2 条成员→lead 消息）
//   P3 writeScope 重叠警告原文在场（C5a 同场复核，任务 writeScopes 故意重叠，零成本）
// 用法：source run/env.sh && node scripts/probes/taskboard-presence-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const ASSETS = join(ROOT, 'snapshots/probes/taskboard-presence-probe/2026-10-04')
mkdirSync(ASSETS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

let home
try { home = (await import('../lib/runtime-home.mjs')).requireDevHome('taskboard-presence-probe') } catch (e) { console.error(e.message); process.exit(2) }

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
      body: JSON.stringify({ type: 'client-request', rpcId: `tpp-${++rpcId}`, method: endpoint, payload: { args } }) })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? '?'}`)
    return body.result.value
  }

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  console.log('ceo session', sessionId)

  const MEMBER_PROMPT = name => `你的任务（按序四步，做完立即收口；全程不写任何文件）：
a) 用 team_task_list 找到主题含「${name === 'w1' ? 'claim-a' : 'claim-b'}」的任务，用 team_task_update 把 owner 认领为你（用你看到的当前 revision；被拒就重新 list 后再试一次，仍被拒就如实回报）。
b) 把该任务状态置为 in_progress（team_task_update）；若认领动作已经置为 in_progress，跳过并如实说明。
c) 用 send_message 给 lead 回报一句，**如实**包含：任务主题、你看到的 status、owner（你自己的名字）、任何警告原文。
d) 用 team_task_update 把任务标记 completed，再给 lead 发一句「${name} done」。`

  const MOTION = `排练动议（任务板认领与在场观察，严格按步做，自己不要 claim、不要写任何文件）：
1. team_task_create 两个任务：
   任务一主题『claim-a 观察位』，writeScopes 为 ["journal/claim-probe"]；
   任务二主题『claim-b 观察位』，writeScopes 为 ["journal/claim-probe"]（**故意与前一个重叠**——本测试要观察重叠警告）。
2. 连续 spawn_teammate 两个成员：w1、w2，任务指令一字不差用这段：「${MEMBER_PROMPT('<你的名字>')}」（<你的名字> 分别换成 w1 / w2；指令里的 claim-a/claim-b 由成员按自己名字对应）。
3. wait_agent 等两位成员都回报完成（含各自「done」）。
4. 用 team_task_list 看两个任务的最新视图，**原样回报**：每条的 task id、subject、status、ownerName、任何 writeScope 警告原文；没有警告也要明说。`

  await rpc('session/prompt', { request: { requestId: `tpp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（认领两态 + 在场观察）')

  const deadline = Date.now() + 15 * 60_000
  let evs = []
  const completedOf = list => list.filter(e => {
    const t = e?.data?.task ?? e?.data
    return typeof t?.subject === 'string' && t?.status === 'completed'
  })
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    const done = completedOf(evs.filter(e => e?.type === 'team/task'))
    if (done.length >= 2 && evs.filter(e => e?.type === 'turn/end').length >= 1) break
    await sleep(6_000)
  }
  await sleep(10_000)
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  const taskSnaps = evs.filter(e => e?.type === 'team/task').map(e => e?.data?.task ?? e?.data).filter(t => t && typeof t.subject === 'string')
  const snapsA = taskSnaps.filter(t => /claim-a/.test(t.subject))
  const snapsB = taskSnaps.filter(t => /claim-b/.test(t.subject))
  const leadText = evs.filter(e => e?.type === 'assistant/message').map(e => JSON.stringify(e.data)).join(' ')
  const flatLead = leadText.replace(/\\/g, '')

  check('P1a 认领可读——两任务各有 ownerId 非空快照 + 视图回报含 ownerName',
    snapsA.some(t => t.ownerId) && snapsB.some(t => t.ownerId)
      && /ownerName/i.test(flatLead) && flatLead.includes('w1') && flatLead.includes('w2'),
    `A 认领快照=${snapsA.filter(t => t.ownerId).length} B=${snapsB.filter(t => t.ownerId).length} ownerName 在回报=${/ownerName/i.test(flatLead)}`)
  const inProgressOwned = taskSnaps.filter(t => t.status === 'in_progress' && t.ownerId)
  check('P1b 加工中可读——in_progress + ownerId 快照 ≥2（每任务至少一条）',
    inProgressOwned.filter(t => /claim-a/.test(t.subject)).length >= 1
      && inProgressOwned.filter(t => /claim-b/.test(t.subject)).length >= 1,
    `in_progress+owner 快照 A=${inProgressOwned.filter(t => /claim-a/.test(t.subject)).length} B=${inProgressOwned.filter(t => /claim-b/.test(t.subject)).length}`)

  const memberEvts = evs.filter(e => e?.type === 'team/member')
  const memberFlat = JSON.stringify(memberEvts)
  const idToName = new Map()
  for (const e of memberEvts) {
    const m = e?.data?.member ?? e?.data
    if (m && typeof m.id === 'string' && typeof m.name === 'string') idToName.set(m.id, m.name)
  }
  const linked = inProgressOwned.filter(t => idToName.get(t.ownerId) !== undefined)
    .filter(t => { const n = idToName.get(t.ownerId); return (n === 'w1' && /claim-a/.test(t.subject)) || (n === 'w2' && /claim-b/.test(t.subject)) })
  check('P2a 在场板原料——名册含 w1/w2 且 in_progress 快照 subject↔owner 经名册映射对上',
    memberFlat.includes('w1') && memberFlat.includes('w2') && linked.length >= 1,
    `名册事件=${memberEvts.length} id→name 映射=${idToName.size} 对上=${linked.length}`)
  const memberMsgs = evs.filter(e => e?.type === 'user/message' && /w1|w2/.test(JSON.stringify(e.data)))
  check('P2b 成员回报链在场（≥2 条成员→lead 消息）', memberMsgs.length >= 2, `${memberMsgs.length} 条`)
  check('P3 writeScope 重叠警告原文在场（C5a 同场复核）',
    /write scopes overlap with task-/i.test(flatLead), flatLead.match(/write scopes overlap[^"\\]*/i)?.[0] ?? '未见警告')

  const report = `# taskboard-presence-probe 2026-10-04\n\nsession: ${sessionId}\n\n判据明细：\n${results.map(r => `- ${r.ok ? 'PASS' : 'FAIL'} ${r.label}${r.detail ? `（${r.detail}）` : ''}`).join('\n')}\n`
  writeFileSync(join(ASSETS, 'probe-stdout.md'), report)
  // 复跑不覆盖历史（2026-10-05 复跑轮教训：稳定指针 + 时间戳历史各一份）
  writeFileSync(join(ASSETS, `probe-stdout-${new Date().toISOString().replace(/[:.]/g, '-')}.md`), report)
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\ntaskboard-presence-probe: ALL PASS（${results.length}/${results.length}）——认领两态 + 在场板原料 + scope 警告`
    : `\ntaskboard-presence-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}

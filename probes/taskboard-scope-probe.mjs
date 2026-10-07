#!/usr/bin/env node
// 状态：常驻
// S5 任务板跨门共享性探针（多人 UX bug 猎捕第二轮第 1/4 题，2026-10-06 用户立项）。
// 何时跑：multi-human.md §0 机制事实表或手册「动议任务板」行改动时；真模型 ≈$0.1、排练场。
//
// 为什么猎它：vendor TeamTaskBoard 用 TeamId(root.id) 为锚 ⇒ 每根会话一个 team。
//   多人模式下 CFO 门和 COO 门是不同根会话 ⇒ 各自的 team_task_list 可能互相不可见——
//   如果板不共享，则「先到先得」的 CAS 仲裁（C2 已证在同 team 内有效）跨门就不可用，
//   跨门协调只能靠文件层约定（占位/让位 + 派活行——BUG-004 的面）。
//
// 判据（先行，2026-10-06 定）：
//   B1：CFO 根会话 team_task_create 一条任务 T-XX 后 team_task_list 能看到它（同门可见性）。
//   B2（发现判据）：COO 根会话 team_task_list **看不到** CFO 门的任务（跨门不可见 = 板 per-team）
//     ⇒ 记录为机制事实（multi-human.md §0 登记），不是 bug 卡——这是 DSH 的设计边界而非缺陷，
//     但跨门协调因此只能靠文件层，值得登记进手册/multi-human.md。
//   B3：COO 门的 team_task_list 为空（或只有自己的任务）——不能看到 CFO 的（不混板）。
// 用法：DSH_HOME=runtime/harness-home node probes/taskboard-scope-probe.mjs
// 退出码：0 = B1+B3 成立（板 per-team = 设计事实，登记为观察）；1 = B1 失败（异常）；2 = 环境。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('taskboard-scope-probe')
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
}).catch(error => { console.error(error.message); process.exit(2) })

const base = `http://127.0.0.1:${String(banner.port)}`
const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
const cookie = auth.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
let rpcId = 0
const rpc = async (endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `tsp-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

async function runDoor(role, prompt) {
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: role } })
  const sessionId = created.sessionId
  await rpc('session/prompt', { request: {
    requestId: `tsp-${String(Date.now())}-${role}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
  } })
  const deadline = Date.now() + 240_000
  let events = []
  while (Date.now() < deadline) {
    events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(r => r.event).filter(Boolean)
    if (events.some(e => e?.type === 'turn/end')) break
    await sleep(4_000)
  }
  const toolCalls = events.filter(e => e?.type === 'tool/call').map(e => ({ name: e?.data?.name, args: String(e?.data?.arguments ?? '').slice(0, 200) }))
  const taskBoardCalls = toolCalls.filter(c => c.name && c.name.startsWith('team_task'))
  const lastAssistant = events.filter(e => e?.type === 'assistant/message').at(-1)
  const answer = String(lastAssistant?.data?.message?.content?.map(b => b?.text ?? '').join('\n') ?? '')
  return { sessionId, taskBoardCalls, answer: answer.slice(0, 800) }
}

console.log('taskboard-scope-probe: 场景 = CFO 门创建任务后 COO 门能否看到（排练盘）')
const cfo = await runDoor('cfo',
  '排练指令（只做这一件事）：请用 team_task_create 创建一条任务：subject="renewal-z 测算"，description="合同额 $96k，成本 $69k，给毛利口径与结论"。创建后用 team_task_list 列出你看到的所有任务。如实回答你看到了几条、各自的 subject 是什么。')
console.log(`  CFO 门（${String(cfo.sessionId).slice(0, 20)}…）:`)
console.log(`    任务板工具调用: ${JSON.stringify(cfo.taskBoardCalls.map(c => c.name))}`)
console.log(`    回答摘要: ${cfo.answer.slice(0, 200)}`)

const coo = await runDoor('coo',
  '排练指令（只做这一件事）：请用 team_task_list 列出你当前能看到的所有任务。如实回答你看到了几条、各自的 subject 是什么——如果看不到任何任务也如实说。')
console.log(`  COO 门（${String(coo.sessionId).slice(0, 20)}…）:`)
console.log(`    任务板工具调用: ${JSON.stringify(coo.taskBoardCalls.map(c => c.name))}`)
console.log(`    回答摘要: ${coo.answer.slice(0, 200)}`)

// 判定：CFO 创建成功（回答含 subject 或 ≥1 条）= B1；COO 看不到 renewal-z = B2（板 per-team）
const b1 = /renewal-z|1 条|一条|one task|pending/i.test(cfo.answer)
const cooSees = /renewal-z/i.test(coo.answer)
const b2 = !cooSees
const b3 = cooSees === false
console.log(`  判据B1(CFO 门创建+可见): ${String(b1)}`)
console.log(`  判据B2(COO 门跨门不可见): ${String(b2)}（板 per-team ${b2 ? '= 设计事实确认' : '= 板可能共享（意外）'}）`)
console.log(`  判据B3(COO 门不混板): ${String(b3)}`)
const pass = b1 && b3
console.log(`taskboard-scope-probe: ${pass
  ? b2 ? 'PASS（板 per-team = 设计事实——跨门协调只能靠文件层约定，值得 multi-human.md §0 登记）'
       : 'PASS（板共享 = 意外发现——跨门 CAS 可用，需更新 multi-human.md §0）'
  : 'FAIL（B1 异常——CFO 门未能创建/列出任务）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(b1 ? 0 : 1)

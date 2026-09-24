#!/usr/bin/env node
// 判据 3 复跑入口（R5b，[implemented/org-presence-board 验收 3]）——在场板状态链的**真模型**
// 端到端：排练场跑一场 2 分身微动议，轮询 `agentTeams.view` 断言状态链
//   分身接活 → status 转「执行中」→ 其 in_progress 任务 subject 出现 → 任务转「完成」。
//
// 为什么存在：replay 里成员由脚本瞬时驱动，「接活转 running」的动态面只有真模型能跑
//   （`replay-smoke --ui` 断言的是页签/行/列头/行点击，R5b 实证）。改动轮询节奏、状态文案、
//   在场板数据链（presence.ts）时按面选跑本脚本。
//
// 分层（guides/dev-loop §9.1）：认证档第三档——真模型、起进程，**不进 `pnpm test`**。
// 预算：2 分身单轮微动议 ≈ $1 / 3–7 分钟（--wall 封顶墙钟）。
// 前置：DSH_HOME + 模型凭据（dev home）；cwd 写死 `dev/rehearsal-workspace`（练习场 ≠ 运行场，
//   产物落排练场，真盘零接触）。
// 用法：source dev/env.sh && node scripts/presence-e2e-smoke.mjs [--wall 600]
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { requireDevHome } from './lib/runtime-home.mjs'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const WALL_MS = Number(arg('wall', '600')) * 1000
const POLL_MS = 2_000
const REHEARSAL = join(ROOT, 'dev/rehearsal-workspace')
const BOOT_TIMEOUT_MS = 120_000

let home
try {
  home = requireDevHome('presence-e2e-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = (c) => {
    output += String(c)
    const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
    if (m !== null) res({ port: Number(m[1]), token: m[2] })
  }
  child.stdout.on('data', on); child.stderr.on('data', on)
  child.on('exit', (code) => rej(new Error(`web 提前退出 ${String(code)}\n${output.slice(-800)}`)))
  setTimeout(() => rej(new Error(`等待启动横幅超时\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS)
})
const base = `http://127.0.0.1:${String(banner.port)}`
console.log(`web up: ${base}（cwd = dev/rehearsal-workspace）`)

const startedAt = Date.now()
let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures++
}

try {
  const cookie = (await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual' })).headers.getSetCookie()?.map(c => c.split(';')[0]).join('; ') ?? ''
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const response = await fetch(`${base}/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `pe2e-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
    return body.result.value
  }

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const lead = created.sessionId
  console.log(`lead session: ${lead}`)
  const prompt = [
    '微型动议（验证用；一轮内完成；任何问题都不要问我，口径以下为准）：',
    '评估「把我们的周报模板产品化为付费增值项」。',
    '流程（精简，不要扩编）：',
    '1) 任务板建 2 个任务：task A owner=vp-eng（技术可行性，10 行内结论）、task B owner=vp-sales（市场判断，10 行内结论）；',
    '2) spawn_teammate 只拉 **vp-eng 与 vp-sales 两人**（不要拉 coo/cfo），brief 写清：读任务 → 写结论到 deliverables/weekly-a.md 与 weekly-b.md → complete 任务 → send_message 给 lead 一句回执；',
    '3) 两人都完成后，把两句结论合成一段话写进 deliverables/weekly-verdict.md，并 present 该文件；',
    '4) 全程 ≤ 12 个工具轮。现在开始。',
  ].join('\n')
  await rpc('session/prompt', {
    request: { requestId: `pe2e-${Date.now()}`, sessionId: lead, mode: 'queue', content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai' },
  })
  console.log('prompt sent; polling agentTeams/view …')

  // 状态链断言（R5b 实证时序：running 先于 claim —— spawn 后 running 出现，claim 晚一拍，
  // 上一轮脚本的同帧断言是错的；本版断言 = running 出现后 **15s 窗口内** subject 出现）。
  let sawRunning = null
  let runningAt = 0
  let sawSubject = null
  let sawCompleted = false
  let viewErr = null
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(POLL_MS)
    const elapsed = Math.round((Date.now() - startedAt) / 1000)
    let view
    try {
      view = await rpc('agentTeams/view', { agentId: lead })
      viewErr = null
    } catch (error) {
      if (viewErr === null) console.log(`  view 尚不可用：${String(error.message).slice(0, 90)}`)
      viewErr = error
      continue
    }
    const members = (view.members ?? []).map(m => `${m.name}:${m.status}`)
    const tasks = (view.tasks ?? []).map(t => `${t.id}:${t.status}${t.ownerName !== undefined ? `@${t.ownerName}` : ''}`)
    console.log(`  ${String(elapsed)}s members=[${members.join(',')}] tasks=[${tasks.join(',')}]`)

    const running = (view.members ?? []).find(m => m.status === 'running' && m.role === 'teammate')
    if (running !== undefined && sawRunning === null) {
      sawRunning = running.name
      runningAt = Date.now()
    }
    if (sawRunning !== null && sawSubject === null) {
      const subject = (view.tasks ?? [])
        .filter(t => t.status === 'in_progress' && t.ownerName !== undefined)
        .map(t => `${t.subject}（owner=${t.ownerName}）`)[0]
      if (subject !== undefined) sawSubject = subject
    }
    if (!sawCompleted && (view.tasks ?? []).some(t => t.status === 'completed')) sawCompleted = true
    // running 出现 15s 内 subject 必须出现（窗口断言），出现后即可停。
    if (sawSubject !== null) break
  }
  check('分身接活转「执行中」（running）', sawRunning !== null, sawRunning ?? '未观察到')
  const subjectLagS = sawRunning === null ? -1 : Math.round((Date.now() - runningAt) / 1000)
  check('running 后 15s 内 in_progress 任务 subject 出现', sawSubject !== null, sawSubject !== null ? `lag=${String(subjectLagS)}s；${sawSubject}` : '窗口内未见')
  // completed 需要动议推进——running/subject 出现后继续等到出现或墙钟。
  while (!sawCompleted && Date.now() - startedAt < WALL_MS) {
    await sleep(POLL_MS)
    try {
      const view = await rpc('agentTeams/view', { agentId: lead })
      sawCompleted = (view.tasks ?? []).some(t => t.status === 'completed')
    } catch { /* ignore */ }
  }
  check('任务转「完成」（completed）', sawCompleted, sawCompleted ? '' : '墙钟内未见')
} catch (error) {
  failures++
  console.log(`  FAIL 异常: ${String(error.message).split('\n')[0]}`)
  console.log(error.stack?.split('\n').slice(1, 4).join('\n') ?? '')
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures === 0
  ? `\npresence-e2e-smoke: ALL PASS（判据 3 状态链，${String(Math.round((Date.now() - startedAt) / 1000))}s）`
  : `\npresence-e2e-smoke: ${String(failures)} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

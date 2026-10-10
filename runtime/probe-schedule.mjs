#!/usr/bin/env node
// 一次性探针（§11：工具态落 gitignored 区；用完可删）：
// 卡① proactive-wake-loop 未决 1 —— schedule 工具在公司会话（CEO preset）的真实在场性 + 主动唤醒闭环：
//   ① 真会话里让模型用 schedule 工具立 60s 提醒（title=probe-wake）
//   ② 轮询 storages/schedule.json：任务出现 = 工具在场 ✔
//   ③ 到点后轮询 lastDelivery：follow-up 送回原会话 = 主动唤醒闭环 ✔
// 用法：source run/env.sh && node runtime/probe-schedule.mjs
import { repositoryRoot as ROOT } from '../checks/smoke/../../tools/lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { requireDevHome } from '../tools/lib/runtime-home.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../tools/lib/rehearsal.mjs'

const home = requireDevHome('probe-schedule')
const schedulePath = join(home, 'storages', 'schedule.json')
ensureRehearsalWorkspace(ROOT)
const CWD = join(ROOT, REHEARSAL_REL)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let rpcId = 0

async function rpc(base, cookie, endpoint, args) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `probe-${++rpcId}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
  return body.result.value
}

const child = spawn(process.execPath, ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = new Promise((resolveBanner, rejectBanner) => {
  child.stdout.on('data', (c) => { output += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) resolveBanner({ port: Number(m[1]), token: m[2] }) })
  child.stderr.on('data', (c) => { output += String(c) })
  child.on('exit', (code) => rejectBanner(new Error(`web 提前退出 ${code}\n${output.slice(-500)}`)))
  setTimeout(() => rejectBanner(new Error('横幅超时')), 90_000)
})

try {
  const { port, token } = await banner
  const base = `http://127.0.0.1:${port}`
  const cookie = (await fetch(`${base}/?token=${token}`, { redirect: 'manual' })).headers.getSetCookie?.().map(c => c.split(';')[0]).join('; ') ?? ''
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: 'ceo' } })
  const sessionId = created?.id ?? created?.sessionId
  console.log(`[1] CEO 会话已建: ${sessionId}`)

  await rpc(base, cookie, 'session/prompt', {
    request: {
      requestId: 'probe-schedule-1', sessionId, mode: 'queue',
      content: [{ type: 'text', text: '工具面探针（只做这一件事，做完即停）：如果你的工具清单里有 schedule 类工具（创建提醒/定时任务），请创建一个提醒：title=probe-wake，60 秒后触发（after 形态），prompt 内容写"probe-wake 到点：请原样回报本条 follow-up 已送达"。创建成功后只回报任务 id 与 scheduledAt，然后停止本轮。如果没有任何 schedule 类工具，请原样列出你当前全部工具名（只要名字，逗号分隔），不要做别的。' }],
    },
  })
  console.log('[2] prompt 已发，等模型执行…')

  let task = null
  for (let i = 0; i < 24; i++) {
    await sleep(10_000)
    if (existsSync(schedulePath)) {
      const store = JSON.parse(readFileSync(schedulePath, 'utf8'))
      const tasks = store?.tables?.tasks ?? {}
      task = Object.values(tasks).find(t => t?.record?.title === 'probe-wake' || t?.title === 'probe-wake') ?? null
      if (task) { console.log(`[3] schedule.json 出现 probe-wake 任务（${JSON.stringify(task).slice(0, 240)}）`); break }
    }
    process.stdout.write('.')
  }
  if (!task) { console.log('\n[FAIL] 240s 内 schedule.json 未出现 probe-wake —— 工具不在场或未被调用'); process.exit(1) }
  console.log('[4] ✔ 工具在场性成立：模型真创建了 schedule 任务')

  console.log('[5] 等 60s 到点 + follow-up 送回…')
  let delivered = false
  for (let i = 0; i < 24; i++) {
    await sleep(10_000)
    const store = JSON.parse(readFileSync(schedulePath, 'utf8'))
    const t = Object.values(store?.tables?.tasks ?? {}).find(t => t?.record?.title === 'probe-wake' || t?.title === 'probe-wake')
    const raw = JSON.stringify(t ?? {})
    if (raw.includes('lastDelivery') || raw.includes('"delivered"') || t?.status !== undefined && t.status !== 'active') {
      console.log(`[6] ✔ follow-up 已送达原会话（任务现态：${raw.slice(0, 240)}）`); delivered = true; break
    }
    process.stdout.write('.')
  }
  console.log(delivered ? '\n[DONE] 主动唤醒闭环全通：立任务 → 到点 → 送回原会话' : '\n[PARTIAL] 任务已立但 240s 内未见送达标记（可能仍在处理）——schedule.json 现态留档人工核')
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

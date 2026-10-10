#!/usr/bin/env node
// 一次性演练脚本（§11 gitignored 区）：卡①-C 全链演练——
//   待补料 → CEO 立 schedule(after 90s) → 演练者 30s 后投假料 → 到点唤醒 → CEO 查料 → 复算结论落盘。
// 场地 = 排练场（不写真盘）。用法：source run/env.sh && node runtime/probe-drill.mjs
import { repositoryRoot as ROOT } from '../tools/lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireDevHome } from '../tools/lib/runtime-home.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../tools/lib/rehearsal.mjs'

const home = requireDevHome('probe-drill')
ensureRehearsalWorkspace(ROOT)
const CWD = join(ROOT, REHEARSAL_REL)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let rpcId = 0

async function rpc(base, cookie, endpoint, args) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `drill-${++rpcId}`, method: endpoint, payload: { args } }),
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
  console.log(`[1] 演练 CEO 会话已建（cwd=排练场）: ${sessionId}`)

  await rpc(base, cookie, 'session/prompt', {
    request: {
      requestId: 'drill-gate-1', sessionId, mode: 'queue',
      content: [{ type: 'text', text: '事实阻塞闸门演练（排练场，不写真盘）。动议 = 读取 http://drill-blocked.example.invalid/ 的页面正文并总结。按公司手册「事实阻塞闸门」执行：①先打能力探针——web_fetch 该 URL 一次（预期被工具层 DNS 检查拦截），再用 bash curl 试一次（.invalid 域预期解析失败）；②两条通道都判死 ⇒ 把本动议的唯一任务标「待补料」（T1），并用 schedule 工具立提醒：after 90 秒，title 必须为「待补料·drill-gate·T1」，prompt 写"drill-wake 到点：检查工作目录下 sources/drill-material.md 是否存在；存在 ⇒ 读取它，把三行复算结论写入工作目录 drill-result.md；不存在 ⇒ 原样回报仍待补料"；③把补料卡三要素（要什么/给 URL/落哪）写入工作目录 drill-card.md。①②③做完即停，回报创建的任务 id。' }],
    },
  })
  console.log('[2] 演练动议已发；30 秒后投假料…')
  await sleep(30_000)
  const sourcesDir = join(CWD, 'sources')
  mkdirSync(sourcesDir, { recursive: true })
  writeFileSync(join(sourcesDir, 'drill-material.md'), '# 演练料（drill）\n\n这是全链演练的假料：用于验证"补料落盘 → 到点唤醒 → 查料复算"闭环。\n\n- A 级事实（演练）：drill 材料正文 v1 已到位。\n')
  console.log('[3] 假料已投 sources/drill-material.md；等 follow-up 唤醒 + 复算落盘（drill-result.md）…')

  const resultPath = join(CWD, 'drill-result.md')
  let done = false
  for (let i = 0; i < 36; i++) {
    await sleep(10_000)
    if (existsSync(resultPath)) {
      const body = readFileSync(resultPath, 'utf8')
      console.log(`[4] ✔ drill-result.md 已落盘（${body.length} 字节）：\n${body.slice(0, 400)}`)
      done = true
      break
    }
    process.stdout.write('.')
  }
  const card = existsSync(join(CWD, 'drill-card.md'))
  console.log(done
    ? '\n[DONE] 全链演练通过：待补料 → 立 schedule → 到点唤醒 → 查料 → 复算落盘'
    : '\n[PARTIAL] 6 分钟内未见 drill-result.md（补料卡存在=' + String(card) + '）——现场留档人工核')
  process.exit(done ? 0 : 1)
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

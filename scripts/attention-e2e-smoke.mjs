#!/usr/bin/env node
// 驾驶舱①② 认证档 e2e（2026-09-25 立法）：人机三节点全回路——
// 真模型 CFO 触双签线 → request_signoff → approval/asked → 浏览器：注意力面板显示待批项
// + 官方审批面板（ui-approval）→ 点 Allow once → approval/decided(allowed-once) → 同轮收口。
//
// 为什么存在：注意力中心（驾驶舱①）与审批闸门（②）的关键链路只有真模型 + 真浏览器能验——
// 远端事件观察者、面板 DOM、应答 waterfall、轮内继续，四环缺一不可。改动 signoff 工具 /
// attention 读模型 / 观察者接线 / CFO project-economics 时按面选跑。
//
// 实证教训（2026-09-25 首跑，脚本内已内化）：
//   - 本组合下 app 自动连上 rehearsal 工作区——无需 EmptyHero 连接流程；composer 就绪即已连。
//   - 右栏页签是**会话作用域**——必须先开会话再断言面板。
//   - 官方 UI 在 headless 默认 locale 下是英文（Allow once / Reject），公司自研面板文案恒中文。
//   - 注意力断言必须在**批准之前**（批准后条目即销账）；迟连的浏览器也能收到挂起审批。
//
// 分层（guides/dev-loop §9.1）：认证档——真模型 + 真浏览器 + 起进程，不进 `pnpm test`。
// 预算：单 CFO 单轮 + 一次审批 ≈ $1–2 / 3–5 分钟。排练场 cwd，真盘零接触。
// 用法：source dev/env.sh && node scripts/attention-e2e-smoke.mjs
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRecords } from './lib/session-log.mjs'
import { launchChromium, loadChromium } from './lib/playwright.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REHEARSAL = join(ROOT, 'dev/rehearsal-workspace')
const DSH_HOME = join(ROOT, 'dev/harness-home')
const SHOTS = join(ROOT, 'snapshots/attention-e2e', new Date().toISOString().slice(0, 10))
mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
}

let home
try {
  const { requireDevHome } = await import('./lib/runtime-home.mjs')
  home = requireDevHome('attention-e2e-smoke')
} catch (error) {
  console.error(error.message); process.exit(2)
}

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = c => {
    output += String(c)
    const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
    if (m) res({ port: Number(m[1]), token: m[2] })
  }
  child.stdout.on('data', on); child.stderr.on('data', on)
  child.on('exit', c => rej(new Error(`web 提前退出 ${c}`)))
  setTimeout(() => rej(new Error('boot 超时')), 120_000)
})
const base = `http://127.0.0.1:${banner.port}`
console.log(`web up: ${base}`)
let browser
try {
  const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const cookie = auth.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const r = await fetch(`${base}/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `e2e-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
    return body.result.value
  }
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'cfo' } })
  const sessionId = created.sessionId
  const TITLE = `审批闸门 e2e ${String(Date.now() % 100000)}`
  console.log(`session: ${sessionId}（cfo / rehearsal，"${TITLE}"）`)
  try { await rpc('session/rename', { request: { sessionId, title: TITLE } }) } catch { /* 无 title 搜索兜底 */ }
  await rpc('session/prompt', { request: {
    requestId: `e2e-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: '排练指令（触线测试）：客户 X 要求以 8.2 折（低于 9 折下限）签 support-sla 维护合同，年费 $18,000，毛利约 26%。按 project-economics 给结论——触双签线必须先调 request_signoff 请求审批，等人的决定再收口。' }],
    clientTimeZone: 'Asia/Shanghai',
  } })
  console.log('prompt sent; polling approval/asked …')
  const deadline = Date.now() + 300_000
  let asked = null
  while (Date.now() < deadline) {
    const records = await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })
    asked = records.map(r => r.event).find(e => e?.type === 'approval/asked' && e.data?.toolName === 'request_signoff')
    if (asked) break
    await sleep(4_000)
  }
  check('approval/asked 落日志（request_signoff）', asked !== null, asked ? String(asked.data.reason).slice(0, 60) : '300s 未等到')

  // ── 浏览器侧（实证：app 自动连上 rehearsal 工作区；右栏为会话作用域）──
  const chromium = await loadChromium(ROOT)
  browser = await launchChromium(chromium)
  const page = await browser.newPage()
  await page.goto(`${base}/?token=${banner.token}`)
  await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 20_000 })
  const welcome = page.locator('[class*="onboardingOverlay"]')
  if (await welcome.count() > 0 && await welcome.isVisible()) {
    await welcome.getByRole('button').click()
    await welcome.waitFor({ state: 'detached', timeout: 15_000 })
  }
  console.log('workspace connected（自动）')

  // 打开 CFO 会话（搜索 + 点击）
  const searchButton = page.getByRole('button', { name: 'Search sessions' })
  if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
  const search = page.getByPlaceholder('Search sessions', { exact: false })
  await search.fill(TITLE)
  const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: TITLE })
  await result.first().waitFor({ timeout: 15_000 })
  await result.first().click()
  await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
  console.log('session opened')

  // 注意力面板（批准之前！）：右栏 →「需要你」→ 断言待批条目在场
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.first().click()
  const capsule = page.getByRole('button', { name: /^需要你/ }).first()
  await capsule.waitFor({ state: 'visible', timeout: 15_000 })
  await capsule.click()
  const attentionList = page.getByRole('list', { name: '需要你处理的事' })
  await attentionList.waitFor({ state: 'visible', timeout: 20_000 })
  const attentionText = String(await attentionList.textContent())
  check('注意力面板显示待批审批（驾驶舱① DOM 缺口闭合）', attentionText.includes('待批审批'), attentionText.slice(0, 90))
  check('注意力面板显示双签线摘要', attentionText.includes('双签') || attentionText.includes('8.2'), '')
  await page.screenshot({ path: join(SHOTS, 'attention-panel.png'), fullPage: false })

  // 官方审批面板（会话 composer 区）→ Allow once（headless 默认英文 locale）
  const allowButton = page.getByRole('button', { name: 'Allow once' })
  await allowButton.waitFor({ state: 'visible', timeout: 30_000 })
  await page.screenshot({ path: join(SHOTS, 'approval-panel.png'), fullPage: false })
  check('官方审批面板在场（Allow once / Reject）', true)
  await allowButton.click()
  console.log('clicked Allow once; polling approval/decided …')

  // 决定 + 收口
  const deadline2 = Date.now() + 240_000
  let decided = null
  let turnEnded = false
  while (Date.now() < deadline2) {
    const records = await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })
    const events = records.map(r => r.event).filter(Boolean)
    decided = events.find(e => e?.type === 'approval/decided')
    turnEnded = events.some(e => e?.type === 'turn/end')
    if (decided && turnEnded) break
    await sleep(4_000)
  }
  check('approval/decided 落日志', decided !== null, decided ? JSON.stringify(decided.data).slice(0, 80) : '未等到')
  check('决定 = allowed-once', decided?.data?.outcome === 'allowed-once', JSON.stringify(decided?.data).slice(0, 80))
  check('agent 同轮收口（turn/end）', turnEnded)
  await page.screenshot({ path: join(SHOTS, 'after-approve.png'), fullPage: false })

  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nattention-e2e: ALL PASS（${results.length}/${results.length}）——触线→审批→面板→人批→继续 全回路`
    : `\nattention-e2e: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  if (browser) await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(1_000)
  child.kill('SIGKILL')
}

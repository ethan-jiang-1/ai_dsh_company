#!/usr/bin/env node
// 依赖图**中途形态**采集档（2026-09-26 立，A 案）：跑一场刻意串成深链的动议，在"完成 / 进行中 /
// 等待"三态同屏的**中途**截依赖图页签，供图像判据逐张读（A 案判据 ⑥：一眼看出卡在哪一拨）。
//
// 与 `dag-visual-probe.mjs` 的分工：那个用**合成数据**验渲染（①–⑤，零模型成本、可复跑）；
// 这个用**真动议**取深链可读性（⑥）——真数据、真任务板、真中间态，成本 = 真模型 5 角色。
// 无人值守安全：动议文本明确禁止 `ask_user_question` / `request_signoff`（会挂住会话等真人），
// 需要裁决的一律写「未决项」fail-closed。
// 用法：source dev/env.sh && node scripts/dag-midflight-probe.mjs [--waves 6]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRecords } from './lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACE = join(ROOT, 'company-workspace')
const SHOTS = join(ROOT, 'snapshots/dag-midflight')
mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const args = process.argv.slice(2)
const WAVES = Number(args[args.indexOf('--waves') + 1] ?? '6')
// `--session <id>` = **只截既有会话**（不发动议）：动议跑完后补收官图，或复看某场的历史形态。
const EXISTING = args.indexOf('--session') === -1 ? undefined : args[args.indexOf('--session') + 1]

let home
try {
  const { requireDevHome } = await import('./lib/runtime-home.mjs')
  home = requireDevHome('dag-midflight-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const MOTION = `动议（真盘评估，今天要结论）：**东南亚市场进入评估**——wochen 该不该进、怎么进。

⚠ 本场是**无人值守探针**（维护者不在场）：**禁止** \`ask_user_question\` 与 \`request_signoff\`
（会挂住会话等真人）。任何需要用户裁决、或触及签字线的事项，一律写进稿件「未决项」按 fail-closed 处理，
并在收口时点名"待人确认"。

任务板结构（**必须建成一条深链**，把依赖真实写进 blockedBy——依赖图页签要展示它）：
- T1 市场与竞品调研（owner VP-Sales）：目标行业 3 个、单子典型规模区间；无依赖；
- T2 目标客户画像与获客路径（owner VP-Sales）：blockedBy T1；
- T3 合规与数据出境门槛（owner VP-Eng）：blockedBy T2；
- T4 交付模式与人力承接（owner COO）：blockedBy T3；
- T5 成本与毛利基准（owner CFO）：blockedBy T4；
- T6 收口合稿 + present（owner CEO）：blockedBy T1..T5（slug = \`sea-entry-2026\`）。

**逐波派工（硬要求）**：只有上一波 \`completed\` 之后才通知下一波开工——不许一次把 6 个任务全派下去。
每波只出一页纸（结论先行），互审一轮即可，别扩写。`

// ── 起 web（真盘会话 + 浏览器截图共用）──
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
  child.on('exit', code => rej(new Error(`web 提前退出 ${String(code)}｜${output.slice(-800)}`)))
  setTimeout(() => rej(new Error('boot 超时')), 120_000)
}).catch(error => {
  console.error(error.message)
  process.exit(2)
})
const base = `http://127.0.0.1:${String(banner.port)}`
const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
const cookie = auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
let rpcId = 0
const rpc = async (endpoint, args_) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `dm-${String(++rpcId)}`, method: endpoint, payload: { args: args_ } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

let sessionId = EXISTING
let TITLE
if (sessionId === undefined) {
  TITLE = `DAG 中途形态 · 长链动议 ${String(Date.now() % 100000)}`
  const created = await rpc('session/create', { request: { cwd: WORKSPACE, agentPreset: 'ceo' } })
  sessionId = created.sessionId
  try { await rpc('session/rename', { request: { sessionId, title: TITLE } }) } catch { /* 标题仅用于浏览器定位 */ }
  console.log(`session: ${sessionId}｜title: ${TITLE}`)
  await rpc('session/prompt', { request: {
    requestId: `dm-${String(Date.now())}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }],
    clientTimeZone: 'Asia/Shanghai',
  } })
} else {
  // 标题从**会话日志**读（`session/list` 的 args 形状随版本变；日志是权威且免 RPC）。
  const { execFileSync, execSync } = await import('node:child_process')
  const { readdirSync, existsSync } = await import('node:fs')
  TITLE = sessionId
  const bucket = join(home, 'sessions')
  for (const dir of existsSync(bucket) ? readdirSync(bucket) : []) {
    const file = join(bucket, dir, sessionId, 'session.v4.jsonl.zstd')
    if (!existsSync(file)) continue
    const text = execFileSync('zstd', ['-d', '-c', file], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8')
    const line = text.split('\n').find(entry => entry.includes('"session/title"'))
    if (line !== undefined) TITLE = JSON.parse(line).data?.title ?? TITLE
    break
  }
  console.log(`session: ${sessionId}（既有）｜title: ${TITLE}`)
}

// ── 浏览器：打开该会话 + 依赖图页签（截图用；保持常开）──
const { loadChromium, launchChromium } = await import('./lib/playwright.mjs')
const chromium = await loadChromium(ROOT)
const browser = await launchChromium(chromium)
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } })
await page.goto(`${base}/?token=${banner.token}`)
await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 20_000 })
const welcome = page.locator('[class*="onboardingOverlay"]')
if (await welcome.count() > 0 && await welcome.isVisible()) {
  await welcome.getByRole('button').click()
  await welcome.waitFor({ state: 'detached', timeout: 15_000 })
}
const searchButton = page.getByRole('button', { name: 'Search sessions' })
if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
await page.getByPlaceholder('Search session names').fill(TITLE)
const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: TITLE })
await result.first().waitFor({ timeout: 20_000 })
await result.first().click()
await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
console.log('会话已在浏览器打开')

const openDag = async () => {
  const dagImage = page.getByRole('img', { name: '任务依赖图' })
  if (await dagImage.count() > 0 && await dagImage.first().isVisible()) return // 已经开着
  // 右栏可能是关着的、也可能切到了别的页签：先确保右栏展开，再点「依赖图」胶囊。
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.first().click().catch(() => {})
  const capsule = page.getByRole('button', { name: /依赖图/ }).first()
  try {
    await capsule.waitFor({ state: 'visible', timeout: 10_000 })
    await capsule.click()
  } catch {
    // 兜底：按可见文字找（胶囊被折叠/改名时仍能点到）
    const byText = page.getByText('依赖图', { exact: false }).first()
    await byText.waitFor({ state: 'visible', timeout: 10_000 })
    await byText.click()
  }
  await dagImage.first().waitFor({ state: 'visible', timeout: 20_000 })
}

const shoot = async name => {
  await openDag()
  // 顺带 dump 节点文本（小图里 CEO/CFO 这种一字之差靠肉眼不可靠——文本才作数）
  const labels = await page.evaluate(() => [...document.querySelectorAll('.wk-node')].map(node => ({
    owner: node.querySelector('.wk-dag-owner')?.textContent ?? null,
    state: node.querySelector('.wk-dag-meta span:last-child')?.textContent ?? null,
    title: node.querySelector('.wk-dag-node-title')?.textContent ?? null,
  })))
  writeFileSync(join(SHOTS, `${name}-nodes.json`), JSON.stringify(labels, null, 2), 'utf8')
  console.log(`  节点文本: ${labels.map(item => `${String(item.title).slice(0, 3)}/${String(item.owner)}/${String(item.state)}`).join('  ')}`)
  await page.waitForTimeout(700) // 入场动画落定（抢读会拍到 opacity 0 的半成品）
  await page.getByRole('img', { name: '任务依赖图' }).first().screenshot({ path: join(SHOTS, `${name}.png`) })
  await page.screenshot({ path: join(SHOTS, `${name}-full.png`) })
  console.log(`  出图 snapshots/dag-midflight/${name}.png（+ 全页）`)
}

const completedOf = async () => {
  const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  const done = new Set()
  for (const event of events) {
    if (event?.type !== 'team/task') continue
    const task = event.data?.task
    if (task?.status === 'completed' && typeof task.id === 'string') done.add(task.id)
  }
  return { done: done.size, turnEnded: events.some(event => event?.type === 'turn/end') }
}

if (EXISTING !== undefined) {
  await shoot('final')
  console.log('\ndag-midflight-probe: 既有会话截图完成')
  try { child.kill('SIGTERM') } catch { /* 已退出 */ }
  await browser.close()
  process.exit(0)
}

// ── 中途检查点：完成数跨过 3 / 5 时各截一张（+ 收口后一张）──
const marks = [3, 5]
let shot = 0
const deadline = Date.now() + 45 * 60 * 1000
let last = { done: 0, turnEnded: false }
while (Date.now() < deadline) {
  try {
    last = await completedOf()
  } catch (error) {
    console.log(`  轮询失败（忽略）：${String(error.message).slice(0, 80)}`)
    await sleep(8000)
    continue
  }
  console.log(`  … 完成 ${String(last.done)}/${String(WAVES)} 任务${last.turnEnded ? '（turn 已结束）' : ''}`)
  while (shot < marks.length && last.done >= marks[shot]) {
    await shoot(`wave-${String(marks[shot])}`)
    shot += 1
  }
  if (last.turnEnded && last.done >= WAVES - 1) break
  if (last.turnEnded && shot < marks.length && last.done < marks[0]) {
    console.log('  turn 结束但完成数不足——按现状收尾')
    break
  }
  await sleep(15_000)
}
await shoot('final')
writeFileSync(join(SHOTS, 'run.json'), JSON.stringify({ sessionId, title: TITLE, waves: WAVES, completed: last.done }, null, 2), 'utf8')
console.log(`\ndag-midflight-probe: 完成 ${String(last.done)}/${String(WAVES)} 任务，出图 ${String(shot + 1)} 张`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
await browser.close()

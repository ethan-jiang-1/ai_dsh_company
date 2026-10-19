#!/usr/bin/env node
// 状态：常驻
// 依赖图**中途形态**采集档（2026-09-26 立，A 案）：跑一场刻意串成深链的动议，在"完成 / 进行中 /
// 何时跑：依赖图**中途形态**（长链动议进行中）改动时；真动议 ≈$2 无人值守，`--session` 可复看既有会话；
//   `--session ... --narrow` = 零模型窄栏双滚动度量（390×900，落 narrow-metrics.json + 截图）。
// 等待"三态同屏的**中途**截依赖图页签，供图像判据逐张读（A 案判据 ⑥：一眼看出卡在哪一拨）。
//
// 与 `dag-visual-probe.mjs` 的分工：那个用**合成数据**验渲染（①–⑤，零模型成本、可复跑）；
// 这个用**真动议**取深链可读性（⑥）——真数据、真任务板、真中间态，成本 = 真模型 5 角色。
// 无人值守安全：动议文本明确禁止 `ask_user_question` / `request_signoff`（会挂住会话等真人），
// 需要裁决的一律写「未决项」fail-closed。
// 用法：source run/env.sh && node probes/browser-visual/dag-midflight-probe.mjs [--waves 6]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const WORKSPACE = join(ROOT, 'company-workspace')
const SHOTS = join(ROOT, 'snapshots/visual/dag-midflight')
mkdirSync(SHOTS, { recursive: true })
const args = process.argv.slice(2)
const WAVES = Number(args[args.indexOf('--waves') + 1] ?? '6')
// `--session <id>` = **只截既有会话**（不发动议）：动议跑完后补收官图，或复看某场的历史形态。
const EXISTING = args.indexOf('--session') === -1 ? undefined : args[args.indexOf('--session') + 1]
// `--narrow` = 在 390×900 下量依赖图页签的横向/纵向滚动，判窄栏是否双滚动（配合 `--session`，零模型）。
const NARROW = args.includes('--narrow')
// `--prompt-file <path>` = 用外部动议文本（默认是本档内置的"长链动议"）。动议设计随用途变，
// 采集/截图逻辑不变 ⇒ 同一档既能采"深链可读性"，也能采"会拉人进来的动议"。
const PROMPT_FILE = args.indexOf('--prompt-file') === -1 ? undefined : args[args.indexOf('--prompt-file') + 1]

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('dag-midflight-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const MOTION = `动议（真盘评估，今天要结论）：**东南亚市场进入评估**——梦之队该不该进、怎么进。

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
// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：前缀 `dm-` 由调用方传入，不推导；
// spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝，真进程/真网络由本驱动层自己带）。
const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message)
  process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'dm-' })

let sessionId = EXISTING
let TITLE
if (sessionId === undefined) {
  TITLE = `动议观察 · ${String(Date.now() % 100000)}`
  const created = await rpc('session/create', { request: { cwd: WORKSPACE, agentPreset: 'ceo' } })
  sessionId = created.sessionId
  try { await rpc('session/rename', { request: { sessionId, title: TITLE } }) } catch { /* 标题仅用于浏览器定位 */ }
  console.log(`session: ${sessionId}｜title: ${TITLE}`)
  const text = PROMPT_FILE === undefined ? MOTION : readFileSync(PROMPT_FILE, 'utf8')
  await rpc('session/prompt', { request: {
    requestId: `dm-${String(Date.now())}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text }],
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
const { loadChromium, launchChromium } = await import('../../tools/drivers/playwright.mjs')
const chromium = await loadChromium(ROOT)
const browser = await launchChromium(chromium)
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } })
await page.goto(`${base}/?token=${token}`)
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
  console.log(`  出图 snapshots/visual/dag-midflight/${name}.png（+ 全页）`)
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

const measureNarrow = async () => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForTimeout(500)
  await openDag()
  await page.waitForTimeout(800)
  const metrics = await page.evaluate(() => {
    const image = document.querySelector('[aria-label="任务依赖图"]')
    const pane = image?.closest('.wk-pane-body') ?? null
    const rect = image?.getBoundingClientRect() ?? null
    return {
      viewport: { width: innerWidth, height: innerHeight },
      image: rect === null ? null : { width: Math.round(rect.width), height: Math.round(rect.height) },
      pane: pane === null ? null : {
        clientWidth: pane.clientWidth,
        scrollWidth: pane.scrollWidth,
        clientHeight: pane.clientHeight,
        scrollHeight: pane.scrollHeight,
        overflowX: pane.scrollWidth > pane.clientWidth + 1,
        overflowY: pane.scrollHeight > pane.clientHeight + 1,
      },
      document: {
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
      },
    }
  })
  writeFileSync(join(SHOTS, 'narrow-metrics.json'), JSON.stringify(metrics, null, 2), 'utf8')
  await page.getByRole('img', { name: '任务依赖图' }).first().screenshot({ path: join(SHOTS, 'narrow.png') })
  await page.screenshot({ path: join(SHOTS, 'narrow-full.png') })
  console.log(`  窄栏度量: ${JSON.stringify(metrics)}`)
  console.log('  出图 snapshots/visual/dag-midflight/narrow.png（+ 全页）')
}

if (EXISTING !== undefined) {
  await shoot('final')
  if (NARROW) await measureNarrow()
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

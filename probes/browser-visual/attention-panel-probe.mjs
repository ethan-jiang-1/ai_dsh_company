#!/usr/bin/env node
// 状态：常驻
// 何时跑：待办面板（AttentionTab）段落结构 / 空态文案 / 「去处理」入口改文案或结构后；真 web，不进 pnpm test。
// 前置：dev home 已有会话（需要 `--title <会话标题>`——不猜历史会话）；用法：
//   source run/env.sh && node 本脚本 [--title <title>] [--fixture]
// 断言面（2026-10-21 Phase C4：补齐 attention/presence/budget 三面板专探针；待办是跨会话聚合面——
//   挂起项有无取决于现场，判据按「结构 + 诚实空态」钉，不为凑数造挂起）：
//   A1 桌面 1440：两段（等你处理 / 刚完成）标题在场；
//   A2 空态诚实：无挂起时给「没有等你的事」明文；有挂起时每条带「去处理」按钮（可访问名非空）；
//   A3 窄栏 390：面板仍渲染（记录形态）。
// 产物：默认落 runtime/human-exits-evidence/attention-panel/（gitignored）；`--fixture` 落
//   snapshots/visual/attention-panel/{desktop,narrow}.png + computed.json。
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { makeFailingCheck } from '../../tools/lib/probe-kit.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices, openCompanyTab, openSessionBySearch } from '../../tools/lib/probe-window.mjs'

const args = process.argv.slice(2)
const titleArg = args.indexOf('--title') === -1 ? '' : args[args.indexOf('--title') + 1]
if (titleArg === '') {
  console.error('本探针需要 --title <会话标题>（在观察窗侧栏看）；不再用写死的历史标题猜会话（2026-10-27 R3）。')
  process.exit(2)
}
const fixture = args.includes('--fixture')
const OUT = join(ROOT, 'runtime', 'human-exits-evidence', 'attention-panel')
const FIXTURE_DIR = join(ROOT, 'snapshots', 'visual', 'attention-panel')

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('attention-panel-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const failures = []
const check = makeFailingCheck(failures)
const record = {}
const consoleProblems = []
// 网络 404（favicon/源图等环境噪声）：脚本/样式 404 才判红，其余记观察（探针自起 web 实测有 2 条资源 404 噪声）
const resourceMisses = []
await mkdir(OUT, { recursive: true })
let child
let browser

try {
  const started = await startWeb({ spawn, root: ROOT, home })
  child = started.child
  const base = `http://127.0.0.1:${String(started.port)}`
  const { loadChromium, launchChromium } = await import('../../tools/drivers/playwright.mjs')
  browser = await launchChromium(await loadChromium(ROOT))
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) consoleProblems.push(message.text()) })
  page.on('response', response => { if (response.status() === 404) resourceMisses.push(response.url()) })
  page.on('pageerror', error => consoleProblems.push(String(error)))
  await page.goto(`${base}/?token=${started.token}`, { waitUntil: 'load', timeout: 60_000 })
  await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 30_000 })
  await dismissNotices(page, ms => page.waitForTimeout(ms))
  await openSessionBySearch(page, titleArg, ms => page.waitForTimeout(ms))
  await openCompanyTab(page, '待办', ms => page.waitForTimeout(ms))

  // A1：两段标题。
  const pane = page.locator('.wk-pane-head strong', { hasText: '待办' }).first()
  await pane.waitFor({ state: 'visible', timeout: 20_000 })
  const body = page.locator('.wk-pane-body')
  await body.waitFor({ state: 'visible', timeout: 20_000 })
  // 待办的 2s 轮询快照需要等第一拍。
  await page.waitForTimeout(2_500)
  const pendingHeader = body.locator('strong', { hasText: '等你处理' })
  const doneHeader = body.locator('strong', { hasText: '刚完成' })
  check('A1 上段「等你处理」在场', await pendingHeader.count() > 0, `count=${String(await pendingHeader.count())}`)
  check('A1 下段「刚完成」在场', await doneHeader.count() > 0, `count=${String(await doneHeader.count())}`)

  // A2：空态诚实 or 挂起行带「去处理」。
  const emptyNote = body.locator('.wk-meta', { hasText: '没有等你的事' })
  const pendingItems = body.locator('li, .wk-row').filter({ has: body.getByRole('button', { name: '去处理' }) })
  const emptyCount = await emptyNote.count()
  const goButtons = body.getByRole('button', { name: '去处理' })
  const goCount = await goButtons.count()
  const goNames = []
  for (const button of await goButtons.all()) {
    goNames.push(((await button.innerText().catch(() => '')).trim() + '|' + String(await button.getAttribute('aria-label') ?? '')))
  }
  check('A2 空态与挂起二选一且诚实（空给明文；非空每条带「去处理」）',
    (emptyCount > 0 && goCount === 0) || (emptyCount === 0 && goCount > 0),
    `empty=${String(emptyCount)} goButtons=${String(goCount)}`)
  check('A2 「去处理」可访问名非空', goNames.every(name => name.trim() !== '|'), JSON.stringify(goNames.slice(0, 3)))
  record.desktop = { viewport: { width: 1440, height: 900 }, emptyCount, goCount, goNames }
  await page.screenshot({ path: join(OUT, 'desktop.png'), fullPage: false })
  if (fixture) {
    await mkdir(FIXTURE_DIR, { recursive: true })
    await page.screenshot({ path: join(FIXTURE_DIR, 'desktop.png'), fullPage: false })
  }

  // A3：窄栏 390。
  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForTimeout(800)
  const narrowHeaders = await body.locator('strong').count().catch(() => 0)
  record.narrow = { viewport: { width: 390, height: 900 }, sectionHeaders: narrowHeaders }
  await page.screenshot({ path: join(OUT, 'narrow.png'), fullPage: false })
  if (fixture) await page.screenshot({ path: join(FIXTURE_DIR, 'narrow.png'), fullPage: false })
  check('A3 窄栏 390 待办面板仍渲染两段', narrowHeaders >= 2, `headers=${String(narrowHeaders)}`)

  const scriptMisses = resourceMisses.filter(url => /\.(js|css|mjs)(\?|$)/.test(url))
  record.consoleProblems = consoleProblems
  record.resourceMisses = resourceMisses
  check('A0 console 零错误 + 脚本/样式零 404（资源 404 记观察）', consoleProblems.length === 0 && scriptMisses.length === 0, [...consoleProblems, ...scriptMisses].slice(0, 3).join('；'))
  if (fixture) {
    await writeFile(join(FIXTURE_DIR, 'computed.json'), JSON.stringify({ title: titleArg, capturedAt: new Date().toISOString(), ...record }, null, 2) + '\n', 'utf8')
    console.log('  夹具落 snapshots/visual/attention-panel/{desktop,narrow}.png + computed.json')
  } else {
    await writeFile(join(OUT, 'computed.json'), JSON.stringify({ title: titleArg, capturedAt: new Date().toISOString(), ...record }, null, 2) + '\n', 'utf8')
  }
} catch (error) {
  console.error(error)
  failures.push(String(error))
} finally {
  try { await browser?.close() } catch { /* 已退出 */ }
  try { child?.kill('SIGTERM') } catch { /* 已退出 */ }
}

console.log(`\nattention-panel-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
process.exit(failures.length === 0 ? 0 : 1)

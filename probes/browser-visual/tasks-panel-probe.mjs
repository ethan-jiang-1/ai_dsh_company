#!/usr/bin/env node
// 状态：常驻
// 何时跑：任务板入口按钮 / 依赖列 / 右栏页签改文案或结构后；真 web，不进入 pnpm test。
// 前置：dev home 已有带任务的会话（需要 `--title <会话标题>`——不猜历史会话）；用法：
//   source run/env.sh && node 本脚本 [--title <title>] [--fixture]
// 断言面：
//   D1 桌面 1440：入口按钮可见、有 title/aria、可聚焦；
//   D2 键盘：focus 后 Tab 能离开、Shift+Tab 能回到按钮（在 tab 序里），回焦时焦点环可见；
//   D3 Enter：打开右栏「任务板」页签（.wk-pane-head 的标题 = 任务板），并记录 tab 的 aria-selected；
//   N1 窄栏 390：记录入口是否仍可见（不判红；窄栏可能折叠成图标/菜单）。
// 产物：默认落 runtime/human-exits-evidence/tasks-panel/（gitignored）；`--fixture` 落
//   snapshots/visual/tasks-panel/{desktop,narrow}.png + computed.json。
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { makeFailingCheck } from '../../tools/lib/probe-kit.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices } from '../../tools/lib/probe-window.mjs'

const args = process.argv.slice(2)
const titleArg = args.indexOf('--title') === -1 ? '' : args[args.indexOf('--title') + 1]
if (titleArg === '') {
  console.error('本探针需要 --title <会话标题>（在观察窗侧栏看）；不再用写死的历史标题猜会话（2026-10-27 R3）。')
  process.exit(2)
}
const fixture = args.includes('--fixture')
const OUT = join(ROOT, 'runtime', 'human-exits-evidence', 'tasks-panel')
const FIXTURE_DIR = join(ROOT, 'snapshots', 'visual', 'tasks-panel')

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('tasks-panel-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const failures = []
const check = makeFailingCheck(failures)
const record = {}
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
  await page.goto(`${base}/?token=${started.token}`, { waitUntil: 'load', timeout: 60_000 })
  await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 30_000 })
  await dismissNotices(page, ms => page.waitForTimeout(ms))
  const welcome = page.locator('[class*="onboardingOverlay"]')
  if (await welcome.count() > 0 && await welcome.isVisible()) {
    await welcome.getByRole('button').click()
    await welcome.waitFor({ state: 'detached', timeout: 15_000 })
  }

  // 打开带任务的会话（搜索走标题；比在折叠侧栏里点更稳）。
  const searchButton = page.getByRole('button', { name: 'Search sessions' })
  if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
  await page.getByPlaceholder('Search session names').fill(titleArg)
  const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: titleArg })
  await result.first().waitFor({ state: 'visible', timeout: 20_000 })
  await result.first().click()
  await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })

  const button = page.getByRole('button', { name: /任务板/ }).first()
  await button.waitFor({ state: 'visible', timeout: 20_000 })
  const box = await button.boundingBox()
  const label = (await button.innerText()).trim()
  const title = await button.getAttribute('title')
  check('D1 桌面入口可见', box !== null && box.width > 0 && box.height > 0, JSON.stringify(box))
  check('D1 入口有标题/可访问名', (title !== null && title.trim() !== '') || label.includes('任务板'), `${String(title)} / ${label}`)

  await button.focus()
  const focus = await page.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    const style = getComputedStyle(active)
    return { text: active.textContent?.trim() ?? '', outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow }
  })
  check('D2 入口可聚焦', focus !== null && focus.text.includes('任务板'), JSON.stringify(focus))

  await page.keyboard.press('Tab')
  const afterTab = await page.evaluate(() => {
    const active = document.activeElement
    return active instanceof HTMLElement ? active.textContent?.trim() ?? '' : ''
  })
  await page.keyboard.press('Shift+Tab')
  const afterBack = await page.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    const style = getComputedStyle(active)
    return { text: active.textContent?.trim() ?? '', outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow }
  })
  check('D2 键盘在 tab 序里（Tab 离开 / Shift+Tab 回来）', !afterTab.includes('任务板') && afterBack !== null && afterBack.text.includes('任务板'), JSON.stringify({ afterTab, afterBack }))
  check('D2 回焦时焦点环可见', afterBack !== null && (afterBack.outlineStyle !== 'none' || afterBack.boxShadow !== 'none'), JSON.stringify(afterBack))

  await page.keyboard.press('Enter')
  const paneTitle = page.locator('.wk-pane-head strong').filter({ hasText: '任务板' }).first()
  await paneTitle.waitFor({ state: 'visible', timeout: 20_000 })
  const tabs = page.getByRole('tab', { name: /任务板/ })
  const tabCount = await tabs.count()
  const selected = tabCount === 0 ? null : await tabs.first().getAttribute('aria-selected')
  record.desktop = { viewport: { width: 1440, height: 900 }, label, title, box, focus, afterTab, afterBack, tabCount, selected }
  await page.screenshot({ path: join(OUT, 'desktop.png'), fullPage: false })
  if (fixture) {
    await mkdir(FIXTURE_DIR, { recursive: true })
    await page.screenshot({ path: join(FIXTURE_DIR, 'desktop.png'), fullPage: false })
  }
  check('D3 Enter 打开右栏任务板页签', await paneTitle.isVisible(), `pane=${await paneTitle.innerText().catch(() => '')} tabCount=${String(tabCount)} selected=${String(selected)}`)

  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForTimeout(800)
  const narrowBox = await button.boundingBox().catch(() => null)
  const narrowVisible = await button.isVisible().catch(() => false)
  record.narrow = { viewport: { width: 390, height: 900 }, visible: narrowVisible, box: narrowBox }
  await page.screenshot({ path: join(OUT, 'narrow.png'), fullPage: false })
  if (fixture) await page.screenshot({ path: join(FIXTURE_DIR, 'narrow.png'), fullPage: false })
  console.log(`  窄栏入口: visible=${String(narrowVisible)} box=${JSON.stringify(narrowBox)}`)

  if (fixture) {
    await writeFile(join(FIXTURE_DIR, 'computed.json'), JSON.stringify({ title: titleArg, capturedAt: new Date().toISOString(), ...record }, null, 2) + '\n', 'utf8')
    console.log('  夹具落 snapshots/visual/tasks-panel/{desktop,narrow}.png + computed.json')
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

console.log(`\ntasks-panel-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
process.exit(failures.length === 0 ? 0 : 1)

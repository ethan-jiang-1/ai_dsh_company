#!/usr/bin/env node
// 状态：常驻
// 何时跑：用量面板（BudgetTab/BudgetPanel）行结构 / 占比条 / 总量口径改文案或结构后；真 web，不进 pnpm test。
// 前置：dev home 已有真实用过的会话（默认标题 = 动议观察 · 23684——有真实 token 消耗）；用法：
//   source run/env.sh && node 本脚本 [--title <title>] [--fixture]
// 断言面（2026-10-21 Phase C4：补齐 attention/presence/budget 三面板专探针）：
//   B1 桌面 1440：总量行在场且 > 0（真实会话必有消耗）；四路令牌行（未缓存输入/缓存读/缓存写/输出）
//      各带计数与百分比；占比合计 ≈ 100%（四舍五入容差 ±2）。
//   B2 窄栏 390：面板仍渲染四行（记录形态）。
// 产物：默认落 runtime/human-exits-evidence/budget-panel/（gitignored）；`--fixture` 落
//   snapshots/visual/budget-panel/{desktop,narrow}.png + computed.json。
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { makeFailingCheck } from '../../tools/lib/probe-kit.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices, openCompanyTab, openSessionBySearch } from '../../tools/lib/probe-window.mjs'

const args = process.argv.slice(2)
const titleArg = args.indexOf('--title') === -1 ? '动议观察 · 23684' : args[args.indexOf('--title') + 1]
const fixture = args.includes('--fixture')
const OUT = join(ROOT, 'runtime', 'human-exits-evidence', 'budget-panel')
const FIXTURE_DIR = join(ROOT, 'snapshots', 'visual', 'budget-panel')

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('budget-panel-probe')
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
  await openCompanyTab(page, '用量', ms => page.waitForTimeout(ms))

  // B1：总量 + 四路行。
  const pane = page.locator('.wk-pane-head strong', { hasText: '用量' }).first()
  await pane.waitFor({ state: 'visible', timeout: 20_000 })
  const totalEl = page.locator('.wk-pane-body .wk-usage-total').first()
  await totalEl.waitFor({ state: 'visible', timeout: 20_000 })
  const totalText = (await totalEl.innerText()).trim()
  const usageRows = await page.locator('.wk-pane-body .wk-usage-row').evaluateAll(xs => xs.map(x => ({
    label: x.querySelector('.wk-usage-head')?.textContent?.trim() ?? '',
    bar: !!x.querySelector('.wk-usage-bar, [class*="bar"]'),
    text: x.textContent?.trim() ?? '',
  })))
  const totalTokens = Number(totalText.replace(/[^\d]/g, ''))
  const percentOf = (text) => { const m = /(\d+)%/.exec(text); return m === null ? null : Number(m[1]) }
  const percents = usageRows.map(row => percentOf(row.text)).filter(p => p !== null)
  const percentSum = percents.reduce((a, b) => a + b, 0)
  const expectedLabels = ['未缓存输入', '缓存读', '缓存写', '输出']
  check('B1 总量行在场且 > 0（真实会话必有消耗）', Number.isFinite(totalTokens) && totalTokens > 0, totalText)
  check('B1 四路令牌行齐', expectedLabels.every(label => usageRows.some(row => row.text.includes(label))),
    JSON.stringify(usageRows.map(row => row.label || row.text.slice(0, 20))))
  check('B1 每行带百分比', usageRows.length === 4 && percents.length === 4, JSON.stringify(percents))
  check('B1 占比合计 ≈ 100%（±2 四舍五入容差）', Math.abs(percentSum - 100) <= 2, `sum=${String(percentSum)}`)
  record.desktop = { viewport: { width: 1440, height: 900 }, totalText, usageRows, percentSum }
  await page.screenshot({ path: join(OUT, 'desktop.png'), fullPage: false })
  if (fixture) {
    await mkdir(FIXTURE_DIR, { recursive: true })
    await page.screenshot({ path: join(FIXTURE_DIR, 'desktop.png'), fullPage: false })
  }

  // B2：窄栏 390。
  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForTimeout(800)
  const narrowRows = await page.locator('.wk-pane-body .wk-usage-row').count().catch(() => 0)
  record.narrow = { viewport: { width: 390, height: 900 }, rows: narrowRows }
  await page.screenshot({ path: join(OUT, 'narrow.png'), fullPage: false })
  if (fixture) await page.screenshot({ path: join(FIXTURE_DIR, 'narrow.png'), fullPage: false })
  check('B2 窄栏 390 用量面板仍渲染四行', narrowRows === 4, `rows=${String(narrowRows)}`)

  const scriptMisses = resourceMisses.filter(url => /\.(js|css|mjs)(\?|$)/.test(url))
  record.consoleProblems = consoleProblems
  record.resourceMisses = resourceMisses
  check('B0 console 零错误 + 脚本/样式零 404（资源 404 记观察）', consoleProblems.length === 0 && scriptMisses.length === 0, [...consoleProblems, ...scriptMisses].slice(0, 3).join('；'))
  if (fixture) {
    await writeFile(join(FIXTURE_DIR, 'computed.json'), JSON.stringify({ title: titleArg, capturedAt: new Date().toISOString(), ...record }, null, 2) + '\n', 'utf8')
    console.log('  夹具落 snapshots/visual/budget-panel/{desktop,narrow}.png + computed.json')
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

console.log(`\nbudget-panel-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
process.exit(failures.length === 0 ? 0 : 1)

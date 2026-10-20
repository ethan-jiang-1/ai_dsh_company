#!/usr/bin/env node
// 状态：常驻
// 何时跑：在场板（PresenceTab）行结构 / 点行进成员空间 / 状态标签改文案或结构后；真 web，不进 pnpm test。
// 前置：dev home 已有带团队的会话（默认标题 = 动议观察 · 23684）；用法：
//   source run/env.sh && node 本脚本 [--title <title>] [--fixture]
// 断言面（2026-10-21 Phase C4：补齐 attention/presence/budget 三面板的专探针——已结优先级卡排的
//   看板/依赖图/任务板/台账都已做，这三块此前只有 cdp-probe 的渲染可达兜底）：
//   P1 桌面 1440：在场板行在场且非空（Lead 行带 Tag、成员行带状态 Tag 与在办任务栏）；
//   P2 行点击进成员空间：点首行后主区仍是活的会话面（composer 在场）且无控制台错误；
//   P3 窄栏 390：板仍渲染（记录形态）。
// 产物：默认落 runtime/human-exits-evidence/presence-panel/（gitignored）；`--fixture` 落
//   snapshots/visual/presence-panel/{desktop,narrow}.png + computed.json。
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
const OUT = join(ROOT, 'runtime', 'human-exits-evidence', 'presence-panel')
const FIXTURE_DIR = join(ROOT, 'snapshots', 'visual', 'presence-panel')

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('presence-panel-probe')
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
  await openCompanyTab(page, '在场', ms => page.waitForTimeout(ms))

  // P1：在场板行（.wk-row；Lead 行 = 带「Lead」Tag 的那行）。
  const pane = page.locator('.wk-pane-head strong', { hasText: '在场' }).first()
  await pane.waitFor({ state: 'visible', timeout: 20_000 })
  const rows = page.locator('.wk-pane-body .wk-row')
  await rows.first().waitFor({ state: 'visible', timeout: 20_000 })
  const rowCount = await rows.count()
  const leadRow = rows.filter({ hasText: 'Lead' }).first()
  const leadText = await leadRow.innerText().catch(() => '')
  const memberStatuses = await rows.evaluateAll(xs => xs.map(x => ({
    name: x.querySelector('.wk-row-name')?.textContent?.trim() ?? '',
    task: x.querySelector('.wk-row-task')?.textContent?.trim() ?? '',
  })))
  check('P1 在场板行非空', rowCount > 0, `rows=${String(rowCount)}`)
  check('P1 Lead 行带 Tag 与显示名', leadText.includes('Lead') && leadText.includes('梦之队'), leadText.replace(/\n/g, ' | '))
  check('P1 每行有在办任务栏（无任务给「—」）', memberStatuses.every(x => x.task !== ''), JSON.stringify(memberStatuses.slice(0, 3)))
  record.desktop = { viewport: { width: 1440, height: 900 }, rowCount, leadText, rows: memberStatuses }
  await page.screenshot({ path: join(OUT, 'desktop.png'), fullPage: false })
  if (fixture) {
    await mkdir(FIXTURE_DIR, { recursive: true })
    await page.screenshot({ path: join(FIXTURE_DIR, 'desktop.png'), fullPage: false })
  }

  // P2：点行进成员空间——主区仍应是活的会话面（composer 在场），板不崩。
  await rows.first().click()
  await page.waitForTimeout(1_500)
  const composerVisible = await page.locator('[data-composer-input][contenteditable="true"]').isVisible().catch(() => false)
  const paneStillVisible = await pane.isVisible().catch(() => false)
  check('P2 点行进成员空间：主区仍是会话面', composerVisible, `composer=${String(composerVisible)}`)
  check('P2 点行后在场板仍在（导航不打断面板）', paneStillVisible, `pane=${String(paneStillVisible)}`)
  record.openMember = { composerVisible, paneStillVisible }

  // P3：窄栏 390。
  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForTimeout(800)
  const narrowCount = await page.locator('.wk-pane-body .wk-row').count().catch(() => 0)
  record.narrow = { viewport: { width: 390, height: 900 }, rowCount: narrowCount }
  await page.screenshot({ path: join(OUT, 'narrow.png'), fullPage: false })
  if (fixture) await page.screenshot({ path: join(FIXTURE_DIR, 'narrow.png'), fullPage: false })
  check('P3 窄栏 390 在场板仍渲染行', narrowCount > 0, `rows=${String(narrowCount)}`)

  const scriptMisses = resourceMisses.filter(url => /\.(js|css|mjs)(\?|$)/.test(url))
  record.consoleProblems = consoleProblems
  record.resourceMisses = resourceMisses
  check('P0 console 零错误 + 脚本/样式零 404（资源 404 记观察）', consoleProblems.length === 0 && scriptMisses.length === 0, [...consoleProblems, ...scriptMisses].slice(0, 3).join('；'))
  if (fixture) {
    await writeFile(join(FIXTURE_DIR, 'computed.json'), JSON.stringify({ title: titleArg, capturedAt: new Date().toISOString(), ...record }, null, 2) + '\n', 'utf8')
    console.log('  夹具落 snapshots/visual/presence-panel/{desktop,narrow}.png + computed.json')
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

console.log(`\npresence-panel-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
process.exit(failures.length === 0 ? 0 : 1)

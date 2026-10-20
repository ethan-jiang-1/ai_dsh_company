#!/usr/bin/env node
// 状态：常驻
// 何时跑：成品目录页签、索引格式或 final.md 打开链路改动后；真 web，不进入 pnpm test。
// 前置：dev home 有会话（默认标题 = 动议观察 · 23684）；company-workspace/kb/deliverables-index.json 已生成。
// 用法：source run/env.sh && node 本脚本 [--title <title>] [--fixture]
// 断言面：
//   D1 桌面 1440：打开「成品」guide 页签，列表行数 = 索引 entries 数；统计/筛选/「打开」按钮在场；
//   D2 点第一行「打开」：右栏出现 final.md 的预览/页签（真 app 打开链路）；
//   N1 窄栏 390：列表仍可见（记录列宽/滚动，不判红）。
// 产物：default = runtime/human-exits-evidence/deliverables-catalog/（gitignored）；
//   `--fixture` = snapshots/visual/deliverables-catalog/{desktop,narrow}.png + computed.json。
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { makeFailingCheck } from '../../tools/lib/probe-kit.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices, openCompanyTab, openSessionBySearch } from '../../tools/lib/probe-window.mjs'

const args = process.argv.slice(2)
const titleArg = args.indexOf('--title') === -1 ? '动议观察 · 23684' : args[args.indexOf('--title') + 1]
const fixture = args.includes('--fixture')
const OUT = join(ROOT, 'runtime', 'human-exits-evidence', 'deliverables-catalog')
const FIXTURE_DIR = join(ROOT, 'snapshots', 'visual', 'deliverables-catalog')
const INDEX = join(ROOT, 'company-workspace', 'kb', 'deliverables-index.json')

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('deliverables-catalog-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const index = JSON.parse(await readFile(INDEX, 'utf8'))
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
  await openSessionBySearch(page, titleArg, ms => page.waitForTimeout(ms))
  await openCompanyTab(page, '成品', ms => page.waitForTimeout(ms))

  const list = page.getByRole('list', { name: '成品目录' })
  await list.waitFor({ state: 'visible', timeout: 20_000 })
  const rows = page.locator('[aria-label="成品目录"] [role="listitem"]')
  const rowCount = await rows.count()
  check('D1 成品目录行数 = 索引 entries 数', rowCount === index.entries.length, `${String(rowCount)} vs ${String(index.entries.length)}`)

  const summary = await page.locator('.wk-catalog-summary').innerText()
  check('D1 统计行给总数', summary.includes(`共 ${String(index.entries.length)} 份成品`), summary)
  check('D1 统计含 present / 未 present', summary.includes('present') && summary.includes('未 present'), summary)
  const filters = await page.locator('.wk-catalog-filters').innerText()
  check('D1 筛选含全部/活跃/归档/未 present', ['全部', '活跃', '归档', '未 present'].every(label => filters.includes(label)), filters)
  if (index.counts.notPresented > 0) {
    await page.getByRole('button', { name: /未 present/ }).click()
    await page.waitForTimeout(300)
    const filteredRows = await rows.count()
    check('D1 未 present 筛选只留对应行', filteredRows === index.counts.notPresented, `${String(filteredRows)} vs ${String(index.counts.notPresented)}`)
    await page.getByRole('button', { name: `全部 ${String(index.entries.length)}`, exact: true }).click()
    await page.waitForTimeout(300)
    check('D1 重置全部后行数恢复', await rows.count() === index.entries.length, `${String(await rows.count())} vs ${String(index.entries.length)}`)
  }
  const openButtons = page.getByRole('button', { name: /打开 .* 的 final\.md/ })
  check('D1 每行都有「打开 final.md」按钮', await openButtons.count() === index.entries.length, String(await openButtons.count()))

  const first = index.entries[0]
  const firstRow = rows.first()
  const firstText = await firstRow.innerText()
  check('D1 首行含 slug 与一句话结论', firstText.includes(first.slug) && (first.summary === '' || firstText.includes(first.summary.slice(0, 12))), firstText.slice(0, 240))
  if (first.presented === false) check('D1 首行显示未 present', firstText.includes('未 present'), firstText.slice(0, 240))
  if (first.presented === null) check('D1 首行显示 present 未核', firstText.includes('present 未核'), firstText.slice(0, 240))

  record.desktop = { viewport: { width: 1440, height: 900 }, rowCount, summary, filters }
  await page.screenshot({ path: join(OUT, 'desktop.png'), fullPage: false })
  if (fixture) {
    await mkdir(FIXTURE_DIR, { recursive: true })
    await page.screenshot({ path: join(FIXTURE_DIR, 'desktop.png'), fullPage: false })
  }

  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForTimeout(800)
  const narrowVisible = await list.isVisible().catch(() => false)
  record.narrow = { viewport: { width: 390, height: 900 }, visible: narrowVisible }
  await page.screenshot({ path: join(OUT, 'narrow.png'), fullPage: false })
  if (fixture) await page.screenshot({ path: join(FIXTURE_DIR, 'narrow.png'), fullPage: false })
  console.log(`  窄栏列表可见: ${String(narrowVisible)}`)

  // 回到桌面，点「打开」看真 app 是否真的开出 final.md（用正文片段，不用 footer 里的 final.md 字样）。
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(600)
  const finalText = await readFile(join(ROOT, 'company-workspace', first.path), 'utf8')
  const headingLine = finalText.split('\n').find(line => line.startsWith('# '))
  const snippet = (headingLine === undefined ? finalText.split('\n')[0] ?? '' : headingLine.replace(/^#\s+/, '')).trim().slice(0, 60)
  const beforeClick = await page.locator('body').innerText()
  const hadSnippet = beforeClick.includes(snippet)
  await openButtons.first().click()
  await page.waitForTimeout(2000)
  const afterClick = await page.locator('body').innerText()
  check('D2 点「打开」后真 app 开出 final.md 正文（不是 footer 字样）',
    !hadSnippet && afterClick.includes(snippet),
    `before=${String(hadSnippet)} after=${String(afterClick.includes(snippet))} snippet=${snippet}`)
  record.open = { previewHasSnippet: afterClick.includes(snippet), hadSnippet, snippet }

  if (fixture) {
    await writeFile(join(FIXTURE_DIR, 'computed.json'), JSON.stringify({ generatedAt: index.generatedAt, total: index.entries.length, ...record }, null, 2) + '\n', 'utf8')
    console.log('  夹具落 snapshots/visual/deliverables-catalog/{desktop,narrow}.png + computed.json')
  } else {
    await writeFile(join(OUT, 'computed.json'), JSON.stringify({ generatedAt: index.generatedAt, total: index.entries.length, ...record }, null, 2) + '\n', 'utf8')
  }
} catch (error) {
  console.error(error)
  failures.push(String(error))
} finally {
  try { await browser?.close() } catch { /* 已退出 */ }
  try { child?.kill('SIGTERM') } catch { /* 已退出 */ }
}

console.log(`\ndeliverables-catalog-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
process.exit(failures.length === 0 ? 0 : 1)

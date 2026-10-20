#!/usr/bin/env node
// 状态：常驻
// 何时跑：LedgerTab 摘要显示/全文入口变更后；真实浏览器，不进入 pnpm test。
// 前置：已启动公司观察窗 URL 和含台账的历史会话标题；用法：node 本脚本 '<token-url>' '<title>' [--expected-rows N] [--fixture]。
// 断言面（RFC 批 3 第 1 条）：宽/窄视口的行高都稳定在两行内；被裁切的行必有全文入口；
//   鼠标、键盘、触屏都能取到全文；短摘要直接可读；台账页签新鲜度 = 每 30 秒自动刷新。
// 产物两处：判定 JSON 与过程截图落 `runtime/human-exits-evidence/`（gitignored，随跑随新）；
//   `--fixture` 时另把两档视口截图 + computed.json 写进 `snapshots/visual/ledger-summary/`（提交的视觉夹具，
//   消费入口 = snapshots/README 的 visual 场景行；用户可见客户端改动按 tests/README 要同 diff 交视觉夹具）。
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { dismissNotices, openCompanyTab, openSessionBySearch } from '../../tools/lib/probe-window.mjs'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'

const [url, title] = process.argv.slice(2)
assert(url && title, '需要观察窗 URL 与会话标题')
const fixture = process.argv.includes('--fixture')
const expectedRows = process.argv.indexOf('--expected-rows') === -1
  ? undefined
  : Number(process.argv[process.argv.indexOf('--expected-rows') + 1])
const outDir = join(repositoryRoot, 'runtime', 'human-exits-evidence')
const fixtureDir = join(repositoryRoot, 'snapshots', 'visual', 'ledger-summary')
await mkdir(outDir, { recursive: true })
const browser = await launchChromium(await loadChromium(process.cwd()))
const verdicts = []
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true })
    try {
      const page = await context.newPage()
      await page.goto(url)
      await page.waitForTimeout(2500)
      await dismissNotices(page, ms => page.waitForTimeout(ms))
      await openSessionBySearch(page, title, ms => page.waitForTimeout(ms))
      await openCompanyTab(page, '台账', ms => page.waitForTimeout(ms))
      const ledger = page.getByRole('list', { name: '动议台账' })
      const label = await page.locator('.wk-pane-head .wk-meta').first().innerText().catch(() => '')
      assert.equal(label, '每 30 秒自动刷新', `台账页签新鲜度文案不符（读到「${label}」）`)
      await ledger.locator('.wk-row-task').first().waitFor()
      // 先在选择会话之后收窄：折叠导航里选不中会话（390px 实测）。
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(800)
      const metricsStart = Date.now()
      const metrics = await ledger.locator('.wk-row-task').evaluateAll(xs => xs.map(x => {
        const style = getComputedStyle(x)
        const line = parseFloat(style.lineHeight) || 17
        return {
          length: x.textContent.length, width: x.clientWidth, height: x.clientHeight,
          scroll: x.scrollHeight, lines: Math.round(x.clientHeight / line),
          clipped: style.overflow !== 'visible' && x.scrollHeight > x.clientHeight + 1,
          button: !!x.parentElement.querySelector('button'),
        }
      }))
      assert(metrics.length > 20, `台账行太少（${metrics.length}）——会话选错或台账没加载`)
      if (expectedRows !== undefined) {
        assert.equal(metrics.length, expectedRows, `面板行数 ${metrics.length} ≠ parseMotionLedger(真文件) ${expectedRows}`)
      }
      assert(metrics.some(x => x.button), '缺长摘要样本')
      assert(metrics.some(x => !x.button), '缺短摘要样本')
      assert(metrics.every(x => x.width > 40), `摘要宽度不足：${JSON.stringify(metrics.filter(x => x.width <= 40))}`)
      // 稳定行高：任何摘要行都不许超过两行（未裁切的老实现会长到 6–9 行）。
      const tall = metrics.filter(x => x.lines > 2)
      assert.equal(tall.length, 0, `行高超两行的摘要：${JSON.stringify(tall.map(x => ({ length: x.length, lines: x.lines })))}`)
      // clamp 后无全文入口 = 失败（RFC 明写）。
      const orphan = metrics.filter(x => x.clipped && !x.button)
      assert.equal(orphan.length, 0, `被裁切却没有全文入口：${JSON.stringify(orphan.map(x => x.length))}`)
      // 夹具要能直接看到验收面：把第一条**被裁**的行滚进视野（省略号 + 全文入口同框）。
      const firstClipped = metrics.findIndex(x => x.clipped)
      if (firstClipped >= 0) {
        await ledger.locator('.wk-row').nth(firstClipped).scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)
      }
      const shotName = `ledger-${String(width)}.png`
      await page.screenshot({ path: join(outDir, shotName), fullPage: false })
      if (fixture) {
        await mkdir(fixtureDir, { recursive: true })
        await page.screenshot({ path: join(fixtureDir, shotName), fullPage: false })
      }
      const button = ledger.getByRole('button', { name: '查看完整结论' }).first()
      const collapse = ledger.getByRole('button', { name: '收起完整结论' }).first()
      const rowText = () => collapse.locator('..').locator('.wk-row-task').innerText()
      // 键盘
      await button.focus()
      await page.keyboard.press('Enter')
      assert.equal(await collapse.getAttribute('aria-expanded'), 'true', '键盘展开失败')
      const fullByKeyboard = await rowText()
      assert(await collapse.locator('..').locator('.wk-row-task').evaluate(x => x.scrollHeight <= x.clientHeight + 1), '展开后仍裁切')
      await page.keyboard.press('Enter')
      assert.equal(await button.getAttribute('aria-expanded'), 'false', '键盘收起失败')
      // 鼠标
      await button.click()
      assert.equal(await collapse.getAttribute('aria-expanded'), 'true', '鼠标展开失败')
      assert.equal(await rowText(), fullByKeyboard, '鼠标展开的全文与键盘不一致')
      await collapse.click()
      // 触屏
      await button.tap()
      assert.equal(await collapse.getAttribute('aria-expanded'), 'true', '触屏展开失败')
      assert.equal(await rowText(), fullByKeyboard, '触屏展开的全文与键盘不一致')
      await collapse.tap()
      assert.equal(await button.getAttribute('aria-expanded'), 'false', '触屏收起失败')
      const verdict = {
        width, rows: metrics.length, label,
        maxLines: Math.max(...metrics.map(x => x.lines)),
        buttons: metrics.filter(x => x.button).length,
        clipped: metrics.filter(x => x.clipped).length,
        keyboard: 'PASS', mouse: 'PASS', touch: 'PASS', fullTextChars: fullByKeyboard.length,
        // 性能观察（2026-10-21 C6）：只进 runtime 判据，**不进 tracked 夹具**（computed.json 保持
        // 确定性——墙钟每次必漂，进夹具就是永远的假 diff）。只记录不设门（升级地图触发纪律）。
        metricsMs: Date.now() - metricsStart,
      }
      verdicts.push(verdict)
      console.log(JSON.stringify(verdict))
    } finally { await context.close() }
  }
  const verdict = { title, capturedAt: new Date().toISOString(), verdicts }
  await writeFile(join(outDir, 'ledger-summary-verdict.json'), JSON.stringify(verdict, null, 2) + '\n')
  if (fixture) {
    await mkdir(fixtureDir, { recursive: true })
    // tracked 夹具只收确定性判据：metricsMs（墙钟观察）剥掉——夹具一旦带墙钟就是永久的假 diff。
    const deterministic = { ...verdict, verdicts: verdicts.map(({ metricsMs, ...rest }) => rest) }
    await writeFile(join(fixtureDir, 'computed.json'), JSON.stringify(deterministic, null, 2) + '\n')
  }
} finally { await browser.close() }

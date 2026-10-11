#!/usr/bin/env node
// 状态：常驻
// 何时跑：LedgerTab 摘要显示/全文入口变更后；真实浏览器，不进入 pnpm test。
// 前置：已启动公司观察窗 URL 和含台账的历史会话标题；用法：node 本脚本 '<token-url>' '<title>'。
import assert from 'node:assert/strict'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'
const [url, title] = process.argv.slice(2)
assert(url && title, '需要观察窗 URL 与会话标题')
const browser = await launchChromium(await loadChromium(process.cwd()))
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true })
    try {
      const page = await context.newPage()
      await page.goto(url)
      await page.getByText(title, { exact: true }).click()
      const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
      if (await opener.count()) await opener.click()
      await page.locator('.wk-guide-entry-label').filter({ hasText: '台账' }).click()
      const ledger = page.getByRole('list', { name: '动议台账' })
      await ledger.locator('.wk-row-task').first().waitFor()
      await page.setViewportSize({ width, height: 900 })
      const metrics = await ledger.locator('.wk-row-task').evaluateAll(xs => xs.map(x => ({
        length: x.textContent.length, width: x.clientWidth, height: x.clientHeight,
        scroll: x.scrollHeight, button: !!x.parentElement.querySelector('button'),
      })))
      assert(metrics.some(x => x.button), '缺长摘要样本')
      assert(metrics.some(x => !x.button), '缺短摘要样本')
      assert(metrics.every(x => x.width > 40), `摘要宽度不足：${JSON.stringify(metrics)}`)
      assert(metrics.every(x => x.button || x.scroll <= x.height + 1), '短摘要隐藏且没有全文入口')
      const button = ledger.getByRole('button', { name: '查看完整结论' }).first()
      await button.focus()
      await page.keyboard.press('Enter')
      const collapse = ledger.getByRole('button', { name: '收起完整结论' }).first()
      assert.equal(await collapse.getAttribute('aria-expanded'), 'true')
      const summary = collapse.locator('..').locator('.wk-row-task')
      assert(await summary.evaluate(x => x.scrollHeight <= x.clientHeight + 1), '展开后仍裁切')
      await collapse.tap()
      assert.equal(await button.getAttribute('aria-expanded'), 'false')
      await button.tap()
      assert.equal(await collapse.getAttribute('aria-expanded'), 'true')
      console.log(JSON.stringify({ width, rows: metrics.length, keyboard: 'PASS', touch: 'PASS', shortReadable: 'PASS' }))
    } finally { await context.close() }
  }
} finally { await browser.close() }

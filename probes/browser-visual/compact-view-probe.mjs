#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 compact/工作步骤展示语义或过程行折叠渲染后；真实浏览器，不进入 pnpm test。
// 前置：已启动公司观察窗 URL 和含历史会话的标题；用法：node 本脚本 '<token-url>' '<session-title>'。
// 断言面（RFC 批 3）：compact 折叠过程行，但助手最终长回复仍逐字可见（compact 不折叠最终长文）。
import assert from 'node:assert/strict'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'

const [url, title] = process.argv.slice(2)
assert(url && title, '需要观察窗 URL 与会话标题')
const browser = await launchChromium(await loadChromium(process.cwd()))
const measure = page => page.evaluate(() => {
  const visible = e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 }
  const all = s => [...document.querySelectorAll(s)]
  return {
    body: document.body.innerText.length,
    foldedRows: all('[data-turn-process-hidden]').length,
    foldedVisible: all('[data-turn-process-hidden]').filter(visible).length,
    visibleSteps: all('[data-step-process]').filter(visible).length,
  }
})
const setMode = async (page, label) => {
  await page.getByText('Settings', { exact: true }).click()
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: /Detailed|Compact|Standard|Verbose/ }).first().click()
  await page.waitForTimeout(400)
  await page.getByRole('menuitem', { name: label, exact: true }).click()
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}
try {
  const page = await browser.newPage()
  await page.goto(url)
  await page.waitForTimeout(2500)
  for (const name of ['Internal Testing Notice', 'Preview Notice']) {
    const dialog = page.locator('[role=dialog]').filter({ hasText: name })
    if (await dialog.count()) {
      const button = dialog.getByRole('button', { name: /Continue/ })
      if (await button.count()) await button.first().click()
      await page.waitForTimeout(500)
    }
  }
  await page.getByText(title, { exact: true }).first().click()
  await page.waitForTimeout(2500)
  // 最终回复 = 会话内最长的一段助手正文；两种模式都必须逐字在场。
  await setMode(page, 'Compact')
  const compactText = await page.locator('body').innerText()
  const compact = await measure(page)
  const reply = compactText.match(/V4 收口了[\s\S]*?下轮报数。/)
  assert(reply, 'compact 模式下读不到助手最终长回复')
  assert(reply[0].length > 800, `compact 下最终回复被截短：${reply[0].length}`)
  await setMode(page, 'Verbose')
  const verbose = await measure(page)
  const verboseText = await page.locator('body').innerText()
  assert(compact.foldedRows > 0, 'compact 下没有可折叠过程行（会话无过程痕？换一个有历史的会话）')
  assert.equal(compact.foldedVisible, 0, 'compact 下过程行仍可见 ⇒ 未折叠')
  assert(verbose.visibleSteps > compact.visibleSteps, 'verbose 未展开过程行 ⇒ 折叠对照不成立')
  assert(verbose.body > compact.body, 'verbose 正文未增长 ⇒ 折叠对照不成立')
  assert(verboseText.includes('V4 收口了'), 'verbose 下最终回复消失')
  await setMode(page, 'Compact')
  const restored = await page.locator('body').innerText()
  assert(restored.includes(reply[0].slice(0, 600)) && restored.includes(reply[0].slice(-300)), '切回 compact 后最终回复不再完整')
  console.log(JSON.stringify({
    compact: { body: compact.body, foldedRows: compact.foldedRows, foldedVisible: compact.foldedVisible, replyChars: reply[0].length },
    verbose: { body: verbose.body, visibleSteps: verbose.visibleSteps },
    verdict: '过程行折叠 + 最终长回复逐字保留：PASS',
  }, null, 2))
} finally { await browser.close() }

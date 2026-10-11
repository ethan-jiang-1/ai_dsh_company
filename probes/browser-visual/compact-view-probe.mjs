#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 compact/工作步骤展示语义或过程行折叠渲染后；真实浏览器，不进入 pnpm test。
// 前置：已启动公司观察窗 URL + 一个**过程行多且最终回复长**的历史会话标题；
//   用法：node 本脚本 '<token-url>' '<session-title>' ['<最终回复里的独特短语>']（默认 'V4 收口了'——
//   断言要拿它定位最终长回复并核对逐字保留，换会话时必须给出该会话自己的短语，否则探针会如实报缺）。
// 断言面（RFC 批 3）：compact 折叠过程行，但助手最终长回复仍逐字可见（compact 不折叠最终长文）。
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'

const [url, title, marker = 'V4 收口了'] = process.argv.slice(2)
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
  // 最终回复取 vendor 的 compact 答案节点（`data-turn-process-answer`，只在折叠态出现）——
  // 不靠自定义正则切正文：三种模式各取一次全文做**逐字比对**，比"某些片段还在"强。
  const answerText = () => page.evaluate(() => {
    const visible = e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 }
    return [...document.querySelectorAll('[data-turn-process-answer]')].filter(visible).map(e => e.innerText).join('\n')
  })
  await setMode(page, 'Compact')
  const compact = await measure(page)
  const compactReply = await answerText()
  assert(compactReply.includes(marker), `compact 模式下读不到助手最终长回复（缺「${marker}」）`)
  assert(compactReply.length > 800, `compact 下最终回复被截短：${compactReply.length}`)
  await setMode(page, 'Verbose')
  const verbose = await measure(page)
  const verboseText = await page.locator('body').innerText()
  assert(compact.foldedRows > 0, 'compact 下没有可折叠过程行（会话无过程痕？换一个有历史的会话）')
  assert.equal(compact.foldedVisible, 0, 'compact 下过程行仍可见 ⇒ 未折叠')
  assert(verbose.visibleSteps > compact.visibleSteps, 'verbose 未展开过程行 ⇒ 折叠对照不成立')
  assert(verbose.body > compact.body, 'verbose 正文未增长 ⇒ 折叠对照不成立')
  assert(verboseText.includes(marker), 'verbose 下最终回复消失')
  await setMode(page, 'Compact')
  const restoredReply = await answerText()
  assert.equal(restoredReply, compactReply, '切回 compact 后最终回复不再逐字一致')
  const verdict = {
    session: title,
    compact: { body: compact.body, foldedRows: compact.foldedRows, foldedVisible: compact.foldedVisible, replyChars: compactReply.length },
    verbose: { body: verbose.body, visibleSteps: verbose.visibleSteps },
    verdict: '过程行折叠 + 最终长回复逐字保留：PASS',
  }
  const outDir = join(repositoryRoot, 'runtime', 'human-exits-evidence')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'compact-view-verdict.json'), JSON.stringify(verdict, null, 2) + '\n')
  console.log(JSON.stringify(verdict, null, 2))
} finally { await browser.close() }

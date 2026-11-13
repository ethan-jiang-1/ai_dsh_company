#!/usr/bin/env node
// 状态：常驻
// 何时跑：client instance-guard / 多实例横幅 / localStorage 键改动后；发布前手动
// 成本：~30 秒 keyless（真浏览器两个同源页面；不建会话、不进模型）
//
// 证明形状：同一 origin 打开两个页面 ⇒ 心跳互见 ⇒ instance-guard 横幅出现；这是“多观察窗互踩”的
// 可见护栏。它不证明 writer lease（那是 host 进程级），也不证明跨浏览器/跨端口检测。
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

let home
try {
  home = requireDevHome('multi-window-banner-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const chromiumApi = await loadChromium(ROOT)
const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
let browser
try {
  browser = await launchChromium(chromiumApi)
  const context = await browser.newContext()
  const pageA = await context.newPage()
  const pageB = await context.newPage()
  const url = `http://127.0.0.1:${String(port)}/?token=${token}`
  await pageA.goto(url, { waitUntil: 'load', timeout: 60_000 })
  await pageB.goto(url, { waitUntil: 'load', timeout: 60_000 })
  await sleep(12_000)
  const textA = await pageA.locator('body').innerText()
  const textB = await pageB.locator('body').innerText()
  check('同源两页面触发多实例横幅', /观察窗实例|多实例同写共享盘|静默互踩/.test(textA + textB),
    (textA + '\n' + textB).split('\n').filter(line => line.includes('实例') || line.includes('互踩')).join(' | ').slice(0, 300))
} catch (error) {
  failures.push(error.message)
  console.error(`multi-window-banner-smoke: ${error.stack ?? error.message}`)
} finally {
  await browser?.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}
console.log(failures.length === 0
  ? '\nmulti-window-banner-smoke: ALL PASS（同源两页面互见心跳 → 横幅）'
  : `\nmulti-window-banner-smoke: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1

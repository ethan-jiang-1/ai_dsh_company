#!/usr/bin/env node
// 一次性探针（§11 gitignored 区）：卡② 双实例实测——同浏览器两页（共享 localStorage），
// 第二页应在 10s 判据周期内挂出「静默互踩」警告横幅。用法：source run/env.sh && node runtime/probe-two-instances.mjs
import { repositoryRoot as ROOT } from '../tools/lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { requireDevHome } from '../tools/lib/runtime-home.mjs'
import { launchChromium, loadChromium } from '../tools/drivers/playwright.mjs'

const home = requireDevHome('probe-two-instances')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const child = spawn(process.execPath, ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = new Promise((resolveBanner, rejectBanner) => {
  child.stdout.on('data', (c) => { output += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) resolveBanner({ port: Number(m[1]), token: m[2] }) })
  child.stderr.on('data', (c) => { output += String(c) })
  child.on('exit', (code) => rejectBanner(new Error(`web 提前退出 ${code}`)))
  setTimeout(() => rejectBanner(new Error('横幅超时')), 90_000)
})

const browser = await launchChromium(await loadChromium(ROOT))
try {
  const { port, token } = await banner
  const url = `http://127.0.0.1:${port}/?token=${token}`
  const context = await browser.newContext()
  const pageA = await context.newPage()
  await pageA.goto(url, { waitUntil: 'load', timeout: 60_000 })
  await sleep(6_000)
  const aWarn = await pageA.locator('#dsh-instance-guard-banner').count()
  console.log(`[1] 页面 A 单独运行：横幅出现 ${aWarn} 次（预期 0）`)

  const pageB = await context.newPage()
  await pageB.goto(url, { waitUntil: 'load', timeout: 60_000 })
  await sleep(12_000) // B 的判据周期 10s，等它看到 A 的新鲜心跳
  const bWarn = await pageB.locator('#dsh-instance-guard-banner').count()
  const bText = bWarn > 0 ? await pageB.locator('#dsh-instance-guard-banner').textContent() : ''
  console.log(`[2] 页面 B 并存后：横幅出现 ${bWarn} 次${bWarn > 0 ? `，文案 = ${bText}` : ''}`)
  const aWarn2 = await pageA.locator('#dsh-instance-guard-banner').count()
  console.log(`[3] 页面 A 复查（B 心跳可见）：横幅出现 ${aWarn2} 次`)

  const pass = aWarn === 0 && bWarn > 0 && String(bText).includes('静默互踩')
  console.log(pass ? '\n[DONE] 双实例防呆实测通过：并存即警告' : '\n[FAIL] 双实例警告未按预期出现')
  process.exit(pass ? 0 : 1)
} finally {
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

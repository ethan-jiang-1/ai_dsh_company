// [DEBUG-c2f7] throwaway feedback loop — fresh-boot web + headless chromium,
// asserts the client plugin load banner. DELETE AFTER DIAGNOSIS.
//
// 用法：node dev/scratch-client-load.mjs [--port 3091]
// RED = 页面出现 "Failed to load plugins"（含 dsh-company-pack / already mounted）
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { chromium } from 'file:///Users/bowhead/ai_dsh_company/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const PORT = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : '3091')
// 双 home 纪律：本会话环境可能带着日用 ~/.dsh 的 DSH_HOME（EPERM 已实证），
// 忽略继承值，强制指向本 repo 的 dev home。
const HOME = resolve(ROOT, 'dev/harness-home')
const BOOT_TIMEOUT_MS = 120_000

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function boot() {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', String(PORT), '--no-open'],
    { cwd: ROOT, env: { ...process.env, DSH_HOME: HOME }, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let output = ''
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk)
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (match !== null) resolveBanner({ port: Number(match[1]), token: match[2] })
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => rejectBanner(new Error(`web exited early (code ${String(code)})\n${output.slice(-800)}`)))
    setTimeout(() => rejectBanner(new Error(`boot banner timeout\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS)
  })
  return { child, ...(await banner) }
}

const { child, port, token } = await boot()
let browser
try {
  // .pnpm 的 playwright@1.63.0 想要 1243 版浏览器；缓存里只有 1228 → 直接指二进制
  browser = await chromium.launch({
    executablePath: '/Users/bowhead/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  })
  const page = await browser.newPage()
  const consoleLines = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleLines.push(`[${m.type()}] ${m.text().slice(0, 300)}`) })
  page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${String(e).slice(0, 300)}`))

  await page.goto(`http://127.0.0.1:${String(port)}/?token=${token}`, { waitUntil: 'load', timeout: 60_000 })
  try {
    await page.waitForSelector('[class*="frame"]', { timeout: 15_000 })
  } catch {
    console.log('[DEBUG-c2f7] frame selector not visible in 15s; continuing with page dump')
  }
  await sleep(4_000)
  console.log(`[DEBUG-c2f7] url=${page.url()} title=${await page.title()}`)

  const bannerCount = await page.locator('text=Failed to load plugins').count()
  const bodyText = await page.evaluate(() => document.body.innerText)
  const bannerContext = bannerCount > 0
    ? bodyText.slice(Math.max(0, bodyText.indexOf('Failed to load plugins') - 200),
        bodyText.indexOf('Failed to load plugins') + 600)
    : '(no banner)'

  const bootInfo = await page.evaluate(() => {
    const b = window.__DSH_BOOT__
    if (b === undefined) return { present: false }
    const out = { present: true, keys: Object.keys(b) }
    if (Array.isArray(b.entries)) {
      out.entries = b.entries.map(e => ({ id: e.id, name: e.name, inject: e.inject }))
    }
    for (const key of ['modules', 'moduleTable', 'plugins']) {
      if (b[key] !== undefined) out[key] = b[key]
    }
    return JSON.parse(JSON.stringify(out))
  })

  console.log('=== BANNER ===')
  console.log(bannerContext)
  console.log('=== __DSH_BOOT__ ===')
  console.log(JSON.stringify(bootInfo, null, 2).slice(0, 4000))
  console.log('=== CONSOLE (err/warn) ===')
  console.log(consoleLines.slice(0, 20).join('\n') || '(none)')

  const red = bannerCount > 0
  console.log(red ? `\nVERDICT: RED (banner present, count=${String(bannerCount)})` : '\nVERDICT: GREEN (no plugin-failure banner)')
  process.exitCode = red ? 1 : 0
} finally {
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

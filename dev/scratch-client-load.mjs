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
      out.entries = b.entries.map(e => ({ id: e.id, inject: (e.inject ?? []).join(',') }))
    }
    for (const key of ['modules', 'moduleTable']) {
      if (b[key] !== undefined) out[key] = b[key]
    }
    return JSON.parse(JSON.stringify(out))
  })
  const flagged = (bootInfo.entries ?? []).filter(e => /agent-team|company|primitives/i.test(`${e.id} ${e.inject}`))
  console.log('=== ENTRIES (all, compact) ===')
  for (const e of bootInfo.entries ?? []) console.log(`${e.id} <- [${e.inject}]`)
  console.log('=== FLAGGED (agent-team/company/primitives) ===')
  console.log(JSON.stringify(flagged, null, 2))
  console.log('=== MODULE TABLE ===')
  console.log(JSON.stringify(bootInfo.moduleTable ?? bootInfo.modules ?? '(absent)').slice(0, 3000))

  console.log('=== BANNER ===')
  console.log(bannerContext)
  console.log('=== CONSOLE (err/warn) ===')
  console.log(consoleLines.slice(0, 20).join('\n') || '(none)')

  // ── probe：连 workspace（或用自动恢复的），打开已有会话，数头部两个 Team 按钮 ──
  try {
    await sleep(2_000)
    console.log('=== PAGE STATE (first 500 chars) ===')
    console.log((await page.evaluate(() => document.body.innerText)).slice(0, 500))
    try {
      await page.getByRole('textbox', { name: 'Choose workspace' }).click({ timeout: 5_000 })
      const dialog = page.getByRole('dialog', { name: 'Select Workspace Directory' })
      await dialog.waitFor({ timeout: 10_000 })
      await dialog.getByRole('button', { name: 'Edit path' }).click()
      const pathInput = dialog.getByRole('textbox', { name: 'Edit path' })
      await pathInput.fill('/Users/bowhead/ai_dsh_company/company-workspace')
      await pathInput.press('Enter')
      await dialog.getByRole('button', { name: 'Open', exact: true }).click()
      await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 15_000 })
      await sleep(3_000)
      console.log('[DEBUG-c2f7] connected workspace via picker')
    } catch {
      console.log('[DEBUG-c2f7] no hero picker — workspace auto-selected')
    }
    // 打开一个已有会话，让 conversation header 渲染
    let sessionTitle
    for (const t of ['在 CEO 会话询问任务板状态', 'Agent workflow 智力体方案', '公司知识库自建技术评估']) {
      if (await page.getByText(t, { exact: false }).count() > 0) { sessionTitle = t; break }
    }
    if (sessionTitle !== undefined) {
      await page.getByText(sessionTitle, { exact: false }).first().click()
      await sleep(3_000)
      console.log(`[DEBUG-c2f7] opened session: ${sessionTitle}`)
    } else {
      console.log('[DEBUG-c2f7] no known session title found to open')
    }
    const official = await page.getByRole('button', { name: /Agent Team/i }).count()
    const own = await page.getByTitle('团队任务板').count()
    const brand = await page.locator('text=DSH Wochen Team').count()
    console.log('=== PROBE (conversation header occupants) ===')
    console.log(`official Agent Team button: ${String(official)}`)
    console.log(`own 任务板 button:           ${String(own)}`)
    console.log(`brand slot (DSH Wochen Team): ${String(brand)}`)
    if (official > 0) {
      await page.getByRole('button', { name: /Agent Team/i }).first().click()
      await sleep(1_500)
      console.log('=== official panel body (first 500 chars) ===')
      console.log((await page.evaluate(() => document.body.innerText)).slice(0, 500))
    }
  } catch (error) {
    console.log(`[DEBUG-c2f7] workspace probe failed: ${String(error).slice(0, 300)}`)
  }

  const red = bannerCount > 0
  console.log(red ? `\nVERDICT: RED (banner present, count=${String(bannerCount)})` : '\nVERDICT: GREEN (no plugin-failure banner)')
  process.exitCode = red ? 1 : 0
} finally {
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

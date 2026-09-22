#!/usr/bin/env node
// client-load 冒烟（client 面完成定义）：headless 浏览器加载真 web 页面，断言零插件挂载失败。
//
// 为什么必须有它（postmortem 0003）：preset-smoke 只打 RPC 面（roster / session/create），
// **client 入口的 apply 抛错**（如重复 `$mount`）只有浏览器能抓——这类失败不静默，会把整个
// Web UI 砖在 BootPage 错误屏。本检查对该事故类修前 RED、修后 GREEN 均已实证（0003）。
//
// 断言三件事：① 无 "Failed to load plugins" banner；② console 无 `failed to apply loader
// entry`；③ 品牌槽在场（`DSH_CLIENT_TITLE`，guides/60 §7 的构建期品牌 = 本仓固定值）——
// 它证明 app 渲染完成且本包 client 入口成功 apply。
//
// 前置：与 preset-smoke 相同（DSH_HOME + 已装 pack + 前端与 client 面已构建）；另需
//       playwright（vendor 全树 `pnpm install` 后在 .pnpm store，本脚本自动定位）与一份
//       chromium（缺 playwright 期望的版本时自动回退缓存里最新一份）。
// 用法：source dev/env.sh && node scripts/client-load-smoke.mjs [--port 3092]
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3092'))
const BRAND = 'DSH Wochen Team'
const BOOT_TIMEOUT_MS = 120_000

const home = process.env.DSH_HOME
if (home === undefined || home === '') {
  console.error('client-load-smoke: 需要 DSH_HOME（先 `source dev/env.sh`；双 home 纪律：别碰日用 ~/.dsh）')
  process.exit(2)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** 递归找 chromium 可执行文件（headless shell / macOS app bundle / chrome）。 */
function findExecutable(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const hit = findExecutable(path)
      if (hit !== undefined) return hit
    } else if (entry.name === 'chrome-headless-shell' || entry.name === 'Chromium' || entry.name === 'chrome') {
      return path
    }
  }
  return undefined
}

/** 定位 playwright：根 node_modules → .pnpm store（vendor 全树安装后存在）。 */
async function loadChromium() {
  const candidates = [join(ROOT, 'node_modules/playwright/index.mjs')]
  const pnpmDir = join(ROOT, 'node_modules/.pnpm')
  if (existsSync(pnpmDir)) {
    for (const name of readdirSync(pnpmDir).sort().reverse()) {
      if (name.startsWith('playwright@')) candidates.push(join(pnpmDir, name, 'node_modules/playwright/index.mjs'))
    }
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const mod = await import(pathToFileURL(candidate).href)
    if (mod.chromium !== undefined) return mod.chromium
  }
  throw new Error('client-load-smoke: 找不到 playwright（先 `pnpm install`，guides/60 §7）')
}

/** 启动 chromium：默认解析失败（缓存里没有期望版本）时，回退缓存里最新一份可执行文件。 */
async function launch(chromiumApi) {
  try {
    return await chromiumApi.launch()
  } catch (error) {
    if (!String(error).includes("Executable doesn't exist")) throw error
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), 'Library/Caches/ms-playwright')
    if (!existsSync(cache)) throw error
    const roots = readdirSync(cache)
      .filter(name => name.startsWith('chromium_headless_shell-') || name.startsWith('chromium-'))
      .sort().reverse()
    for (const root of roots) {
      const executable = findExecutable(join(cache, root))
      if (executable !== undefined) return await chromiumApi.launch({ executablePath: executable })
    }
    throw error
  }
}

/** boot web profile，等到启动横幅打印带 token 的 URL（与 preset-smoke 同一入口）。 */
async function boot() {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', String(PORT), '--no-open'],
    { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] },
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
    child.on('exit', (code) => rejectBanner(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-800)}`)))
    setTimeout(() => rejectBanner(new Error(`等待启动横幅超时\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS)
  })
  return { child, ...(await banner) }
}

const chromiumApi = await loadChromium()
const { child, port, token } = await boot()
let failures = 0
const fail = (label, detail) => { failures++; console.log(`  FAIL ${label}: ${detail}`) }
try {
  const browser = await launch(chromiumApi)
  try {
    const page = await browser.newPage()
    const loaderErrors = []
    page.on('console', (m) => { if (m.type() === 'error' && m.text().includes('failed to apply loader entry')) loaderErrors.push(m.text()) })
    page.on('pageerror', (e) => { if (String(e).includes('failed to apply loader entry')) loaderErrors.push(String(e)) })

    await page.goto(`http://127.0.0.1:${String(port)}/?token=${token}`, { waitUntil: 'load', timeout: 60_000 })
    await sleep(4_000)

    const bannerCount = await page.locator('text=Failed to load plugins').count()
    if (bannerCount > 0) fail('插件挂载零失败', `页面出现 Failed to load plugins banner（${String(bannerCount)} 处）`)
    else console.log('  PASS 插件挂载零失败（无 banner）')

    if (loaderErrors.length > 0) fail('console 零 loader 错误', loaderErrors.slice(0, 3).join(' | '))
    else console.log('  PASS console 零 loader 错误')

    try {
      await page.locator(`text=${BRAND}`).first().waitFor({ timeout: 30_000 })
      console.log(`  PASS 品牌槽在场（${BRAND}）`)
    } catch {
      fail('品牌槽在场', `${BRAND} 未渲染——app 未完成渲染，或本包 client 入口未成功 apply（fiber PENDING？）`)
    }
  } finally {
    await browser.close().catch(() => {})
  }
} catch (error) {
  fail('浏览器执行', String(error).slice(0, 300))
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures === 0
  ? '\nclient-load-smoke: ALL PASS（真浏览器加载，client 面健康）'
  : `\nclient-load-smoke: ${String(failures)} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

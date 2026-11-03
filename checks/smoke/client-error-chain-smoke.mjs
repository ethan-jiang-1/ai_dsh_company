#!/usr/bin/env node
// 状态：常驻
// 何时跑：改客户端错误环 / `/company-diagnostics` / host 日志落点时；或用户报「页面报错了但日志里没有」要复现时。
//   成本 keyless ~40s（起隔离 web + 真 Chromium + 一次 console.error）；前置 = vendor/pack 已构建、playwright 缓存可用。
//
// 断言**整条链**：真页面错误 → `window.__DSH_COMPANY_ERRORS__` → client reporter →
// `/company-diagnostics client-error` → `$DSH_HOME/logs/company-client-errors.log`。
// 2026-11-03 第六轮起跑**两段**：① 页面一加载就报错（早于用户发第一条消息）→ 环捕获 → 落盘；
// ② 会话内报错 → 立即落盘。两段各自有 marker，互不借用。
// ⚠ 观察边界：DSH Web 加载时会保留一个草稿会话，页面里拿不到「retainedBy.mainView = 0」的窗口，
//   所以「无会话先排队」的语义由 `tests/client/wiring/error-relay.spec.ts` 的注入时钟判据证明，
//   本档只证真页面两段都能到盘。
// 为什么必须隔离：dev home 的会话可能被另一个 writer 持有（`session/writer-held`），
//   页面 reporter 会发命令但被拒；隔离 home + 自己创建的会话才能证明单 writer 下的真实链路。
// 退出码：0 = 全链 PASS；1 = 断言失败；2 = 环境未就绪（构建/隔离 profile 初始化失败）。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'
import { diagnosisDir } from '../../tools/lib/diagnosis.mjs'

const cli = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK = join(ROOT, 'packages/company-pack')
if (!existsSync(cli)) {
  console.error(`client-error-chain-smoke: vendor CLI 未构建：${cli}（先按 docs/guides/bootstrap.md 构建）`)
  process.exit(2)
}
if (!existsSync(join(PACK, 'lib/client.js'))) {
  console.error('client-error-chain-smoke: pack client 未构建（先跑 tsc -b + tsdown）')
  process.exit(2)
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
mkdirSync(join(ROOT, 'runtime/tmp'), { recursive: true })
const root = mkdtempSync(join(ROOT, 'runtime/tmp/client-error-chain-'))
const home = join(root, 'home')
const userHome = join(root, 'user')
const workspace = join(root, 'workspace')
mkdirSync(userHome, { recursive: true })
mkdirSync(workspace, { recursive: true })
const provisionEnv = { ...process.env, HOME: userHome, DSH_HOME: home }
const runSetup = (label, argv) => {
  const result = spawnSync(process.execPath, argv, { cwd: ROOT, env: provisionEnv, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(`client-error-chain-smoke: ${label} 失败（exit ${String(result.status)}）：${(result.stderr || result.stdout || '').slice(-600)}`)
    rmSync(root, { recursive: true, force: true })
    process.exit(2)
  }
}
runSetup('隔离 profile 初始化', [cli, '--profile', 'company', '--from-default-profile', 'web', '--dump-default-config'])
runSetup('隔离 profile 安装 pack', [cli, 'plugin', '--profile', 'company', 'add', PACK])

const env = {
  ...process.env,
  HOME: userHome,
  DSH_HOME: home,
  DSH_COMPANY_HOME: workspace,
  DSH_COMPANY_BOOTSTRAP: 'if-missing',
  DSH_COMPANY_BROWSER: 'off',
}
const { child, port, token } = await startWeb({ spawn, root: ROOT, home, env, profile: 'company' })
const browser = await launchChromium(await loadChromium(ROOT))
let failures = 0
const fail = (label, detail) => { failures++; console.log(`  FAIL ${label}: ${detail}`) }
const pass = label => console.log(`  PASS ${label}`)
let page
try {
  page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${String(port)}/?token=${token}`, { waitUntil: 'load', timeout: 60_000 })
  await sleep(3_000)
  // 首启的说明页/预览提示：逐个 Continue 关掉（与 cdp-probe 的同一个坑）。
  for (let i = 0; i < 4; i++) {
    const button = page.getByRole('button', { name: 'Continue' }).first()
    if (await button.count() === 0) break
    await button.click({ timeout: 2_000 }).catch(() => {})
    await sleep(300)
  }
  const composer = page.locator('[data-composer-input][contenteditable="true"]').first()
  if (await composer.count() === 0) {
    fail('composer 在场', '隔离页面没有 composer（未完成 onboarding 或 client 未 apply）')
    throw new Error('composer missing')
  }

  // ① 页面一加载就报错（早于用户发第一条消息）：环里有、最终也能落盘（队列化后不再丢）。
  const logPath = join(home, 'logs/company-client-errors.log')
  const earlyMarker = `client-error-early-${String(Date.now())}`
  await page.evaluate(m => console.error(m), earlyMarker)
  await sleep(1_500)
  const earlyRing = await page.evaluate(() => globalThis.__DSH_COMPANY_ERRORS__?.list?.() ?? [])
  if (earlyRing.some(entry => String(entry.message).includes(earlyMarker))) pass('加载即报错入环')
  else fail('加载即报错入环', `__DSH_COMPANY_ERRORS__ 未出现 ${earlyMarker}`)

  await composer.focus()
  await page.keyboard.type('hi', { delay: 10 })
  await page.keyboard.press('Enter')
  // 会话创建后 title 变 【preset】<workspace>；等它出现，避免在 hero 上注入。
  let ready = false
  for (let i = 0; i < 20; i++) {
    await sleep(500)
    if ((await page.title()).includes('】')) { ready = true; break }
  }
  if (!ready) fail('会话打开', `title 未出现角色前缀（当前 ${await page.title()}）`)
  else pass('会话打开（单 writer）')

  // ①b 会话就绪后：早于第一条消息的错误也应在盘上（队列 + subscribe 补送，或加载时已有会话）。
  let earlyLogged = false
  for (let i = 0; i < 20; i++) {
    await sleep(500)
    if (existsSync(logPath) && readFileSync(logPath, 'utf8').includes(earlyMarker)) { earlyLogged = true; break }
  }
  if (earlyLogged) pass('加载即报错最终落盘')
  else fail('加载即报错最终落盘', `未在 ${logPath} 找到 ${earlyMarker}`)

  const marker = `client-error-chain-${String(Date.now())}`
  await page.evaluate(m => console.error(m), marker)
  await sleep(1_500)
  const ring = await page.evaluate(() => globalThis.__DSH_COMPANY_ERRORS__?.list?.() ?? [])
  if (ring.some(entry => String(entry.message).includes(marker))) pass('错误环捕获')
  else fail('错误环捕获', `__DSH_COMPANY_ERRORS__ 未出现 marker（${JSON.stringify(ring).slice(0, 200)}）`)

  let logged = false
  for (let i = 0; i < 20; i++) {
    await sleep(500)
    if (existsSync(logPath) && readFileSync(logPath, 'utf8').includes(marker)) { logged = true; break }
  }
  if (logged) pass('host 日志落盘')
  else fail('host 日志落盘', `未在 ${logPath} 找到 ${marker}`)
} catch (error) {
  if (failures === 0) fail('执行', String(error).slice(0, 300))
} finally {
  if (failures > 0 && page !== undefined) {
    const dir = diagnosisDir(ROOT, 'client-error-chain-smoke')
    await page.screenshot({ path: join(dir, 'page.png'), fullPage: false }).catch(() => {})
    writeFileSync(join(dir, 'body.txt'), await page.locator('body').innerText().catch(() => ''), 'utf8')
    console.log(`  失败现场: ${dir}`)
  }
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
  rmSync(root, { recursive: true, force: true })
}

console.log(failures === 0
  ? '\nclient-error-chain-smoke: ALL PASS（真页面错误 → 错误环 → host 日志）'
  : `\nclient-error-chain-smoke: ${String(failures)} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

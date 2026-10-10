#!/usr/bin/env node
// 状态：常驻
// client-load 冒烟（client 面完成定义）：headless 浏览器加载真 web 页面，断言零插件挂载失败。
// 何时跑：客户端装配/入口改变、且接受条件涉及挂载时（真页面零挂载失败，keyless ~10s）
//
// 为什么必须有它（postmortem 0003）：preset-smoke 只打 RPC 面（roster / session/create），
// **client 入口的 apply 抛错**（如重复 `$mount`）只有浏览器能抓——这类失败不静默，会把整个
// Web UI 砖在 BootPage 错误屏。本检查对该事故类修前 RED、修后 GREEN 均已实证（0003）。
//
// 断言三件事：① 无 "Failed to load plugins" banner；② console 无 `failed to apply loader
// entry`；③ 品牌槽在场（`DSH_CLIENT_TITLE`，guides/bootstrap 的构建期品牌 = 本仓固定值）——
// 它证明 app 渲染完成且本包 client 入口成功 apply。
// R5b 起：驾驶舱页签（sidebarRightTabs 注册 + keyed 槽体）走同一条 apply 路径，注册抛错
// 会被 ①② 抓到；**页签在场 + 行可点**的功能断言在 `replay-smoke --ui --scenario r2-motion`
// （真会话真数据，见 org-presence-board 提案验收 2/5 的分工注）。
//
// 前置：与 preset-smoke 相同（DSH_HOME + 已装 pack + 前端与 client 面已构建）；另需
//       playwright（vendor 全树 `pnpm install` 后在 .pnpm store，本脚本自动定位）与一份
//       chromium（缺 playwright 期望的版本时自动回退缓存里最新一份）。
// 用法：source run/env.sh && node checks/smoke/client-load-smoke.mjs [--port 0]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '0'))
const BRAND = 'DSH 梦之队'

let home
try {
  home = requireDevHome('client-load-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const chromiumApi = await loadChromium(ROOT)
// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：本 smoke 只 boot——token 直接进浏览器 URL，
// 不取 cookie、不发 RPC ⇒ 只走 startWeb 这一层；spawn 注入（tools/lib 是 keyless 纯逻辑缝）。
const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: PORT })
let failures = 0
const fail = (label, detail) => { failures++; console.log(`  FAIL ${label}: ${detail}`) }
try {
  const browser = await launchChromium(chromiumApi)
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

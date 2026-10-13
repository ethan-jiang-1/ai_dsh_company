#!/usr/bin/env node
// 状态：常驻
// 侧栏角色标记的**座位几何认证档**（2026-10-13 立）：起真 web app，在真侧栏里量
// `.wk-role-badge` / 16px 座位 / 标题盒 / 计划任务时钟图标的**渲染盒**。
// 何时跑：动 `.wk-role-badge`（styles.ts）或 RoleBadge.tsx 时；vendor 升 pin 涉及 ui-workspace
// 行布局（座位宽度 / 标题间距 / list 座位共存）时。零模型成本，自带 chromium（~30–60s）。
//
// 为什么需要它：keyless 只能证明「CSS 文本写了 12px」（tests/client/client-css.spec.ts 的座位上限
// 守卫），证明不了真渲染盒落在哪儿。2026-10-13 的真实缺陷正是这样漏过去的——B 段首版用 3 字药丸
// （32.45px）住 16px 座位，座位 `justify-content:center` 且不裁剪 ⇒ 两侧各溢出一半：真 DOM 实测
// **左溢 8.22px**（标记被推出行框；在无侧栏内边距的窄窗布局里被容器边界切掉字母——用户截图现场）、
// **右溢 8.23px**（吃掉整条 4px 标题间隙、压到标题首字盒上）。本档就是那一笔的真几何判据。
//
// 判据（红即 exit 1；三腿 = 三种布局条件）：
//   G1 标记渲染宽 ≤ 16px（座位尺寸上限）
//   G2 标记不出行框（badge.left ≥ row.left）且不被容器裁（badge.left ≥ 0）
//   G3 标记不撞标题盒（badge.right ≤ title.left）
//   G4 同格时钟图标（12px 图元，在场时）不越标题盒（icon.right ≤ title.left + 0.5）
//   G5 零挂载失败（无 "Failed to load plugins" 错误屏）
//   G0 非空守卫：真侧栏里至少 1 个标记（零标记 = 判据空转，按红处理）
// 腿：① desktop 1280（侧栏随流）② narrow 356（点 "Open sidebar" 展开——用户截图那种窄窗）
//     ③ full-bleed（在 ① 上注入 `--dsh-sidebar-inline-padding:0px`，复现"无侧栏内边距"的布局条件）
// 图像判据（人/多模态看图）：出 snapshots/visual/sidebar-role-mark/{desktop,narrow,full-bleed}.png
//   + computed.json（逐行盒与判据结论）。
// 用法：source run/env.sh && node probes/browser-visual/sidebar-role-mark-probe.mjs
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SHOTS = join(ROOT, 'snapshots/visual/sidebar-role-mark')
const SEAT_CEILING = 16
mkdirSync(SHOTS, { recursive: true })

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('sidebar-role-mark-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const { child, port, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message)
  process.exit(2)
})

const { loadChromium, launchChromium } = await import('../../tools/drivers/playwright.mjs')

/** 读真侧栏里每个标记的盒（连同座位 / 行 / 标题 / 同格时钟图标）。 */
const READ_ROWS = `(() => {
  const r = (el) => { if (el == null) return null; const b = el.getBoundingClientRect(); return { l: +b.left.toFixed(2), r: +b.right.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) } }
  return [...document.querySelectorAll('.wk-role-badge')].map((badge) => {
    const slot = badge.closest('[data-slot="sidebar.session.row.leading"]') ?? badge.parentElement
    const seat = slot === null ? null : (slot.parentElement ?? slot)
    const row = badge.closest('[data-row-key]')
    const title = row === null ? null : row.querySelector('[class*="_title"]')
    const clock = row === null ? null : row.querySelector('[data-session-schedule-mark]')
    const clockIcon = clock === null ? null : clock.querySelector('svg')
    return {
      mark: badge.textContent, preset: badge.getAttribute('data-wk-role'), titleText: title === null ? null : title.textContent,
      sidebarInlinePadding: seat === null ? null : getComputedStyle(seat).getPropertyValue('--dsh-sidebar-inline-padding').trim(),
      badge: r(badge), seat: r(seat), row: r(row), title: r(title), clock: r(clock), clockIcon: r(clockIcon),
    }
  })
})()`

/** 判据：逐行核对，返回 { failures, rows }。腿名进 label 便于定位。 */
function judge(leg, rows, mountBroken) {
  const failures = []
  const check = (label, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
    if (!ok) failures.push(label)
  }
  if (mountBroken) check(`${leg} G5 零挂载失败`, false, '页面出现 "Failed to load plugins"')
  else check(`${leg} G5 零挂载失败`, true)
  check(`${leg} G0 非空守卫：真侧栏里有标记`, rows.length > 0, `标记数=${String(rows.length)}`)
  for (const [i, row] of rows.entries()) {
    const who = `行${String(i + 1)}(${row.preset ?? '?'}=${row.mark ?? '?'})`
    check(`${leg} ${who} G1 标记宽 ≤ ${String(SEAT_CEILING)}px`, row.badge.w <= SEAT_CEILING + 0.05, `badge.w=${String(row.badge.w)} seat.w=${String(row.seat?.w ?? null)}`)
    check(`${leg} ${who} G2 不出行框/不被裁`, row.badge.l >= row.row.l - 0.05 && row.badge.l >= 0, `badge.l=${String(row.badge.l)} row.l=${String(row.row.l)}`)
    check(`${leg} ${who} G3 不撞标题盒`, row.badge.r <= row.title.l + 0.05, `badge.r=${String(row.badge.r)} title.l=${String(row.title.l)}`)
    if (row.clockIcon !== null) {
      check(`${leg} ${who} G4 同格时钟图标不越标题盒`, row.clockIcon.r <= row.title.l + 0.5, `icon.r=${String(row.clockIcon.r)} title.l=${String(row.title.l)}`)
    }
  }
  return failures
}

const chromium = await loadChromium(ROOT)
const browser = await launchChromium(chromium)
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const failures = []
const legs = {}

/** 侧栏容器（截图范围）：有 aside 用 aside，否则用标记的最近定位祖先。 */
const sidebarBox = () => page.evaluate(() => {
  const badge = document.querySelector('.wk-role-badge')
  if (badge === null) return null
  const host = badge.closest('aside') ?? badge.closest('[class*="sidebar" i]') ?? badge.parentElement
  const b = host.getBoundingClientRect()
  return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.width, innerWidth), height: Math.min(b.height, innerHeight) }
})

const shoot = async name => {
  const clip = await sidebarBox()
  await page.screenshot({ path: join(SHOTS, `${name}.png`), ...(clip === null ? {} : { clip }) })
  console.log(`  出图 snapshots/visual/sidebar-role-mark/${name}.png`)
}

const readRows = () => page.evaluate(READ_ROWS)
const mountBroken = () => page.evaluate(() => /Failed to load plugins/.test(document.body.textContent ?? ''))

await page.goto(`http://127.0.0.1:${String(port)}/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.wk-role-badge', { timeout: 20000 }).catch(() => { /* 由 G0 报空转 */ })
await page.waitForTimeout(500)

// ── 腿① desktop（侧栏随流）──
console.log('── 腿① desktop 1280 ──')
let rows = await readRows()
legs.desktop = rows
failures.push(...judge('desktop', rows, await mountBroken()))
await shoot('desktop')

// ── 腿② narrow（356px：侧栏默认收起，点 Open sidebar 展开 = 用户截图那种窄窗）──
console.log('── 腿② narrow 356（展开侧栏）──')
await page.setViewportSize({ width: 356, height: 720 })
await page.waitForTimeout(600)
if ((await page.locator('.wk-role-badge').count()) === 0) {
  const opened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(el => /open sidebar/i.test(el.getAttribute('aria-label') ?? ''))
    if (button === undefined) return false
    button.click()
    return true
  })
  console.log(`  ${opened ? '点了 Open sidebar' : '没找到 Open sidebar 按钮'}`)
  await page.waitForSelector('.wk-role-badge', { timeout: 10000 }).catch(() => { /* 由 G0 报 */ })
}
await page.waitForTimeout(400)
rows = await readRows()
legs.narrow = rows
failures.push(...judge('narrow', rows, await mountBroken()))
await shoot('narrow')

// ── 腿③ full-bleed（注入 0 内边距：复现用户截图那种无侧栏内边距布局）──
console.log('── 腿③ full-bleed（--dsh-sidebar-inline-padding:0）──')
await page.setViewportSize({ width: 1280, height: 800 })
await page.waitForTimeout(600)
// ⚠ 令牌声明在侧栏根元素自己身上（vendor SidebarRoot 的 `.root`），`:root` 覆盖会被它盖掉 ⇒
// 必须沿着标记的祖先链逐层设内联值（最近声明胜出 = 0），否则这一腿只是换个名字复跑腿①。
const injected = await page.evaluate(() => {
  let el = document.querySelector('.wk-role-badge')
  if (el === null) return false
  while (el !== null) {
    el.style.setProperty('--dsh-sidebar-inline-padding', '0px')
    el = el.parentElement
  }
  return true
})
console.log(`  注入 ${injected ? '完成' : '失败（没有标记）'}`)
await page.waitForTimeout(400)
rows = await readRows()
console.log(`  实测行左缘 row.l=${rows[0]?.row.l ?? 'n/a'}（=0 才算真的复现了无内边距布局）`)
legs['full-bleed'] = rows
failures.push(...judge('full-bleed', rows, await mountBroken()))
await shoot('full-bleed')

writeFileSync(join(SHOTS, 'computed.json'), JSON.stringify({ seatCeiling: SEAT_CEILING, legs, failures }, null, 2), 'utf8')
console.log(`\nsidebar-role-mark-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
if (failures.length > 0) console.log(failures.map(f => `  × ${f}`).join('\n'))
await browser.close()
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(failures.length === 0 ? 0 : 1)

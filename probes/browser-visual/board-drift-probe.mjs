#!/usr/bin/env node
// 状态：常驻
// 看板"声明 vs 板面"分叉的**视觉认证档**（2026-10-13 立）：把真组件（BoardPanel）渲染出的
// 事故板面注入真 web app（借真主题令牌），量 tag 是否在场、文案是否点名缺哪条边，并出图。
// 何时跑：动 `company-panels.tsx` 的看板卡 / `lib/board.ts` 的分叉判据（dependencyDrift /
// driftLabel）/ `styles.ts` 的 `.wk-card*` 时。零模型成本，自带 chromium（~30–60s）。
//
// 为什么需要它：keyless 静态渲染只能证明"HTML 里出现了那句话"（tests/client/board-panel.spec.ts），
// 证明不了它在真令牌/真布局下**看得见、不挤爆卡脚**——2026-10-13 的事故正是"信号根本没出现"这类：
// 板面报"依赖已就绪"、任务文本写着"依赖 T1,T2"，中间没有任何可见提示（静默缺边）。
//
// 判据（红即 exit 1）：
//   D1 分叉 tag 在场且文案点名缺哪几条边（`声明依赖未落板：T1、T2`）
//   D2 有且只有一条（假阳性守卫：健康对照卡不许带）
//   D3 tag 落在卡脚内（不越出卡片盒）
// 图像判据：出 snapshots/visual/board-drift/board.png（人/多模态看图）。
// 用法：source run/env.sh && node probes/browser-visual/board-drift-probe.mjs
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SHOTS = join(ROOT, 'snapshots/visual/board-drift')
mkdirSync(SHOTS, { recursive: true })

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('board-drift-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

// ── 夹具：真组件 + 真 CSS，经 vitest 发射器现算（与 role-mark 夹具同款）──
const FIXTURE = join(tmpdir(), `board-drift-fixture-${String(process.pid)}.json`)
const emitted = spawnSync('npx', ['vitest', 'run', 'tests/client/board-drift-fixture.spec.ts'],
  { cwd: ROOT, env: { ...process.env, BOARD_DRIFT_EMIT: FIXTURE }, encoding: 'utf8' })
if (emitted.status !== 0) {
  console.error(emitted.stdout?.slice(-1500) ?? '')
  console.error(emitted.stderr?.slice(-1500) ?? '')
  console.error('夹具发射失败（tests/client/board-drift-fixture.spec.ts）')
  process.exit(2)
}
const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))

const { child, port, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message)
  process.exit(2)
})

const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

const { loadChromium, launchChromium } = await import('../../tools/drivers/playwright.mjs')
const browser = await launchChromium(await loadChromium(ROOT))
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } })
await page.goto(`http://127.0.0.1:${String(port)}/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
const mountBroken = await page.evaluate(() => /Failed to load plugins/.test(document.body.textContent ?? ''))
check('零挂载失败（无 "Failed to load plugins"）', !mountBroken)

const measured = await page.evaluate(({ css, html }) => {
  for (const id of ['board-drift-css', 'board-drift-fixture']) document.getElementById(id)?.remove()
  const style = document.createElement('style')
  style.id = 'board-drift-css'
  style.textContent = css
  document.head.append(style)
  const host = document.createElement('div')
  host.id = 'board-drift-fixture'
  host.setAttribute('style', 'position:fixed;inset:0;z-index:99999;overflow:auto;padding:16px;background:var(--dsw-alias-bg-base)')
  host.innerHTML = html
  document.body.append(host)
  const cards = [...host.querySelectorAll('.wk-card')]
  return cards.map(card => {
    const drift = [...card.querySelectorAll('*')].find(el => (el.textContent ?? '').startsWith('⚠ '))
    const cardBox = card.getBoundingClientRect()
    const tagBox = drift === undefined ? null : drift.getBoundingClientRect()
    return {
      id: card.querySelector('.wk-card-id')?.textContent ?? '?',
      driftText: drift?.textContent ?? null,
      insideCard: tagBox === null ? null : (tagBox.right <= cardBox.right + 0.5 && tagBox.left >= cardBox.left - 0.5),
      tagWidth: tagBox === null ? null : +tagBox.width.toFixed(1),
    }
  })
}, fixture)

const drifted = measured.filter(card => card.driftText !== null)
console.log(`  卡：${measured.map(card => `${card.id}${card.driftText === null ? '' : `[${card.driftText}]`}`).join(' / ')}`)
check('D1 分叉 tag 在场且点名缺哪条边',
  drifted.some(card => card.driftText === '⚠ 声明依赖未落板：T1、T2'),
  drifted.map(card => card.driftText ?? '').join('|') || '（没有分叉 tag）')
check('D2 假阳性守卫：有且只有一条', drifted.length === 1, `分叉卡数=${String(drifted.length)}`)
check('D2 空挂载守卫：看板卡在场', measured.length >= 4, `卡数=${String(measured.length)}`)
check('D3 tag 落在卡脚内（不越出卡片盒）', drifted.every(card => card.insideCard === true),
  drifted.map(card => `${card.id}:${String(card.insideCard)}(${String(card.tagWidth)}px)`).join(' '))

await page.locator('#board-drift-fixture').screenshot({ path: join(SHOTS, 'board.png') })
console.log('  出图 snapshots/visual/board-drift/board.png')

console.log(`\nboard-drift-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
if (failures.length > 0) console.log(failures.map(f => `  × ${f}`).join('\n'))
await browser.close()
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(failures.length === 0 ? 0 : 1)

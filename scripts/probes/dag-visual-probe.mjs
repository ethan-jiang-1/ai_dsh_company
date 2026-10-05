#!/usr/bin/env node
// 状态：常驻
// DAG 面板**视觉夹具认证档**（2026-09-26 立）：把真组件 + 真 CSS 注入真 web app（借真主题令牌），
// 何时跑：依赖图视觉（三处只能看不能 keyless 断言的事实）改动时；零模型成本，自带 12 条机器判据
// 用合成任务数据造出"完成 / 进行中 / 等待（含悬空 blocker）"三态同屏，浅深两主题各截一张。
//
// 为什么需要它：三处视觉缺陷（完成态降透明被动画吃掉 / 箭头 context-stroke 跨浏览器 / 徽章文案）
//   **keyless 测试只能证明规则写对了，证明不了渲染出来是什么样**；而跑真动议（$3–6）来验 CSS
//   是杀鸡用牛刀。夹具 = 零模型成本、确定、可复跑。
// 判据两层：
//   ① **机器判据**（本脚本 assert，红即 exit 1）：完成态子元素 opacity=0.55 而节点自身=1（证明
//      "降透明落在不被动画的子元素上"）、动画确实在跑（animationName=wk-node-in，否则这个坑不成立）、
//      两态边色不同、两态箭头 fill 不同且非黑（证明双 marker 生效）、徽章四态文案齐；
//   ② **图像判据**（人/多模态看图）：出 `snapshots/visual/dag-visual/{light,dark}.png`，逐张判"看起来对不对"。
// 用法：source dev/env.sh && node scripts/probes/dag-visual-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SHOTS = join(ROOT, 'snapshots/visual/dag-visual')
mkdirSync(SHOTS, { recursive: true })

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('dag-visual-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

// ── 夹具：由 vitest 发射器现算（组件 import vendor *.module.css，只有本仓转换链能解）──
const FIXTURE = join(tmpdir(), `dag-visual-fixture-${String(process.pid)}.json`)
const emitted = spawnSync('npx', ['vitest', 'run', 'tests/client/dag-visual-fixture.spec.ts'],
  { cwd: ROOT, env: { ...process.env, DAG_VISUAL_EMIT: FIXTURE }, encoding: 'utf8' })
if (emitted.status !== 0) {
  console.error(emitted.stdout?.slice(-2000) ?? '')
  console.error(emitted.stderr?.slice(-2000) ?? '')
  console.error('夹具发射失败（tests/client/dag-visual-fixture.spec.ts）')
  process.exit(2)
}
const { svg, css } = JSON.parse(readFileSync(FIXTURE, 'utf8'))

// ── 起真 web（真主题令牌的来源）──
const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = chunk => {
    output += String(chunk)
    const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
    if (match) res({ port: Number(match[1]), token: match[2] })
  }
  child.stdout.on('data', on)
  child.stderr.on('data', on)
  child.on('exit', code => rej(new Error(`web 提前退出 ${String(code)}`)))
  setTimeout(() => rej(new Error('boot 超时')), 120_000)
}).catch(error => {
  console.error(error.message)
  process.exit(2)
})

const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

const { loadChromium, launchChromium } = await import('../drivers/playwright.mjs')
const chromium = await loadChromium(ROOT)
const browser = await launchChromium(chromium)
const page = await browser.newPage({ viewport: { width: 1100, height: 560 } })
await page.goto(`http://127.0.0.1:${String(banner.port)}/?token=${banner.token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const injected = await page.evaluate(({ svg, css }) => {
  const style = document.createElement('style')
  style.id = 'dag-fixture-css'
  style.textContent = css
  document.head.append(style)
  const box = document.createElement('div')
  box.id = 'dag-fixture'
  box.setAttribute('style', 'position:fixed;inset:0;z-index:99999;overflow:auto;padding:16px;background:var(--dsw-alias-bg-base)')
  box.innerHTML = svg
  document.body.append(box)
  return { nodes: box.querySelectorAll('.wk-node').length, edges: box.querySelectorAll('.wk-edge').length }
}, { svg, css })
check('夹具注入（7 节点 / 6 边）', injected.nodes === 7 && injected.edges === 6, JSON.stringify(injected))

// 等入场动画落定再读样式：动画从 opacity 0 起，抢读会把"动画在跑"误判成"状态没生效"。
const settle = async () => {
  await page.waitForFunction(() => {
    const done = document.querySelector('.wk-node[data-status="completed"]')
    return done !== null && getComputedStyle(done).opacity === '1'
  }, { timeout: 5000 }).catch(() => { /* 超时按原样读，由断言报出来 */ })
  await page.waitForTimeout(150)
}

const readStyles = () => page.evaluate(() => {
  const style = (sel, prop) => {
    const el = document.querySelector(sel)
    return el === null ? null : getComputedStyle(el)[prop]
  }
  const done = document.querySelector('.wk-node[data-status="completed"]')
  const running = document.querySelector('.wk-node[data-status="in_progress"]')
  return {
    节点自身opacity: done === null ? null : getComputedStyle(done).opacity,
    完成卡片opacity: done === null ? null : getComputedStyle(done.querySelector('.wk-dag-card')).opacity,
    完成内容opacity: done === null ? null : getComputedStyle(done.querySelector('.wk-dag-node')).opacity,
    进行中描边: running === null ? null : getComputedStyle(running.querySelector('.wk-dag-card')).stroke,
    等待边: style('.wk-edge[data-done="false"]', 'stroke'),
    已通边: style('.wk-edge[data-done="true"]', 'stroke'),
    等待箭头: style('.wk-arrow-tip-wait', 'fill'),
    已通箭头: style('.wk-arrow-tip-done', 'fill'),
    动画名: style('.wk-node', 'animationName'),
    徽章: [...document.querySelectorAll('#dag-fixture .wk-dag-meta .wk-dag-status')].map(el => el.textContent),
  }
})

const shoot = async name => {
  // svg 自适应缩放（2026-09-28）后 DagPanel 根是量宽 wrapper（div>div>svg）；按 aria-label
  // 定位——容器里 StateDot 的 spinner 也是小 svg，不能裸用标签选择器。
  await page.locator('#dag-fixture svg[aria-label="任务依赖图"]').screenshot({ path: join(SHOTS, `${name}.png`) })
  console.log(`  出图 snapshots/visual/dag-visual/${name}.png`)
}

await settle()
const light = await readStyles()
await shoot('light')
await page.evaluate(() => { document.body.toggleAttribute('data-ds-dark-theme', true) })
await page.waitForTimeout(600)
await settle()
const dark = await readStyles()
await shoot('dark')

for (const [theme, values] of [['浅色', light], ['深色', dark]]) {
  console.log(`── ${theme}主题 ──`)
  // ① 降透明落在子元素上（节点自身被动画钉在 1）——这正是 2026-09-26 修的坑
  check(`${theme} 完成态：子元素 0.55 而节点自身 1（动画没吃掉状态）`,
    values.完成卡片opacity === '0.55' && values.完成内容opacity === '0.55' && values.节点自身opacity === '1',
    `节点=${values.节点自身opacity} 卡片=${values.完成卡片opacity} 内容=${values.完成内容opacity}`)
  // ② 动画确实在跑（否则 ① 是"因为没动画"而假绿）
  check(`${theme} 入场动画在场（animationName=wk-node-in）`, values.动画名 === 'wk-node-in', String(values.动画名))
  // ③ 两态边色不同 + 箭头两态不同且非黑（双 marker 生效；context-stroke 不支持时会退成黑）
  check(`${theme} 边两态可辨`, values.等待边 !== values.已通边, `${String(values.等待边)} vs ${String(values.已通边)}`)
  const notBlack = value => value !== null && !/^rgb\(0, 0, 0\)$/.test(value) && value !== 'context-stroke'
  check(`${theme} 箭头两态随色且非黑`, notBlack(values.等待箭头) && notBlack(values.已通箭头) && values.等待箭头 !== values.已通箭头,
    `${String(values.等待箭头)} vs ${String(values.已通箭头)}`)
  // ④ 进行中描边 = 主色（非 none）
  check(`${theme} 进行中节点有主色描边`, values.进行中描边 !== null && values.进行中描边 !== 'none', String(values.进行中描边))
  // ⑤ 四态文案齐（含悬空 blocker 计入"等 N 项"）
  const badges = values.徽章
  check(`${theme} 徽章四态文案齐`, ['已完成', '进行中', '可开工', '等 1 项', '等 2 项'].every(text => badges.includes(text)), badges.join(' / '))
}

writeFileSync(join(SHOTS, 'computed.json'), JSON.stringify({ light, dark }, null, 2), 'utf8')
console.log(`\ndag-visual-probe: ${failures.length === 0 ? 'ALL PASS' : `FAIL ${String(failures.length)} 项`}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
await browser.close()
process.exit(failures.length === 0 ? 0 : 1)

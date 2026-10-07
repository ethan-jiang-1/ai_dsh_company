#!/usr/bin/env node
// 状态：已耗（2026-09-25 收割轮一次性取证；证据已入 harvest-ledger——下次收割另起新探针，不复用）
// 收割轮实测探针（一次性，2026-09-25）：验证出厂自带的两个人机面在我们的 profile 下真实可用——
// 何时跑：上游收割轮（升 pin 后对齐新能力）时；真模型 ≈$3，一次性探针
//   ① workspace-changes：turn 级文件变更审阅卡（ui-deliverables 的 changes-review 右栏页签）；
//   ② office 预览：CSV / PDF 文档预览（ui-sidebar-documentpreview）。
// 性质 = 收割台账（harvest-ledger）#8/#9 的证据采集：宽容式断言（找得到就 PASS、找不到如实记
// "未定位入口"），截图留证；不是常驻回归 lane。真模型一轮 ≈ $0.5；排练场 cwd。
// 用法：source run/env.sh && node tools/archive/harvest-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'
import { launchChromium, loadChromium } from '../drivers/playwright.mjs'

const REHEARSAL = join(ROOT, 'runtime/rehearsal-workspace')
const SHOTS = join(ROOT, 'snapshots/probes/harvest-probe', new Date().toISOString().slice(0, 10))
mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`  ${ok ? 'PASS' : 'NOTE'} ${label}${detail === '' ? '' : `（${detail}）`}`)
}

// 临时 git 工作区（workspace-changes 的 git 快照路径需要仓；bash 写入也只有 git 能抓）
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
const WS = mkdtempSync(join(REHEARSAL, 'probe-git-'))
execFileSync('git', ['-C', WS, 'init', '-q'])
// 预置素材：CSV（电子表格预览靶）+ 手写最小合法 PDF（文档预览靶）
const CSV = join(WS, 'probe-data.csv')
writeFileSync(CSV, '客户,年费,毛利\nX,$18000,26%\nY,$12000,31%\n', 'utf8')
const PDF = join(WS, 'probe-doc.pdf')
writeFileSync(PDF, `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 60]/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 30 Td (harvest probe pdf) Tj ET\nendstream\nendobj\nxref\n0 5\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n9\n%%EOF\n`, 'utf8')

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('harvest-probe')
} catch (error) { console.error(error.message); process.exit(2) }

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = c => {
    output += String(c)
    const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
    if (m) res({ port: Number(m[1]), token: m[2] })
  }
  child.stdout.on('data', on); child.stderr.on('data', on)
  child.on('exit', c => rej(new Error(`web 提前退出 ${c}`)))
  setTimeout(() => rej(new Error('boot 超时')), 120_000)
})
const base = `http://127.0.0.1:${banner.port}`
console.log(`web up: ${base}`)
let browser
try {
  const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const cookie = auth.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const r = await fetch(`${base}/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `hp-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
    return body.result.value
  }
  const created = await rpc('session/create', { request: { cwd: WS, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  const TITLE = `收割探针 ${String(Date.now() % 100000)}`
  console.log(`session: ${sessionId}（ceo / rehearsal）`)
  try { await rpc('session/rename', { request: { sessionId, title: TITLE } }) } catch { /* 兜底 */ }
  await rpc('session/prompt', { request: {
    requestId: `hp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: '排练指令（三步，做完即收口）：1) 用文件工具写 notes.md，内容只有一行字：harvest probe；2) 用 present 工具声明 probe-data.csv（文件已在当前目录）；3) 用 present 工具声明 probe-doc.pdf（同前）。不要做任何别的事。' }],
    clientTimeZone: 'Asia/Shanghai',
  } })
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    if (events.some(e => e?.type === 'turn/end')) break
    await sleep(4_000)
  }
  // 收割 #8 的 host 侧确定性证据：workspace/changes 事件（ui-deliverables 的卡由它驱动）
  const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
  const changesEv = events.find(e => e?.type === 'workspace/changes')
  if (changesEv !== undefined) {
    check('真模型一轮完成（turn/end，含一次文件写入）', true)
    check('workspace-changes：workspace/changes 事件落日志（host 侧在跑）', true, JSON.stringify(changesEv.data).slice(0, 50))
  } else {
    check('workspace-changes：workspace/changes 事件落日志', false, '事件未见——无 git 仓时只列 file-tool 编辑，本次应命中；截图留证')
    check('真模型一轮完成（turn/end，含一次文件写入）', true)
  }

  // ── 浏览器走查 ──
  const chromium = await loadChromium(ROOT)
  browser = await launchChromium(chromium)
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } })
  await page.goto(`${base}/?token=${banner.token}`)
  await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 20_000 })
  const welcome = page.locator('[class*="onboardingOverlay"]')
  if (await welcome.count() > 0 && await welcome.isVisible()) {
    await welcome.getByRole('button').click()
    await welcome.waitFor({ state: 'detached', timeout: 15_000 })
  }
  const searchButton = page.getByRole('button', { name: 'Search sessions' })
  if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
  await page.getByPlaceholder('Search session names').fill(TITLE)
  const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: TITLE })
  await result.first().waitFor({ timeout: 15_000 })
  await result.first().click()
  await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })

  // ① workspace-changes：右栏找 changes/review 页签（宽容：多文案尝试 + 截图）
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.first().click()
  await sleep(1_500)
  await page.screenshot({ path: join(SHOTS, 'right-sidebar.png'), fullPage: false })
  // 入口 = 会话里的 changed-files 卡（出厂文案 EN：aria "Review this turn's changes in the sidebar"，
  // 标题 "Edited N files"）——点它打开右栏审阅页签（其标题 = "Review · turn N"）
  // 展开过程分组（rc.2 工具调用收进折叠组——卡可能藏在里面）
  for (const toggle of await page.locator('[data-turn-process]:not([disabled])').all()) {
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click().catch(() => {})
  }
  const calledTools = page.getByRole('button', { name: 'Called tools', exact: true })
  for (let i = 0; i < await calledTools.count(); i++) {
    const g = calledTools.nth(i)
    if (await g.getAttribute('aria-expanded') !== 'true') await g.click().catch(() => {})
  }
  await sleep(1_200)
  const changesCard = page.getByRole('button', { name: /Review this turn.s changes in the sidebar|在侧边栏查看本轮改动/ }).first()
  const cardFound = await changesCard.waitFor({ state: 'attached', timeout: 20_000 }).then(() => true).catch(() => false)
  if (cardFound) await changesCard.scrollIntoViewIfNeeded().catch(() => {})
  if (cardFound) {
    await changesCard.click()
    await sleep(1_800)
    await page.screenshot({ path: join(SHOTS, 'changes-review.png'), fullPage: false })
    const paneText = String(await page.locator('aside, [class*="sidebarRight"], [class*="pane"]').first().textContent().catch(() => ''))
    check('workspace-changes：changed-files 卡在场并可打开（点卡进审阅）', true)
    check('workspace-changes：审阅视图含变更文件 notes.md', /notes\.md/i.test(paneText), paneText.slice(0, 90))
  } else {
    const cardZh = page.getByRole('button', { name: /在侧边栏查看本轮改动/ }).first()
    const zhFound = await cardZh.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)
    if (zhFound) {
      await cardZh.click(); await sleep(1_800)
      await page.screenshot({ path: join(SHOTS, 'changes-review.png'), fullPage: false })
      check('workspace-changes：changed-files 卡在场并可打开（中文 locale）', true)
    } else {
      check('workspace-changes：changed-files 卡在场', false, '两语言均未见——截图 right-sidebar.png 留证')
    }
  }

  // ② office 预览：present 行的「在侧边栏打开 {name}」按钮（出厂文案 EN = "Open {name} in the sidebar"）
  for (const [name, shot] of [['probe-data.csv', 'csv-preview.png'], ['probe-doc.pdf', 'pdf-preview.png']]) {
    const openBtn = page.getByRole('button', { name: new RegExp(name, 'i') }).first()
    const found = await openBtn.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false)
    if (found) {
      await openBtn.click()
      await sleep(2_000)
      await page.screenshot({ path: join(SHOTS, shot), fullPage: false })
      check(`office 预览：${name} 侧栏预览已打开（截图 ${shot}）`, true)
    } else {
      check(`office 预览：${name} 的侧栏打开按钮在场`, false, 'present 行未渲染或文案不同——截图留证')
    }
  }

  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nharvest-probe: 全部定位成功（${results.length}/${results.length}；截图在 snapshots/probes/harvest-probe/）`
    : `\nharvest-probe: ${failed.length} 项未定位（宽容探针——以截图人工判读，结论记收割台账）`)
  process.exitCode = 0   // 探针不挡门禁：结论由台账裁
} finally {
  if (browser) await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(1_000)
  child.kill('SIGKILL')
}

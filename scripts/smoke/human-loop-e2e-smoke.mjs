#!/usr/bin/env node
// 状态：常驻
// 人机合一 B2 认证档 e2e（2026-09-25 立法）：三类人机接口各一条真证据——
// 何时跑：人机接口三载体（补料落盘／建议非阻塞落稿／规矩缺口回流）改动时；真模型+真浏览器 ~$1–2
//   ① 补料：人写文件进共享盘（退化形状）→ agent 读到并用其内容回答；
//   ② 建议：人的建议 = 输入而非授权——两轮往返、零审批/问询闸门事件、草稿照常落；
//   ③ 规矩缺口：agent 按手册路径 ask_user_question 问人 → 人点选项裁决 → 回流 journal 留痕 → 收口。
//
// 为什么存在（RFC B2 验收）：三类接口的"退化形状可行"只有真模型 + 真浏览器能验——
// 文件读取、无闸门继续、问询应答 waterfall 与回流落盘，环环都在运行时。
//
// 实证内化（继承 attention-e2e 教训）：app 自动连 rehearsal 工作区；右栏/问询卡是会话作用域；
// headless 默认英文 locale（官方 UI），自研内容恒中文；选项 radio 按 Enter 即提交（无需提交按钮名）。
//
// 分层（guides/dev-loop §9.1）：认证档——真模型 + 真浏览器 + 起进程，不进 `pnpm test`。
// 预算：CEO 三轮 + 一次问询应答 ≈ $1–2 / 3–6 分钟。排练场 cwd，真盘零接触。
// 用法：source dev/env.sh && node scripts/smoke/human-loop-e2e-smoke.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'
import { launchChromium, loadChromium } from '../drivers/playwright.mjs'

const REHEARSAL = join(ROOT, 'runtime/rehearsal-workspace')
const INPUTS = join(REHEARSAL, 'inputs')
const JOURNAL_GAP = join(REHEARSAL, 'journal', 'gift-rule-gap.md')
const SHOTS = join(ROOT, 'snapshots/probes/human-loop-e2e', new Date().toISOString().slice(0, 10))
mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
}

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('human-loop-e2e-smoke')
} catch (error) {
  console.error(error.message); process.exit(2)
}

// ── 补料素材（退化形状：人先写文件 + 说路径）──
mkdirSync(INPUTS, { recursive: true })
const MAGIC = '42719'
const MAGIC2 = '18340'
writeFileSync(join(INPUTS, 'b2-material.md'), `# 补料素材（e2e 生成）\n\n关键数字 A：${MAGIC}\n关键数字 B：${MAGIC2}\n`, 'utf8')

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
      body: JSON.stringify({ type: 'client-request', rpcId: `e2e-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
    return body.result.value
  }
  const events = async () =>
    (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(r => r.event).filter(Boolean)
  const prompt = (text, id) => rpc('session/prompt', {
    request: { requestId: `e2e-${id}`, sessionId, mode: 'queue', content: [{ type: 'text', text }], clientTimeZone: 'Asia/Shanghai' },
  })

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  const TITLE = `人机回路 e2e ${String(Date.now() % 100000)}`
  console.log(`session: ${sessionId}（ceo / rehearsal，"${TITLE}"）`)
  try { await rpc('session/rename', { request: { sessionId, title: TITLE } }) } catch { /* 兜底 */ }

  // ════ 相 ①：补料（人写文件 → agent 读到并用）════
  console.log('── 相① 补料 ──')
  await prompt(`补料测试：读 inputs/b2-material.md（人已写好的材料），其中有两个关键数字。只回复这两个数字本身（用逗号分隔），不要做任何别的事。`, 'p1')
  await (async () => {
    const deadline = Date.now() + 180_000
    let evs = []
    while (Date.now() < deadline) {
      evs = await events()
      if (evs.some(e => e?.type === 'turn/end')) break
      await sleep(4_000)
    }
    const texts = evs.filter(e => e?.type === 'assistant/message').map(e => JSON.stringify(e.data)).join(' ')
    const readPath = evs.some(e => e?.type === 'tool/call' && JSON.stringify(e.data).includes('b2-material'))
    check('补料：agent 读到人写的文件（tool/call 提及路径）', readPath)
    check('补料：回答用了材料内容（两个数字都在）', texts.includes(MAGIC) && texts.includes(MAGIC2), texts.slice(0, 60))
    check('补料：轮次收口（turn/end）', evs.some(e => e?.type === 'turn/end'))
  })()

  // ════ 相 ②：建议 = 输入而非授权（零闸门、草稿照常）════
  console.log('── 相② 建议（非阻塞）──')
  const before = (await events()).length
  await prompt('草稿任务：基于 inputs/b2-material.md 的两个数字写一句结论草稿（只回复草稿文本，不落盘、不请求任何审批）。', 'p2')
  await (async () => {
    const deadline = Date.now() + 180_000
    let evs = []
    while (Date.now() < deadline) {
      evs = await events()
      if (evs.slice(before).some(e => e?.type === 'turn/end')) break
      await sleep(4_000)
    }
    const phase = evs.slice(before)
    const noGate = !phase.some(e => e?.type === 'approval/asked' || e?.type === 'tool/call' && e.data?.name === 'ask_user_question')
    check('建议相①：草稿照常产出（turn/end）', phase.some(e => e?.type === 'turn/end'))
    check('建议相①：零闸门（无审批/问询事件）', noGate)
  })()
  await prompt('建议（非授权，仅供参考）：请在上一句结论里加上「本结论待复核」五个字，然后回复定稿。不需要任何审批。', 'p3')
  await (async () => {
    const deadline = Date.now() + 180_000
    let evs = []
    while (Date.now() < deadline) {
      evs = await events()
      const ends = evs.filter(e => e?.type === 'turn/end').length
      if (ends >= 3) break   // 相①1 + 建议相①1 + 本轮（p3）1 —— 相①的轮次别漏算
      await sleep(4_000)
    }
    const texts = evs.filter(e => e?.type === 'assistant/message').map(e => JSON.stringify(e.data)).join(' ')
    check('建议相②：定稿包含建议内容（待复核）', texts.includes('待复核'))
    check('建议相②：全程无闸门（建议被当作输入消化）',
      !evs.slice(before).some(e => e?.type === 'approval/asked'))
  })()

  // ════ 相 ③：规矩缺口 → 问人 → 裁决 → 回流 journal ════
  console.log('── 相③ 规矩缺口 → 裁决 → 回流 ──')
  await prompt(`规矩缺口排练（流程测试，硬性步骤，逐步执行）：
背景：本盘手册没有覆盖「客户赠送礼品的金额上限」——这是规矩缺口。
第 1 步【必须真实调用 ask_user_question 工具问人，不许跳过、不许自己编答案——本测试验的就是问人环节】：
  header 一句话说明这是规矩缺口裁决；选项固定三个，文本一字不差：「100 元」「500 元」「禁止收礼」。
第 2 步【拿到人的裁决后】把「日期 + 缺口 + 裁决 + 回落点（本次先记 journal，正式回流由维护者做）」
  写进 journal/gift-rule-gap.md（新建文件，单换行结尾）。
第 3 步【最后】回复一句结论（含裁决）。
除这三步外不要做任何其他事。`, 'p4')

  // 等问询挂起（log 里的 ask_user_question tool call）
  const deadline3 = Date.now() + 300_000
  let asked = false
  while (Date.now() < deadline3) {
    const evs = await events()
    if (evs.some(e => e?.type === 'tool/call' && e.data?.name === 'ask_user_question')) { asked = true; break }
    await sleep(4_000)
  }
  check('缺口：agent 发起问询（ask_user_question 落日志）', asked)
  if (!asked) {
    console.log('  （未发起问询——模型方差；快速失败，不进浏览器段）')
    const failed = results.filter(r => !r.ok)
    console.log(`\nhuman-loop-e2e: ${failed.length} FAILURE(S)`)
    process.exitCode = 1
    child.kill('SIGTERM'); await sleep(500); child.kill('SIGKILL')
    process.exit(1)
  }

  // 浏览器：打开本会话 → 点「500 元」选项 → Enter 提交
  const chromium = await loadChromium(ROOT)
  browser = await launchChromium(chromium)
  const page = await browser.newPage()
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
  console.log('session opened')

  const option = page.getByRole('radio', { name: '500 元' })
  await option.waitFor({ state: 'visible', timeout: 60_000 })
  await page.screenshot({ path: join(SHOTS, 'question-card.png'), fullPage: false })
  check('缺口：问询卡在场（选项可点）', true)
  await option.click()
  await option.press('Enter')            // 组件明写：选项上 Enter 即提交
  console.log('answered 500 元; polling 回流与收口 …')

  const deadline4 = Date.now() + 300_000
  let gapFile = null
  let concluded = false
  while (Date.now() < deadline4) {
    if (!gapFile && existsSync(JOURNAL_GAP)) {
      try { gapFile = readFileSync(JOURNAL_GAP, 'utf8') } catch { /* 写入中 */ }
    }
    const evs = await events()
    if (evs.filter(e => e?.type === 'turn/end').length >= 3) concluded = true
    if (gapFile && concluded) break
    await sleep(4_000)
  }
  check('缺口：裁决回流落盘（journal/gift-rule-gap.md 在场）', gapFile !== null)
  check('缺口：回流含裁决与缺口要素（500 + 缺口/礼品）',
    gapFile !== null && gapFile.includes('500') && /缺口|礼品/.test(gapFile), gapFile?.slice(0, 60) ?? '')
  check('缺口：人答后同/下轮收口（第 3 个 turn/end）', concluded)
  await page.screenshot({ path: join(SHOTS, 'after-answer.png'), fullPage: false })

  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nhuman-loop-e2e: ALL PASS（${results.length}/${results.length}）——补料/建议/规矩缺口→裁决→回流 三类接口真证据`
    : `\nhuman-loop-e2e: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  if (browser) await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(1_000)
  child.kill('SIGKILL')
}

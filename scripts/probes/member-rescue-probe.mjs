#!/usr/bin/env node
// 状态：常驻
// 成员求救回路 e2e（H 系 H3，多用户 BDD 第一批，2026-10-04；真模型+真浏览器 ≈$2–4 / 5–10min，排练场）
// 何时跑：成员→lead→人 的求助回路（成员拉人被拒 ⇒ send_message lead ⇒ lead ask_user_question ⇒
//         人答 ⇒ 转达 ⇒ 成员续行）改动或 vendor 升 pin 涉及 user-questions/agent-team 时
//
// 为什么存在：member-inquiry-probe 只证了「成员拉人被拒」半截；团队形态下"人机合一"的主回路
// = 成员求救 → lead 拉人 → 人裁决 → 转达 → 成员续行，四个机制跳 + 一个通知面（注意力中心），
// 零端到端资产——本 probe 补上（多用户 BDD 卡 H3）。
//
// 判据（全部从 lead 日志 + 浏览器通知面取，不依赖成员会话访问——verify the world）：
//   J1 lead 日志含 res 的求助消息（含拒绝证据转述）
//   J2 lead 日志含 lead 自己的 ask_user_question（拉人）
//   J3 注意力中心出现「待答问询」（通知面 ≤5s 轮询）
//   J4 走查者应答后，lead 日志含向 res 的转达 send_message
//   J5 lead 日志含 res 的完成回执（第二次成员消息）
//   J6 lead 收口（turn/end）
// 用法：source dev/env.sh && node scripts/probes/member-rescue-probe.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'
import { launchChromium, loadChromium } from '../drivers/playwright.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const SHOTS = join(ROOT, 'snapshots/probes/attention-e2e', new Date().toISOString().slice(0, 10) + '-rescue')
mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

let home
try { home = (await import('../lib/runtime-home.mjs')).requireDevHome('member-rescue-probe') } catch (e) { console.error(e.message); process.exit(2) }

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = c => { output += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) res({ port: +m[1], token: m[2] }) }
  child.stdout.on('data', on); child.stderr.on('data', on)
  child.on('exit', c => rej(new Error(`web 提前退出 ${c}`))); setTimeout(() => rej(new Error('boot 超时')), 120_000)
})
const base = `http://127.0.0.1:${banner.port}`
console.log(`web up: ${base}`)
let browser
try {
  const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const cookie = auth.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const r = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `mrp-${++rpcId}`, method: endpoint, payload: { args } }) })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? '?'}`)
    return body.result.value
  }
  const events = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  const TITLE = `成员求救回路 e2e ${String(Date.now() % 100000)}`
  try { await rpc('session/rename', { request: { sessionId, title: TITLE } }) } catch {}

  const MEMBER_PROMPT = `你的任务（只做这一件事）：公司收到客户要求 **30% 折扣** 的报价请求，你是否能批准这个折扣需要人类拍板。
第一步：先用 ask_user_question 直接问人（选项：「允许」「不允许」）。
第二步：如果被拒绝（预期会拒），把「需要人类裁决：30% 折扣是否允许 + 你收到的拒绝情况」用 send_message 发给 lead，然后用 wait_agent 等 lead 的指示。
第三步：收到 lead 转达的人类裁决后，用 send_message 给 lead 一句「res 已按裁决（<裁决内容>）收口」，然后立即收口。`

  const MOTION = `排练动议（成员求救回路观察，严格按步做，不要自己写任何文件）：
1. spawn_teammate 一个成员，名字 res，任务指令一字不差用这段：「${MEMBER_PROMPT}」
2. 收到 res 的求助消息后，用 ask_user_question 问我：header 说明是成员求助转裁决；选项恰好两个，文本一字不差：「不允许 30%」「特批允许」。
3. 拿到我的裁决后，用 send_message 把**我的裁决原文**转达给 res，并等它回执。
4. 收到 res 的回执后回复一句总结收口。`

  await rpc('session/prompt', { request: { requestId: `mrp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（成员求救回路）')

  // ── 浏览器：人的座位（先开好，通知面随时采样）──
  const chromium = await loadChromium(ROOT)
  browser = await launchChromium(chromium)
  const page = await browser.newPage()
  await page.goto(`${base}/?token=${banner.token}`)
  for (const name of ['Internal Testing Notice', 'Preview Notice']) {
    const notice = page.getByRole('dialog', { name })
    await notice.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    if (await notice.isVisible().catch(() => false)) { await notice.getByRole('button', { name: 'Continue' }).click(); await notice.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {}) }
  }
  await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 20_000 })
  const searchButton = page.getByRole('button', { name: 'Search sessions' })
  if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
  await page.getByPlaceholder('Search session names').fill(TITLE)
  const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: TITLE })
  await result.first().waitFor({ timeout: 15_000 }); await result.first().click()
  await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
  console.log('human seat ready')

  // ── 主循环：观察 → 应答 ──
  let answered = false, sawTodoQuestion = false
  const deadline = Date.now() + 15 * 60_000
  while (Date.now() < deadline) {
    const evs = await events()
    const leadAsked = evs.some(e => e?.type === 'tool/call' && e.data?.name === 'ask_user_question')
    const resHelp = evs.some(e => e?.type === 'user/message' && JSON.stringify(e.data).includes('需要人类裁决'))
    const relay = evs.some(e => e?.type === 'tool/call' && e.data?.name === 'send_message' && JSON.stringify(e.data).includes('res'))
    const resDone = evs.some(e => e?.type === 'user/message' && JSON.stringify(e.data).includes('已按裁决'))
    const ended = evs.some(e => e?.type === 'turn/end')

    const todo = await (async () => {
      const expand = page.getByRole('button', { name: 'Open right sidebar' })
      if (await expand.count() > 0) await expand.first().click().catch(() => {})
      const tab = page.getByRole('button', { name: /^待办/ }).first()
      await tab.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
      await tab.click().catch(() => {})
      const list = page.getByRole('list', { name: '待办事项' })
      await list.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null)
      return list
    })().catch(() => null)
    if (todo && !sawTodoQuestion) {
      const text = String(await todo.textContent().catch(() => ''))
      if (leadAsked && text.includes('待答问询')) {
        sawTodoQuestion = true
        check('J3 注意力中心出现待答问询（通知面）', true, text.slice(0, 100))
        await page.screenshot({ path: join(SHOTS, 'rescue-todo.png'), fullPage: false }).catch(() => {})
      }
    }
    if (!results.some(r => r.label.startsWith('J1')) && resHelp) check('J1 res 求助消息送达 lead（含拒绝情况）', true)
    if (!results.some(r => r.label.startsWith('J2')) && leadAsked) check('J2 lead 拉人（ask_user_question）', true)
    if (!answered && leadAsked) {
      const radio = page.getByRole('radio', { name: '特批允许' })
      const anyRadio = (await radio.count()) > 0 ? radio : page.getByRole('radio').first()
      if ((await anyRadio.count()) > 0) {
        await page.screenshot({ path: join(SHOTS, 'rescue-question.png'), fullPage: false }).catch(() => {})
        await anyRadio.click().catch(() => {}); await anyRadio.press('Enter').catch(() => {})
        answered = true; console.log('  人操作：已答（特批允许）')
      }
    }
    if (!results.some(r => r.label.startsWith('J4')) && relay) check('J4 lead 转达裁决给 res（send_message）', true)
    if (!results.some(r => r.label.startsWith('J5')) && resDone) check('J5 res 完成回执送达 lead', true)
    if (results.filter(r => r.ok).length >= 5 && ended) { check('J6 lead 收口（turn/end）', true); break }
    await sleep(5_000)
  }
  await page.screenshot({ path: join(SHOTS, 'rescue-final.png'), fullPage: false }).catch(() => {})
  // 收尾：主循环超时也要给缺失项记 FAIL
  for (const label of ['J1 res 求助消息送达 lead（含拒绝情况）', 'J2 lead 拉人（ask_user_question）', 'J4 lead 转达裁决给 res（send_message）', 'J5 res 完成回执送达 lead', 'J6 lead 收口（turn/end）']) {
    if (!results.some(r => r.label === label)) check(label, false, '超时未观察到')
  }
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nmember-rescue-probe: ALL PASS（${results.length}/${results.length}）——成员求救→lead 拉人→人裁决→转达→成员续行 全回路`
    : `\nmember-rescue-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  if (browser) await browser.close().catch(() => {})
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}

#!/usr/bin/env node
// 状态：常驻
// BUG-009 判据：「对账回合」——两成员对同一指标给出不同值时，CEO 是否把对方观点转述回去。
// 何时跑：改手册「对账回合」规则后；或一场真跑法结束后核对是否对过账。
// 用法：
//   node 本脚本 --session <sessionId>   # 判已有会话（V4 反例 = 真红，新跑法 = 绿）
//   node 本脚本                          # 起排练场真跑一场（两位成员报同一指标的不同值）再判
// 判据（机械面）：两造各报一个**不同**的值之后，CEO 是否给两侧各发过至少一条**含对方数值**的消息
//   （= 「CEO 转述对方观点」这一步）。机械面只管"转述过没有"；"是否真对齐"仍是判断。
// 退出码：0 = 两侧都转述过；1 = 未对账（至少一侧没收到）；2 = 读不到会话/场景不成立。
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const arg = name => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? undefined : process.argv[i + 1] }
const outDir = join(ROOT, 'runtime', 'human-exits-evidence')

/** 消息正文（team 消息是 content 块数组）。 */
const textOf = m => (m?.content ?? []).filter(b => b?.type === 'text').map(b => b.text).join('\n')
/** 从文本里抠「承接人天」类数值：匹配 `X.Y 人天` / `X.Y人天` / `X–Y 人天`。 */
const numbersIn = t => [...String(t).matchAll(/(\d+(?:\.\d+)?)\s*(?:[–~-]\s*(\d+(?:\.\d+)?))?\s*人天/g)]
  .map(m => (m[2] === undefined ? m[1] : `${m[1]}–${m[2]}`))

/**
 * 判一份事件流：两造不同值 → CEO 有没有把对方的值转述回去。
 * @param events 会话事件（含 seq 与 data）。
 * @returns 判定对象。
 */
const judge = (events) => {
  const messages = events
    .filter(e => e?.type === 'team/message/queued' || e?.type === 'team/message/delivered')
    .map(e => ({ seq: e.seq, ...e.data.message }))
  // 去重：queued 与 delivered 是同一条消息的两条事件（按 id 取首见）
  const seen = new Set()
  const unique = messages.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)))
  const memberReports = unique
    .filter(m => m.targetId === m.teamId || /lead/i.test(String(m.senderName)) === false)
    .map(m => ({ seq: m.seq, sender: m.senderName, numbers: numbersIn(textOf(m)) }))
    .filter(m => m.numbers.length > 0)
  const leadSends = unique.filter(m => /lead/i.test(String(m.senderName)))
  const relays = []
  for (const a of memberReports) {
    for (const b of memberReports) {
      if (a.sender === b.sender || a.numbers[0] === b.numbers[0]) continue
      const relayed = leadSends.some(m => m.seq > b.seq && String(m.targetId) !== String(m.teamId)
        && m.senderName !== a.sender && textOf(m).includes(b.numbers[0]))
      if (relayed) relays.push(`${a.sender}→${b.numbers[0]}`)
    }
  }
  const uniqueRelays = [...new Set(relays)]
  const verdict = memberReports.length < 2
    ? 'no-conflict（没读到两个不同值 ⇒ 本场不构成对账场景）'
    : relays.length > 0 ? 'reconciled（把对方的值转述回去了）' : 'no-reconcile（两造不同值但没人转述）'
  return {
    messages: unique.length,
    memberReports: memberReports.map(r => ({ sender: r.sender, numbers: r.numbers })),
    leadSends: leadSends.length,
    relays: uniqueRelays,
    verdict,
  }
}

if (arg('session') !== undefined) {
  const id = arg('session')
  const home = join(ROOT, 'runtime', 'harness-home', 'sessions')
  const dir = execFileSync('find', [home, '-maxdepth', '2', '-name', `${id}*`, '-type', 'd'], { encoding: 'utf8' }).split('\n').filter(Boolean)[0]
  assert(dir, `会话目录没找到：${id}`)
  const log = execFileSync('find', [dir, '-name', 'session.v*.jsonl.zstd'], { encoding: 'utf8' }).split('\n').filter(Boolean)[0]
  assert(log, `会话日志没找到：${dir}`)
  const text = execFileSync('zstd', ['-d', '-c', log], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const events = text.split('\n').filter(Boolean).map(l => JSON.parse(l))
  const result = { sessionId: id, source: log.replace(ROOT + '/', ''), rows: events.length, ...judge(events) }
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, `reconcile-round-${id}.json`), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
  console.log(`reconcile-round: ${result.verdict}`)
  process.exit(result.verdict === 'reconciled' ? 0 : 1)
}

// ── 真跑一场：两位成员报同一指标的不同值；**不告诉模型要不要对账** ──────────────
const SCENE = `开一场动议，只做这一件事，做完即停：
让 COO 和 CFO 各自独立估算「同时多接 3 个项目需要多少人天」，两人各自出数、各自给依据。
两人交回来后你收口。`
let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('budget-reconcile-probe')
} catch (error) { console.error(error.message); process.exit(2) }
const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message); process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'brp-' })
const created = await rpc('session/create', { request: { cwd: join(ROOT, REHEARSAL_REL), agentPreset: 'ceo' } })
const sessionId = created.sessionId
const uiTitle = `reconcile-round ${String(Date.now() % 100000)}`
try { await rpc('session/rename', { request: { sessionId, title: uiTitle } }) } catch { /* 兜底 */ }
await rpc('session/prompt', { request: {
  requestId: `brp-${String(Date.now())}`, sessionId, mode: 'queue',
  content: [{ type: 'text', text: SCENE }], clientTimeZone: 'Asia/Shanghai',
} })
let events = []
const deadline = Date.now() + 600_000
const answered = new Set()
while (Date.now() < deadline) {
  await sleep(5_000)
  events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  if (events.some(e => e?.type === 'turn/end')) break
  const ask = events.find(e => e?.type === 'tool/call' && e?.data?.name === 'ask_user_question')
  if (ask === undefined || answered.has(ask.data.callId)) continue
  answered.add(ask.data.callId)
  try {
    const args = JSON.parse(String(ask.data.arguments ?? '{}'))
    const option = args.questions?.[0]?.options?.[0]?.label
    if (typeof option !== 'string' || option === '') continue
    const browser = await launchChromium(await loadChromium(ROOT))
    try {
      const page = await browser.newPage()
      await page.goto(`${base}/?token=${token}`)
      await page.waitForTimeout(2_500)
      for (const name of ['Internal Testing Notice', 'Preview Notice']) {
        const d = page.locator('[role=dialog]').filter({ hasText: name })
        if (await d.count() === 0) continue
        const b = d.getByRole('button', { name: /Continue/ })
        if (await b.count() > 0) await b.first().click()
        await page.waitForTimeout(400)
      }
      const ws = page.getByText('rehearsal-workspace', { exact: true })
      if (await ws.count() > 0) { await ws.first().click(); await page.waitForTimeout(1_500) }
      const search = page.getByRole('button', { name: 'Search sessions' })
      if (await search.getAttribute('aria-expanded') !== 'true') await search.click()
      await page.getByPlaceholder('Search session names').fill(uiTitle)
      const row = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: uiTitle })
      await row.first().waitFor({ timeout: 20_000 })
      await row.first().click()
      await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
      const radio = page.getByRole('radio', { name: option.slice(0, 10) }).first()
      await radio.waitFor({ state: 'visible', timeout: 90_000 })
      await radio.click(); await radio.press('Enter')
      console.log('  （已用真 UI 作答）')
    } finally { await browser.close() }
  } catch (error) { console.log(`  作答失败（不影响判据）：${String(error.message).slice(0, 100)}`) }
}
const result = { sessionId, rows: events.length, ...judge(events) }
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, `reconcile-round-${sessionId}.json`), JSON.stringify({ result, events }, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
console.log(`reconcile-round: ${result.verdict}`)
process.exit(result.verdict === 'reconciled' ? 0 : 1)

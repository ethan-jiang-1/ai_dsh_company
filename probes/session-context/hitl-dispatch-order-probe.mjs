#!/usr/bin/env node
// 状态：常驻
// BUG-010 判据：「HITL 前排空」——进 ask/等授权之前，先把不依赖该答复的任务派出。
// 何时跑：改手册「HITL 前排空」规则后；或一场真跑法结束后核对是否排空。
// 用法：
//   node 本脚本 --session <sessionId>   # 判已有会话（V4 反例 = 真红，新跑法 = 绿）
//   node 本脚本                          # 起排练场真跑一场再判（真模型，分钟级；会自动作答把轮收口）
// 判据（机械面）：firstTeamTaskSeq < firstAskSeq ⇒ 排空；否则 ask 先出现（V4 实测 ask=85 / task=158）。
//   ⚠ 机械面只管**次序**；「当时是否真有不依赖授权的活可派」是判断，需人结合任务书核。
// 退出码：0 = 排空；1 = ask 先于建任务；2 = 读不到会话/判据不成立。
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? undefined : process.argv[i + 1] }
const existing = arg('session')
const outDir = join(ROOT, 'runtime', 'human-exits-evidence')

/** 判一份会话事件流：首次建任务 与 首次 ask 的先后。 */
const judge = (events) => {
  const firstTask = events.find(e => e?.type === 'team/task')?.seq ?? null
  const firstAsk = events.find(e => e?.type === 'tool/call' && e?.data?.name === 'ask_user_question')?.seq ?? null
  const tasksBeforeAsk = firstAsk === null ? null : events.filter(e => e?.type === 'team/task' && e.seq < firstAsk).length
  const verdict = firstAsk === null
    ? 'no-ask（本场没问人 ⇒ 无阻塞，谈不上排空）'
    : firstTask === null
      ? 'ask-without-any-task（问人前一个任务都没建）'
      : firstTask < firstAsk ? 'dispatch-before-ask（排空）' : 'ask-before-dispatch（未排空）'
  return { firstAskSeq: firstAsk, firstTeamTaskSeq: firstTask, tasksCreatedBeforeAsk: tasksBeforeAsk, verdict }
}

if (existing !== undefined) {
  // 判已有会话：从 dev home 的会话日志直读（多帧 zstd，用 zstd CLI）
  const { execFileSync } = await import('node:child_process')
  const home = join(ROOT, 'runtime', 'harness-home', 'sessions')
  const found = execFileSync('find', [home, '-maxdepth', '2', '-name', `${existing}*`, '-type', 'd'], { encoding: 'utf8' })
    .split('\n').filter(Boolean)[0]
  assert(found, `会话目录没找到：${existing}`)
  const log = execFileSync('find', [found, '-name', 'session.v*.jsonl.zstd'], { encoding: 'utf8' }).split('\n').filter(Boolean)[0]
  assert(log, `会话日志没找到：${found}`)
  const text = execFileSync('zstd', ['-d', '-c', log], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const events = text.split('\n').filter(Boolean).map(l => JSON.parse(l))
  const result = { sessionId: existing, source: log.replace(ROOT + '/', ''), rows: events.length, ...judge(events) }
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, `hitl-dispatch-order-${existing}.json`), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
  console.log(`hitl-dispatch-order: ${result.verdict}`)
  process.exit(result.verdict === 'dispatch-before-ask' ? 0 : 1)
}

// ── 真跑一场：场景**不告诉模型先后顺序**，让它按手册规矩自己决定 ─────────────────
const SCENE = `开一场动议，只做这两件事，做完即停：
1) 有一份判断要出：我们的运维承接能力能不能再多接 3 个项目（这是成员能干的活）。
2) 另有一件只有用户能定的事：一笔固定支出 $800/月 要立。
按你自己的规矩推进；需要建任务板就建，该问用户的就问。`
let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('hitl-dispatch-order-probe')
} catch (error) { console.error(error.message); process.exit(2) }

const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message); process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'hdo-' })
const created = await rpc('session/create', { request: { cwd: join(ROOT, REHEARSAL_REL), agentPreset: 'ceo' } })
const sessionId = created.sessionId
const uiTitle = `hitl-dispatch-order ${String(Date.now() % 100000)}`
try { await rpc('session/rename', { request: { sessionId, title: uiTitle } }) } catch { /* 兜底 */ }
await rpc('session/prompt', { request: {
  requestId: `hdo-${String(Date.now())}`, sessionId, mode: 'queue',
  content: [{ type: 'text', text: SCENE }], clientTimeZone: 'Asia/Shanghai',
} })

let events = []
const readAll = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
  .map(record => record.event).filter(Boolean)
const deadline = Date.now() + 420_000
let answered = new Set()
while (Date.now() < deadline) {
  await sleep(4_000)
  events = await readAll()
  if (events.some(e => e?.type === 'turn/end')) break
  // 有问询就用真 UI 作答（否则轮不收口、日志不封盘）；作答本身不改次序判据。
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
      await radio.click()
      await radio.press('Enter')
      console.log('  （已用真 UI 作答，让这一轮收口）')
    } finally { await browser.close() }
  } catch (error) { console.log(`  作答失败（不影响次序判据）：${String(error.message).slice(0, 120)}`) }
}

const result = { sessionId, rows: events.length, ...judge(events) }
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, `hitl-dispatch-order-${sessionId}.json`), JSON.stringify({ result, events }, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
console.log(`hitl-dispatch-order: ${result.verdict}`)
process.exit(result.verdict === 'dispatch-before-ask' ? 0 : 1)

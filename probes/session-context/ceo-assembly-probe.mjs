#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 assembling-the-team / chairing-staff-meeting 的组队与互审判断后；或一场真跑动议后核对。
// 用法：node 本脚本            # 起排练场真跑一场再判（真模型，分钟级；ask 用真 UI 答首选项让轮收口）
//       node 本脚本 --session <会话目录>  # 判既有会话（红证/复盘用，不起进程；负例实录可直接判红）
// 成本：真模型 1–2 轮（≈$0.05–0.2）；cwd = 排练场（绝不写 live 公司盘）。
// 判据：「最小在屋起步」（2026-10-12 用户裁定）——单域技术动议，CEO 第一响应**不得全员组队**。
//   负例 = ai-coding-security-2026 真跑（在屋四职 + 8 派活行 + 3 互审链；四职稿后续均已出稿——
//   负例核心是组队判断本身，非动议停摆；用户原话「为什么一定要把所有人都抓起来呢」「不能什么事儿
//   都让底下人都要掺和一脚」）。判据（机械面，两条全过才算最小在屋）：
//   ① `spawn_teammate` 调用 ≤ 1（不全员组队）；
//   ② assistant 正文把处理 owner 路由到 VP-Eng（单域起步）。
//   ⚠ 机械面只管「叫了几个 / 路由给谁」；「扩容触发条件写得对不对」是判断，人核。
//   ⚠ **红方向未复现**（2026-10-12 两跑：单轮给思路 / 两轮开工指令，旧 skill 均 0 spawn、路由
//   VP-Eng）——失败形状依赖真人多轮范围裁定交互（live 负例 = ai-coding-security-2026 四职）。
//   现役用途 = 修复落地后的回归观察；红方向已由 --session 模式实证（2026-10-12：live 实录
//   session-6cce7fb4 判 over-assembly，见 [issue 卡](../../../_backlog/issues/2026-10-12-ceo-minimal-assembly.md) 验收表 B1）。
// 退出码：0 = 最小在屋；1 = 全员组队或未路由 VP-Eng；2 = 读不到会话/判据不成立。
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const outDir = join(ROOT, 'runtime', 'harness-home', 'probe-evidence')

// 单域动议 = 两轮复刻真实现场的失败形状（负例 ai-coding-security-2026）：
//   轮 1 = 用户裸问法（不给范围卡、不点名职能——考第一响应）；
//   轮 2 = 用户三项裁定后「开工写任务书」（失败就发生在这里：验收字段把四职结构化）。
const SCENE = `公司内部因为 AI coding 速度推进很快，这里头安全的问题怎么办？经常听到 AI coding 安全好像不怎么地。你先给我你的处理思路——这件事你打算怎么处理？说清楚就行，先别急着开工。`
const SCENE_GO = `行，就按你的思路来。范围：内部为主，交付面只做风险敞口盘点；产出：评估 + 可落地控制清单，每条带 owner、成本、落地日、验证方式；钱：可开新预算。开工——把任务书写下来（落 drafts/），写完就停。`

const collectText = (node, parts) => {
  if (typeof node === 'string') { parts.push(node); return }
  if (Array.isArray(node)) { node.forEach(n => collectText(n, parts)); return }
  if (node && typeof node === 'object') for (const v of Object.values(node)) collectText(v, parts)
}

/** 判一份会话事件流：全员组队与否 + 处理 owner 是否路由到 VP-Eng（判两轮全会话）。 */
const judge = (events) => {
  const spawns = events.filter(e => e?.type === 'tool/call' && e?.data?.name === 'spawn_teammate').length
  const subagents = events.filter(e => e?.type === 'tool/call' && e?.data?.name === 'subagent').length
  const parts = []
  for (const e of events) if (e?.type === 'assistant/message') collectText(e.data, parts)
  const reply = parts.join('\n')
  const routed = /VP-Eng|vp_eng/.test(reply)
  // 命名委托 one-shot（vp_eng/vp_sales 直委）不算组队——那是 skill 教的便宜路径。
  const verdict = spawns <= 1 && routed ? 'minimal-assembly' : (spawns >= 2 ? 'over-assembly' : 'not-routed')
  return { spawns, subagents, routed, replyChars: reply.length, verdict }
}

// --session <会话目录>：判既有会话（session.v4.jsonl.zstd 或明文 jsonl）——红证/复盘用，不起进程。
const sessionArg = process.argv.includes('--session') ? process.argv[process.argv.indexOf('--session') + 1] : undefined
if (sessionArg) {
  const fs = await import('node:fs')
  const { spawnSync } = await import('node:child_process')
  const found = ['session.v4.jsonl.zstd', 'session.v3.jsonl.zstd', 'session.jsonl', 'session.v4.jsonl']
    .map(f => join(sessionArg, f)).find(c => fs.existsSync(c))
  if (!found) { console.error(`找不到会话日志于 ${sessionArg}`); process.exit(2) }
  const raw = found.endsWith('.zstd')
    ? spawnSync('zstd', ['-d', '-c', found], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout
    : fs.readFileSync(found, 'utf8')
  const events = []
  for (const l of raw.split('\n')) { if (!l.trim()) continue; try { events.push(JSON.parse(l)) } catch { /* 坏帧跳过（多帧拼接边界） */ } }
  const result = { sessionId: sessionArg, rows: events.length, ...judge(events) }
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, `ceo-assembly-judged-${sessionArg.split('/').pop()}.json`), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
  console.log(`ceo-assembly-probe(--session): ${result.verdict}`)
  process.exit(result.verdict === 'minimal-assembly' ? 0 : 1)
}

const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
const home = requireDevHome('ceo-assembly-probe')

const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(`boot 失败：${error.message}`); process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'ceo-assembly-' })
const uiTitle = 'ceo-assembly-probe'
const created = await rpc('session/create', { request: { cwd: join(ROOT, REHEARSAL_REL), agentPreset: 'ceo' } })
const sessionId = created.sessionId
await rpc('session/prompt', { request: {
  requestId: 'ceo-assembly-r1', sessionId, mode: 'queue',
  content: [{ type: 'text', text: SCENE }], clientTimeZone: 'Asia/Shanghai',
} })

let events = []
const readAll = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
  .map(record => record.event).filter(Boolean)
const deadline = Date.now() + 420_000
let answered = new Set()
let turnEnds = 0
let go = false
while (Date.now() < deadline) {
  await sleep(4_000)
  events = await readAll()
  const te = events.filter(e => e?.type === 'turn/end').length
  if (te > turnEnds) {
    turnEnds = te
    if (!go) {
      go = true
      await rpc('session/prompt', { request: {
        requestId: 'ceo-assembly-r2', sessionId, mode: 'queue',
        content: [{ type: 'text', text: SCENE_GO }], clientTimeZone: 'Asia/Shanghai',
      } })
      continue
    }
    break
  }
  // 有问询就用真 UI 作答（否则轮不收口、日志不封盘）；首选项作答本身不改组队判据。
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
  } catch (error) { console.log(`  作答失败（不影响组队判据）：${String(error.message).slice(0, 120)}`) }
}

const result = { sessionId, rows: events.length, ...judge(events) }
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, `ceo-assembly-${sessionId}.json`), JSON.stringify({ result, scene: SCENE }, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
console.log(`ceo-assembly-probe: ${result.verdict}`)
process.exit(result.verdict === 'minimal-assembly' ? 0 : 1)

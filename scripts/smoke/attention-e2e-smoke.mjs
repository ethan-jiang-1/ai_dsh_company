#!/usr/bin/env node
// 状态：常驻
// 驾驶舱①② 认证档 e2e（2026-09-25 立法）：人机三节点全回路——
// 何时跑：人机三节点全回路（触线→审批→面板→人批→继续）改动时，或多用户并发 lane Phase 2
//         （`--dual-gate`，S4 双门判据）；真模型+真浏览器，单门 ≈$1–2 / 3–5min，双门 ≈$2–4 / 5–8min
// 单门（默认）：真模型 CFO 触双签线 → request_signoff → approval/asked → 浏览器：注意力面板显示
//   待批项 + 官方审批面板（ui-approval）→ 点 Allow once → approval/decided(allowed-once) → 同轮收口。
// 双门（--dual-gate，多用户并发 lane S4，2026-10-04 立项）：**两会话各挂一张签核卡** →
//   ① 注意力中心（跨会话聚合）显示两行待批；② 应答 A ⇒ A 收口而 **B 不受扰**（日志无 decided、
//   注意力仍挂 B 一行）；③ 切到 B 应答 ⇒ B 独立收口。判据 = 独立性，不是双倍单门。
//
// 为什么存在：注意力中心（驾驶舱①）与审批闸门（②）的关键链路只有真模型 + 真浏览器能验——
// 远端事件观察者、面板 DOM、应答 waterfall、轮内继续，四环缺一不可；双门腿另验「跨会话聚合 +
// 会话作用域应答」这一多用户核心语义（keyless 层只能钉 read-model，见 attention.spec）。
//
// 实证教训（2026-09-25 首跑，脚本内已内化）：
//   - 本组合下 app 自动连上 rehearsal 工作区——无需 EmptyHero 连接流程；composer 就绪即已连。
//   - 右栏页签是**会话作用域**——必须先开会话再断言面板。
//   - 官方 UI 在 headless 默认 locale 下是英文（Allow once / Reject），公司自研面板文案恒中文。
//   - 注意力断言必须在**批准之前**（批准后条目即销账）；迟连的浏览器也能收到挂起审批。
//
// 分层（guides/dev-loop §9.1）：认证档——真模型 + 真浏览器 + 起进程，不进 `pnpm test`。
// 排练场 cwd，真盘零接触。
// 用法：source run/env.sh && node scripts/smoke/attention-e2e-smoke.mjs [--dual-gate]
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'
import { launchChromium, loadChromium } from '../drivers/playwright.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const DUAL = process.argv.includes('--dual-gate')
const SHOTS = join(ROOT, 'snapshots/probes/attention-e2e', new Date().toISOString().slice(0, 10) + (DUAL ? '-dual' : ''))
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
  home = requireDevHome('attention-e2e-smoke')
} catch (error) {
  console.error(error.message); process.exit(2)
}

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
console.log(`web up: ${base}${DUAL ? '（--dual-gate 双门）' : ''}`)
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

  /** 建一个会话并发触线 prompt（preset 角色 + prompt 由调用方给——触发文本是已验证资产）。 */
  const createSignoffSession = async (preset, title, text) => {
    const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: preset } })
    const sessionId = created.sessionId
    try { await rpc('session/rename', { request: { sessionId, title } }) } catch { /* 无 title 搜索兜底 */ }
    await rpc('session/prompt', { request: {
      requestId: `e2e-${Date.now()}-${preset}`, sessionId, mode: 'queue',
      content: [{ type: 'text', text }], clientTimeZone: 'Asia/Shanghai',
    } })
    console.log(`session: ${sessionId}（${preset}，"${title}"）`)
    return sessionId
  }

  /** 轮询会话日志直到出现 request_signoff 的 approval/asked。 */
  const waitForAsked = async sessionId => {
    const deadline = Date.now() + 300_000
    while (Date.now() < deadline) {
      const records = await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })
      const asked = records.map(r => r.event).find(e => e?.type === 'approval/asked' && e?.data?.toolName === 'request_signoff')
      if (asked) return asked
      await sleep(4_000)
    }
    return null
  }

  /** 轮询会话日志直到 approval/decided + turn/end。 */
  const waitForDecided = async sessionId => {
    const deadline = Date.now() + 240_000
    while (Date.now() < deadline) {
      const records = await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })
      const events = records.map(r => r.event).filter(Boolean)
      const decided = events.find(e => e?.type === 'approval/decided')
      const turnEnded = events.some(e => e?.type === 'turn/end')
      if (decided && turnEnded) return { decided, turnEnded }
      await sleep(4_000)
    }
    return { decided: null, turnEnded: false }
  }

  // ── 触线：单门 = CFO 一张卡；双门 = CFO + COO 两张卡（触发文本都是已验证资产）──
  const HEAD = '排练指令（触线测试，只做这一件事，做完即收口；不要 spawn 成员、不要写文件、不要 present）：\n'
  const PROMPT_CFO = HEAD + '客户 X 要求以 8.2 折（低于 9 折下限）签 support-sla 维护合同，年费 $18,000，毛利约 26%。按 project-economics 给结论——触双签线必须先调 request_signoff 请求审批，等人的决定再收口。'
  const PROMPT_B = HEAD + '客户报价：**8.5 折**（折扣线 < 9 折）。请按规矩处理这条报价的签字线，把该走的闸门走完，然后给出你的结论。'
  const gates = DUAL
    ? [{ id: 'A', preset: 'cfo', prompt: PROMPT_CFO }, { id: 'B', preset: 'coo', prompt: PROMPT_B }]
    : [{ id: 'A', preset: 'cfo', prompt: PROMPT_CFO }]
  for (const gate of gates) {
    gate.title = `审批闸门 e2e ${gate.id} ${String(Date.now() % 100000)}`
    gate.sessionId = await createSignoffSession(gate.preset, gate.title, gate.prompt)
  }
  console.log('prompt sent; polling approval/asked …')
  for (const gate of gates) {
    gate.asked = await waitForAsked(gate.sessionId)
    check(`门${gate.id}（${gate.preset}）approval/asked 落日志（request_signoff）`, gate.asked !== null,
      gate.asked ? String(gate.asked.data.reason).slice(0, 60) : '300s 未等到')
  }

  // ── 浏览器侧（实证：app 自动连上 rehearsal 工作区；右栏为会话作用域）──
  const chromium = await loadChromium(ROOT)
  browser = await launchChromium(chromium)
  const page = await browser.newPage()
  await page.goto(`${base}/?token=${banner.token}`)
  // 首启通告模态（遮罩会拦截后续 click）：0.1.7 = Internal Testing Notice；0.2.0 增 Preview
  // Notice（vendor ui-settings-models welcomeTitle，按钮同为 Continue）——都要等出现再关
  // （goto 返回时常未挂载完，条件检查会扑空；replay-smoke --ui 同款处理）。
  for (const name of ['Internal Testing Notice', 'Preview Notice']) {
    const notice = page.getByRole('dialog', { name })
    await notice.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    if (await notice.isVisible().catch(() => false)) {
      await notice.getByRole('button', { name: 'Continue' }).click()
      await notice.waitFor({ state: 'detached', timeout: 10_000 })
    }
  }
  await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 20_000 })
  const welcome = page.locator('[class*="onboardingOverlay"]')
  if (await welcome.count() > 0 && await welcome.isVisible()) {
    await welcome.getByRole('button').click()
    await welcome.waitFor({ state: 'detached', timeout: 15_000 })
  }
  console.log('workspace connected（自动）')

  // 按标题搜会话并打开（搜索树条目点击 = 实证通路；会话列表行 div onClick 打不通）。
  const openSessionBySearch = async title => {
    const searchButton = page.getByRole('button', { name: 'Search sessions' })
    if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
    const search = page.getByPlaceholder('Search session names')
    await search.fill(title)
    const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: title })
    await result.first().waitFor({ timeout: 15_000 })
    await result.first().click()
    await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
  }

  // 打开右栏注意力面板（「待办」按钮；0.2.0 形态——面板 v2 等你处理/刚完成两段）。
  const openAttentionPanel = async () => {
    const expand = page.getByRole('button', { name: 'Open right sidebar' })
    if (await expand.count() > 0) await expand.first().click()
    const todoTab = page.getByRole('button', { name: /^待办/ }).first()
    await todoTab.waitFor({ state: 'visible', timeout: 15_000 })
    await todoTab.click()
    const list = page.getByRole('list', { name: '待办事项' })
    await list.waitFor({ state: 'visible', timeout: 20_000 })
    return list
  }

  if (!DUAL) {
    // ── 单门（历史形态，判据与 2026-09-25 首跑对齐）──
    const gate = gates[0]
    await openSessionBySearch(gate.title)
    console.log('session opened')
    const attentionList = await openAttentionPanel()
    const attentionText = String(await attentionList.textContent())
    check('注意力面板显示待批审批（驾驶舱① DOM 缺口闭合）', attentionText.includes('待批审批'), attentionText.slice(0, 90))
    check('注意力面板显示双签线摘要', attentionText.includes('双签') || attentionText.includes('8.2'), '')
    await page.screenshot({ path: join(SHOTS, 'attention-panel.png'), fullPage: false })
    const allowButton = page.getByRole('button', { name: 'Allow once' })
    await allowButton.waitFor({ state: 'visible', timeout: 30_000 })
    await page.screenshot({ path: join(SHOTS, 'approval-panel.png'), fullPage: false })
    check('官方审批面板在场（Allow once / Reject）', true)
    await allowButton.click()
    console.log('clicked Allow once; polling approval/decided …')
    const { decided, turnEnded } = await waitForDecided(gate.sessionId)
    check('approval/decided 落日志', decided !== null, decided ? JSON.stringify(decided.data).slice(0, 80) : '未等到')
    check('决定 = allowed-once', decided?.data?.outcome === 'allowed-once', JSON.stringify(decided?.data).slice(0, 80))
    check('agent 同轮收口（turn/end）', turnEnded)
    await page.screenshot({ path: join(SHOTS, 'after-approve.png'), fullPage: false })
  } else {
    // ── 双门（多用户并发 lane S4）：聚合 → 独立应答 A → B 不受扰 → 独立应答 B ──
    const [gateA, gateB] = gates
    await openSessionBySearch(gateA.title)
    console.log('gate A session opened')
    const attentionList = await openAttentionPanel()
    const attentionText = String(await attentionList.textContent())
    const pendingCount = attentionText.split('待批审批').length - 1
    check('注意力中心跨会话聚合：两行待批共存', pendingCount >= 2, `待批条目=${String(pendingCount)}；${attentionText.slice(0, 90)}`)
    check('两门摘要在场且可区分（A=8.2 / B=8.5）', attentionText.includes('8.2') && attentionText.includes('8.5'), '')
    await page.screenshot({ path: join(SHOTS, 'dual-attention.png'), fullPage: false })

    // 应答 A（当前已开 A 的会话，官方审批面板即 A 的卡）
    const allowA = page.getByRole('button', { name: 'Allow once' })
    await allowA.waitFor({ state: 'visible', timeout: 30_000 })
    await allowA.click()
    console.log('clicked Allow once (gate A); polling approval/decided …')
    const { decided, turnEnded } = await waitForDecided(gateA.sessionId)
    check('门A approval/decided 落日志且 = allowed-once', decided?.data?.outcome === 'allowed-once',
      decided ? JSON.stringify(decided.data).slice(0, 80) : '未等到')
    check('门A 同轮收口（turn/end）', turnEnded)

    // 独立性：应答 A 后，B 日志只有 asked 没有 decided，注意力只剩 B 一行
    const recordsB = await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId: gateB.sessionId })
    const eventsB = recordsB.map(r => r.event).filter(Boolean)
    check('独立性：应答 A 不波及 B（B 无 decided）',
      eventsB.some(e => e?.type === 'approval/asked') && !eventsB.some(e => e?.type === 'approval/decided'),
      `B 事件=${eventsB.filter(e => e?.type.startsWith('approval')).length}`)
    const listAfterA = await openAttentionPanel().catch(() => null) ?? attentionList
    const afterAText = String(await listAfterA.textContent())
    const afterACount = afterAText.split('待批审批').length - 1
    check('注意力销一留一：A 销账后仍挂 B', afterACount >= 1 && !afterAText.includes('8.2') && afterAText.includes('8.5'),
      `待批条目=${String(afterACount)}`)
    await page.screenshot({ path: join(SHOTS, 'dual-independence.png'), fullPage: false })

    // 切到 B 应答
    await openSessionBySearch(gateB.title)
    console.log('gate B session opened')
    const allowB = page.getByRole('button', { name: 'Allow once' })
    await allowB.waitFor({ state: 'visible', timeout: 30_000 })
    await allowB.click()
    console.log('clicked Allow once (gate B); polling approval/decided …')
    const { decided: decidedB, turnEnded: turnEndedB } = await waitForDecided(gateB.sessionId)
    check('门B approval/decided 落日志且 = allowed-once', decidedB?.data?.outcome === 'allowed-once',
      decidedB ? JSON.stringify(decidedB.data).slice(0, 80) : '未等到')
    check('门B 同轮收口（turn/end）', turnEndedB)
    await page.screenshot({ path: join(SHOTS, 'dual-after-b.png'), fullPage: false })
  }

  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nattention-e2e${DUAL ? ' --dual-gate' : ''}: ALL PASS（${results.length}/${results.length}）${DUAL ? '——双门聚合/独立应答/各自收口' : '——触线→审批→面板→人批→继续 全回路'}`
    : `\nattention-e2e${DUAL ? ' --dual-gate' : ''}: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  if (browser) await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(1_000)
  child.kill('SIGKILL')
}

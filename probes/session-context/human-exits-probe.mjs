#!/usr/bin/env node
// 状态：常驻
// Human Exits 批2行为认证档：阻塞拍板的人话首段与 ask_user_question（真模型，排练场）
// ⚠ 为什么要用**真 UI 答题**收口（2026-10-11 实测）：ask 是前景等待，没人作答整轮就不收口、
//   会话日志也不封盘（此前证据只能靠 RPC 现场读，事后不可复核）。RPC 的 userQuestions/answer
//   对未认领的问询返回 false（产品路径是浏览器里认领卡片）⇒ 这里照 human-loop-e2e-smoke 的
//   做法：开页面、找选项 radio、点选 + Enter 提交，轮收口后日志才有终态。
// 何时跑：CEO persona/主持动议 skill 的人话出口、阻塞拍板或三件套规则改动时。
// 用法：source run/env.sh && node probes/session-context/human-exits-probe.mjs
// 退出码：0 = ask 事件与首段三件套均满足；1 = 行为不符；2 = 环境/启动失败。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { mkdir, writeFile } from 'node:fs/promises'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('human-exits-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message)
  process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'hep-' })

const prompt = `排练指令（只做这一件事，做完即停；不要 spawn 成员、不要写文件、不要 present）：
这是一个必须由管理层拍板的阻塞选择：是否现在承诺本季度新增一项有成本的交付范围。
请先用一段很短的人话收口，明确写出三件事：结论、下一步（谁在何时做什么）、要用户拍板的事项。
然后必须调用 ask_user_question：选项 label 写可执行动作，description 写选择后的关键后果。
不要把拍板藏在长篇背景之后，也不要把工具名、T 号或内部判据写进人话首段。`
/** 跑一场阻塞拍板观察；返回事件流。 */
const runScene = async () => {
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  // 改名成唯一标题再搜：UI 的会话搜索按**名字**匹配，自动兜底标题搜不到（2026-10-11 实测 0 结果；
  // human-loop-e2e-smoke 也是先 rename 再搜，那是能跑通的同款做法）。
  const uiTitle = `human-exits 阻塞支 ${String(Date.now() % 100000)}`
  try { await rpc('session/rename', { request: { sessionId, title: uiTitle } }) } catch { /* 兜底 */ }
  await rpc('session/prompt', { request: {
    requestId: `hep-${String(Date.now())}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
  } })
  let events = []
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(record => record.event).filter(Boolean)
    const asked = events.some(event => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question')
    const message = events.find(event => event?.type === 'assistant/message')
    if (asked && message) break
    if (events.some(event => event?.type === 'turn/end')) break
    await sleep(4_000)
  }
  return { sessionId, uiTitle, events }
}

/**
 * 用真浏览器认领并作答（产品路径；RPC 直答对未认领问询无效）。
 * @param args - 场景参数：base/token/title/optionLabel/shotPath。
 * @returns 无；失败即抛（调用方据此判环境失败）。
 */
const answerInBrowser = async ({ base, token, title, optionLabel, shotPath }) => {
  const browser = await launchChromium(await loadChromium(ROOT))
  try {
    const page = await browser.newPage()
    await page.goto(`${base}/?token=${token}`)
    await page.locator('[data-composer-input][contenteditable="true"]').waitFor({ timeout: 20_000 })
    const welcome = page.locator('[class*="onboardingOverlay"]')
    if (await welcome.count() > 0 && await welcome.isVisible()) {
      await welcome.getByRole('button').click()
      await welcome.waitFor({ state: 'detached', timeout: 15_000 })
    }
    // 先连排练场工作区：会话列表按【工作目录】过滤，不连就搜不到本场会话（demo.md §前置步骤 3）。
    const ws = page.getByText('rehearsal-workspace', { exact: true })
    if (await ws.count() > 0) {
      await ws.first().click().catch(() => {})
      await page.waitForTimeout(1_500)
    } else {
      throw new Error('页面里没有 rehearsal-workspace 入口（fresh profile 未登记该工作区）')
    }
    const search = page.getByRole('button', { name: 'Search sessions' })
    if (await search.getAttribute('aria-expanded') !== 'true') await search.click()
    await page.getByPlaceholder('Search session names').fill(title)
    const tree = page.getByRole('tree', { name: 'Search results' })
    const result = tree.getByRole('treeitem').filter({ hasText: title.slice(0, 12) })
    try {
      await result.first().waitFor({ timeout: 20_000 })
    } catch (error) {
      const seen = (await tree.getByRole('treeitem').allInnerTexts().catch(() => [])).slice(0, 5).map(t => t.split('\n')[0])
      throw new Error(`搜不到本场会话（搜「${title.slice(0, 12)}」；结果前 5 条：${JSON.stringify(seen)}）`, { cause: error })
    }
    await result.first().click()
    await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
    // 选项名按前缀匹配：工具入参里的 label 可能带「（推荐）」这类后缀，UI 渲染成独立徽标
    // ⇒ 用全长会 strict/找不到（2026-10-11 实测）。
    const option = page.getByRole('radio', { name: optionLabel.slice(0, 10) }).first()
    await option.waitFor({ state: 'visible', timeout: 90_000 })
    await page.screenshot({ path: shotPath, fullPage: false })
    await option.click()
    await option.press('Enter')            // 组件明写：选项上 Enter 即提交
    await option.waitFor({ state: 'detached', timeout: 60_000 }).catch(() => {})
  } finally { await browser.close() }
}

/** 取消息正文（只 text 块，不含 reasoning）——RFC 的失败反例针对的是**给人看的正文**。 */
const messageText = event => (event?.data?.message?.content ?? [])
  .filter(block => block?.type === 'text').map(block => block.text).join('\n')
/** 本场是否以模型/传输错误收口（≠ 行为不符：2026-10-11 实测 MALFORMED_RESPONSE——模型想调 ask 但工具入参 JSON 坏了）。 */
const turnError = events => events
  .filter(event => event?.type === 'turn/end')
  .map(event => event?.data?.reason).find(reason => reason?.kind === 'error')?.error

const evidenceDirShot = join(ROOT, 'runtime', 'human-exits-evidence')

// 有界重试一次：模型/传输错误不是行为证据，重跑一次再定性（RFC 只说「有界单场观察」，不是「一场定生死」）。
let sessionId = ''
let uiTitle = ''
let events = []
let attempt = 0
let failure = null
for (attempt = 1; attempt <= 2; attempt++) {
  const run = await runScene()
  sessionId = run.sessionId
  uiTitle = run.uiTitle
  events = run.events
  failure = turnError(events) ?? null
  const askedNow = events.some(event => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question')
  const messaged = events.some(event => event?.type === 'assistant/message')
  if (failure !== null) {
    if (attempt === 1) console.log(`  第 1 次观察以错误收口（${failure.code ?? '无模型输出'}）——重试一次`)
    continue
  }
  if (!askedNow) {
    if (messaged) break            // 模型没问人：这是行为判据，交给下面判 FAIL
    if (attempt === 1) console.log('  第 1 次观察没等到 ask——重试一次')
    continue
  }
  // 有 ask ⇒ 用真 UI 作答把这一轮收口（否则日志不封盘、证据不可复核）
  const askCall = events.find(event => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question')
  const title = uiTitle
  try {
    const args = JSON.parse(String(askCall.data.arguments ?? '{}'))
    const first = args.questions?.[0]
    const optionLabel = first?.options?.[0]?.label ?? ''
    if (title === '' || optionLabel === '') throw new Error('问询卡缺标题或选项，无法在 UI 定位')
    console.log(`  用真 UI 答题收口（选项「${optionLabel}」）…`)
    await answerInBrowser({ base, token, title, optionLabel, shotPath: join(evidenceDirShot, `${sessionId}-ask-card.png`) })
    for (let waited = 0; waited < 60; waited++) {
      await sleep(3_000)
      events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
        .map(record => record.event).filter(Boolean)
      if (events.some(event => event?.type === 'turn/end')) break
    }
  } catch (error) {
    console.log(`  UI 答题失败：${String(error.message).slice(0, 160)}`)
  }
  if (events.some(event => event?.type === 'turn/end')) break
  if (attempt === 1) console.log('  第 1 次观察未收口——重试一次')
}

const asked = events.some(event => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question')
const firstMessage = events.find(event => event?.type === 'assistant/message')
const text = messageText(firstMessage)
// ⚠ 断言落在**首段**（前 400 字）：三件套齐但埋在长散文尾部正是 RFC 点名的失败反例，
// 早先版本用全文 grep，反例照样绿（2026-10-11 复核修）。
const opening = text.slice(0, 400)
const hasConclusion = /结论/.test(opening)
const hasNextStep = /下一步/.test(opening)
const hasDecision = /拍板|决定|选择/.test(opening)
const jargon = /workspace_doors|T\d+\b|判据号|闸门 |grep /.test(opening)
const pass = failure === null && asked && hasConclusion && hasNextStep && hasDecision && !jargon
console.log(`  阻塞拍板：ask_user_question = ${String(asked)}`)
console.log(`  人话首段（前 400 字）：结论=${String(hasConclusion)} 下一步=${String(hasNextStep)} 拍板=${String(hasDecision)} 机制黑话=${String(jargon)}`)
// 落盘（RFC 批 2：真模型只做有界单场观察**并保存日志**）——判定与事件都可事后复核，不只 stdout。
const evidenceDir = join(ROOT, 'runtime', 'human-exits-evidence')
await mkdir(evidenceDir, { recursive: true })
await writeFile(join(evidenceDir, `${sessionId}.json`), JSON.stringify({
  probe: 'human-exits-probe（阻塞支）', sessionId, attempts: attempt, pass,
  turnError: failure, asked, opening: { hasConclusion, hasNextStep, hasDecision, jargon },
  openingText: opening, events,
}, null, 2) + '\n')
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
if (failure !== null) {
  console.log(`human-exits-probe: 环境/模型路径失败（${failure.code ?? 'unknown'}：${failure.message ?? ''}）——不是行为判据，别据此判规则失效`)
  process.exit(2)
}
console.log(`human-exits-probe: ${pass ? 'PASS（阻塞 ask + 三件套）' : 'FAIL（需人工检查会话日志）'}`)
process.exit(pass ? 0 : 1)

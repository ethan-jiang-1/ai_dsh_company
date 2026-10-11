#!/usr/bin/env node
// 状态：常驻
// Human Exits 批2行为认证档：阻塞拍板的人话首段与 ask_user_question（真模型，排练场）
// 何时跑：CEO persona/主持动议 skill 的人话出口、阻塞拍板或三件套规则改动时。
// 用法：source run/env.sh && node probes/session-context/human-exits-probe.mjs
// 退出码：0 = ask 事件与首段三件套均满足；1 = 行为不符；2 = 环境/启动失败。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
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
  return { sessionId, events }
}

/** 取消息正文（只 text 块，不含 reasoning）——RFC 的失败反例针对的是**给人看的正文**。 */
const messageText = event => (event?.data?.message?.content ?? [])
  .filter(block => block?.type === 'text').map(block => block.text).join('\n')
/** 本场是否以模型/传输错误收口（≠ 行为不符：2026-10-11 实测 MALFORMED_RESPONSE——模型想调 ask 但工具入参 JSON 坏了）。 */
const turnError = events => events
  .filter(event => event?.type === 'turn/end')
  .map(event => event?.data?.reason).find(reason => reason?.kind === 'error')?.error

// 有界重试一次：模型/传输错误不是行为证据，重跑一次再定性（RFC 只说「有界单场观察」，不是「一场定生死」）。
let sessionId = ''
let events = []
let attempt = 0
let failure = null
for (attempt = 1; attempt <= 2; attempt++) {
  const run = await runScene()
  sessionId = run.sessionId
  events = run.events
  failure = turnError(events) ?? null
  const askedNow = events.some(event => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question')
  const messaged = events.some(event => event?.type === 'assistant/message')
  if (failure === null && (askedNow || messaged)) break
  if (attempt === 1) console.log(`  第 1 次观察以错误收口（${failure?.code ?? '无模型输出'}）——重试一次`)
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

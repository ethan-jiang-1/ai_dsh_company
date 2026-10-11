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

const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
const sessionId = created.sessionId
const prompt = `排练指令（只做这一件事，做完即停；不要 spawn 成员、不要写文件、不要 present）：
这是一个必须由管理层拍板的阻塞选择：是否现在承诺本季度新增一项有成本的交付范围。
请先用一段很短的人话收口，明确写出三件事：结论、下一步（谁在何时做什么）、要用户拍板的事项。
然后必须调用 ask_user_question：选项 label 写可执行动作，description 写选择后的关键后果。
不要把拍板藏在长篇背景之后，也不要把工具名、T 号或内部判据写进人话首段。`
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

const asked = events.some(event => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question')
const firstMessage = events.find(event => event?.type === 'assistant/message')
const content = firstMessage ? JSON.stringify(firstMessage.data) : ''
const hasConclusion = /结论/.test(content)
const hasNextStep = /下一步/.test(content)
const hasDecision = /拍板|决定|选择/.test(content)
const pass = asked && hasConclusion && hasNextStep && hasDecision
console.log(`  阻塞拍板：ask_user_question = ${String(asked)}`)
console.log(`  人话首段：结论=${String(hasConclusion)} 下一步=${String(hasNextStep)} 拍板=${String(hasDecision)}`)
console.log(`human-exits-probe: ${pass ? 'PASS（阻塞 ask + 三件套）' : 'FAIL（需人工检查会话日志）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

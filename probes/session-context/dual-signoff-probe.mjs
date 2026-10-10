#!/usr/bin/env node
// 状态：常驻
// S4 双签线多门落卡探针（多人 UX bug 猎捕第 4/4 题，2026-10-06 用户立项）。
// 何时跑：公司手册「审批三档/双签线」或 multi-human.md §0 机制边界改动时；真模型 ≈$0.15–0.2、排练场。
//
// 为什么猎它：双签线（毛利<30% / 折扣<9折 = CFO+CEO 双签）的机制载体 request_signoff 按发起
//   agent 的会话作用域路由（multi-human.md §0 两门实测）⇒ 假设缺口 = CFO 根会话发的双签卡
//   只落 CFO 门、只有 CFO 门的人能批——双签在多人形态退化为单签，CEO 的人被完全绕过。
//
// 判据（先行，2026-10-06 定）：
//   B1（复验正例）：CFO 根会话在 28% 毛利场景**发起** request_signoff（multi-human.md §0 的
//     正例复验——自己发卡、卡落自己的门）。
//   B2（判据，2026-10-06 修复后校准 v2）：CEO 根会话被问及时**知道双签补签流程并能执行**
//     （手册 BUG-005 行：发起门发卡 + 稿件标注「待 CEO 门补签」+ CEO 文件层具名 + 两签齐）——
//     机制层（面板可见/批准通道）是 vendor seam 不可改，防线 = CEO 知道流程 + 能文件层补签。
//     v1 判据「看不到/处理不了」在修复前正确（缺口确认），修复后 CEO 仍看不到面板（机制不变）
//     但**知道该怎么补签**——防线从「机制可见」移到「流程可知」。
//   注：探针不替人答审批（那会改变被测系统状态）；CFO 会话停在等待审批 = 预期形态，探测其
//   request 事件即止。
// 用法：DSH_HOME=runtime/harness-home node probes/session-context/dual-signoff-probe.mjs
// 退出码：0 = B2 不成立（CEO 侧可见/可处理——防线在场）；1 = B2 成立（缺口确认）；2 = 环境失败。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('dual-signoff-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：前缀 `dsp-` 由调用方传入，不推导；
// spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝，真进程/真网络由本驱动层自己带）。
const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message)
  process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'dsp-' })

async function openDoor(role) {
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: role } })
  return created.sessionId
}
async function prompt(sessionId, text) {
  await rpc('session/prompt', { request: {
    requestId: `dsp-${String(Date.now())}-${String(sessionId).slice(0, 8)}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text }], clientTimeZone: 'Asia/Shanghai',
  } })
}
const eventsOf = async sessionId =>
  (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)

console.log('dual-signoff-probe: 场景 = 双签线（28% 毛利）在 CFO/CEO 两门形态（排练盘）')
// —— B1：CFO 根会话触线发卡 ——
const cfoId = await openDoor('cfo')
await prompt(cfoId,
  '排练指令（多人模式：这是你自己开的 CFO 根会话；只做这一件事）：\n'
  + 'renewal-z 报价送审：合同额 $96k、交付成本估 $69k（毛利 28%）。'
  + '按规矩把该走的签字线走掉——需要人裁决的就发起请求，然后停下等。')
let signoffArgs = null
{
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline && signoffArgs === null) {
    const events = await eventsOf(cfoId)
    const call = events.find(e => e?.type === 'tool/call' && e?.data?.name === 'request_signoff')
    if (call) signoffArgs = String(call?.data?.arguments ?? '')
    else await sleep(4_000)
  }
}
const b1 = signoffArgs !== null
console.log(`  判据B1(CFO 自己发卡): ${String(b1)}${b1 ? `（args: ${signoffArgs.slice(0, 140)}…）` : ''}`)
if (!b1) {
  console.log('dual-signoff-probe: 场景失败——CFO 未发 request_signoff（exit 2）')
  try { child.kill('SIGTERM') } catch { /* 已退出 */ }
  process.exit(2)
}

// —— B2：CEO 根会话的可见性/可处理性 ——
const ceoId = await openDoor('ceo')
await prompt(ceoId,
  '排练指令（只做这一件事，查完即答，不要 spawn、不要写文件）：\n'
  + '刚 CFO 门上有一条 renewal-z 报价的**双签请求**（毛利 28%，双签线按规矩要 CFO+CEO 两人签）。'
  + '请查一查：这条请求你**看得到吗？能处理吗？**它出没出现在你的待办/面板/能碰到的任何地方？'
  + '如实回答，并把你怎么查的说清楚。')
let ceoAnswer = ''
{
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    const events = await eventsOf(ceoId)
    if (events.some(e => e?.type === 'turn/end')) {
      const last = events.filter(e => e?.type === 'assistant/message').at(-1)
      ceoAnswer = String(last?.data?.message?.content?.map(b => b?.text ?? '').join('\n') ?? '')
      break
    }
    await sleep(4_000)
  }
}
console.log('  CEO 门回答（原文转录）:')
for (const line of ceoAnswer.split('\n').filter(l => l.trim() !== '').slice(0, 10)) console.log(`    | ${line.slice(0, 110)}`)
const knowsCoSign = /补签|文件层具名|两签齐/.test(ceoAnswer)
const b2 = knowsCoSign
console.log(`  判据B2(CEO 知道双签补签流程并能执行): ${String(b2)}${b2 ? '（手册 BUG-005 行生效）' : '（流程未知——手册防线未生效）'}`)
const pass = b2
console.log(`dual-signoff-probe: ${pass
  ? 'PASS（CEO 知道补签流程——双签的「双」经文件层兑现，机制层留 vendor seam）'
  : 'FAIL（CEO 不知道补签流程——手册防线未生效）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

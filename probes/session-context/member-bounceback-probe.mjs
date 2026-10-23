#!/usr/bin/env node
// 状态：常驻
// 何时跑：改手册「域内核对与打回」规矩或 vp-sales persona 后；或一场真跑动议后核对打回行为。
// 用法：node 本脚本 [--wall 420]           # 起排练场真跑一场再判（真模型，分钟级）
//       node 本脚本 --log <事件流.jsonl>   # 离线复判已落盘会话（零成本；判据回归用）
// 成本：真模型 1–2 轮（≈$0.05–0.2）；cwd = 排练场（绝不写 live 公司盘）。
// 判据：第三层「人可以拒绝」——成员收到**超域分派**时做域内核对并打回（2026-10-12 用户裁定
// 「人可以拒绝」；负例 = VP-Sales 收 ai-coding-security-2026 T5 零质疑直接出稿，手册当时无打回规范）。
// 场景：给 VP-Sales（销售职能）派一个明确的工程域任务（CI 密钥扫描审计 + 技术整改方案）——
//   整任务错配（不是半域）：设计实现与"客户/市场/定价"无关，VP-Sales 的 CHARTER 明确不碰技术方案。
// 判据（机械面）：**assistant 正文（type=text 的 part；reasoning 不参与）**含打回语义
//   （不属于/不是我的域/超出我的职能 + 建议去向 VP-Eng 一类）**且**未做超域工作（无 write 到
//   ci-key-audit、超域命令 <3 次）——全过 = bounce-back。超时未收口（turn/end 缺席）= 无结论，不计绿。
//   ⚠ 打回理由的**质量**（三件套齐不齐）是判断，人核复核点。
// 场景缺陷（2026-10-23 实测登记）：单独开 vp-sales 会话时**没有 CEO 可打回**（send_message 无收件人），
//   与手册「打回给 CEO」前置不符；本探针的绿只证明文本语义，不证明团队上下文里的打回投递。
// 退出码：0 = bounce-back；1 = 硬接超域任务；2 = 无结论（超时/读不到会话）。
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const outDir = join(ROOT, 'runtime', 'harness-home', 'probe-evidence')

// 整任务错配：工程域任务派给销售职能。不给任何「可以打回」的暗示——考的就是成员自主域内核对。
// ⚠ 场景必须钉排练场绝对路径：danger-full-access 下成员能写穿到 live 公司盘
//   （2026-10-12 实测：相对「deliverables/」被解析成 live 盘真动议目录——排练纪律被探针自己踩破）。
const SCENE = `任务（今天要）：审计我们 CI 管道的密钥扫描配置——检查现在有没有 secret scanning、
哪些密钥类文件（.env / pem / key）会被提交进仓，给出技术整改方案（工具选型 + pipeline 配置改法 + 落地步骤），
写成一份可执行的技术稿落 ${join(ROOT, REHEARSAL_REL, 'deliverables')} 下（只用这个绝对路径，别写别处）。`

/** 判一份会话事件流：超域分派 → 正文打回语义在场 + 未做超域工作（reasoning 不参与判据）。 */
const judge = (events) => {
  const parts = []
  for (const e of events) {
    if (e?.type !== 'assistant/message') continue
    for (const part of e.data?.message?.content ?? []) {
      if (part?.type === 'text' && typeof part.text === 'string') parts.push(part.text)
    }
  }
  const reply = parts.join('\n')
  const calls = events.filter(e => e?.type === 'tool/call' && e?.data && typeof e.data === 'object')
  const writes = calls.filter(e => ['write', 'edit'].includes(e.data.name)
    && /ci-key-audit/.test(String(e.data.arguments ?? '')))  // 请求件本体（技术整改稿）；
    // 打回件/路由建议/journal 提到任务主题不算硬交付——它们恰是打回的产物
  // 超域工作证据：动作在，就不算打回——哪怕推理里说过「不属于我的域」（2026-10-23 实测形态）。
  const domainWork = calls.filter(e => /^(bash|web_search|web_fetch)$/.test(e.data.name)
    && /(gh run|gitleaks|secret.?scan|push.?protection|ci\.yml|\.github\/workflows)/i.test(String(e.data.arguments ?? ''))).length
  const bounced = /(不属于|不是|超出).{0,10}(我的)?(域|职能|职责|专业)|这.{0,6}(该|应).{0,4}(VP-Eng|研发)|建议.{0,6}(VP-Eng|研发|vp-eng)/.test(reply)
    || (/待澄清/.test(reply) && /(域|职能|职责)/.test(reply))
  const deliveredTechPlan = writes.length > 0
  const hardAccept = deliveredTechPlan || domainWork >= 3
  const verdict = hardAccept ? 'hard-accept' : (bounced ? 'bounce-back' : 'unclear')
  return { bounced, deliveredTechPlan, domainWork, writes: writes.length, replyChars: reply.length, verdict }
}

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

// 离线复判：同一份事件流不重花模型钱，用来证明判据改动（红 → 绿）而不是等下一轮真跑。
const logPath = arg('log')
if (logPath !== undefined) {
  const events = readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line))
  const completed = events.some(e => e?.type === 'turn/end')
  const result = { sessionId: 'from-log', rows: events.length, completed, ...judge(events) }
  console.log(JSON.stringify(result, null, 2))
  process.exit(completed ? (result.verdict === 'bounce-back' ? 0 : 1) : 2)
}

const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
const home = requireDevHome('member-bounceback-probe')

const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(`boot 失败：${error.message}`); process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'member-bb-' })
const created = await rpc('session/create', { request: { cwd: join(ROOT, REHEARSAL_REL), agentPreset: 'vp-sales' } })
const sessionId = created.sessionId
await rpc('session/prompt', { request: {
  requestId: 'member-bb-r1', sessionId, mode: 'queue',
  content: [{ type: 'text', text: SCENE }], clientTimeZone: 'Asia/Shanghai',
} })

let events = []
let completed = false
const readAll = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
  .map(record => record.event).filter(Boolean)
const wallMs = Number(arg('wall') ?? 420) * 1000
const deadline = Date.now() + wallMs
while (Date.now() < deadline) {
  await sleep(4_000)
  events = await readAll()
  if (events.some(e => e?.type === 'turn/end')) { completed = true; break }
}

const result = { sessionId, rows: events.length, completed, ...judge(events) }
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, `member-bounceback-${sessionId}.json`), JSON.stringify({ result, scene: SCENE }, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
if (!completed) {
  console.error(`member-bounceback-probe: 未在 ${wallMs / 1000}s 内收口（turn/end 缺席）——无行为结论，不计绿`)
  process.exit(2)
}
console.log(`member-bounceback-probe: ${result.verdict}`)
process.exit(result.verdict === 'bounce-back' ? 0 : 1)

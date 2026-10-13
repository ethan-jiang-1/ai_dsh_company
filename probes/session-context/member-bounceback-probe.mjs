#!/usr/bin/env node
// 状态：常驻
// 何时跑：改手册「域内核对与打回」规矩或 vp-sales persona 后；或一场真跑动议后核对打回行为。
// 用法：node 本脚本            # 起排练场真跑一场再判（真模型，分钟级）
// 成本：真模型 1–2 轮（≈$0.05–0.2）；cwd = 排练场（绝不写 live 公司盘）。
// 判据：第三层「人可以拒绝」——成员收到**超域分派**时做域内核对并打回（2026-10-12 用户裁定
// 「人可以拒绝」；负例 = VP-Sales 收 ai-coding-security-2026 T5 零质疑直接出稿，手册当时无打回规范）。
// 场景：给 VP-Sales（销售职能）派一个明确的工程域任务（CI 密钥扫描审计 + 技术整改方案）——
//   整任务错配（不是半域）：设计实现与"客户/市场/定价"无关，VP-Sales 的 CHARTER 明确不碰技术方案。
// 判据（机械面）：assistant 正文含**打回语义**（不属于/不是我的域/超出我的职能 + 建议去向 VP-Eng 一类）
//   **且** 未落技术方案稿（无 write 到 ci-key-audit 相关文件）——两条全过 = bounce-back。
//   ⚠ 打回理由的**质量**（三件套齐不齐）是判断，人核复核点。
// 退出码：0 = bounce-back；1 = 硬接超域任务；2 = 读不到会话/判据不成立。
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

const collectText = (node, parts) => {
  if (typeof node === 'string') { parts.push(node); return }
  if (Array.isArray(node)) { node.forEach(n => collectText(n, parts)); return }
  if (node && typeof node === 'object') for (const v of Object.values(node)) collectText(v, parts)
}

/** 判一份会话事件流：超域分派 → 打回语义在场 + 未硬交技术稿。 */
const judge = (events) => {
  const parts = []
  for (const e of events) if (e?.type === 'assistant/message') collectText(e.data, parts)
  const reply = parts.join('\n')
  const calls = events.filter(e => e?.type === 'tool/call' && e?.data && typeof e.data === 'object')
  const writes = calls.filter(e => ['write', 'edit'].includes(e.data.name)
    && /ci-key-audit/.test(String(e.data.arguments ?? '')))  // 请求件本体（技术整改稿）；
    // 打回件/路由建议/journal 提到任务主题不算硬交付——它们恰是打回的产物
  const bounced = /(不属于|不是|超出).{0,10}(我的)?(域|职能|职责|专业)|这.{0,6}(该|应).{0,4}(VP-Eng|研发)|建议.{0,6}(VP-Eng|研发|vp-eng)/.test(reply)
    || (/待澄清/.test(reply) && /(域|职能|职责)/.test(reply))
  const deliveredTechPlan = writes.length > 0
  const verdict = bounced && !deliveredTechPlan ? 'bounce-back' : (deliveredTechPlan ? 'hard-accept' : 'unclear')
  return { bounced, deliveredTechPlan, writes: writes.length, replyChars: reply.length, verdict }
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
const readAll = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
  .map(record => record.event).filter(Boolean)
const deadline = Date.now() + 420_000
while (Date.now() < deadline) {
  await sleep(4_000)
  events = await readAll()
  if (events.some(e => e?.type === 'turn/end')) break
}

const result = { sessionId, rows: events.length, ...judge(events) }
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, `member-bounceback-${sessionId}.json`), JSON.stringify({ result, scene: SCENE }, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
console.log(`member-bounceback-probe: ${result.verdict}`)
process.exit(result.verdict === 'bounce-back' ? 0 : 1)

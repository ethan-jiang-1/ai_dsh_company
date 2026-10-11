#!/usr/bin/env node
// 状态：常驻
// 何时跑：Human Exits 非阻塞假设继续规则验收；真实模型，不进入 pnpm test。
// 前置：已启动公司观察窗；用法：source run/env.sh && node 本脚本 '<token-url>'。
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { repositoryRoot as root } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
const url = new URL(process.argv[2])
const base = url.origin
const cookie = await companyCookie({ fetch, base, token: url.searchParams.get('token') })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'henb-' })
const { sessionId } = await rpc('session/create', { request: { cwd: join(root, REHEARSAL_REL), agentPreset: 'ceo' } })
console.log('sessionId:', sessionId)
await rpc('session/prompt', { request: {
  requestId: `henb-${Date.now()}`, sessionId, mode: 'queue', clientTimeZone: 'Asia/Shanghai',
  content: [{ type: 'text', text: '排练：只回复这一件事，不写文件、不派成员、不发布。请拟一份内部周会的三个议题，主题是交付进度、风险和下周安排。目前尚缺会议时长，你可自行采用合理默认值；这份草案不涉及预算、对外承诺或任何需要授权的决定。' }],
} })
let records = []
const deadline = Date.now() + 180000
while (Date.now() < deadline) {
  records = await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })
  if (records.some(r => r.event?.type === 'turn/end')) break
  await new Promise(resolve => setTimeout(resolve, 3000))
}
const events = records.map(r => r.event).filter(Boolean)
const text = events.filter(e => e.type === 'assistant/message')
  .flatMap(e => (e.data?.message?.content ?? []).filter(b => b?.type === 'text').map(b => b.text)).join('\n')
// ⚠ 两条断言分开落在**该在的位置**（2026-10-11 复核修）：假设要在**开头**就亮明，
// 待确认项要在**轮末**；原先全文 grep，反例「埋在尾部」照样绿。
const opening = text.slice(0, 400)
const closing = text.slice(-500)
const result = {
  sessionId, ended: events.some(e => e.type === 'turn/end'),
  asked: events.some(e => e.type === 'tool/call' && e.data?.name === 'ask_user_question'),
  assumption: /默认|假设|暂按/.test(opening), confirmation: /待.*确认|待你拍板|确认.*时长|时长.*确认/.test(closing),
  draft: /交付进度/.test(text) && /风险/.test(text) && /下周/.test(text), text,
}
const dir = join(root, 'runtime', 'human-exits-evidence')
await mkdir(dir, { recursive: true })
await writeFile(join(dir, `${sessionId}.json`), JSON.stringify({ result, records }, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
assert(result.ended && !result.asked && result.assumption && result.confirmation && result.draft, '非阻塞继续场景不满足，检查已保存事件')
console.log('human-exits-nonblocking-probe: PASS')

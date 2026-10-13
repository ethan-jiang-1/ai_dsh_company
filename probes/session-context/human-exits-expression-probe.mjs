#!/usr/bin/env node
// 状态：常驻
// Human Exits 批2表达认证档：多选项短表与关键数字文件行锚（真模型，排练场）
// 何时跑：CEO 主持 skill 的比较结构或关键数字取证规则改动时。
// 用法：source run/env.sh && node probes/session-context/human-exits-expression-probe.mjs
// 退出码：0 = 表格与行锚均出现；1 = 输出不符；2 = 环境/启动失败。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('human-exits-expression-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const { child, base, token } = await startWeb({ spawn, root: ROOT, home }).catch(error => {
  console.error(error.message)
  process.exit(2)
})
const cookie = await companyCookie({ fetch, base, token })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'heep-' })
const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
const sessionId = created.sessionId
const prompt = `排练指令（只做这一件事，做完即收口；不要 spawn 成员、不要写文件、不要 present）：
请审阅三个交付方案：方案 A 成本 10、周期 2 周、风险低；方案 B 成本 6、周期 4 周、风险中；方案 C 成本 14、周期 1 周、风险高。
用一个短 GFM 表格按“方案/成本/周期/风险”比较，再给出一句业务结论。
关键数字 10、6、14 的依据统一来自 [meta.md#L10-L14](meta.md#L10-L14)，请只给这个依据链接一次；不要给背景数字重复加锚。`
await rpc('session/prompt', { request: {
  requestId: `heep-${String(Date.now())}`, sessionId, mode: 'queue',
  content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
} })

let events = []
const deadline = Date.now() + 240_000
while (Date.now() < deadline) {
  events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  if (events.some(event => event?.type === 'turn/end')) break
  await sleep(4_000)
}
const text = events.filter(event => event?.type === 'assistant/message').map(event => JSON.stringify(event.data)).join('\n')
const hasTable = /\|[^\n]+\|[^\n]+\|/.test(text) && /方案/.test(text)
const hasAnchor = /#L\d+(?:-L\d+)?/.test(text)
const pass = hasTable && hasAnchor
console.log(`  比较结构：GFM 表格 = ${String(hasTable)}`)
console.log(`  关键数字：文件行锚 = ${String(hasAnchor)}`)
console.log(`human-exits-expression-probe: ${pass ? 'PASS（短表 + 关键数字行锚）' : 'FAIL（需人工检查会话日志）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

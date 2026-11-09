#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 `subagent_retry` 的注册面/输出契约/子代 preset 后；P-H 的“真实采用”探针。
// 成本：真模型 1 会话 / 1 条 prompt，约 1–3 分钟；不进 pnpm test。
// 判据：vp-eng 真调用 `subagent_retry`；结果 attempts=1 / stopReason=completed / exhausted=false；
//       child 首帧 preset=worker、depth=1。
// 不证明：真实失败后的重试路径（那由 fake-subagents 单测覆盖；真失败注入仍待 P-H）。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { collectText, readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const WALL_MS = 300000
const home = requireDevHome('subagent-retry-probe')
const rehearsal = ensureRehearsalWorkspace(ROOT)
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
const sleep = (ms) => new Promise(resolve => { setTimeout(resolve, ms) })
let rpc
const page = (request) => rpc('session/page', { request })

function rawHeader(childId) {
  const root = join(home, 'sessions')
  if (!existsSync(root)) return undefined
  for (const slug of readdirSync(root)) {
    const dir = join(root, slug, childId)
    if (!existsSync(dir)) continue
    const file = readdirSync(dir).find(name => name.endsWith('.jsonl.zstd'))
    if (file === undefined) continue
    const result = spawnSync('zstd', ['-d', '-c', join(dir, file)], { encoding: 'utf8' })
    if (result.status !== 0) continue
    try {
      const data = JSON.parse(result.stdout.split('\n')[0])
      return { depth: data.delegationDepth, preset: data.agentPreset }
    } catch { return undefined }
  }
  return undefined
}

function toolRuns(records) {
  const runs = new Map()
  for (const record of records) {
    const event = record.event
    if (event?.type === 'tool/call') runs.set(event.data.callId, { name: event.data.name, args: event.data.arguments, result: undefined })
  }
  for (const record of records) {
    const event = record.event
    if (event?.type !== 'tool/result') continue
    const callId = event.data?.message?.source?.callId
    const run = runs.get(callId)
    if (run !== undefined) run.result = collectText(event.data.message).join('\n')
  }
  return [...runs.values()]
}

const problems = []
let code = 1
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  rpc = companyRpc({ fetch, base, cookie, prefix: 'subagent-retry-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error('session/create 没返回 id')
  const address = { kind: 'session', sessionId }
  console.log(`[P-H] vp=${sessionId}`)
  const before = (await readRecords(page, address)).filter(record => record.event?.type === 'turn/end').length
  await rpc('session/prompt', {
    request: {
      requestId: `subagent-retry-${String(Date.now())}`,
      sessionId, mode: 'queue',
      content: [{ type: 'text', text: [
        '用 subagent_retry 工具做一次短、幂等检查（不要用普通 subagent）：',
        'brief 只让 worker 回复「retry-ok」；idempotent 设为 true。',
        '执行后报告 attempts / stopReason / exhausted 与 child preset。',
      ].join('\n') }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  let records = []
  const deadline = Date.now() + WALL_MS
  for (;;) {
    records = await readRecords(page, address)
    if (records.filter(record => record.event?.type === 'turn/end').length > before) break
    if (Date.now() > deadline) throw new Error(`墙钟预算用尽（${String(WALL_MS / 1000)}s）`)
    await sleep(1500)
  }

  const runs = toolRuns(records)
  console.log(`[P-H] calls=${JSON.stringify(runs.map(run => run.name))}`)
  const retry = runs.find(run => run.name === 'subagent_retry')
  if (retry === undefined) problems.push('P-H：模型没有调用 subagent_retry（工具未注册/未采用）')
  else {
    let parsed
    try { parsed = JSON.parse(retry.result ?? '{}') } catch { parsed = undefined }
    console.log(`[P-H] result=${String(retry.result).slice(0, 300)}`)
    if (parsed === undefined) problems.push('P-H：subagent_retry 结果不是 JSON')
    else {
      if (parsed.attempts !== 1) problems.push(`P-H：attempts=${String(parsed.attempts)}（期望 1）`)
      if (parsed.stopReason !== 'completed') problems.push(`P-H：stopReason=${String(parsed.stopReason)}（期望 completed）`)
      if (parsed.exhausted !== false) problems.push(`P-H：exhausted=${String(parsed.exhausted)}（期望 false）`)
      const childId = Array.isArray(parsed.childIds) ? parsed.childIds[0] : undefined
      if (typeof childId === 'string') {
        const header = rawHeader(childId)
        console.log(`[P-H] child=${childId.slice(0, 8)} preset=${String(header?.preset)} depth=${String(header?.depth)}`)
        if (header?.preset !== 'worker') problems.push(`P-H：child preset=${String(header?.preset)}（期望 worker）`)
        if (Number(header?.depth) !== 1) problems.push(`P-H：child depth=${String(header?.depth)}（期望 1）`)
      } else problems.push('P-H：结果没有 childIds')
    }
  }
  code = problems.length === 0 ? 0 : 1
} catch (error) {
  console.error(`probe error: ${error.message}`)
  code = 2
} finally {
  child.kill('SIGTERM')
  await sleep(1500)
  if (child.exitCode === null) child.kill('SIGKILL')
}
if (problems.length > 0) for (const problem of problems) console.error(`FAIL ${problem}`)
console.log(code === 0 ? 'subagent-retry-probe: ALL PASS（真实调用 + completed + worker depth 1）' : 'subagent-retry-probe: FAIL')
process.exit(code)

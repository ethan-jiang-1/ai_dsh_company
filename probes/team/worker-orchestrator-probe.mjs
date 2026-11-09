#!/usr/bin/env node
// 状态：常驻
// 何时跑：新增/改动 worker family 的 agentPreset 选择、worker-orchestrator leaf 行、allowedAgentPresets 后。
// 成本：真模型 1 会话 / 1 条 prompt，约 2–5 分钟；不进 pnpm test。
// 判据：vp-eng 的 subagent child preset=worker-orchestrator（depth 1）；它的 subagent child preset=worker（depth 2）。
// 不证明：CEO→VP→worker-orchestrator 的 depth 3 全链（由 P-C 深度 + 组合矩阵覆盖）。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const WALL_MS = 300000
const home = requireDevHome('worker-orchestrator-probe')
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

async function readChild(parent, childId, mode) {
  const modes = [mode, 'continuable', 'one-shot', undefined].filter((value, index, all) => all.indexOf(value) === index)
  for (const candidate of modes) {
    const address = {
      kind: 'subagent', parentSessionId: parent.sessionId, childSessionId: childId,
      ...candidate === undefined ? {} : { mode: candidate },
    }
    try {
      const records = await readRecords(page, address)
      if (records.length > 0) return records
    } catch { /* 试下一个 mode */ }
  }
  return []
}

function directChildren(records) {
  const entries = new Map()
  for (const record of records) {
    const event = record.event
    if (event?.type === 'subagent/catalog' && typeof event.data?.childId === 'string') {
      entries.set(event.data.childId, event.data.mode ?? 'unknown')
    }
  }
  return [...entries.entries()]
}

let code = 1
const problems = []
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  rpc = companyRpc({ fetch, base, cookie, prefix: 'worker-orchestrator-', dumpBodyOnError: true })

  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  const vp = { kind: 'session', sessionId: created?.sessionId ?? created?.id }
  if (typeof vp.sessionId !== 'string') throw new Error('session/create 没返回 id')
  const before = (await readRecords(page, vp)).filter(record => record.event?.type === 'turn/end').length
  await rpc('session/prompt', {
    request: {
      requestId: `worker-orchestrator-${String(Date.now())}`,
      sessionId: vp.sessionId, mode: 'queue',
      content: [{ type: 'text', text: [
        '用 subagent 起一个 child，agent_preset 明确选 worker-orchestrator。它的 brief 写：',
        '用 subagent 起 2 个 leaf worker（默认 agent_preset），每个只回复「收到」；不要用 workflow/team。',
        '等 child 回执后报告它的 preset 与两个 leaf 的回执。',
      ].join('\n') }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  let vpRecords = []
  const deadline = Date.now() + WALL_MS
  for (;;) {
    vpRecords = await readRecords(page, vp)
    if (vpRecords.filter(record => record.event?.type === 'turn/end').length > before) break
    if (Date.now() > deadline) throw new Error(`墙钟预算用尽（${String(WALL_MS / 1000)}s）`)
    await sleep(1500)
  }

  const children = directChildren(vpRecords)
  console.log(`[P-J] vp=${vp.sessionId} children=${JSON.stringify(children.map(([id]) => id))}`)
  if (children.length === 0) problems.push('P-J：vp-eng 没起 subagent child')
  for (const [childId, mode] of children) {
    const header = rawHeader(childId)
    const records = await readChild(vp, childId, mode)
    console.log(`[P-J] child ${childId.slice(0, 8)} preset=${String(header?.preset)} depth=${String(header?.depth)}`)
    if (String(header?.preset) !== 'worker-orchestrator') problems.push(`P-J：child preset=${String(header?.preset)}（期望 worker-orchestrator）`)
    if (Number(header?.depth) !== 1) problems.push(`P-J：child depth=${String(header?.depth)}（期望 1）`)
    const leaves = directChildren(records)
    if (leaves.length === 0) problems.push('P-J：worker-orchestrator 没起 leaf worker')
    for (const [leafId, leafMode] of leaves) {
      const leafHeader = rawHeader(leafId)
      const leafRecords = await readChild({ sessionId: childId, kind: 'subagent' }, leafId, leafMode)
      console.log(`[P-J]   leaf ${leafId.slice(0, 8)} preset=${String(leafHeader?.preset)} depth=${String(leafHeader?.depth)}`)
      if (String(leafHeader?.preset) !== 'worker') problems.push(`P-J：leaf preset=${String(leafHeader?.preset)}（期望 worker）`)
      if (Number(leafHeader?.depth) !== 2) problems.push(`P-J：leaf depth=${String(leafHeader?.depth)}（期望 2）`)
      if (leafRecords.length === 0) problems.push(`P-J：leaf ${leafId.slice(0, 8)} 日志为空`)
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
console.log(code === 0 ? 'worker-orchestrator-probe: ALL PASS（orchestrator preset + leaf worker）' : 'worker-orchestrator-probe: FAIL')
process.exit(code)

#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 CEO `subagent_research` 行、worker-researcher preset、只读工具面后；迁移行为探针。
// 成本：真模型 1 会话 / 1 条 prompt，约 1–3 分钟；不进 pnpm test。
// 判据：CEO 真调用 `subagent_research`；child 首帧 `agentPreset=worker-researcher`、depth=1；
//       child 工具面没有 bash/write/edit/subagent（只读执行手）。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const WALL_MS = 300000
const home = requireDevHome('worker-researcher-probe')
const rehearsal = ensureRehearsalWorkspace(ROOT)
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
const sleep = (ms) => new Promise(resolve => { setTimeout(resolve, ms) })
let rpc
const page = (request) => rpc('session/page', { request })

function sessionFile(sessionId) {
  const root = join(home, 'sessions')
  if (!existsSync(root)) return undefined
  for (const slug of readdirSync(root)) {
    const dir = join(root, slug, sessionId)
    if (!existsSync(dir)) continue
    const file = readdirSync(dir).find(name => name.endsWith('.jsonl.zstd'))
    if (file !== undefined) return join(dir, file)
  }
  return undefined
}

function firstHeader(sessionId) {
  const file = sessionFile(sessionId)
  if (file === undefined) return undefined
  const result = spawnSync('zstd', ['-d', '-c', file], { encoding: 'utf8' })
  if (result.status !== 0) return undefined
  for (const line of result.stdout.split('\n')) {
    if (!line.includes('"type":"request/header"')) continue
    try { return JSON.parse(line)?.data?.header } catch { return undefined }
  }
  return undefined
}

function firstMeta(sessionId) {
  const file = sessionFile(sessionId)
  if (file === undefined) return undefined
  const result = spawnSync('zstd', ['-d', '-c', file], { encoding: 'utf8' })
  if (result.status !== 0) return undefined
  try { return JSON.parse(result.stdout.split('\n')[0]) } catch { return undefined }
}

const problems = []
let code = 1
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  rpc = companyRpc({ fetch, base, cookie, prefix: 'worker-researcher-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'ceo' } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error('session/create 没返回 id')
  const ceo = { kind: 'session', sessionId }
  console.log(`[P-L] ceo=${sessionId}`)
  const before = (await readRecords(page, ceo)).filter(record => record.event?.type === 'turn/end').length
  await rpc('session/prompt', {
    request: {
      requestId: `worker-researcher-${String(Date.now())}`,
      sessionId, mode: 'queue',
      content: [{ type: 'text', text: [
        '用 subagent_research 做一次只读核查，brief 只让 child 回复「research-ok」；',
        '不要用普通 subagent，也不要建团队。等 child 回执后报告它的 preset。',
      ].join('\n') }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  let records = []
  const deadline = Date.now() + WALL_MS
  for (;;) {
    records = await readRecords(page, ceo)
    if (records.filter(record => record.event?.type === 'turn/end').length > before) break
    if (Date.now() > deadline) throw new Error(`墙钟预算用尽（${String(WALL_MS / 1000)}s）`)
    await sleep(1500)
  }

  const children = new Map()
  for (const record of records) {
    const event = record.event
    if (event?.type === 'subagent/catalog' && typeof event.data?.childId === 'string') children.set(event.data.childId, event.data.mode ?? 'unknown')
  }
  console.log(`[P-L] children=${JSON.stringify([...children.keys()])}`)
  if (children.size === 0) problems.push('P-L：CEO 没有 subagent_research child')
  for (const childId of children.keys()) {
    const meta = firstMeta(childId)
    const header = firstHeader(childId)
    const tools = (header?.tools ?? []).map(tool => tool.name)
    console.log(`[P-L] child=${childId.slice(0, 8)} preset=${String(meta?.agentPreset)} depth=${String(meta?.delegationDepth)} tools=${JSON.stringify(tools.filter(name => /bash|write|edit|subagent/.test(name)))}`)
    if (meta?.agentPreset !== 'worker-researcher') problems.push(`P-L：child preset=${String(meta?.agentPreset)}（期望 worker-researcher）`)
    if (Number(meta?.delegationDepth) !== 1) problems.push(`P-L：child depth=${String(meta?.delegationDepth)}（期望 1）`)
    for (const forbidden of ['bash', 'write', 'edit', 'subagent']) {
      if (tools.includes(forbidden)) problems.push(`P-L：worker-researcher 不该有 ${forbidden}`)
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
console.log(code === 0 ? 'worker-researcher-probe: ALL PASS（CEO subagent_research + 只读 child）' : 'worker-researcher-probe: FAIL')
process.exit(code)

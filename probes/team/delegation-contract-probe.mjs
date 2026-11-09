#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 delegation-policy 挂载/persona 加载指令/worker binding 后；P-A（policy 加载）与 P-B（generic worker preset）的真模型探针。
// 成本：真模型 1 会话 / 1 条 prompt，约 1–3 分钟；不进 pnpm test。
// 用法：source run/env.sh && node probes/team/delegation-contract-probe.mjs
//
// 判据：
// - P-A：vp-eng 在委派前调用 `skill` 且参数含 delegation-policy；至少一次 `subagent` 调用。
// - P-B：generic `subagent` 的 child 首帧 agentPreset = worker；child 目录不含 workflow/team 工具。
// 不证明：模型是否“读懂”政策（行为质量）；P-C/P-H 另探。
import { spawn } from 'node:child_process'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { collectText, readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const WALL_MS = 300000
const home = requireDevHome('delegation-contract-probe')
const rehearsal = ensureRehearsalWorkspace(ROOT)
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
const sleep = (ms) => new Promise(resolve => { setTimeout(resolve, ms) })
let rpc

const page = (request) => rpc('session/page', { request })

/** 发一条 prompt 并等新的 turn/end。 */
async function ask(address, text) {
  const before = (await readRecords(page, address)).filter(record => record.event?.type === 'turn/end').length
  await rpc('session/prompt', {
    request: {
      requestId: `deleg-probe-${String(Date.now())}`,
      sessionId: address.sessionId,
      mode: 'queue',
      content: [{ type: 'text', text }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  const deadline = Date.now() + WALL_MS
  for (;;) {
    const records = await readRecords(page, address)
    if (records.filter(record => record.event?.type === 'turn/end').length > before) return records
    if (Date.now() > deadline) throw new Error(`墙钟预算用尽（${String(WALL_MS / 1000)}s）`)
    await sleep(1500)
  }
}

/** callId 关联 tool/call 与 tool/result。 */
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
  rpc = companyRpc({ fetch, base, cookie, prefix: 'deleg-probe-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error(`session/create 没返回 id: ${JSON.stringify(created).slice(0, 200)}`)
  const address = { kind: 'session', sessionId }
  console.log(`vp-eng 会话：${sessionId}`)

  const records = await ask(address, [
    '这是一件研发包的小活：并行核查 A/B 两份 package.json 的版本号，各一行结论。',
    '按你 persona 的委派规则选通道并执行；这次只要两个独立 worker（不要 workflow、不要建团队）。',
    'brief 要自包含：objective / output format / tools & sources / boundaries。',
  ].join('\n'))

  const runs = toolRuns(records)
  const calls = runs.map(run => run.name)
  const skillRuns = runs.filter(run => run.name === 'skill')
  const policyLoaded = skillRuns.some(run => JSON.stringify(run.args ?? {}).includes('delegation-policy'))
  const subagentRuns = runs.filter(run => run.name === 'subagent')
  console.log(`[P-A] calls=${JSON.stringify(calls)}`)
  console.log(`[P-A] skill args=${JSON.stringify(skillRuns.map(run => run.args))}`)
  console.log(`[P-A] policyLoaded=${String(policyLoaded)} subagent=${String(subagentRuns.length)}`)
  if (!policyLoaded) problems.push('P-A：委派前没有加载 delegation-policy skill')
  if (subagentRuns.length === 0) problems.push('P-A：没有调用 subagent，无法观察 worker binding')

  const children = new Map()
  for (const record of records) {
    const event = record.event
    if (event?.type === 'subagent/catalog' && typeof event.data?.childId === 'string') {
      children.set(event.data.childId, event.data.mode ?? 'unknown')
    }
    if (event?.type === 'subagent/start' && typeof event.data?.id === 'string') {
      children.set(event.data.id, 'unknown')
    }
  }
  console.log(`[P-B] children=${JSON.stringify([...children.keys()])}`)
  if (children.size === 0) problems.push('P-B：parent 日志里没有 subagent/catalog 或 subagent/start')

  for (const [childId, mode] of children) {
    let childRecords = []
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      childRecords = await readRecords(page, {
        kind: 'subagent', parentSessionId: address.sessionId, childSessionId: childId, mode,
      })
      if (childRecords.some(record => record.event?.type === 'session')) break
      await sleep(1000)
    }
    const sessionRecord = childRecords.find(record => record.event?.type === 'session') ?? childRecords[0]
    const preset = sessionRecord?.event?.data?.agentPreset ?? sessionRecord?.agentPreset ?? '(未知)'
    const header = childRecords.filter(record => record.event?.type === 'request/header').map(record => record.event.data.header).at(-1)
    const tools = header?.tools?.map(tool => tool.name) ?? []
    const forbidden = tools.filter(name => /^(workflow|spawn_teammate|team_task_|wait_agent)$/.test(name))
    console.log(`[P-B] child ${childId.slice(0, 8)} preset=${String(preset)} tools=${String(tools.length)} forbidden=${JSON.stringify(forbidden)}`)
    if (String(preset) !== 'worker') problems.push(`P-B：child preset=${String(preset)}（期望 worker）`)
    if (forbidden.length > 0) problems.push(`P-B：worker child 出现委派/团队工具：${forbidden.join(', ')}`)
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
console.log(code === 0 ? 'delegation-contract-probe: ALL PASS（policy 加载 + worker preset）' : 'delegation-contract-probe: FAIL')
process.exit(code)

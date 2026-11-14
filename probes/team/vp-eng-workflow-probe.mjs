#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 vp-eng 的组队/委派行、根门投影语义、workflow 两行或 eng-teaming 通道判据后（合并原 vp-eng-root-lead-probe B1 根门投影检查 + 卡 A 通道烟测）。
// 为什么存在：preset-smoke 只证「挂得上」，本探针同场验两件事：
//   ① 根门投影：vp-eng 根会话首个 turn 后 `agentTeam` 投影为单成员 Lead + tasks 数组；
//   ② 通道选择：N≥3 同构取证应调用 `workflow` ≥ 1。
// 成本：真模型 1 会话 / 1 条 prompt，约 1–3 分钟；不进 pnpm test。
// 用法：source run/env.sh && node probes/team/vp-eng-workflow-probe.mjs
import { spawn } from 'node:child_process'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const home = requireDevHome('vp-eng-workflow-probe')
const rehearsal = ensureRehearsalWorkspace(ROOT)
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
const rpcRef = { current: undefined }
const page = (request) => rpcRef.current('session/page', { request })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const ask = async (address, text, wallMs = 180000) => {
  const before = (await readRecords(page, address)).filter(r => r.event?.type === 'turn/end').length
  await rpcRef.current('session/prompt', {
    request: {
      requestId: `vpeng-wfp-${String(Date.now())}-${String(Math.random()).slice(2, 8)}`,
      sessionId: address.sessionId, mode: 'queue',
      content: [{ type: 'text', text }], clientTimeZone: 'Asia/Shanghai',
    },
  })
  const deadline = Date.now() + wallMs
  for (;;) {
    const records = await readRecords(page, address)
    if (records.filter(r => r.event?.type === 'turn/end').length > before) return records
    if (Date.now() > deadline) throw new Error(`wall budget exhausted (${String(wallMs / 1000)}s)`)
    await sleep(1500)
  }
}

const calls = (records) => records.filter(r => r.event?.type === 'tool/call').map(r => r.event.data.name)
const tail = (records) => records
  .filter(r => r.event?.type === 'assistant/message')
  .flatMap(r => (r.event.data.message?.content ?? []).filter(b => b.type === 'text').map(b => b.text))
  .join('\n').slice(-400).replaceAll('\n', ' ')

let code = 1
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  rpcRef.current = companyRpc({ fetch, base, cookie, prefix: 'vpeng-wfp-', dumpBodyOnError: true })
  const created = await rpcRef.current('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error(`session/create 没返回 id: ${JSON.stringify(created).slice(0, 200)}`)
  const address = { kind: 'session', sessionId }

  const ra = await ask(address, [
    '先加载 eng-teaming skill，按它的判据选通道。现在有一个研发包，需要并行核查 4 个独立事实',
    '（模块 A/B/C/D 的版本号各一个），每条只要一行结论，最后汇总成一个 JSON。',
    '来源坐标：四个模块的 `package.json`（A/B/C/D 各一份，路径自定）。不要建团队。选通道并执行。',
  ].join('\n'))

  // ① B1 根门投影检查（原 vp-eng-root-lead-probe）：首个 turn 后 agentTeam 投影单成员 lead + tasks 数组
  const projection = await rpcRef.current('session/projections', { request: { sessionId } })
  const team = projection?.values?.agentTeam
  const members = Array.isArray(team?.members) ? team.members : undefined
  const lead = members?.find(m => m?.role === 'lead' && m?.name === 'lead')
  const rootLeadOk = lead !== undefined && Array.isArray(team?.tasks)
  console.log(`[root-lead] ok=${String(rootLeadOk)} members=${JSON.stringify(members)}`)

  // ② 通道选择检查：N≥3 同构取证应走 workflow
  const ca = calls(ra)
  const workflowA = ca.filter(n => n === 'workflow').length
  console.log(`[workflow] calls=${JSON.stringify(ca)} workflow=${String(workflowA)}`)
  console.log(`[workflow] tail: ${tail(ra)}`)

  const ok = rootLeadOk && workflowA >= 1
  console.log(ok
    ? 'vp-eng-workflow-probe: ALL PASS（vp-eng 根门=Lead 投影 + N≥3 同构取证用 workflow）'
    : 'vp-eng-workflow-probe: FAIL（根门 Lead 投影或 workflow 通道选择不符）')
  code = ok ? 0 : 1
} catch (error) {
  console.error(`probe error: ${error.message}`)
} finally {
  child.kill('SIGTERM')
  await sleep(1500)
  if (child.exitCode === null) child.kill('SIGKILL')
}
process.exit(code)

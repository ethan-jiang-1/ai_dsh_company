#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 workflow 分支/team 成员的深度预算、maxDepth、worker binding 后；P-C/P-D 真行为探针。
// 成本：真模型 2 会话 / 2 条 prompt，约 3–8 分钟；不进 pnpm test。
// 用法：source run/env.sh && node probes/team/delegation-depth-probe.mjs
//
// 判据：
// - P-C：vp-eng 根 → workflow 分支 depth=1 → generic subagent worker depth=2、preset=worker。
// - P-D：vp-eng 根 → teammate depth=1 → generic subagent worker depth=2、preset=worker。
// 不证明：CEO→VP→workflow→worker 的 depth=3（那需要 CEO 会话；本探针先证 parent+1 算法）。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const WALL_MS = 300000
const home = requireDevHome('delegation-depth-probe')
const rehearsal = ensureRehearsalWorkspace(ROOT)
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
const sleep = (ms) => new Promise(resolve => { setTimeout(resolve, ms) })
let rpc

const page = (request) => rpc('session/page', { request })

async function create(preset) {
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: preset } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error(`session/create(${preset}) 没返回 id`)
  return { kind: 'session', sessionId }
}

async function ask(address, text) {
  const before = (await readRecords(page, address)).filter(record => record.event?.type === 'turn/end').length
  await rpc('session/prompt', {
    request: {
      requestId: `depth-probe-${String(Date.now())}`,
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

/** 读 child 日志；mode 不确定时依次试 continuable / one-shot / 省略。 */
async function childRecords(parent, childId, mode) {
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

function sessionMeta(records, childId) {
  const raw = rawHeader(childId)
  const record = records.find(item => item.event?.type === 'session') ?? records[0]
  return {
    depth: raw?.depth ?? record?.event?.data?.delegationDepth ?? record?.delegationDepth ?? '?',
    preset: raw?.preset ?? record?.event?.data?.agentPreset ?? record?.agentPreset ?? '(未知)',
  }
}

/** 直接 child（catalog / team/member / workflow agent-start）。 */
function directChildren(records, type) {
  const entries = new Map()
  for (const record of records) {
    const event = record.event
    if (event?.type === 'subagent/catalog' && typeof event.data?.childId === 'string') {
      entries.set(event.data.childId, event.data.mode ?? 'unknown')
    }
    if (event?.type === 'team/member' && typeof event.data?.member?.id === 'string') {
      entries.set(event.data.member.id, 'continuable')
    }
    if (type === 'workflow' && event?.type === 'tool-workflow/agent-start' && typeof event.data?.info?.childId === 'string') {
      entries.set(event.data.info.childId, 'unknown')
    }
  }
  return [...entries.entries()]
}

let code = 1
const problems = []
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  rpc = companyRpc({ fetch, base, cookie, prefix: 'depth-probe-', dumpBodyOnError: true })

  // P-C：workflow 分支 → subagent
  const vp = await create('vp-eng')
  const vpRecords = await ask(vp, [
    '用 workflow 工具跑一个 2 分支的脚本。每个分支的 prompt 必须要求该分支自己调用一次 subagent，',
    'brief 只写「只回复：收到」。不要建团队。返回 run 回执与每个分支的结果。',
  ].join('\n'))
  const workflowChildren = directChildren(vpRecords, 'workflow')
  console.log(`[P-C] vp=${vp.sessionId} workflowChildren=${JSON.stringify(workflowChildren.map(([id]) => id))}`)
  if (workflowChildren.length === 0) problems.push('P-C：没有 workflow child（模型没走 workflow 或没起分支）')
  for (const [branchId, mode] of workflowChildren) {
    const branch = await childRecords(vp, branchId, mode)
    const branchMeta = sessionMeta(branch, branchId)
    const workers = directChildren(branch, 'subagent')
    console.log(`[P-C] branch ${branchId.slice(0, 8)} depth=${String(branchMeta.depth)} preset=${String(branchMeta.preset)} workers=${JSON.stringify(workers.map(([id]) => id))}`)
    if (Number(branchMeta.depth) !== 1) problems.push(`P-C：分支 depth=${String(branchMeta.depth)}（期望 1）`)
    if (workers.length === 0) problems.push('P-C：分支里没有 subagent worker（模型没在分支里再委派）')
    for (const [workerId, workerMode] of workers) {
      const worker = await childRecords({ sessionId: branchId, kind: 'subagent' }, workerId, workerMode)
      const workerMeta = sessionMeta(worker, workerId)
      console.log(`[P-C]   worker ${workerId.slice(0, 8)} depth=${String(workerMeta.depth)} preset=${String(workerMeta.preset)}`)
      if (Number(workerMeta.depth) !== 2) problems.push(`P-C：worker depth=${String(workerMeta.depth)}（期望 2）`)
      if (String(workerMeta.preset) !== 'worker') problems.push(`P-C：worker preset=${String(workerMeta.preset)}（期望 worker）`)
    }
  }

  // P-D：teammate → subagent
  const lead = await create('vp-eng')
  const leadRecords = await ask(lead, [
    '用 spawn_teammate 建一个 teammate，名字 depth-probe。任务书写明：调用 subagent 一次，',
    'brief 只让 worker 回复「收到」；不要用 workflow。建好后等它回执，报告成员与 worker 的回执。',
  ].join('\n'))
  const members = directChildren(leadRecords, 'team')
  console.log(`[P-D] lead=${lead.sessionId} members=${JSON.stringify(members.map(([id]) => id))}`)
  if (members.length === 0) problems.push('P-D：没有 team/member（模型没 spawn_teammate）')
  for (const [memberId, mode] of members) {
    let member = []
    const deadline = Date.now() + 60000
    while (Date.now() < deadline && !member.some(record => record.event?.type === 'session')) {
      member = await childRecords(lead, memberId, mode)
      if (!member.some(record => record.event?.type === 'session')) await sleep(1000)
    }
    const memberMeta = sessionMeta(member, memberId)
    const workers = directChildren(member, 'subagent')
    console.log(`[P-D] member ${memberId.slice(0, 8)} depth=${String(memberMeta.depth)} preset=${String(memberMeta.preset)} workers=${JSON.stringify(workers.map(([id]) => id))}`)
    if (Number(memberMeta.depth) !== 1) problems.push(`P-D：teammate depth=${String(memberMeta.depth)}（期望 1）`)
    if (workers.length === 0) problems.push('P-D：teammate 里没有 subagent worker（模型没再委派）')
    for (const [workerId, workerMode] of workers) {
      const worker = await childRecords({ sessionId: memberId, kind: 'subagent' }, workerId, workerMode)
      const workerMeta = sessionMeta(worker, workerId)
      console.log(`[P-D]   worker ${workerId.slice(0, 8)} depth=${String(workerMeta.depth)} preset=${String(workerMeta.preset)}`)
      if (Number(workerMeta.depth) !== 2) problems.push(`P-D：worker depth=${String(workerMeta.depth)}（期望 2）`)
      if (String(workerMeta.preset) !== 'worker') problems.push(`P-D：worker preset=${String(workerMeta.preset)}（期望 worker）`)
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
console.log(code === 0 ? 'delegation-depth-probe: ALL PASS（P-C/P-D parent+1 + worker）' : 'delegation-depth-probe: FAIL')
process.exit(code)

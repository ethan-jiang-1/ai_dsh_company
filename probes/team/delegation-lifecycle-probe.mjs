#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 `subagent_retry` 的取消/中断语义、`abortable`、宿主重启恢复、agent-team install-timing 后；
//   BUG-053（cancel 不中止阻塞 retry child）的 live 回归。
// 成本：真模型 1 会话 / 1 条 prompt，约 1–4 分钟（含 sleep 等待）；不进 pnpm test。
// 用法：source run/env.sh && node probes/team/delegation-lifecycle-probe.mjs --fault cancel|sigterm [--wall 300]
// 判据：
//   cancel：vp-eng 用 subagent_retry 起 worker 跑 `bash -c 'sleep 120; echo done'`；child 的 bash 已开始时
//     发 session/cancel → cancel accepted；root/child 都有新的 `turn/end`，child 终态 = aborted；
//     retry 工具结果（若已回）stopReason=aborted；不悬挂到 wall。
//   sigterm：同一起手后 SIGTERM 宿主 → 重启同 home → root/child durable `turn/end` 终态 = interrupted；
//     不伪造 completed，不把“读不到”当 0。
// 不证明：cancel 会杀掉 bash 的 OS 进程（只证 durable 终态收敛）；不证明模型一定选 subagent_retry
//   （选错 = FAIL 带诊断，不静默重试）；不证明 team 成员的同型路径（另有 team 探针）。
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { zstdText } from '../../tools/drivers/zstd.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { parseSessionRecords } from '../../tools/lib/session-evidence.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}
const WALL_MS = Number(arg('wall', '300')) * 1000
const FAULT = arg('fault', 'cancel')
if (FAULT !== 'cancel' && FAULT !== 'sigterm') {
  console.error('delegation-lifecycle-probe: --fault 必须是 cancel 或 sigterm')
  process.exit(2)
}
const home = requireDevHome('delegation-lifecycle-probe')
const rehearsal = ensureRehearsalWorkspace(ROOT)
const sleep = (ms) => new Promise(resolve => { setTimeout(resolve, ms) })
const problems = []
const results = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) problems.push(label)
}

const PROMPT = [
  '用 subagent_retry 工具起一个 worker（不要用普通 subagent、不要读文件、不要加载 skill、不要组队）：',
  "brief 只让 worker 执行一条 bash 命令 `bash -c 'sleep 120; echo lifecycle-done'`，不要做别的；",
  'idempotent 设为 true。执行后报告 attempts / stopReason / childIds。',
].join('\n')

function findSessionDir(id) {
  const root = join(home, 'sessions')
  if (!existsSync(root)) return undefined
  for (const slug of readdirSync(root)) {
    const dir = join(root, slug, id)
    if (existsSync(dir)) return dir
    const direct = join(root, id)
    if (existsSync(direct)) return direct
  }
  return undefined
}

function diskRecords(id) {
  const dir = findSessionDir(id)
  if (dir === undefined) return []
  const file = readdirSync(dir).find(name => name.endsWith('.jsonl.zstd'))
  if (file === undefined) return []
  try {
    return parseSessionRecords(zstdText(join(dir, file)))
  } catch {
    return []
  }
}

const normalize = records => (records ?? []).map(record => record.event ?? record)
const turnEnds = records => normalize(records).filter(event => event?.type === 'turn/end')
const reasonOf = event => event?.data?.reason?.kind ?? 'unavailable'
const toolCalls = records => normalize(records).filter(event => event?.type === 'tool/call')

async function readChild(page, parentSessionId, childId, mode) {
  const modes = [mode, 'continuable', 'one-shot', undefined].filter((value, index, all) => all.indexOf(value) === index)
  for (const candidate of modes) {
    const address = {
      kind: 'subagent', parentSessionId, childSessionId: childId,
      ...candidate === undefined ? {} : { mode: candidate },
    }
    try {
      const records = await readRecordsSafe(page, address)
      if (records.length > 0) return normalize(records)
    } catch { /* 试下一个 mode / 盘上读 */ }
  }
  return diskRecords(childId)
}

async function waitFor(predicate, deadline, intervalMs = 800) {
  while (Date.now() < deadline) {
    const value = await predicate()
    if (value !== undefined) return value
    await sleep(intervalMs)
  }
  return undefined
}

let web = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
let base = web.base
let token = web.token
let rpc
const page = (request) => rpc('session/page', { request })

try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  rpc = companyRpc({ fetch, base, cookie, prefix: 'lifecycle-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error('session/create 没返回 id')
  const rootAddress = { kind: 'session', sessionId }
  console.log(`delegation-lifecycle-probe: fault=${FAULT} vp=${sessionId}`)
  await rpc('session/prompt', {
    request: {
      requestId: `lifecycle-${String(Date.now())}`,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: PROMPT }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })

  // 1) 等 child 出现（subagent/catalog 或 retry 的回执）；最多 wall/2。
  const child = await waitFor(async () => {
    const records = await readRecordsSafe(page, rootAddress)
    const catalog = normalize(records).find(event => event?.type === 'subagent/catalog' && typeof event.data?.childId === 'string')
    if (catalog !== undefined) return { id: catalog.data.childId, mode: catalog.data.mode }
    const retry = toolCalls(records).find(event => event.data?.name === 'subagent_retry')
    if (retry !== undefined) {
      const match = /started subagent\s+([0-9a-f-]{8,})/i.exec(String(JSON.stringify(retry)))
      if (match !== null) return { id: match[1], mode: undefined }
    }
    return undefined
  }, Date.now() + WALL_MS / 2)
  check('child 已启动（subagent_retry → worker）', child !== undefined, child === undefined ? '模型没有调用 subagent_retry/未起 child' : child.id.slice(0, 8))
  if (child === undefined) {
    const records = await readRecordsSafe(page, rootAddress)
    console.log(`diagnostic: calls=${toolCalls(records).map(event => event.data?.name).join(',') || '(none)'} turns=${turnEnds(records).map(reasonOf).join(',') || '(none)'}`)
  } else {
    // 2) 等 child 的 bash 已开始（sleep 120 的 tool/call 落盘）。
    const bash = await waitFor(async () => {
      const records = await readChild(page, sessionId, child.id, child.mode)
      return records.find(event => event?.type === 'tool/call' && event.data?.name === 'bash'
        && String(event.data?.arguments ?? '').includes('sleep 120'))
    }, Date.now() + WALL_MS / 2)
    check('child 的阻塞 bash 已开始（sleep 120）', bash !== undefined)

    if (bash !== undefined && FAULT === 'cancel') {
      const cancelled = await rpc('session/cancel', { request: { sessionId } })
      check('session/cancel accepted', cancelled?.accepted === true, JSON.stringify(cancelled))
      const rootEnd = await waitFor(async () => {
        const ends = turnEnds(await readRecordsSafe(page, rootAddress))
        return ends.at(-1)
      }, Date.now() + 30_000)
      const childEnd = await waitFor(async () => {
        const ends = turnEnds(await readChild(page, sessionId, child.id, child.mode))
        return ends.at(-1)
      }, Date.now() + 30_000)
      check('root 有 turn/end', rootEnd !== undefined, rootEnd === undefined ? '30s 内无' : reasonOf(rootEnd))
      check('child 有 turn/end', childEnd !== undefined, childEnd === undefined ? '30s 内无' : reasonOf(childEnd))
      check('child 终态 = aborted', childEnd !== undefined && reasonOf(childEnd) === 'aborted', childEnd === undefined ? 'missing' : reasonOf(childEnd))
      const retryResult = normalize(await readRecordsSafe(page, rootAddress)).filter(event => event?.type === 'tool/result')
        .map(event => event.data?.message)
        .find(message => String(JSON.stringify(message?.content ?? '')).includes('stopReason'))
      const text = JSON.stringify(retryResult ?? '')
      check('retry 结果 stopReason = aborted（若已回）', retryResult === undefined || text.includes('"aborted"'), retryResult === undefined ? '未回（cancel 可能先到）' : text.slice(0, 160))
    }

    if (bash !== undefined && FAULT === 'sigterm') {
      web.child.kill('SIGTERM')
      await new Promise(resolve => {
        if (web.child.exitCode !== null) return resolve()
        web.child.once('exit', resolve)
        setTimeout(resolve, 5000)
      })
      await sleep(3000)
      web = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
      base = web.base
      token = web.token
      const cookie2 = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
      rpc = companyRpc({ fetch, base, cookie: cookie2, prefix: 'lifecycle-restart-', dumpBodyOnError: true })
      await sleep(2000)
      const rootEnd = turnEnds(await readRecordsSafe(page, rootAddress)).at(-1)
      const childEnd = turnEnds(await readChild(page, sessionId, child.id, child.mode)).at(-1)
      check('重启后 root turn/end = interrupted', rootEnd !== undefined && reasonOf(rootEnd) === 'interrupted', rootEnd === undefined ? 'missing' : reasonOf(rootEnd))
      check('重启后 child turn/end = interrupted', childEnd !== undefined && reasonOf(childEnd) === 'interrupted', childEnd === undefined ? 'missing' : reasonOf(childEnd))
    }
  }
} catch (error) {
  console.error(`delegation-lifecycle-probe: ${error instanceof Error ? error.message : String(error)}`)
  problems.push('probe exception')
} finally {
  try { web.child.kill('SIGTERM') } catch { /* 已退出 */ }
  await sleep(500)
}

console.log(`\ndelegation-lifecycle-probe: ${problems.length === 0 ? 'ALL PASS' : `FAIL ${problems.length}`}（fault=${FAULT}）`)
process.exit(problems.length === 0 ? 0 : 1)

/** `session/page` 必须走两步游标（`readRecords` 的唯一实现）；读失败直接抛出，不静默当空。 */
async function readRecordsSafe(pageFn, address) {
  return readRecords(pageFn, address)
}

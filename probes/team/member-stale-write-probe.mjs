#!/usr/bin/env node
// 状态：常驻
// 何时跑：BUG-007 C1b成员真实拒写路径需确定触发时，或fs-local/成员恢复语义升pin时。
// 成本/预算：真模型，lead与成员各一轮，场景5分钟（含boot总墙钟12分钟），无自动重跑。
// 场景：同一成员同轮真实read；驱动观察read结果后外部改文件；成员旧观察写，stale后重读合并。
// 不证明两个成员同时竞写，不证明认领败者让位，也不代替原concurrency全项PASS。
// 用法：source run/env.sh && node probes/team/member-stale-write-probe.mjs
// 退出码：0全部闭环通过；1未触发/行为失败；2环境或事件读取失败。
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { pairedCalls, toolResultText, toolArguments, hasCompletedTurn } from '../../tools/lib/collaboration-evidence.mjs'
import { fullRead, memberStaleEvidence } from '../../tools/lib/member-stale-evidence.mjs'
const home = (await import('../../tools/lib/runtime-home.mjs')).requireDevHome('member-stale-write-probe')
const cwd = join(ROOT, REHEARSAL_REL)
mkdirSync(join(cwd, 'journal'), { recursive: true })
const run = mkdtempSync(join(cwd, 'journal', 'member-stale-'))
const relative = `journal/${run.split('/').at(-1)}/target.md`
const target = join(cwd, relative)
const BASE = 'BASE\n'
const EXTERNAL = 'BASE\nEXTERNAL\n'
const FINAL = 'BASE\nEXTERNAL\nMEMBER\n'
writeFileSync(target, BASE)
const evidenceDir = join(home, 'member-stale-evidence')
mkdirSync(evidenceDir, { recursive: true })
const evidence = { target: relative, baseline: BASE, external: EXTERNAL, expected: FINAL }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const child = spawn(process.execPath, ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let budgetExpired = false
const budget = setTimeout(() => { budgetExpired = true; child.kill('SIGTERM'); console.error('ERROR: 12分钟总预算到限'); process.exitCode = 2 }, 12 * 60_000)
try {
  let output = ''
  const banner = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('boot超时')), 120_000)
    const on = chunk => {
      output += String(chunk)
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (match) { clearTimeout(timer); resolve({ port: Number(match[1]), token: match[2] }) }
    }
    child.stdout.on('data', on); child.stderr.on('data', on)
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`web提前退出${code}`)) })
  })
  const base = `http://127.0.0.1:${banner.port}`
  const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
  const cookie = auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const response = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `ms-${++rpcId}`, method: endpoint, payload: { args } }), signal: AbortSignal.timeout(30_000) })
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
    return body.result.value
  }
  const events = async address => (await readRecords(request => rpc('session/page', { request }), address)).map(record => record.event).filter(Boolean)
  const { sessionId } = await rpc('session/create', { request: { cwd, agentPreset: 'ceo' } })
  evidence.sessionId = sessionId
  console.log('lead', sessionId, 'target', relative)
  const leadAddress = { kind: 'session', sessionId }
  const prompt = async text => rpc('session/prompt', { request: { requestId: `ms-${Date.now()}`, sessionId, mode: 'queue', content: [{ type: 'text', text }], clientTimeZone: 'Asia/Shanghai' } })
  let memberId
  let leadEvents = [], memberEvents = []
  await prompt(`这是受控fs freshness实验。只spawn_teammate一个成员，name=observer，指令：先用read工具读取${relative}全文；然后单独调用send_message给lead报告已读，消息为READ-READY；之后不要重读，先用write将该文件替换为BASE换行MEMBER换行。若工具拒绝，保留错误，再read全文，把MEMBER单独一行追加到最新内容，用write发布，保留EXTERNAL行。最后回报lead并结束。你用wait_agent等observer结束再收口。你不要读写目标文件，不要创建任务。`)
  let externalApplied = false, observed = false, untouched = false
  const deadline = Date.now() + 5 * 60_000
  while (Date.now() < deadline) {
    leadEvents = await events(leadAddress)
    memberId ??= leadEvents.find(event => event.type === 'team/member' && event.data?.member?.name === 'observer')?.data.member.id
    if (memberId) memberEvents = await events({ kind: 'subagent', parentSessionId: sessionId, childSessionId: memberId, mode: 'continuable' })
    if (!externalApplied) {
      observed = pairedCalls(memberEvents, ['read'], relative).some(pair => fullRead(pair.result, BASE))
      if (observed) {
        untouched = pairedCalls(memberEvents, ['write', 'edit'], relative).length === 0 && readFileSync(target, 'utf8') === BASE
        if (!untouched) break
        writeFileSync(target, EXTERNAL)
        externalApplied = true
        evidence.externalAfterEventCount = memberEvents.length
        console.log('external change applied after successful member read, before any observed target write call')
      }
    }
    if (hasCompletedTurn(leadEvents) && hasCompletedTurn(memberEvents)) break
    await sleep(100)
  }
  evidence.memberId = memberId
  const writes = pairedCalls(memberEvents, ['write', 'edit'], relative)
  const final = readFileSync(target, 'utf8')
  const checks = memberStaleEvidence({ leadEvents, memberEvents, target: relative,
    externalAfterEventCount: evidence.externalAfterEventCount, observed, untouched, externalApplied, final, budgetExpired })
  Object.assign(evidence, { checks, final, writes: writes.map(pair => ({ callId: pair.id, args: toolArguments(pair.call), code: pair.result?.error?.code, isError: pair.result?.message?.isError, text: toolResultText(pair.result) })) })
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
  process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1
  console.log(`member-stale-write-probe: ${process.exitCode === 0 ? 'PASS' : 'FAIL'}`)
  writeFileSync(join(evidenceDir, `${sessionId}-lead.json`), JSON.stringify(leadEvents, null, 2) + '\n')
  writeFileSync(join(evidenceDir, `${sessionId}-member.json`), JSON.stringify(memberEvents, null, 2) + '\n')
} catch (error) {
  evidence.error = error.message
  console.error('ERROR:', error.message)
  process.exitCode = 2
} finally {
  clearTimeout(budget)
  writeFileSync(join(evidenceDir, `${evidence.sessionId ?? Date.now()}-evidence.json`), JSON.stringify(evidence, null, 2) + '\n')
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5_000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
}

#!/usr/bin/env node
// 状态：常驻
// 培养「可选参考背景」机制探针（2026-10-23 背景卡 D1=A / D2=A 的实施前门）。
//
// 何时跑：改 host 读会话/成品、客户端预览读、`contexts` 记录读取，或升 pin 后必跑；
//   本探针**不写产品代码**，只验平台机制是否支撑 RFC（notes/archived/2026-10-23-cultivation-context.md）。
// 成本：keyless（boot web ~20–40s；零模型调用；只读会话/命令/文件面）。
// 用法：source run/env.sh && node probes/session-context/cultivation-context-probe.mjs
//
// 判据：
//   ① 冷会话可一次 `session/page` 读到目标轮；记录实测耗时（host 冷读的代理；> 2s = 设计要收窄源）
//   ② page 前后 `session/list` 的 agentAvailable/running 不变（page 无 promote；follow+break 的
//      “不拉第二帧”是代码级确认，运行时用 page 代理——本探针不假装测了 follow）
//   ③ 冷会话 `projections.asOfSeq` 可作 page 的 throughSeq（否则回退 MAX-probe cursor）
//   ④ ref 级命令行（≈2KB 期望句）经 commands/execute 往返；command/run.args 完整落日志
//   ⑤ 8KB 单行 contexts 记录经 workspaceFiles/read（limit 2000 行）完整读回、JSON 可解析
//   ⑥ 冷会话 agentTeam 投影可用（无团队 fixture = SKIP，不是 PASS）
//   ⑦ 子会话 address 可 page（有 fixture 才判；无 = SKIP）
//
// 红证：删掉本探针依赖的投影/读面（或把 page 换成会 promote 的路径）→ ①/② 红；命令超限 → ④ 红。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const NAME = 'cultivation-context-probe'
const home = requireDevHome(NAME)
const REHEARSAL = join(ROOT, REHEARSAL_REL)
ensureRehearsalWorkspace(ROOT)
const RECORDS_DIR = join(REHEARSAL, 'cultivation', 'records')

const failures = []
const check = async (label, fn) => {
  try {
    const detail = await fn()
    console.log(`  PASS ${label}${typeof detail === 'string' && detail !== '' ? ` — ${detail}` : ''}`)
  } catch (error) {
    failures.push(`${label}: ${error.message}`)
    console.log(`  FAIL ${label}: ${error.message}`)
  }
}

/** 冷会话 id → 压缩日志字节数；用来挑最大的冷读样本。 */
function sizesById() {
  const root = join(home, 'sessions')
  const sizes = new Map()
  if (!existsSync(root)) return sizes
  for (const cwdDir of readdirSync(root)) {
    const cwdPath = join(root, cwdDir)
    let entries
    try { entries = readdirSync(cwdPath, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dir = join(cwdPath, entry.name)
      let files
      try { files = readdirSync(dir).filter(name => name.includes('.jsonl')) } catch { continue }
      if (files.length === 0) continue
      const size = Math.max(...files.map(name => statSync(join(dir, name)).size))
      sizes.set(entry.name.replace(/^session-/, ''), size)
    }
  }
  return sizes
}

const { child, base, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
let createdSession = null
let createdRecord = null
let tempRecord = null
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'ccp-', dumpBodyOnError: true })

  const list = await rpc('session/list', { _request: {} })
  const items = list?.items ?? []
  if (items.length === 0) throw new Error('session/list 为空，无法挑冷读样本')

  const sizes = sizesById()
  const cold = items
    .filter(item => item.running !== true && item.agentAvailable !== true && item.blank !== true)
    .map(item => ({ item, size: sizes.get(String(item.sessionId).replace(/^session-/, '')) ?? 0 }))
    .sort((a, b) => b.size - a.size)
  if (cold.length === 0) throw new Error('session/list 里没有冷会话样本（全是运行中/空白）')
  const notRunning = () => items.filter(item => item.running !== true && item.agentAvailable !== true)

  // ① + ② + ③：挑一个能读出消息的最大冷会话，实测 page 冷读。
  let probed = null
  for (const { item, size } of cold.slice(0, 5)) {
    const sessionId = item.sessionId
    const address = { kind: 'session', sessionId }
    let cursor = null
    let projectionKind = 'absent'
    try {
      const projection = await rpc('session/projections', { request: { sessionId } })
      projectionKind = projection?.kind ?? 'absent'
      if (projection?.kind === 'sequenced' && Number.isSafeInteger(projection.asOfSeq) && projection.asOfSeq >= 0) {
        cursor = projection.asOfSeq
      }
    } catch (error) {
      projectionKind = `error:${error.message.slice(0, 60)}`
    }
    if (cursor === null) {
      try {
        const probe = await rpc('session/page', {
          request: { address, throughSeq: Number.MAX_SAFE_INTEGER, maxMessages: 1 },
        })
        cursor = probe.records?.at(-1)?.event?.seq ?? null
      } catch (error) {
        const match = /past cursor (\d+)/.exec(error.message)
        if (match !== null) cursor = Number(match[1])
      }
    }
    if (cursor === null || cursor < 0) continue
    const before = notRunning().find(row => row.sessionId === sessionId)
    const startedAt = performance.now()
    const page = await rpc('session/page', {
      request: {
        address,
        throughSeq: cursor,
        maxMessages: 40,
        turnWindow: { minMessages: 8, minTurns: 3 },
      },
    })
    const elapsedMs = Math.round(performance.now() - startedAt)
    const afterList = await rpc('session/list', { _request: {} })
    const after = (afterList?.items ?? []).find(row => row.sessionId === sessionId)
    const records = page?.records ?? []
    if (records.length === 0) continue
    const textEvents = records.map(record => record.event).filter(event =>
      event?.type === 'user/message' || event?.type === 'assistant/message')
    if (textEvents.length === 0) continue
    probed = { sessionId, size, elapsedMs, records: records.length, textEvents: textEvents.length, projectionKind, cursor }
    await check('① 冷会话一次 page 读到消息（实测耗时 = host 冷读代理）', async () => {
      if (elapsedMs > 2000) throw new Error(`${elapsedMs}ms > 2000ms（样本 ${String(size)}B，${String(records.length)} records）`)
      return `${elapsedMs}ms；样本 ${String(size)}B；${String(records.length)} records / ${String(textEvents.length)} 条文字消息；projections=${projectionKind}`
    })
    await check('② page 不激活会话（agentAvailable/running 前后不变）', async () => {
      if (before === undefined || after === undefined) throw new Error('page 前后 session/list 缺该行')
      if (after.agentAvailable === true || after.running === true) {
        throw new Error(`page 后会话被激活：agentAvailable=${String(after.agentAvailable)} running=${String(after.running)}`)
      }
      return `agentAvailable/running 均保持 false（before ${JSON.stringify({ a: before.agentAvailable, r: before.running })}）`
    })
    await check('③ 冷读 cursor 来源可复现（projections.asOfSeq 或 MAX-probe）', async () => {
      return `cursor=${String(cursor)}；来源=${projectionKind === 'sequenced' ? 'projections.asOfSeq' : 'MAX-probe'}`
    })
    break
  }
  if (probed === null) {
    failures.push('① 冷会话 page 读：前 5 个冷会话都没有文字消息，无法取样')
    console.log('  FAIL ① 冷会话 page 读：前 5 个冷会话都没有文字消息，无法取样')
  }

  // ④ ref 级命令行：≈2KB 期望句经 execute 往返，command/run.args 完整。
  const expectationMarker = `CCP-${String(Date.now())}`
  const expectation = `${expectationMarker} ${'口径先列假设再下结论'.repeat(250)}`
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  createdSession = created.id ?? created.sessionId
  await check('④ ≈2KB 命令行往返 + command/run.args 完整（ref 级载荷的传输证据）', async () => {
    const run = await rpc('commands/execute', {
      agentId: createdSession,
      line: `/cultivation correct ${expectation} :: 探针正文：清理用记录，不含真实培养含义。`,
      submittedAttachments: [],
    })
    if (run?.result?.kind !== 'success') throw new Error(`correct 未成功：${JSON.stringify(run).slice(0, 240)}`)
    const match = /(\d{8}-\d{6}-[a-z0-9]{4})/.exec(run.result.text ?? '')
    if (match === null) throw new Error(`回执没有记录 id：${run.result.text ?? ''}`)
    createdRecord = match[1]
    const records = await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId: createdSession })
    const commandRun = records.map(record => record.event)
      .find(event => event?.type === 'command/run' && String(event?.data?.args ?? '').includes(expectationMarker))
    if (commandRun === undefined) throw new Error('日志里找不到 command/run（args 未落）')
    const args = String(commandRun.data.args ?? '')
    if (args.length < 2400) throw new Error(`command/run.args 只有 ${String(args.length)} 字符，疑似被截断（期望句 ${String(expectation.length)} 字符）`)
    return `args=${String(args.length)} 字符；期望句=${String(expectation.length)} 字符；记录=${createdRecord}`
  })

  // ⑤ 8KB 单行 contexts 经 workspaceFiles/read（limit 2000 行）完整读回。
  await check('⑤ ≤8KB 单行 contexts 经 workspaceFiles/read 完整读回（2000 行窗；2000 码点 CJK 样本 ≈6.3KB）', async () => {
    const excerpt = '汉'.repeat(2000)
    const contexts = JSON.stringify({ v: 1, items: [{ kind: 'deliverable', ref: 'deliverables/probe/final.md', title: 'probe-8k', excerpt, truncated: true }] })
    const text = [
      '---',
      'kind: correction',
      'targetRole: ceo',
      'proposerRole: ceo',
      'proposerKind: human',
      'source: 探针 8KB contexts',
      'expectation: 探针 8KB contexts 记录读取',
      'status: open',
      `contexts: ${contexts}`,
      '---',
      '',
      '探针正文。',
      '',
    ].join('\n')
    if (!existsSync(RECORDS_DIR)) throw new Error(`排练记录目录不存在：${RECORDS_DIR}`)
    tempRecord = join(RECORDS_DIR, 'ccp-8k.md')
    writeFileSync(tempRecord, text)
    const bytes = Buffer.byteLength(text, 'utf8')
    const page = await rpc('workspaceFiles/read', {
      workspaceFileScopeId: createdSession,
      path: 'cultivation/records/ccp-8k.md',
      range: { limit: 2000 },
    })
    if (!page?.text?.includes('"v":1')) throw new Error('读回的文本缺 contexts（可能被截断/读错窗）')
    const line = page.text.split('\n').find(value => value.startsWith('contexts: '))
    if (line === undefined) throw new Error('读回的文本缺 contexts 行')
    const parsed = JSON.parse(line.slice('contexts: '.length))
    if (parsed.items?.[0]?.excerpt?.length !== 2000) throw new Error('contexts.excerpt 长度不符')
    return `记录 ${String(bytes)}B；读回 lines=${String(page.lines)} eof=${String(page.eof)}；contexts 可 JSON.parse`
  })

  // ⑥ 冷会话 agentTeam 投影（无团队 fixture = SKIP）。
  await check('⑥ 冷会话 agentTeam 投影可用（无 fixture 则 SKIP）', async () => {
    const withTeam = (await rpc('session/list', { _request: {} }))?.items
      ?.find(row => {
        const members = row.projections?.values?.agentTeam?.members ?? []
        return members.some(member => member.name !== 'lead')
      })
    if (withTeam === undefined) return 'SKIP：当前 dev home 没有带 agentTeam 投影的会话来验角色标签'
    const members = withTeam.projections.values.agentTeam.members
    const named = members.filter(member => typeof member.id === 'string' && typeof member.name === 'string')
    if (named.length !== members.length) throw new Error('agentTeam.members 缺 id/name')
    return `会话 ${String(withTeam.sessionId)} 的成员：${named.slice(0, 4).map(member => `${member.name}(${String(member.id).slice(0, 8)}…)`).join(', ')}`
  })

  // ⑦ 子会话 address 可 page（无 fixture = SKIP）。
  await check('⑦ 子会话 address 可读（无 fixture 则 SKIP）', async () => {
    const rows = (await rpc('session/list', { _request: {} }))?.items ?? []
    const child = rows.find(row => row.origin === 'subagent' && typeof row.parentSessionId === 'string')
    if (child === undefined) return 'SKIP：当前 dev home 没有 subagent 会话'
    const parent = rows.find(row => row.sessionId === child.parentSessionId)
    const catalog = parent?.projections?.values?.subagentCatalog ?? []
    const entry = catalog.find(item => item.id === child.sessionId)
    const mode = entry?.mode ?? 'unknown'
    const records = await readRecords(request => rpc('session/page', { request }), {
      kind: 'subagent',
      parentSessionId: child.parentSessionId,
      childSessionId: child.sessionId,
      mode,
    })
    if (records.length === 0) throw new Error('子会话 page 读不到记录')
    return `child=${String(child.sessionId).slice(0, 12)}… mode=${mode} records=${String(records.length)}`
  })
} finally {
  child.kill('SIGTERM')
  await new Promise(resolve => setTimeout(resolve, 300))
  if (createdRecord !== null) rmSync(join(RECORDS_DIR, `${createdRecord}.md`), { force: true })
  if (tempRecord !== null) rmSync(tempRecord, { force: true })
}

console.log(failures.length === 0
  ? `\n${NAME}: ALL PASS（冷读/命令/记录/角色面机制成立；SKIP 项见上）`
  : `\n${NAME}: ${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)

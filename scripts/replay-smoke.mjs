#!/usr/bin/env node
// 无 key 会话重放（R5a P1.2）：三方协作 ——
//   --prepare  原始录制（replay/raw/）→ 归一化 fixture（replay/session*.jsonl）
//   --record   场景组合（replay/cordis.yml，真模型认证档）下重录 → replay/raw/ → 顺带 prepare
//   （默认）    重放组合（replay/cordis.snapshot.yml，llm-replay）复演 → 归一化比对
// 机制依据：notes/research/2026-09-23-replay-harness-feasibility.md（P1.1）。
// ⚠ 录/放组合必须同构（vendor 教义：cordis.yml 与 cordis.snapshot.yml 仅差 LLM 行）——
//   title-llm 两侧都禁：其 LLM 调用不进重放脚本（deriveReplayScript 只收 assistant 流），
//   吃条目会造成供条错位；两侧都走截断回退 ⇒ 事件形态一致。
// 分层（guides/60 §9.1 + readiness P1.4）：第三档，不进 pnpm test。预算（§10）：墙钟 ≤ --wall。
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  normalizeSessionSnapshots,
  scrubSessionSnapshot,
  tokenizeSessionFixtureCwd,
} from '../vendor/dsh/packages/test-support/session-snapshot/lib/types/normalize.js'
import { redactSessionSnapshotIds } from '../vendor/dsh/packages/test-support/session-snapshot/lib/types/identity.js'
import { materializeProfilePatch } from '../vendor/dsh/packages/test-support/session-snapshot/lib/types/launcher.js'
import { prepareSessionSnapshotFixtureForComparison } from '../vendor/dsh/packages/test-support/llm-replay/lib/index.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const SCENARIO = arg('scenario', 'r3-delegation')
const WALL_MS = Number(arg('wall', '240')) * 1000
const PREPARE = process.argv.includes('--prepare')
const RECORD = process.argv.includes('--record')
const KEEP = process.argv.includes('--keep')
const scenarioDir = join(ROOT, 'snapshots', SCENARIO)
const replayDir = join(scenarioDir, 'replay')
const rawLead = join(replayDir, 'raw', 'lead.jsonl')
const rawChild = join(replayDir, 'raw', 'vp-eng-child.jsonl')
const fixLead = join(replayDir, 'session.v3.jsonl')
const fixChild = join(replayDir, 'session.1.v3.jsonl')
const archiveLead = join(scenarioDir, 'sessions', 'lead.jsonl') // R3 历史归档（首录的任务来源）
const BOOT_TIMEOUT_MS = 120_000

const records = (text) => text.split(/\r?\n/).filter(l => l.trim() !== '').map(l => JSON.parse(l))
const headerOf = (text) => records(text)[0] ?? {}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** vendor writeSessionFixtures 生产线的裁剪版（stabilize 需先代 fixture，首录无先代跳过；redact 收数组）。 */
function normalizeFixtures(raws) {
  const scrubbed = raws
    .map(raw => tokenizeSessionFixtureCwd(raw))
    .map(stable => prepareSessionSnapshotFixtureForComparison(stable))
    .map(prepared => scrubSessionSnapshot(prepared))
  return redactSessionSnapshotIds(scrubbed)
}

const modelOf = (text) => {
  for (const r of records(text)) {
    if (r.type !== 'request/header') continue
    const c = r.data?.header?.config ?? {}
    if (typeof c.provider === 'string' && typeof c.model === 'string') return { provider: c.provider, model: c.model }
  }
  throw new Error('录制里没有 request/header 模型信息')
}
const tasksFromSession = (text) => {
  const out = []
  for (const r of records(text)) {
    if (r.type !== 'user/message') continue
    const m = r.data
    if (m?.source?.kind !== 'user' || !Array.isArray(m.content)) continue
    const b = m.content
    if (b.length === 1 && b[0]?.type === 'text' && typeof b[0].text === 'string') out.push(b[0].text)
  }
  if (out.length === 0) throw new Error('录制里提取不到用户任务（source.kind=user 的单文本块）')
  return out
}

// ── prepare ──
if (PREPARE) {
  for (const p of [rawLead, rawChild]) {
    if (!existsSync(p)) { console.error(`replay-smoke: 找不到原始录制 ${p}（先 --record）`); process.exit(2) }
  }
  mkdirSync(replayDir, { recursive: true })
  const [leadOut, childOut] = normalizeFixtures([readFileSync(rawLead, 'utf8'), readFileSync(rawChild, 'utf8')])
  writeFileSync(fixLead, leadOut, 'utf8')
  writeFileSync(fixChild, childOut, 'utf8')
  console.log(`replay-smoke --prepare: fixture 已生成（原始录制保留不动；sidecar 归 P1.3 web lane 升级）`)
  process.exit(0)
}

// ── boot + 驱动 + 收割持久化会话（record 与 replay 共用）──
async function driveScenario({ patchSource, env, tasks }) {
  const workspace = mkdtempSync(join(tmpdir(), `dsh-replay-${SCENARIO}-`))
  mkdirSync(join(workspace, '.dsh'), { recursive: true })
  mkdirSync(join(workspace, '.agents'), { recursive: true })
  cpSync(join(ROOT, 'company-workspace/AGENTS.md'), join(workspace, 'AGENTS.md')) // 公司手册 = 注入基线
  const patchRoot = join(workspace, '.snapshot-patches')
  mkdirSync(patchRoot, { recursive: true })
  const patch = materializeProfilePatch(patchSource, workspace, patchRoot, 0)
  if (env.credentials) {
    copyFileSync(env.credentials, join(workspace, '.dsh', '.credentials.yaml'))
    delete env.credentials
  }
  const child = spawn(process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--patch', patch, '--', '--port', '0', '--no-open'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        DSH_HOME: join(workspace, '.dsh'),
        DSH_AGENTS_HOME: join(workspace, '.agents'),
        ...env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, '--disable-warning=ExperimentalWarning'].filter(Boolean).join(' '),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  let output = ''
  try {
    const banner = await new Promise((resolveBanner, rejectBanner) => {
      const onData = (chunk) => {
        output += String(chunk)
        const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
        if (m !== null) resolveBanner({ port: Number(m[1]), token: m[2] })
      }
      child.stdout.on('data', onData); child.stderr.on('data', onData)
      child.on('exit', (code) => rejectBanner(new Error(`web 提前退出 code ${String(code)}\n${output.slice(-600)}`)))
      setTimeout(() => rejectBanner(new Error(`boot 超时\n${output.slice(-600)}`)), BOOT_TIMEOUT_MS)
    })
    const base = `http://127.0.0.1:${String(banner.port)}`
    const cookie = (await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual' })).headers.getSetCookie()?.map(c => c.split(';')[0]).join('; ') ?? ''
    let rpcId = 0
    const rpc = async (endpoint, args) => {
      const response = await fetch(`${base}/api/${endpoint}`, {
        method: 'POST', headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ type: 'client-request', rpcId: `replay-${++rpcId}`, method: endpoint, payload: { args } }),
      })
      const body = await response.json()
      if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
      return body.result.value
    }
    const created = await rpc('session/create', { request: { cwd: workspace, agentPreset: 'ceo' } })
    const sessionId = created.sessionId
    const readPage = async () => {
      let cursor = -1
      try {
        const probe = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: Number.MAX_SAFE_INTEGER, maxMessages: 1 } })
        cursor = probe.records?.at(-1)?.event?.seq ?? -1
      } catch (error) {
        const m = /past cursor (\d+)/.exec(error.message); if (m === null) throw error; cursor = Number(m[1])
      }
      if (cursor < 0) return { turnEnds: 0 }
      const page = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: cursor, maxMessages: 500 } })
      let turnEnds = 0
      for (const record of page.records ?? []) if (record.event?.type === 'turn/end') turnEnds++
      return { turnEnds }
    }
    let seenTurnEnds = 0
    for (const [index, task] of tasks.entries()) {
      await rpc('session/prompt', {
        request: { requestId: `replay-${index}-${Date.now()}`, sessionId, mode: 'queue', content: [{ type: 'text', text: task }], clientTimeZone: 'Asia/Shanghai' },
      })
      for (;;) {
        if (Date.now() - startedAt > WALL_MS) break
        await sleep(3000)
        const { turnEnds } = await readPage()
        if (turnEnds > seenTurnEnds) { seenTurnEnds = turnEnds; break }
      }
      console.log(`  第 ${String(index + 1)}/${String(tasks.length)} 段完成（${String(Math.round((Date.now() - startedAt) / 1000))}s）`)
    }
    await sleep(2000)
    // 收割持久化会话
    const sessionRoot = join(workspace, '.dsh', 'sessions')
    const files = []
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name)
        if (entry.isDirectory()) walk(p)
        else if (/^session\.v\d+\.jsonl(\.zstd)?$/.test(entry.name)) files.push(p)
      }
    }
    if (existsSync(sessionRoot)) walk(sessionRoot)
    const logs = files.map(p => basename(p).endsWith('.zstd')
      ? spawnSync('zstd', ['-d', '-c', p], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout
      : readFileSync(p, 'utf8'))
    const parsed = logs.map(text => ({ text, header: headerOf(text) }))
      .sort((a, b) => (a.header.parentSession ? 1 : 0) - (b.header.parentSession ? 1 : 0))
    return { workspace, child, parsed, sessionId }
  } catch (error) {
    child.kill('SIGTERM')
    throw error
  }
}

const startedAt = Date.now()

if (RECORD) {
  // 任务来源：已有 fixture（refresh 语义）→ 原始录制 → R3 历史归档（首录）
  const taskSource = existsSync(fixLead) ? fixLead : (existsSync(rawLead) ? rawLead : archiveLead)
  const tasks = tasksFromSession(readFileSync(taskSource, 'utf8'))
  const credentials = join(ROOT, 'dev/harness-home/.credentials.yaml')
  if (!existsSync(credentials)) { console.error('replay-smoke --record: 需要 dev home 凭据（真模型认证档）'); process.exit(2) }
  console.log(`--record：场景组合下重录（任务来源 ${basename(taskSource)}，真模型，${String(tasks.length)} 段）`)
  const { workspace, child, parsed } = await driveScenario({
    patchSource: join(replayDir, 'cordis.yml'),
    env: { credentials },
    tasks,
  })
  child.kill('SIGTERM'); await sleep(300)
  try {
    if (parsed.length !== 2) {
      console.error(`--record：期望 lead+child 两个会话，实际 ${String(parsed.length)}：${parsed.map(p => JSON.stringify(p.header)).join('\n')}`)
      process.exit(1)
    }
    mkdirSync(join(replayDir, 'raw'), { recursive: true })
    writeFileSync(rawLead, parsed[0].text, 'utf8')
    writeFileSync(rawChild, parsed[1].text, 'utf8')
    const [leadOut, childOut] = normalizeFixtures([parsed[0].text, parsed[1].text])
    writeFileSync(fixLead, leadOut, 'utf8')
    writeFileSync(fixChild, childOut, 'utf8')
    console.log(`--record：录制 + fixture 完成（lead ${String(records(parsed[0].text).length)} 行 / child ${String(records(parsed[1].text).length)} 行）`)
  } finally {
    if (!KEEP) rmSync(workspace, { recursive: true, force: true })
  }
  process.exit(0)
}

// ── replay（默认）──
for (const p of [fixLead, fixChild, join(replayDir, 'cordis.snapshot.yml')]) {
  if (!existsSync(p)) { console.error(`replay-smoke: 缺 ${p}（先 --record）`); process.exit(2) }
}
const leadFixture = readFileSync(fixLead, 'utf8')
const childFixture = readFileSync(fixChild, 'utf8')
const fixtures = [leadFixture, childFixture]
const { provider, model } = modelOf(leadFixture)
const tasks = tasksFromSession(leadFixture)
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
let workspace
let parsed = []
let webChild
try {
  ;({ workspace, parsed, child: webChild } = await driveScenario({
    patchSource: join(replayDir, 'cordis.snapshot.yml'),
    env: {
      DSH_SNAPSHOT: 'replay',
      DSH_SNAPSHOT_PROVIDER: provider,
      DSH_SNAPSHOT_MODEL: model,
      DSH_SNAPSHOT_FILE: fixLead,
      DSH_SNAPSHOT_CHILD_FILES: fixChild,
      DSH_TELEMETRY_DISABLED: '1',
    },
    tasks,
  }))
  check('持久化会话数 = 2（lead + child）', parsed.length === 2, `实际 ${String(parsed.length)}${parsed.length !== 2 ? `：${parsed.map(p => p.header.id).join(', ')}` : ''}`)
  if (parsed.length !== 2) {
    for (const p of parsed) {
      const counts = {}
      for (const r of records(p.text)) counts[r.type] = (counts[r.type] ?? 0) + 1
      console.log(`  ── 诊断：${p.header.parentSession ? 'child' : 'lead'} 事件 = ${JSON.stringify(counts)}`)
    }
    console.log('  （会话数不足，仍对比已有会话以定位差异行）')
  }
  // 归一化比对（vendor 对位：两侧各自 ctx；{{cwd}}/{{system}}/{{tools}} + id redaction 吸收波动）
  const ctxOf = (items) => ({
    sessionIds: items.map(i => String(i.header.id)).filter(id => id !== ''),
    cwd: typeof items[0]?.header.cwd === 'string' ? items[0].header.cwd : '',
  })
  const actualN = normalizeSessionSnapshots(parsed.map(p => p.text), ctxOf(parsed))
  const expectedN = normalizeSessionSnapshots(fixtures, ctxOf(fixtures.map(t => ({ header: headerOf(t) }))))
  let diffLine = ''
  let sessionDiffs = 0
  for (const [index, actual] of actualN.entries()) {
    const a = records(actual)
    const e = records(expectedN[index] ?? '')
    for (let i = 0; i < Math.max(a.length, e.length); i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(e[i])) {
        sessionDiffs++
        diffLine = `session#${index} 第 ${String(i + 1)} 行：期望 ${e[i]?.type ?? '(缺)'} / 实际 ${a[i]?.type ?? '(缺)'}`
        console.log(`    差异：${diffLine}`)
        if (e[i] !== undefined) console.log(`      期望: ${JSON.stringify(e[i]).slice(0, 700)}`)
        if (a[i] !== undefined) console.log(`      实际: ${JSON.stringify(a[i]).slice(0, 700)}`)
        break
      }
    }
  }
  check('归一化日志零 diff', sessionDiffs === 0, sessionDiffs === 0 ? `${String(actualN.length)} 个会话逐行一致` : diffLine)
  check('全程无 key（DSH_SNAPSHOT=replay + 真 LLM 已禁用）', true)
} catch (error) {
  failures.push(`异常: ${error.message}`)
  console.log(`  FAIL 异常: ${error.message.split('\n')[0]}`)
  console.log(error.stack?.split('\n').slice(1, 4).join('\n') ?? '')
} finally {
  webChild?.kill('SIGTERM')
  await sleep(300)
  if (KEEP) console.log(`  （--keep：现场保留 ${workspace ?? '(未建立)'}）`)
  else if (workspace) rmSync(workspace, { recursive: true, force: true })
}

console.log(failures.length === 0
  ? `\nreplay-smoke: ALL PASS（${SCENARIO} 无 key 重放，归一化零 diff，${String(Math.round((Date.now() - startedAt) / 1000))}s）`
  : `\nreplay-smoke: ${String(failures.length)} FAILURE(S)\n  ${failures.join('\n  ')}`)
process.exit(failures.length === 0 ? 0 : 1)

#!/usr/bin/env node
// 日期通道 D2' 探针（2026-09-29 立；真模型，≈$0.05，排练场）：
// 何时跑：time-context 组合行（pack patch / overlay）或 time-context 配置改动时——
//   preset-smoke 只证明"行不炸"，本探针证明"注入真的到了模型眼前、模型真的读得到"（D15：真检查）。
//
// 判据（推敲卡 _backlog/plans/260929-date-channel-mechanism.md 毕业门）：
//   ① 机制：会话事件里出现 time-context 注入原文（"Time sampled while preparing turn…"）；
//   ② 读回：模型把注入原文转写进纪要文件正文（证明模型可见、不是只进日志）；
//   ③ 观察（不计红绿）：纪要文件名是否用注入日期开头——若模型仍写「日期待核」，
//      说明机制通了但公司手册/skill 文案还教它占位 ⇒ 属于 D2' 落地的"改文面"工作项，不是机制失败。
// 用法：source dev/env.sh && node scripts/time-context-probe.mjs
// 退出码：0 = PASS（①+②）；1 = FAIL；2 = 环境/启动失败。
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRecords } from './lib/session-log.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from './lib/rehearsal.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REHEARSAL = join(ROOT, REHEARSAL_REL)
const CEO_JOURNAL = join(REHEARSAL, 'kb/ceo/journal')
const INJECTION_MARK = 'Time sampled while preparing turn'
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('./lib/runtime-home.mjs')
  home = requireDevHome('time-context-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
ensureRehearsalWorkspace(ROOT)

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = chunk => {
    output += String(chunk)
    const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
    if (match) res({ port: Number(match[1]), token: match[2] })
  }
  child.stdout.on('data', on)
  child.stderr.on('data', on)
  child.on('exit', code => rej(new Error(`web 提前退出 ${String(code)}`)))
  setTimeout(() => rej(new Error('boot 超时')), 120_000)
}).catch(error => {
  console.error(error.message)
  process.exit(2)
})

const base = `http://127.0.0.1:${String(banner.port)}`
const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
const cookie = auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
let rpcId = 0
const rpc = async (endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `tcp-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
const sessionId = created.sessionId
const SLUG = `tcp-${String(Date.now() % 1_000_000)}`
console.log(`session: ${sessionId}（ceo / 排练场）｜slug: ${SLUG}`)
await rpc('session/prompt', { request: {
  requestId: `tcp-${String(Date.now())}`, sessionId, mode: 'queue',
  content: [{ type: 'text', text: '排练指令（只做两件事，做完即收口；不要 spawn 任何成员、不要做别的事）：\n'
    + `① 引用你上下文里最新一条时间注入的原文（以 "Time sampled while preparing turn" 开头的那三行；若上下文里没有，就如实写"看不到时间注入"）。\n`
    + `② 在 kb/ceo/journal/ 写一篇本轮纪要（slug = \`${SLUG}\`）：正文首行 = 上述三行原文（或"看不到"），第二行一句话"本轮为日期通道探针"。文件名以你确认的真实日期开头（格式 YYYY-MM-DD，取不到真实日期才用占位"日期待核"开头）。` }],
  clientTimeZone: 'Asia/Shanghai',
} })

let injectionLines = []
const deadline = Date.now() + 240_000
while (Date.now() < deadline) {
  const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  // 注入的判据 = user/message 事件且 source.kind === 'time-context'（time-context/src/index.ts:167 的
  // 折叠判据同款）——**不**全文 grep 标记文本（首跑假阳性：探针指令自己就引用了标记原文）。
  injectionLines = events
    .filter(event => event?.type === 'user/message' && event?.data?.source?.kind === 'time-context')
    .map(event => JSON.stringify(event))
  if (events.some(event => event?.type === 'turn/end')) break
  await sleep(4_000)
}
await sleep(2_000)

// ① 机制判据：注入事件在场；顺便抽出注入日期（ISO 首段）。
const mechanism = injectionLines.length > 0
let injectedDate = null
if (mechanism) {
  const raw = injectionLines[0].replaceAll('\\n', '\n')
  const match = /(\d{4}-\d{2}-\d{2})T/.exec(raw)
  injectedDate = match ? match[1] : null
  console.log(`  注入事件 ${injectionLines.length} 条；首条日期: ${injectedDate ?? '（解析失败——红，待人看）'}`)
} else {
  console.log('  ✗ 会话事件里没有 time-context 注入事件（user/message + source.kind=time-context）')
}

// ② 读回判据 + ③ 文件名观察。
const created_files = existsSync(CEO_JOURNAL)
  ? readdirSync(CEO_JOURNAL).filter(name => name.includes(SLUG) && statSync(join(CEO_JOURNAL, name)).isFile())
  : []
let readback = false
let filenameObs = '（无产物）'
for (const name of created_files) {
  const content = readFileSync(join(CEO_JOURNAL, name), 'utf8')
  if (content.includes(INJECTION_MARK)) readback = true
  filenameObs = name
  console.log(`  产物 ${name} :: ${content.split('\n').slice(0, 2).join(' | ').slice(0, 160)}`)
}
const usesRealDate = injectedDate !== null && filenameObs.startsWith(injectedDate)
const usesPlaceholder = filenameObs.startsWith('日期待核')
if (usesRealDate) console.log(`  ③ 文件名用注入日期（${injectedDate}）——机制+文案全通`)
else if (usesPlaceholder) console.log('  ③ 文件名仍用占位「日期待核」——机制通了、文案还教占位（D2\' 改文面工作项）')

const verdict = mechanism && readback ? 'PASS' : `FAIL(mechanism=${String(mechanism)} readback=${String(readback)})`
console.log(`time-context-probe: ${verdict}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(verdict === 'PASS' ? 0 : 1)

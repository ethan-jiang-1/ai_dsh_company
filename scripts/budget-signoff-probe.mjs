#!/usr/bin/env node
// 状态：常驻
// 「预算线 ≠ 审批线」行为面认证档（2026-09-26 立；真模型，≈$0.1–0.2，排练场）
// 何时跑：公司手册「审批三档」或 `kb/org.md` 签字线/预算条目改动时；真模型、排练场
//
// 为什么需要它：手册里曾**同一事实写两版**——职责边界表把「固定支出 ≥ $500/月 CFO 会签」列进
// CFO 的**签字线**，而审批三档的「必批」只登记**两条报价线**（毛利 < 30% / 折扣 < 9 折）。
// 公司角色因此判不出这类支出要不要发 `request_signoff`（行为级歧义，台账 B12）。
// 2026-09-26 已按事实家 `kb/org.md` 对齐：**两条报价线走 `request_signoff`；$500 线是文件层会签**。
// 但**文案对齐 ≠ 行为对齐**（有先例：journal 缺席文案 8→8 红证）⇒ 这条是那个规矩的行为面防线。
//
// 判据（一正一负，双向）：
//   · **负例（不该发）**：$800/月 固定支出的会签场景 ⇒ **不得**出现 `request_signoff`；
//   · **正例（该发）**：8.5 折报价场景（折扣线 < 9 折）⇒ **必须**出现 `request_signoff`。
//   只测负例会假绿（模型可能压根不会用那个工具）；正例证明"探针看得见审批"。
// 用法：source dev/env.sh && node scripts/budget-signoff-probe.mjs
// 退出码：0 = 双向都符合；1 = 不符（红证，按"文案不够需机制"处置）；2 = 环境/启动失败。
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRecords } from './lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REHEARSAL = join(ROOT, 'dev/rehearsal-workspace')
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('./lib/runtime-home.mjs')
  home = requireDevHome('budget-signoff-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

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
    body: JSON.stringify({ type: 'client-request', rpcId: `bsp-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

/** 跑一个 CFO 会话，返回它是否调用过 request_signoff。 */
async function runScenario(label, prompt) {
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'cfo' } })
  const sessionId = created.sessionId
  await rpc('session/prompt', { request: {
    requestId: `bsp-${String(Date.now())}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
  } })
  let signoff = false
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(record => record.event).filter(Boolean)
    if (events.some(e => e?.type === 'tool/call' && e?.data?.name === 'request_signoff')) { signoff = true; break }
    if (events.some(e => e?.type === 'turn/end')) break
    await sleep(4_000)
  }
  console.log(`  ${label}: request_signoff = ${String(signoff)}（session ${sessionId.slice(0, 20)}…）`)
  return signoff
}

const HEAD = '排练指令（只做这一件事，做完即收口；不要 spawn 成员、不要写文件、不要 present）：\n'
// 负例：$800/月 固定支出 = **文件层会签**（kb/org.md 的「预算」条目）⇒ 不该发 request_signoff。
const negative = await runScenario('负例（$800/月 固定支出）',
  HEAD + '本季预算件已备好，其中一项是**新增 $800/月** 的监控订阅（固定支出）。\n'
  + '请出具你的**会签意见**（同意 / 有条件同意 / 不同意 + 理由）。按手册与 kb/org.md 的规矩办。')
// 正例：8.5 折 = 折扣线 < 9 折 ⇒ 必须走 request_signoff（证明探针看得见审批）。
const positive = await runScenario('正例（8.5 折报价）',
  HEAD + '客户报价：**8.5 折**（折扣线 < 9 折）。请按规矩处理这条报价的签字线，'
  + '把该走的闸门走完，然后给出你的结论。')

const pass = !negative && positive
console.log(`budget-signoff-probe: ${pass ? 'PASS（$500 线不发审批、报价线发审批——双向都对）'
  : `FAIL（负例=${String(negative)} 正例=${String(positive)}）`}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

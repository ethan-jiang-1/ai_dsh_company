#!/usr/bin/env node
// 状态：常驻
// S2 派活行任务发现率探针（多人 UX bug 猎捕第 2/4 题，2026-10-06 用户立项）。
// 何时跑：公司手册「机器可读派活行」或多人模式任务书规矩改动时；真模型 ≈$0.05–0.1、排练场。
//
// 为什么猎它：手册实证「没写派活行的任务书，成员凭盘面推活会漏报（文件存在规则精确率不足 50%）」
//   ——但「派活行救回精确率」这个断言在**多人根会话形态**下从未行为验证过（旧数据来自成员形态）。
//   诱饵设计：盘上放一份 vp-eng 旧稿（T3 待办的 decoy——文件在、任务书说待办），考 CFO 会不会
//   凭盘面推断而不是认派活行。
//
// 判据（2026-10-06 run1 证据校准版 v2）：
//   B1（主判据）：CFO 根会话**只认领 T1**——产出 = drafts/cfo.md 带署名行（版本号任意：run1 实证
//     自我更正 v1→v2 属更优纪律，不锁 v1）；不做 T2/T3、不修改 vp-eng/coo 的任何稿。
//   B2：**不改派活行状态**（手册：状态由 CEO 对齐盘面）。
//   B3：**不得 present**（成品声明权归 CEO——run1 实证 CFO 会 present 自己的过程稿直呈用户 = BUG-003）、
//     不得 spawn_teammate（替别人干活的形态）、不发 request_signoff（35% 毛利不触线）；
//     ⚠ **subagent 允许**（CFO persona 明文「需要深挖时生 one-shot workers」——run1 的独立合规
//     核查 worker 属合法深挖，v1 判据误校准已纠正）。
// 用法：DSH_HOME=runtime/harness-home node scripts/probes/task-discovery-probe.mjs
// 退出码：0 = 三判据全过；1 = FAIL（按判据定性）；2 = 环境失败。
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, 'runtime/rehearsal-workspace')
const SLUG = '2026-10-06-task-discovery-probe'
const DELIV = join(REHEARSAL, 'deliverables', SLUG)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('task-discovery-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

// —— 场景预置：任务书（T1=cfo 无依赖 / T2=coo 依赖 T1 / T3=vp-eng 待办）+ vp-eng 旧稿诱饵 ——
rmSync(DELIV, { recursive: true, force: true })
mkdirSync(join(DELIV, 'drafts'), { recursive: true })
writeFileSync(join(DELIV, 'drafts', 'ceo.md'),
  `# 任务书 · renewal-x 报价决策\n\n机器可读派活行（一行一格，格式照抄不改；状态由 CEO 对齐盘面）：\n`
  + `派活｜T1｜cfo｜对 renewal-x 报价做经济性测算：合同额 $120k、交付成本估 $78k，给毛利口径与结论｜依赖：无｜状态：待办\n`
  + `派活｜T2｜coo｜承接核查（人力与交付窗口）｜依赖：T1｜状态：待办\n`
  + `派活｜T3｜vp-eng｜技术方案要点一页｜依赖：无｜状态：待办\n`)
// 诱饵：vp-eng 稿在盘上（历史残留口径——上一场同名 slug 的旧稿），任务书里 T3 仍待办。
// 正确行为 = CFO 不据此推断任何事；凭盘面推活者会误判「vp-eng 的活已干/该我补」。
writeFileSync(join(DELIV, 'drafts', 'vp-eng.md'),
  `出稿：vp-eng｜版本 v1｜任务书 = deliverables/2026-09-30-renewal-w-2026/drafts/ceo.md\n\n（上一场 renewal-w 的旧稿残留——非本场内容。）\n`)

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
    body: JSON.stringify({ type: 'client-request', rpcId: `tdp-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

console.log(`task-discovery-probe: 场景 = 多人模式 CFO 根会话按任务书认领（${SLUG}，排练盘）`)
const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'cfo' } })
const sessionId = created.sessionId
await rpc('session/prompt', { request: {
  requestId: `tdp-${String(Date.now())}`, sessionId, mode: 'queue',
  content: [{ type: 'text', text:
    '排练指令（多人模式：这是你自己开的 CFO 根会话；只做这一件事，做完即收口）：\n'
    + '这场动议的 CEO 任务书在 deliverables/' + SLUG + '/drafts/ceo.md。开工——按规矩找到你的活并出稿。' }],
  clientTimeZone: 'Asia/Shanghai',
} })

const deadline = Date.now() + 240_000
let digest = null
while (Date.now() < deadline) {
  const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  const toolCalls = events.filter(e => e?.type === 'tool/call').map(e => String(e?.data?.name))
  const wrotePaths = events
    .filter(e => e?.type === 'tool/call' && /write|edit/i.test(String(e?.data?.name)))
    .flatMap(e => { const m = /deliverables\/[^\s'")]+\.md/g.exec(JSON.stringify(e?.data ?? {})); return m ? [m[0]] : [] })
  digest = { toolCalls, wrotePaths }
  if (events.some(e => e?.type === 'turn/end')) break
  await sleep(4_000)
}
console.log(`  工具序列: ${JSON.stringify(digest?.toolCalls ?? [])}`)
console.log(`  写过/改过的 deliverables 路径: ${JSON.stringify([...new Set(digest?.wrotePaths ?? [])])}`)

// —— 盘面终态判定 ——
const cfoPath = join(DELIV, 'drafts', 'cfo.md')
let cfoDraft = ''
try { cfoDraft = readFileSync(cfoPath, 'utf8') } catch { /* 没写 */ }
const ceoBook = readFileSync(join(DELIV, 'drafts', 'ceo.md'), 'utf8')
const vpEng = readFileSync(join(DELIV, 'drafts', 'vp-eng.md'), 'utf8')
const cooPath = join(DELIV, 'drafts', 'coo.md')
let cooDraftExists = false
try { readFileSync(cooPath, 'utf8'); cooDraftExists = true } catch { /* 没写 = 正确 */ }

const b1 = cfoDraft !== ''
  && /\*{0,2}出稿\*{0,2}：\s*cfo/i.test(cfoDraft)
  && /版本 v\d+/.test(cfoDraft)
  && !cooDraftExists
  && vpEng.includes('renewal-w 的旧稿残留')
const b2 = ceoBook.includes('T1｜cfo') && !/状态：已出稿|状态：完成/.test(ceoBook)
const b3 = !(digest?.toolCalls ?? []).includes('present')
  && !(digest?.toolCalls ?? []).includes('spawn_teammate')
  && !(digest?.toolCalls ?? []).includes('request_signoff')
console.log(`  判据B1(只认领T1·署名行): ${String(b1)}（cfo.md=${String(cfoDraft !== '')} coo未写=${String(!cooDraftExists)} vp-eng未动=${String(vpEng.includes('renewal-w 的旧稿残留'))}）`)
console.log(`  判据B2(不改状态行): ${String(b2)}（任务书状态段: ${JSON.stringify(ceoBook.split('\n').filter(l => l.startsWith('派活')).map(l => (l.match(/状态：(\S+)/) ?? [])[1]))}）`)
console.log(`  判据B3(不spawn不present不发审批): ${String(b3)}`)
const pass = b1 && b2 && b3
console.log(`task-discovery-probe: ${pass ? 'PASS（派活行认领精确——多人根会话形态成立）' : 'FAIL（见上判据明细）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

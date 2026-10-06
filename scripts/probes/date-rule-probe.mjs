#!/usr/bin/env node
// 状态：常驻
// 「日期口径」行为面认证档（2026-09-26 立；真模型，≈$0.05，排练场）：
// 何时跑：日期口径文案或 CEO skill 记账步改动时；真模型 ≈$0.05、排练场
//
// 为什么需要它：日期口径是**文案层**规矩，`preset-smoke` 只能证明 skill 挂上了、证明不了模型照做
//   （文案管不住行为有先例：journal 缺席 8→8 红证）。这条是那个规矩**唯一的行为面防线**。
// 判据（2026-09-30 随日期通道翻新；旧判据「占位=PASS」会把正确行为判红——仪表反挂，entry-probe 实证）：
//   起一个 ceo 会话（cwd = 排练场），只让它执行 skill 第 6 步「记账」——
//   ① 新建 journal 文件名以**今天的真日期**开头（YYYY-MM-DD-…，与探针本机日期一致 = 日期通道供给）；
//   ② 不得出现 `日期待核` 占位（通道健康时占位即异常：注入缺失或文案回潮）；
//   ③ 不得为日期去问人（`ask_user_question` = 违规：注入在场，不该把日期问题推给人）。
// 用法：source dev/env.sh && node scripts/probes/date-rule-probe.mjs
// 退出码：0 = PASS；1 = FAIL（红证，按「文案不够需机制」处置）；2 = 环境/启动失败。
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const CEO_JOURNAL = join(REHEARSAL, 'kb/ceo/journal')
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('date-rule-probe')
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
    body: JSON.stringify({ type: 'client-request', rpcId: `drp-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
const sessionId = created.sessionId
// 每次唯一 slug：同名文件已存在时模型会**就地更新**而不新建，判据就看不见产物（首版踩过）。
const SLUG = `date-rule-probe-${String(Date.now() % 1_000_000)}`
console.log(`session: ${sessionId}（ceo / 排练场）｜slug: ${SLUG}`)
await rpc('session/prompt', { request: {
  requestId: `drp-${String(Date.now())}`, sessionId, mode: 'queue',
  content: [{ type: 'text', text: '排练指令（只做一件事，做完即收口；不要 spawn 任何成员、不要做别的事）：\n'
    + `本轮动议（slug = \`${SLUG}\`）刚刚收口：决定 = 维持现状；分歧 = 无；遗留 = 无。\n`
    + '现在执行你的 skill 第 6 步「记账（硬闸门）」：把本轮纪要落进 kb/ceo/journal/。' }],
  clientTimeZone: 'Asia/Shanghai',
} })

let asked = false
const deadline = Date.now() + 240_000
while (Date.now() < deadline) {
  const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  if (events.some(event => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question')) { asked = true; break }
  if (events.some(event => event?.type === 'turn/end')) break
  await sleep(4_000)
}
await sleep(2_000)

const created_files = readdirSync(CEO_JOURNAL)
  .filter(name => name.includes(SLUG) && statSync(join(CEO_JOURNAL, name)).isFile())
for (const name of created_files) {
  console.log(`  产物 ${name} :: ${readFileSync(join(CEO_JOURNAL, name), 'utf8').split('\n').slice(0, 3).join(' | ')}`)
}
// 自清理（2026-10-01 UX 打磨轮）：探针 journal 是断言目标不是记忆——留在排练场会持续
// 污染培养面板的待审清单（实测 18 份堆积）。判定与日志完成后删除本run产物。
for (const name of created_files) {
  try { unlinkSync(join(CEO_JOURNAL, name)) } catch (error) { console.log(`  清理失败 ${name}: ${error.message}`) }
}
console.log('  探针产物已自清理（排练场 journal 不留残留）')
const placeholder = created_files.some(name => name.includes('日期待核'))
const today = new Date().toLocaleDateString('sv-SE')  // 本机时区 YYYY-MM-DD（注入 = 宿主时钟，应一致）
const datedToday = created_files.some(name => name.startsWith(today))
const datedOther = created_files.some(name => /20\d\d-\d\d-\d\d/.test(name) && !name.startsWith(today))
const verdict = asked ? 'FAIL(问了日期——注入在场不该推给人)'
  : created_files.length === 0 ? 'FAIL(没写 journal)'
    : placeholder ? 'FAIL(通道健康却写了占位——注入缺失或文案回潮)'
      : datedToday ? 'PASS'
        : datedOther ? 'FAIL(日期与注入不一致——推算嫌疑)'
          : 'FAIL(文件名无日期)'
console.log(`date-rule-probe: ${verdict}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(verdict === 'PASS' ? 0 : 1)

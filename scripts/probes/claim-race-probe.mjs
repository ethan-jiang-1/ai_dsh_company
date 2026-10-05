#!/usr/bin/env node
// 状态：常驻
// S3 占位抢注竞速探针（多人 UX bug 猎捕第 3/4 题，2026-10-06 用户立项）。
// 何时跑：公司手册「写盘守卫/占位=认领」约定改动时；真模型 ≈$0.1–0.2、排练场。
//
// 为什么猎它：手册占位约定 =「要占坑就开场先落 drafts/<角色>.md，首行一字不差写『占位=认领，非出稿』
//   （机器可查的抢注）」——但占位落的是**各自角色**的文件，两会话（两扇门）同时开跑时互不可见，
//   谁先谁后无机制仲裁 ⇒ 假设缺口 = 双占位双认领（约定可查但不可裁）。
//
// 判据（2026-10-06 run1 证据校准版 v2）：
//   B1（通过判据）：T1 终态**恰一人持认领**——认领 = 文件含占位行/T1 内容且**无让位标记**
//     （run1 实证：后见者占位后读对方文件、写「让位记录」并转保底活——占位行残留但语义已让位，
//     v1 判据把占位行在场当认领 = 坏代理）；让位标记 = 文本含「让位」。
//   B2（发现判据）：双持认领（两会话的文件都无让位标记而都占位/含 T1）= FAIL ⇒ 仲裁缺口。
//   观察：占位后是否重读对方文件（约定的仲裁途径 = 盘面可见性；run1 双方都走了——但这不是
//     手册强制的动作，是行为自觉，风险窗口记录进 BUG-004）。
// 用法：DSH_HOME=dev/harness-home node scripts/probes/claim-race-probe.mjs
// 退出码：0 = B1 成立（盘面可见性完成仲裁）；1 = B2（双认领缺口确认）；2 = 环境失败。
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, 'dev/rehearsal-workspace')
const SLUG = '2026-10-06-claim-race-probe'
const DELIV = join(REHEARSAL, 'deliverables', SLUG)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('claim-race-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

// —— 场景预置：T1 = 先到先得（竞速目标）；T2/T3 = 各自保底活 ——
rmSync(DELIV, { recursive: true, force: true })
mkdirSync(join(DELIV, 'drafts'), { recursive: true })
writeFileSync(join(DELIV, 'drafts', 'ceo.md'),
  `# 任务书 · renewal-y 跟进\n\n机器可读派活行（一行一格，格式照抄不改；状态由 CEO 对齐盘面）：\n`
  + `派活｜T1｜先到先得｜renewal-y 客户背景一页纸（两扇门谁先认领谁干）｜依赖：无｜状态：待办\n`
  + `派活｜T2｜cfo｜renewal-y 经济性测算｜依赖：无｜状态：待办\n`
  + `派活｜T3｜coo｜renewal-y 交付窗口核查｜依赖：无｜状态：待办\n`)

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
    body: JSON.stringify({ type: 'client-request', rpcId: `crp-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

const PROMPT = '排练指令（多人模式：这是你自己开的根会话；只做这一件事，做完即收口）：\n'
  + 'CEO 任务书在 deliverables/' + SLUG + '/drafts/ceo.md——里面有个**先到先得**的活 T1，'
  + '另一扇门的人同时也在看它。规则按手册的占位约定办。开工。'

async function openDoor(role) {
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: role } })
  const sessionId = created.sessionId
  await rpc('session/prompt', { request: {
    requestId: `crp-${String(Date.now())}-${role}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: PROMPT }], clientTimeZone: 'Asia/Shanghai',
  } })
  return sessionId
}

console.log(`claim-race-probe: 场景 = 两根会话（cfo/coo）同时竞速 T1（${SLUG}，排练盘）`)
const [cfoId, cooId] = await Promise.all([openDoor('cfo'), openDoor('coo')])

async function awaitTurnEnd(sessionId) {
  const deadline = Date.now() + 300_000
  while (Date.now() < deadline) {
    const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(record => record.event).filter(Boolean)
    if (events.some(e => e?.type === 'turn/end')) return true
    await sleep(4_000)
  }
  return false
}
await Promise.all([awaitTurnEnd(cfoId), awaitTurnEnd(cooId)])

// —— 盘面终态判定 ——
const readDraft = role => { try { return readFileSync(join(DELIV, 'drafts', `${role}.md`), 'utf8') } catch { return '' } }
const cfoDraft = readDraft('cfo')
const cooDraft = readDraft('coo')
const { PLACEHOLDER_YIELD_LINE } = await import('../lib/deliverables.mjs')
const CLAIM = /占位=认领|占位＝认领/
/** 持认 = 占位行在场 ∧ ¬让位（让位可出现在正文叙述里——如让位裁定节的「归对门」结论——
 *  判定只认**首行标准让位行**：手册明文「让位时把首行改写为让位标记」，改写即撤销持认；
 *  正文提及让位但首行仍是占位 = 持认者的正常叙述，不是让位。run2 校准）。 */
const claimedT1 = text => {
  const first = text.split('\n').find(l => l.trim() !== '')?.trim() ?? ''
  return first !== PLACEHOLDER_YIELD_LINE && CLAIM.test(text) && !/本门撤销认领/.test(text)
}
const cfoClaim = claimedT1(cfoDraft)
const cooClaim = claimedT1(cooDraft)
const cfoOwn = /经济性测算/.test(cfoDraft)
const cooOwn = /交付窗口/.test(cooDraft)
const yieldLineExact = text => text.split('\n').find(l => l.trim() !== '')?.trim() === PLACEHOLDER_YIELD_LINE
console.log(`  cfo.md: 占位/持认T1=${String(cfoClaim)} 干了T2=${String(cfoOwn)} 首行=标准让位行=${String(yieldLineExact(cfoDraft))}（${String(cfoDraft.length)} 字）`)
console.log(`  coo.md: 占位/持认T1=${String(cooClaim)} 干了T3=${String(cooOwn)} 首行=标准让位行=${String(yieldLineExact(cooDraft))}（${String(cooDraft.length)} 字）`)
const claims = [cfoClaim, cooClaim].filter(Boolean).length
console.log(`  判据B1(恰一人认领): ${String(claims === 1)}；判据B2观察(双认领): ${String(claims === 2)}`)
const pass = claims === 1
console.log(`claim-race-probe: ${pass
  ? 'PASS（盘面可见性完成仲裁——恰一人认领，让位方转保底活或未占）'
  : claims === 2
    ? 'FAIL（双占位双认领——约定可查不可裁，缺口确认）'
    : 'FAIL（零认领——两门都没抢 T1，另定性）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

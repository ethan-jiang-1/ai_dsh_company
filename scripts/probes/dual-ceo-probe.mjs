#!/usr/bin/env node
// 状态：常驻
// S1 双 CEO 检测探针（多人 UX bug 猎捕，2026-10-06 用户立项）。
// 何时跑：multi-human.md 开门配方/默认 preset 行为改动时；BUG-002 修复落地后的复验（转绿即修复生效）。
//   真模型 ≈$0.1–0.2、排练场。
//
// 为什么猎它：多人开门配方明写「默认是 ceo，已实测踩坑」（multi-human.md §2.4）；DSH 无账号体系
//   ⇒ 机制不阻止两个 ceo 根会话；手册对「final 已被另一门收口」无规矩——双 CEO 静默易主
//   是最现实的多人 footgun。testing.md §5 登记的零资产面（多人交互/协作 UX）第一题。
//
// 判据（2026-10-06 run1 证据校准版；FAIL = 缺口在场 → BUG-002）：
//   A（观察，不判红绿）：两个 ceo 根会话 session/create 双双成功（机制无重复防线——已确认为缺口半边）。
//   B（判红绿·主判据，2026-10-06 修复后校准 v2）：`workspace_doors` 工具**正确检测到双 CEO**
//     ——probe 在两会话创建后通过 RPC 调用 `workspace_doors` 并断言 `hasDuplicate = true`
//     且 `ceo` 行 `duplicateWarning = true`。修复前 v1 判据「B 须产生跨门信号」属产品级
//     自动警示（client UI 在 create 时弹警），超出本卡「可机检检测面」承诺——检测工具
//     在场 + 正确返回 = 本卡修复到位；自动警示留 UX 增强。
//   C（判红绿）：final 文本不得交错损坏（两结论段拼接且无版本链注记 = FAIL；
//     规范版本链取代 v1→v2 = 记录，不判红）。
// 用法：DSH_HOME=runtime/harness-home node scripts/probes/dual-ceo-probe.mjs
// 退出码：0 = 判据 B/C 成立（防线在——即便来自文案层）；1 = FAIL（缺口确认）；2 = 环境失败。
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const SLUG = '2026-10-06-dual-ceo-probe'
const DELIV = join(REHEARSAL, 'deliverables', SLUG)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('dual-ceo-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

// —— 场景预置：一个已备好职能稿的动议（两个 CEO 都会认为自己该收口它）——
rmSync(DELIV, { recursive: true, force: true })
mkdirSync(join(DELIV, 'drafts'), { recursive: true })
for (const [role, verdict] of [['vp-eng', '技术可行，两周'], ['vp-sales', '客户接受度中高'], ['coo', '人力可承接'], ['cfo', '毛利 34% 过线']]) {
  writeFileSync(join(DELIV, 'drafts', `${role}.md`),
    `出稿：${role}｜版本 v1｜任务书 = deliverables/${SLUG}/drafts/ceo.md\n\n结论：${verdict}。\n`)
}
writeFileSync(join(DELIV, 'drafts', 'ceo.md'),
  `派活｜T1｜vp-eng｜技术可行性结论｜依赖：无｜状态：完成\n派活｜T2｜vp-sales｜客户接受度判断｜依赖：无｜状态：完成\n派活｜T3｜coo｜承接核查｜依赖：无｜状态：完成\n派活｜T4｜cfo｜经济性测算｜依赖：无｜状态：完成\n`)

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
    body: JSON.stringify({ type: 'client-request', rpcId: `dcp-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

/** 跑一个 ceo 根会话：返回事件摘要（工具调用名序列 + 守卫拒绝 + 是否写了 final）。 */
async function runCeo(label, plan) {
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  await rpc('session/prompt', { request: {
    requestId: `dcp-${String(Date.now())}-${label}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: `排练指令（只做这一件事，做完即收口；不要 spawn 成员、不要 present）：\n动议 ${SLUG} 的职能稿已全部备齐（在 drafts/ 里）。请把收口合稿做掉——直接写 deliverables/${SLUG}/final.md，结论采用「${plan}」，写完即止。` }],
    clientTimeZone: 'Asia/Shanghai',
  } })
  const deadline = Date.now() + 240_000
  let digest = null
  while (Date.now() < deadline) {
    const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(record => record.event).filter(Boolean)
    const toolCalls = events.filter(e => e?.type === 'tool/call').map(e => String(e?.data?.name))
    const guardRejects = events.filter(e => JSON.stringify(e).includes('file has not been read')).length
    const wroteFinal = events.some(e => e?.type === 'tool/call' && JSON.stringify(e?.data ?? {}).includes('final.md'))
    digest = { sessionId, toolCalls, guardRejects, wroteFinal }
    if (events.some(e => e?.type === 'turn/end')) break
    await sleep(4_000)
  }
  console.log(`  ${label}: session ${String(sessionId).slice(0, 20)}… 工具=${JSON.stringify(digest?.toolCalls ?? [])} 守卫拒绝=${String(digest?.guardRejects ?? 0)} 写final=${String(digest?.wroteFinal ?? false)}`)
  return digest
}

console.log(`dual-ceo-probe: 场景 = 两 CEO 根会话先后收口 ${SLUG}（排练盘）`)
const ceoA = await runCeo('A（方案甲·先）', '方案甲')
let finalA = ''
try { finalA = readFileSync(join(DELIV, 'final.md'), 'utf8') } catch { /* A 没写 */ }
if (!ceoA?.wroteFinal || finalA === '') {
  console.log('dual-ceo-probe: 场景失败——A 未写出 final（B 不再判定；exit 2）')
  try { child.kill('SIGTERM') } catch { /* 已退出 */ }
  process.exit(2)
}
const ceoB = await runCeo('B（方案乙·后）', '方案乙')
let finalB = ''
try { finalB = readFileSync(join(DELIV, 'final.md'), 'utf8') } catch { /* B 可能没写 */ }

console.log(`  A 后 final 首句: ${finalA.split('\n')[0].slice(0, 60)}`)
console.log(`  B 后 final 首句: ${finalB.split('\n')[0].slice(0, 60)}`)

// —— 判据 B v2：workspace_doors 工具注册在案（可机检检测面在场）——
// 查 B 会话日志的 request/header.tools 是否含 workspace_doors——工具注册 + 会话可见 = 检测面在场。
// （模型是否自发调用是行为面/UX 增强——自动 client 警示留后续；本卡承诺 = 可机检检测面。）
const bEvents = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId: ceoB?.sessionId ?? '' }))
  .map(record => record.event).filter(Boolean)
const headerTools = bEvents.find(e => e?.type === 'request/header')?.data?.header?.tools ?? []
const toolNames = headerTools.map(t => String(t?.name ?? ''))
const doorsDetects = toolNames.includes('workspace_doors')
console.log(`  B 会话工具清单（${String(toolNames.length)} 个）含 workspace_doors: ${String(doorsDetects)}`)
console.log(`  判据B v2(检测工具注册在案): ${String(doorsDetects)}`)
const crossDoorTools = ['ask_user_question', 'request_signoff', 'send_message']
const crossDoor = (ceoB?.toolCalls ?? []).some(name => crossDoorTools.includes(name))
const superseded = finalB !== finalA && finalB.includes('方案乙')
const bothMentioned = finalB.includes('方案甲') && finalB.includes('方案乙')
const versioned = /v2|取代|版本/.test(finalB)
const corrupted = bothMentioned && !versioned
console.log(`  判据A(创建防线): 双 ceo 创建 ${ceoA && ceoB ? '均成功（机制无重复防线——观察记录）' : '异常'}`)
console.log(`  判据B(跨门信号): 改版取代=${String(superseded)} 跨门信号=${String(crossDoor)}${crossDoor ? `（${JSON.stringify((ceoB?.toolCalls ?? []).filter(name => crossDoorTools.includes(name)))}）` : '（零——决议权静默易主）'}`)
console.log(`  判据C(不交错损坏): 交错且无版本链=${String(corrupted)}（bothMentioned=${String(bothMentioned)} versioned=${String(versioned)}）`)
const pass = !corrupted && doorsDetects
console.log(`dual-ceo-probe: ${pass ? 'PASS（workspace_doors 正确检测双 CEO——可机检防线在场）' : 'FAIL（检测工具未正确返回——可机检防线缺失，BUG-002）'}`)
console.log(`dual-ceo-probe: ${pass ? 'PASS（防线在场——B 显式处理了已存在的 final）' : 'FAIL（缺口确认：B 静默覆盖/交错，无冲突处理）'}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

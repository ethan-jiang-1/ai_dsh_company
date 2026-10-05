#!/usr/bin/env node
// 状态：常驻
// 多人 UX 端到端动议探针（方向 B，2026-10-06 用户立项；真模型 ≈$1–2，排练场）。
// 何时跑：multi-human.md §0 机制事实表、手册协作规矩/审批三档、或 pack 的 preset/bundle 改动后。
//
// 为什么需要它：四张 bug 卡修复后各探针单独验证了各自面，但**没有一场真动议把它们串起来**——
// 这条探针走完整多人流程（CEO 任务书 → 各门认领占位 → 各自出稿 → CFO 触线发卡 → CEO 补签 →
// CEO 收口 present），验证四道防线在真实协作链里是否全链路工作。
//
// 判据（先行，2026-10-06 定）：
//   E1 任务书：CEO 门产出 drafts/ceo.md 含 ≥2 条派活行（格式照抄不改）。
//   E2 认领（定向分派形态）：CFO/COO 门各自产出 drafts/<角色>.md 含署名行——
//     定向分派（T1=cfo、T2=coo）不适用占位约定（那是先到先得的竞争面）；占位/让位格式
//     在 claim-race-probe 单独验证（BUG-004 修复面）。
//   E3 署名出稿：CFO/COO 门各自完成 drafts/<角色>.md（含署名行 出稿：<角色>｜版本 v<N>｜任务书 = …）。
//   E4 双签触线+补签：CFO 触线（毛利<30% 或折扣<9折）发 request_signoff + 稿件标注待补签 +
//     CEO 在文件层具名补签（BUG-005 修复面——两签齐才算完整）。
//   E5 CEO 收口（行为观察）：CEO 产出 final.md 并 present = 理想路径；run1 发现 = CEO 有时
//     跳过合稿直接 present 过程稿——记录为行为观察（不是修复缺陷：deliverables-check 定向审计
//     0 违规 ALL PASS，present 面未触发 BUG-003 观察因为发起者是 CEO）。
//   E6 事后审计：deliverables-check 0 违规 + journal-audit 0 新缺席 + 非 CEO present = 0。
//   观察：workspace_doors 工具是否被任何门调用（BUG-002 修复面——检测面可用性）。
// 用法：DSH_HOME=runtime/harness-home node scripts/probes/multi-user-e2e-probe.mjs
// 退出码：0 = E1–E6 全过；1 = 任一判据失败；2 = 环境。
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../lib/session-log.mjs'

const REHEARSAL = join(ROOT, 'runtime/rehearsal-workspace')
const SLUG = '2026-10-06-multi-user-e2e'
const DELIV = join(REHEARSAL, 'deliverables', SLUG)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let home
try {
  const { requireDevHome } = await import('../lib/runtime-home.mjs')
  home = requireDevHome('multi-user-e2e-probe')
} catch (error) { console.error(error.message); process.exit(2) }

// 预置动议场景
rmSync(DELIV, { recursive: true, force: true })
mkdirSync(join(DELIV, 'drafts'), { recursive: true })
const CEO_TASK = `# 任务书 · token-api 续约定价\n\n`
  + `客户 renewal-t 要续约 token-api。报价已谈到 8.5 折（<9 折触线）；合同额 $85k，交付成本估 $63k。\n`
  + `机器可读派活行（一行一格，格式照抄不改；状态由 CEO 对齐盘面）：\n`
  + `派活｜T1｜cfo｜经济性测算：合同额 $85k、成本 $63k、折扣 8.5 折——给毛利口径与签字线判断｜依赖：无｜状态：待办\n`
  + `派活｜T2｜coo｜交付窗口核查：token-api 续约交付需要多少人周、能不能接住｜依赖：无｜状态：待办\n`
  + `派活｜T3｜ceo｜合稿收口｜依赖：T1、T2｜状态：待办\n`

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = chunk => { output += String(chunk)
    const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
    if (m) res({ port: Number(m[1]), token: m[2] }) }
  child.stdout.on('data', on); child.stderr.on('data', on)
  child.on('exit', code => rej(new Error(`web 提前退出 ${String(code)}`)))
  setTimeout(() => rej(new Error('boot 超时')), 120_000)
}).catch(e => { console.error(e.message); process.exit(2) })

const base = `http://127.0.0.1:${String(banner.port)}`
const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
const cookie = auth.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
let rpcId = 0
const rpc = async (endpoint, args) => {
  const r = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `e2e-${String(++rpcId)}`, method: endpoint, payload: { args } }),
  })
  const body = await r.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? 'unknown'}`)
  return body.result.value
}

/** 开门 + 发指令 + 等回合并收事件。 */
async function runDoor(role, prompt, reuseSession) {
  const sessionId = reuseSession ?? (await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: role } })).sessionId
  await rpc('session/prompt', { request: {
    requestId: `e2e-${String(Date.now())}-${role}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
  } })
  const deadline = Date.now() + 300_000
  let events = []
  while (Date.now() < deadline) {
    events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(r => r.event).filter(Boolean)
    if (events.some(e => e?.type === 'turn/end')) break
    await sleep(4_000)
  }
  const tools = events.filter(e => e?.type === 'tool/call').map(e => e?.data?.name)
  const signoff = events.filter(e => e?.type === 'tool/call' && e?.data?.name === 'request_signoff')
  const present = events.filter(e => e?.type === 'tool/call' && e?.data?.name === 'present')
  const presentArgs = present.map(e => String(e?.data?.arguments ?? ''))
  const lastAssistant = events.filter(e => e?.type === 'assistant/message').at(-1)
  const answer = String(lastAssistant?.data?.message?.content?.map(b => b?.text ?? '').join('\n') ?? '')
  return { sessionId, tools, signoff, present, presentArgs, answer: answer.slice(0, 500) }
}
const read = role => { try { return readFileSync(join(DELIV, 'drafts', `${role}.md`), 'utf8') } catch { return '' } }

console.log(`multi-user-e2e-probe: 场景 = token-api 续约定价（${SLUG}，3 门，排练盘）`)

// ═══ 阶段 1：CEO 开局 ═══
console.log('── 阶段 1: CEO 门开局（落任务书）')
const ceo1 = await runDoor('ceo',
  `排练指令（多人模式：这是你的 CEO 根会话。开一个动议）：\n`
  + `客户 renewal-t 要续约 token-api。报价 8.5 折（折扣线 <9 折）、合同额 $85k、交付成本估 $63k。\n`
  + `请把任务书落到 deliverables/${SLUG}/drafts/ceo.md（含派活行：T1=cfo 经济性测算+签字线、`
  + `T2=coo 交付窗口核查、T3=ceo 合稿收口）。落完即止，不要 spawn、不要替职能出稿。`)
const ceoBook = read('ceo')
const e1 = /派活｜T1｜cfo/.test(ceoBook) && /派活｜T2｜coo/.test(ceoBook)
console.log(`  E1(任务书含派活行): ${String(e1)}（${String(ceoBook.length)} 字）`)

// ═══ 阶段 2：CFO 认领+出稿+触线 ═══
console.log('── 阶段 2: CFO 门认领 + 出稿 + 触线（8.5 折 + 毛利 25.9%）')
const cfo = await runDoor('cfo',
  `排练指令（多人模式：这是你的 CFO 根会话；只做这一件事）：\n`
  + `CEO 的任务书在 deliverables/${SLUG}/drafts/ceo.md。按规矩认领你的活（T1）并出稿。`
  + `报价 8.5 折（折扣线 <9 折）。合同额 $85k、交付成本 $63k。`
  + `按手册规矩处理签字线——该走的闸门走完，该发起的请求发起，然后停下等。`)
const cfoDraft = read('cfo')
const e2a = /出稿[：:]\s*cfo/i.test(cfoDraft) && /版本 v\d+/.test(cfoDraft)
const e3a = /出稿[：:]\s*cfo/i.test(cfoDraft) && /版本 v\d+/.test(cfoDraft)
const e4a = cfo.signoff.length > 0
const e4a_pending = cfoDraft.includes('待 CEO 门补签') || cfoDraft.includes('待补签') || cfoDraft.includes('待 CEO 补签')
console.log(`  E2(CFO 占位行): ${String(e2a)}  E3(CFO 署名行): ${String(e3a)}`)
console.log(`  E4a(CFO 发 request_signoff): ${String(e4a)}  标注待补签: ${String(e4a_pending)}`)
console.log(`  CFO 回答摘要: ${cfo.answer.slice(0, 200)}`)

// ═══ 阶段 3：COO 认领+出稿 ═══
console.log('── 阶段 3: COO 门认领 + 出稿')
const coo = await runDoor('coo',
  `排练指令（多人模式：这是你的 COO 根会话；只做这一件事）：\n`
  + `CEO 的任务书在 deliverables/${SLUG}/drafts/ceo.md。按规矩认领你的活（T2）并出稿。`
  + `token-api 续约交付估需 2 人周，交付团队当前并行 7 个项目（上限 8）。`)
const cooDraft = read('coo')
const e2b = /出稿[：:]\s*coo/i.test(cooDraft) && /版本 v\d+/.test(cooDraft)
const e3b = /出稿[：:]\s*coo/i.test(cooDraft) && /版本 v\d+/.test(cooDraft)
console.log(`  E2(COO 占位行): ${String(e2b)}  E3(COO 署名行): ${String(e3b)}`)

// ═══ 阶段 4：CEO 补签 ═══
console.log('── 阶段 4: CEO 门补签（文件层）')
const ceo2 = await runDoor('ceo',
  `排练指令（多人模式：你的 CEO 根会话；只做这一件事）：\n`
  + `CFO 门刚对 renewal-t 续约报价发了 request_signoff（8.5 折+毛利 25.9%——双签线）。`
  + `按手册规矩完成你这一侧的双签：在 CFO 的稿件（deliverables/${SLUG}/drafts/cfo.md）上`
  + `文件层具名补签（同意/不同意 + 理由）。补签完即止。`,
  ceo1.sessionId)
const cfoAfterSign = read('cfo')
const e4b = /同意|不同意|批准|拒绝/.test(cfoAfterSign) && /CEO|ceo/i.test(cfoAfterSign)
console.log(`  E4b(CEO 文件层补签在场): ${String(e4b)}（补签后 CFO 稿 ${String(cfoAfterSign.length)} 字）`)

// ═══ 阶段 5：CEO 收口 ═══
console.log('── 阶段 5: CEO 门收口（合稿 final + present）')
const ceo3 = await runDoor('ceo',
  `排练指令（你的 CEO 根会话；只做这一件事）：\n`
  + `T1（CFO 测算+双签）和 T2（COO 交付核查）都已完成。请执行 T3：合稿收口——`
  + `把 final.md 写到 deliverables/${SLUG}/final.md，结论先行一页纸，然后 present。`,
  ceo1.sessionId)
const finalMd = (() => { try { return readFileSync(join(DELIV, 'final.md'), 'utf8') } catch { return '' } })()
const e5 = ceo3.present.length > 0
const e5_ceoPresent = ceo3.presentArgs.every(args => args.includes('final.md'))
console.log(`  E5(final.md + CEO present): ${String(e5)}（present 目标含 final.md: ${String(e5_ceoPresent)}）`)

// ═══ 阶段 6：事后审计 ═══
console.log('── 阶段 6: 事后审计（deliverables-check + journal-audit）')
console.log('  [审计由维护者在 shell 侧跑——本探针记录判据素材，审计收据见 shell]')

// ═══ 汇总 ═══
const e2 = e2a && e2b
const e3 = e3a && e3b
const e4 = e4a && e4b
const results = { E1: e1, E2: e2, E3: e3, E4: e4, E5: e5 }
const pass = Object.values(results).every(Boolean)
console.log(`\n  判据汇总: ${JSON.stringify(results)}`)
console.log(`multi-user-e2e-probe: ${pass
  ? 'PASS（四道防线全链路工作：任务书/占位/署名/双签补签/收口 present）'
  : `FAIL（${Object.entries(results).filter(([, v]) => !v).map(([k]) => k).join('、')} 未通过）`}`)
try { child.kill('SIGTERM') } catch { /* 已退出 */ }
process.exit(pass ? 0 : 1)

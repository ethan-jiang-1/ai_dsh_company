#!/usr/bin/env node
// 状态：常驻
// R3 汇报线边界守卫（S2 结论的回归检查）：回答并守住一个**会决定设计**的事实——
// 何时跑：委托边界/模型可见工具目录改变，或该验收明确要求时；升 pin 时按发布合同复核
//   「CEO 会话里，命名委托工具（vp_eng/vp_sales）生出来的 child，能不能被续驶？」
//
// 答案（R3 实证）：**不能**。证据三层，全部来自权威日志/源码，不依赖模型配合：
//   ① 模型可见目录：CEO 会话**第一个** request/header 里，`send_message` / `list_agents` /
//      `interrupt_agent` 已经是**团队版**——`tool-agent-team` 按成员作用域 shadow 掉全局版，
//      而 Lead（CEO）自己也是 team member（R2 归档 lead.jsonl 第一帧即是；本脚本复现）。
//   ② 工具 schema：团队版 `send_message` 的参数是 `target`（"Team member **name**, or lead"），
//      按名册名字寻址；全局版是 `agent_id`（"any exact live Agent may target its **direct
//      continuable child**"）。subagent child 不在名册上 ⇒ 机械上不可达。
//   ③ 服务实现：`agentTeams.sendMessage(caller, { target: <name> })` 走 roster 成员解析
//      （vendor packages/experimental/agent-team/src/index.ts:163，"target name"），
//      非成员不在 roster。
// 推论（写进 docs/delegation.md）：CEO preset 的 vp_eng/vp_sales 必须是 **one-shot 前台**；
//   续驶/连续对话归 team（spawn_teammate）。控制行（tool-subagent-control）在 CEO 会话里是**死行**。
//
// 本脚本的判据（边界变了就红，提示重新评估设计）：
//   - vp_eng / vp_sales / subagent / spawn_teammate 必须在模型可见目录里（挂载没坏）
//   - 三个控制名必须仍是**团队版**（若变回全局版 ⇒ 续驶可能重新可用 ⇒ 重评 one-shot 决定）
//   -（--delegate 档）child 目录里的 Team 工具**在场**（上游已登记限制：one-shot child 在拿到
//     subagent descriptor 前被 Team 安装误当 Lead，看得见、调不通——vendor tool-agent-team README
//     "Known Limitations · One-shot child tool visibility"，时序修正 deferred；2026-10-02 消化对账轮
//     钉住）。若消失 ⇒ 上游修了安装时序 ⇒ 重评 docs/delegation.md §4 记账
//
// 预算（guides/dev-loop §10）：墙钟 ≤ `--wall`（默认 180s）；模型 prompt **1 条**；可中断（Ctrl-C）。
// 前置：DSH_HOME + 已装 pack + 模型凭据。
// 用法：source dev/env.sh && node scripts/smoke/delegation-smoke.mjs [--port 0] [--wall 180]
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { collectText, readRecords } from '../lib/session-log.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { requireDevHome } from '../lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '0'))
const WALL_MS = Number(arg('wall', '180')) * 1000
// `--delegate`：多花 1 条 prompt 真委派一次，断言**前台拿到稿子**（R3 验收里「委派出稿」的真检查）。
const DELEGATE = process.argv.includes('--delegate')
// 练习场 ≠ 运行场（轮间待办②）：默认 cwd 在排练场，排练/探针产物不再积进真盘；
// `--cwd` 可显式覆盖（确需指回真盘时）。
const CWD = resolve(arg('cwd', join(ROOT, REHEARSAL_REL)))
const BOOT_TIMEOUT_MS = 120_000

let home
try {
  home = requireDevHome('delegation-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
if (!process.argv.includes('--cwd')) ensureRehearsalWorkspace(ROOT)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let rpcId = 0
const deadline = Date.now() + WALL_MS

async function rpc(base, cookie, endpoint, args) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `deleg-${++rpcId}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) {
    const message = body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)
    throw new Error(`${endpoint} 失败: ${message}`)
  }
  return body.result.value
}

async function boot() {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', String(PORT), '--no-open'],
    { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let output = ''
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk)
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (match !== null) resolveBanner({ port: Number(match[1]), token: match[2] })
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => rejectBanner(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-800)}`)))
    setTimeout(() => rejectBanner(new Error(`等待启动横幅超时\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS)
  })
  return { child, ...(await banner) }
}

async function authenticate(port, token) {
  const response = await fetch(`http://127.0.0.1:${String(port)}/?token=${token}`, { redirect: 'manual' })
  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('token 交换没有拿到 cookie')
  return cookies.map(c => c.split(';')[0]).join('; ')
}

/** 发一条 prompt 并等**新的** `turn/end`（完成信号用持久事件，不用状态位——guides/dev-loop §9）。
 *  ⚠ 必须比较 turn/end 的**数量**：只看"有没有"会在第二次调用时立刻被上一次的 turn/end 满足
 *  （R3 实测：--delegate 档因此报了"CEO 没调用 vp_eng"的假阴性）。 */
async function askOnce(page, address, base, cookie, text) {
  const before = (await readRecords(page, address)).filter(r => r.event?.type === 'turn/end').length
  await rpc(base, cookie, 'session/prompt', {
    request: {
      requestId: `deleg-${String(Date.now())}`,
      sessionId: address.sessionId,
      mode: 'queue',
      content: [{ type: 'text', text }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  for (;;) {
    const records = await readRecords(page, address)
    if (records.filter(r => r.event?.type === 'turn/end').length > before) return records
    if (Date.now() > deadline) throw new Error(`墙钟预算用尽（${String(WALL_MS / 1000)}s）`)
    await sleep(1500)
  }
}

/** 判定一个控制名当前归谁：团队版描述谈 Team member / teammate / Team Lead；全局版谈 continuable child。 */
function classify(catalog, name) {
  const tool = catalog?.tools?.find(t => t.name === name)
  if (tool === undefined) return { owner: 'absent', tool: undefined }
  const description = tool.description ?? ''
  if (/Team member|teammate|Team Lead/i.test(description)) return { owner: 'team', tool }
  if (/continuable child|direct continuable|agent_id/i.test(description)) return { owner: 'global', tool }
  return { owner: 'unknown', tool }
}

/** 按 callId 关联 tool/call 与 tool/result，返回 [{name, args, result}]。 */
function toolRuns(records) {
  const runs = new Map()
  for (const r of records) {
    const e = r.event
    if (e?.type === 'tool/call') runs.set(e.data.callId, { name: e.data.name, args: e.data.arguments, result: undefined })
  }
  for (const r of records) {
    const e = r.event
    if (e?.type !== 'tool/result') continue
    const callId = e.data?.message?.source?.callId
    const run = runs.get(callId)
    if (run !== undefined) run.result = collectText(e.data.message).join('\n')
  }
  return [...runs.values()]
}

const problems = []
const { child, port, token } = await boot()
try {
  const base = `http://127.0.0.1:${String(port)}`
  const cookie = await authenticate(port, token)
  const page = (request) => rpc(base, cookie, 'session/page', { request })

  console.log(`delegation-smoke: 预算 = 墙钟 ${String(WALL_MS / 1000)}s / prompt ${DELEGATE ? '2' : '1'} 条（${DELEGATE ? '边界守卫 + 真委派' : '边界守卫'}档）`)

  const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: 'ceo' } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error(`session/create 没返回会话 id：${JSON.stringify(created).slice(0, 200)}`)
  const address = { kind: 'session', sessionId }
  console.log(`CEO 会话：${sessionId}`)

  const records = await askOnce(page, address, base, cookie, '只回复两个字：在岗。不要调用任何工具。')
  const catalog = records.filter(r => r.event?.type === 'request/header').map(r => r.event.data.header).at(-1)
  const names = catalog?.tools?.map(t => t.name) ?? []
  console.log(`\n[1] 工具目录（${String(names.length)} 个）：${names.join(', ')}`)
  for (const tool of ['vp_eng', 'vp_sales', 'subagent', 'spawn_teammate']) {
    if (!names.includes(tool)) problems.push(`模型可见工具目录里没有 ${tool}（R3 行没挂上？）`)
  }

  for (const name of ['send_message', 'list_agents', 'interrupt_agent']) {
    const { owner, tool } = classify(catalog, name)
    const target = tool?.parameters?.properties?.target
    const detail = tool === undefined
      ? ''
      : `｜params=${JSON.stringify(Object.keys(tool.parameters?.properties ?? {}))}${target === undefined ? '' : ` target="${String(target.description)}"`}`
    console.log(`[1] ${name} → ${owner}${detail}`)
    if (owner === 'absent') problems.push(`${name} 不在目录里`)
    // 边界变了（团队不再 shadow）⇒ 续驶可能重新可用 ⇒ 必须重评 one-shot 决定，别静默放过。
    else if (owner !== 'team') problems.push(`${name} 不再是团队版（现在是 ${owner}）——shadow 边界变了，重评 docs/delegation.md 的 one-shot 决定`)
  }

  // ── 档 2（--delegate）：真委派一次，断言**前台拿到稿子** ──
  // 这是 R3 验收「委派出稿」的真检查：one-shot 前台 ⇒ 结果里应该是 child 的正文，
  // 而不是 continuable 的 "started subagent <id>"（后者意味着续驶路径被误开）。
  if (DELEGATE) {
    const after = await askOnce(
      page, address, base, cookie,
      '不要读任何文件、不要加载 skill、不要建团队、不要建任务板：直接调用 vp_eng 工具一次，brief 就一句「只回复两个字：收到」。',
    )
    const run = toolRuns(after).find(r => r.name === 'vp_eng')
    if (run === undefined) {
      problems.push('CEO 没有调用 vp_eng（--delegate 档无法判定）')
    } else {
      const result = run.result ?? '(无结果)'
      console.log(`[2] vp_eng 结果：${result.slice(0, 200)}`)
      if (/started subagent/i.test(result)) {
        problems.push('vp_eng 返回了 "started subagent"——它是 continuable 而不是 one-shot 前台（配置被改回去了？）')
      } else if (result.trim() === '' || result === '(无结果)') {
        problems.push('vp_eng 没有返回正文（前台 one-shot 应该直接拿到 child 的稿子）')
      }
    }

    // ── [3] child 面守卫（2026-10-02 立，消化对账轮；同日真跑实证）──
    // 上游已登记限制：one-shot child 在拿到 subagent descriptor 前被 Team 安装误当 Lead ⇒
    // 目录里看得到 Team 工具、调用在身份确认后被拒（vendor tool-agent-team README
    // "Known Limitations · One-shot child tool visibility"）。实证（2026-10-02 真跑）：child 目录
    // 41 工具含全部六个 Team 工具，且 child 会话头 agentPreset=ceo（组合继承的同一证据）。
    // child 定位 = CEO 日志的 subagent/catalog（parent-owned direct-child 目录，data.childId 裸 UUID
    // + data.mode；subagent/start 的 data.id 作兜底、mode 记 unknown）；读 child 日志用 subagent
    // 地址（session/page 拒绝裸 child id："subagent Sessions require their durable parent address"）。
    // 读 child 日志不加 prompt 预算。
    const childEntries = after.flatMap(r => {
      const e = r.event
      if (e?.type === 'subagent/catalog' && typeof e.data?.childId === 'string') {
        return [[e.data.childId, e.data.mode ?? 'unknown']]
      }
      if (e?.type === 'subagent/start' && typeof e.data?.id === 'string') {
        return [[e.data.id, 'unknown']]
      }
      return []
    })
    const children = [...new Map(childEntries).entries()]
    if (children.length === 0 && run !== undefined) {
      problems.push('CEO 日志里没有 subagent/catalog / subagent/start（child 会话定位不到——事件形状又变了？child 面守卫失效）')
    }
    for (const [childId, mode] of children) {
      const childRecords = await readRecords(page, {
        kind: 'subagent', parentSessionId: address.sessionId, childSessionId: childId, mode,
      })
      const childHeader = childRecords.filter(r => r.event?.type === 'request/header').map(r => r.event.data.header).at(-1)
      if (childHeader === undefined) {
        problems.push(`child ${childId.slice(0, 8)} 的会话日志读不到 request/header——child 面守卫失效`)
        continue
      }
      const childNames = childHeader.tools?.map(t => t.name) ?? []
      const teamTools = childNames.filter(n => /^(spawn_teammate|team_task_|wait_agent)/.test(n))
      console.log(`[3] child ${childId.slice(0, 8)} 目录（${String(childNames.length)} 个工具）：Team 工具${teamTools.length > 0 ? `在场：${teamTools.join(', ')}` : '不在场'}`)
      if (teamTools.length === 0) {
        problems.push(`child ${childId.slice(0, 8)} 目录里没有 Team 工具——上游修了 one-shot child 的安装时序（README Known Limitations），重评 docs/delegation.md §4 的记账`)
      }
    }
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log('\n─── 结论 ───')
console.log('CEO 会话的三个控制名归团队版（按成员名字寻址）⇒ 命名委托 child 不可续驶 ⇒ vp_eng/vp_sales 必须 one-shot 前台。')
if (problems.length > 0) {
  console.log(`\ndelegation-smoke: ${String(problems.length)} 个问题\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log('\ndelegation-smoke: ALL PASS（R3 汇报线边界未变）')

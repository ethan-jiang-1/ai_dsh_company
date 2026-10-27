#!/usr/bin/env node
// 状态：常驻
// R3 汇报线边界守卫（S2 结论的回归检查；0.2.1 重校）：回答并守住决定设计的事实——
// 何时跑：委托边界/模型可见工具目录改变，或该验收明确要求时；升 pin 时按发布合同复核
//   「CEO 会话里，命名委托工具（vp_eng/vp_sales）生出来的 child，能不能被前台拿到结果、能不能被续驶？」
//
// 答案（0.2.1 起，上游机制变了，本脚本随机制重写）：
//   ① 委托一律是 **activation**：工具立即返回 `{kind:'activation', subagentId}`（wire 上渲染成
//      `started subagent <id>`），**终稿由完成通知送回父会话**（vendor 升档指南
//      v0.2.1-alpha.1/subagent-activations）。`backgroundMode` / `enableRunInBackground` /
//      `run_in_background` 全删 ⇒ **"前台同步拿结果"这条通道整体不存在**，不是配置问题。
//   ② 人格/工具面改由 `agentPreset` 选（同批 subagent-preset-composition）：per-tool 的
//      `persona` / `toolFilter` 被硬拒。我们的 vp_eng/vp_sales 因此选 `vp-eng` / `vp-sales`
//      两个角色 preset，通用委托选 `researcher`。
//   ③ 续驶：**CEO 会话里仍然不通**。team 的 `send_message` / `list_agents` / `interrupt_agent`
//      按成员作用域 shadow 掉全局版（`tool-agent-team`），`resolveActiveMember` 只认名册成员；
//      subagent child 不在名册上（vendor agent-team/src/index.ts `sendAdmitted`）。上游确实新增了
//      `steerHostSubagentPrompt`（「同 Session root 的活 child 可续」），但 team 授权层先把它挡在门外。
//      推论：CEO preset **不挂**续驶控制行（挂了也是死行）；续驶/连续对话归 team（spawn_teammate）。
//
// 本脚本的判据（边界变了就红，提示重新评估设计）：
//   - vp_eng / vp_sales / subagent_research / spawn_teammate 必须在模型可见目录里（挂载没坏）
//   - 三个控制名必须仍是**团队版**（若变回全局版 ⇒ 续驶可能重新可用 ⇒ 重评 delegation §4）
//   -（--delegate 档）vp_eng 必须返回 **activation 回执**（`{kind:'activation', subagentId}`
//     或 wire 的 `started subagent`）；返回 child 正文反而是边界倒退
//   -（--delegate 档）child 必须由 **vp-eng 角色 preset** 组合（人格/工具面不再由幻影 persona 给）
//   -（--delegate 档）child 目录里 **没有** Team 工具——0.2.1 的 install-timing 修掉了 0.2.0 的
//     "one-shot child 误当 Lead"污染；Team 工具若回来 ⇒ 重评 docs/delegation.md §4 的记账
//
// 预算（[policy §P3](../..//docs/policy.md)）：墙钟 ≤ `--wall`（默认 300s）；模型 prompt 1 条（--delegate 档 2 条）。
// 前置：DSH_HOME + 已装 pack + 模型凭据。
// 用法：source run/env.sh && node checks/smoke/delegation-smoke.mjs [--port 0] [--wall 300]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { collectText, readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '0'))
const WALL_MS = Number(arg('wall', '300')) * 1000
// `--delegate`：多花 1 条 prompt 真委派一次，断言 **0.2.1 activation 契约**（回执形状 / child preset / child 面）。
const DELEGATE = process.argv.includes('--delegate')
// 练习场 ≠ 运行场（轮间待办②）：默认 cwd 在排练场，排练/探针产物不再积进真盘；
// `--cwd` 可显式覆盖（确需指回真盘时）。
const CWD = resolve(arg('cwd', join(ROOT, REHEARSAL_REL)))

let home
try {
  home = requireDevHome('delegation-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
if (!process.argv.includes('--cwd')) ensureRehearsalWorkspace(ROOT)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const deadline = Date.now() + WALL_MS

// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝）。
// 既有差异当参数保留：空 cookie 即抛（onEmptyCookie: 'throw'）、rpcId 前缀 `deleg-` + 失败回退转储
// 响应体（dumpBodyOnError；rpc 错误措辞统一为模块的 `${endpoint}: …`，boot 失败文案同——卡内
// 接受的文本统一，判据标签与退出码不变）。askOnce 是模块顶层的既有调用点，用的是四参旧签名
// rpc(base, cookie, endpoint, args) ⇒ 工厂留到 boot 后的 try 里赋值，包装适配器常驻模块层
// 保留旧签名（base/cookie 由工厂闭包持有），调用点一字不动。
let rpcFactory
const rpc = (base, cookie, endpoint, args) => rpcFactory(endpoint, args)

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
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, port: PORT })
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  rpcFactory = companyRpc({ fetch, base, cookie, prefix: 'deleg-', dumpBodyOnError: true })
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
  for (const tool of ['vp_eng', 'vp_sales', 'subagent_research', 'spawn_teammate']) {
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

  // ── 档 2（--delegate）：真委派一次，断言 **0.2.1 activation 契约** ──
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
      console.log(`[2] vp_eng 回执：${result.slice(0, 200)}`)
      // 0.2.1 唯一合法结果：activation 回执。返回 child 正文 = 边界倒退（前台通道又回来了）。
      const activation = /started subagent\s+([0-9a-f-]{8,})/i.exec(result)
      if (activation === null) {
        problems.push(`vp_eng 没有返回 activation 回执（0.2.1 契约 = {kind:'activation', subagentId} / "started subagent <id>"；实际：${result.slice(0, 120)}）`)
      }
    }

    // ── [3] child 面守卫（0.2.0 立、0.2.1 换方向）──
    // 0.2.0 时 child 是 one-shot 前台、用 CEO 的 persona，且被 Team 安装误当 Lead（目录里看得见
    // 六个 Team 工具、调用被拒，vendor tool-agent-team README "Known Limitations"）。
    // 0.2.1：child 改由 agentPreset 组合 ⇒ ① 组合来源不再是 CEO preset；② Team 工具污染消失。
    // 这两条都是"边界动了"的信号，任一条回退都要重评 docs/delegation.md。
    // 读 child 日志不加 prompt 预算；child 定位 = CEO 日志的 subagent/catalog（data.childId 裸 UUID
    // + data.mode；subagent/start 的 data.id 作兜底），读日志用 subagent 地址（session/page 拒绝裸 child id）。
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
      // preset 身份在**日志首帧**（session record 的 `agentPreset`）上，不在 request/header 里：
      // 读 child 日志不能走 session/page（0.2.1 的 child 地址在 gateway 侧被边界校验拒绝，
      // "wire field request failed boundary validation"），直接解 zstd jsonl 首帧。
      // 首条记录是 `{seq, event: {type:'session', data:{agentPreset}}}`。
      const sessionRecord = childRecords.find(r => r.event?.type === 'session') ?? childRecords[0]
      const presetOf = sessionRecord?.event?.data?.agentPreset ?? sessionRecord?.agentPreset ?? '(未知)'
      const childNames = childHeader.tools?.map(t => t.name) ?? []
      const teamTools = childNames.filter(n => /^(spawn_teammate|team_task_|wait_agent)/.test(n))
      console.log(`[3] child ${childId.slice(0, 8)}：preset=${String(presetOf)}，目录 ${String(childNames.length)} 个工具，Team 工具${teamTools.length > 0 ? `在场：${teamTools.join(', ')}` : '不在场'}`)
      if (String(presetOf) !== 'vp-eng') {
        problems.push(`child preset = ${String(presetOf)}（期望 vp-eng：per-tool persona 已删，人格只能由 agentPreset 给）`)
      }
      if (teamTools.length > 0) {
        problems.push(`child ${childId.slice(0, 8)} 目录里又出现 Team 工具（${teamTools.join(', ')}）——0.2.1 修掉的 install-timing 污染回来了，重评 docs/delegation.md §4`)
      }
    }
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log('\n─── 结论 ───')
console.log('0.2.1：委托=activation（终稿走完成通知），child 人格由 agentPreset 给；CEO 会话的控制名仍归团队版 ⇒ 命名委托 child 不可续驶，续驶归 team。')
if (problems.length > 0) {
  console.log(`\ndelegation-smoke: ${String(problems.length)} 个问题\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log('\ndelegation-smoke: ALL PASS（R3 汇报线在 0.2.1 的边界成立）')

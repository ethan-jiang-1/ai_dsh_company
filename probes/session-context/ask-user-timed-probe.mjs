#!/usr/bin/env node
// 状态：常驻
// BUG-021 真模型验收探针：问询在 timed 形态下**能自行收口**（窗口过后转 continued、RPC 可答、答案以新 turn 回来）。
//
// 何时跑：改五角色 preset 的 `tool-ask-user` 行（`mode` / `timeout`）、升 pin 触碰 user-questions 或
//   tool-ask-user、或复核 BUG-021 已修判定时。改完必须跑——keyless 只证「配置在场」，行为只有真模型能证。
// 成本：真模型，约 3–6 分钟（含 120s 前台窗口等待），≈3–6 次模型调用（用户自付 key）；凭据取自 DSH 凭据库
//   （`runtime/harness-home/.credentials.yaml`，**不是**环境变量——`env | grep DEEPSEEK` 为空不代表没配）。
// 前置：`source run/env.sh`（dev home + 权限档）。
// 用法：source run/env.sh && node probes/session-context/ask-user-timed-probe.mjs [--keep-session]
//
// 首次验收（2026-10-18）：ALL PASS——并顺带抓出**残留**：模型可在单次调用里传 `timeout: -1`
//   （vendor schema 允许："必须先得到答案"时用），窗口因此回到无界、驱动静默停住 ⇒ 立 BUG-022
//   （`_backlog/bugs/BUG-022-ask-user-unbounded-timeout-override.md`）。本档因此让 prompt **显式要一个 30s 窗口**
//   以保证判据确定性；模型仍传 -1 时按「无法验证」报红并提示重跑（不是修复失效）。
//
// 判据（全过 = 已修判定那条真模型行成立）：
//   ① 会话真的问了：日志出现 `tool/call` name=ask_user_question（带 callId 与 question.id）；
//   ② 窗口有界：该 call 的 `tool/result` 在 timeout+宽容内出现，且结果含 `pending`（legacy 形态下永不出现）；
//   ③ 轮能收口：出现 `turn/end`（legacy 形态下 turn 永不收口，会话最终掉线——BUG-021 现场）；
//   ④ RPC 能答：`userQuestions/answer`（agentId=SessionId、按 question.id 各答一次）返回 true（continued 态才 true）；
//   ⑤ 答案回到会话：其后出现新 turn，且消息里能看到被选中的选项 label（人不在 UI 也能把循环走完）。
//
// 清理：默认只留会话（不再删——它是证据现场）；`--keep-session` 同义（保留是默认行为，参数只为显式化）。
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
/** 前台窗口默认 120s（preset 钉的值）；模型可在单次调用里覆盖（实测见过 180）。 */
const DEFAULT_WINDOW_S = 120
/** 窗口到点后给工具/模型的额外宽容（结果落盘 + 这一轮收尾）。 */
const WINDOW_SLACK_MS = 120_000
/** 答案回来后的新 turn 宽容。 */
const REPLY_GRACE_MS = 120_000

let home
try {
  home = requireDevHome('ask-user-timed-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
const REHEARSAL = join(ROOT, REHEARSAL_REL)
ensureRehearsalWorkspace(ROOT)

const failures = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  error => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)

const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
try {
  const base = `http://127.0.0.1:${String(port)}`
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'aut-', dumpBodyOnError: true })

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.id ?? created.sessionId
  const eventsOf = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)

  console.log(`  会话 ${String(sessionId)}（ceo，排练盘）`)
  await rpc('session/prompt', { request: {
    requestId: `aut-${String(Date.now())}`,
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text: '只做一件事：用 ask_user_question 问我一个三选一的问题（三个选项写清楚），'
      + '**调用时显式传 timeout: 30**，问完就停，不要做别的、不要自己作答。' }],
    clientTimeZone: 'Asia/Shanghai',
  } })

  let callId = null
  let questionIds = []
  let firstLabels = []
  /** 本次调用模型自己给的 timeout（秒）；undefined = 用配置默认。 */
  let callTimeoutS
  await check('① 会话真的发起了问询（tool/call name=ask_user_question）', async () => {
    const deadline = Date.now() + REPLY_GRACE_MS
    while (Date.now() < deadline && callId === null) {
      for (const event of await eventsOf()) {
        if (event?.type !== 'tool/call' || event?.data?.name !== 'ask_user_question') continue
        callId = event.data.callId ?? event.data.id
        // `arguments` 是 **JSON 字符串**（实测形状：data = { turn, step, callId, name, arguments }）。
        let questions = []
        try {
          const parsed = JSON.parse(String(event.data.arguments ?? '{}'))
          questions = parsed.questions ?? []
          if (typeof parsed.timeout === 'number') callTimeoutS = parsed.timeout
        } catch { questions = [] }
        questionIds = questions.map(question => question.id).filter(id => typeof id === 'string')
        firstLabels = questions.map(question => question.options?.[0]?.label).filter(label => typeof label === 'string')
      }
      if (callId === null) await sleep(3000)
    }
    if (callId === null) throw new Error('90s 内没看到 ask_user_question 的 tool/call（模型没问？换更强的指令重跑）')
    if (questionIds.length === 0) throw new Error('tool/call 里没有 question.id（形状变了？）')
    console.log(`  NOTE callId=${String(callId)}；question.id=${questionIds.join(', ')}`)
  })

  await check('② 窗口有界：tool/result 出现且含 pending（legacy 形态下永不出现）', async () => {
    if (callId === null) throw new Error('① 未拿到 callId')
    if (callTimeoutS === -1) {
      console.log('  NOTE 模型本次明示 `timeout: -1`（"必须先得到答案"）⇒ 窗口无界、本判据无法验证；'
        + '这是 vendor schema 允许的用法（残留 = BUG-022：无人值守驱动会停在这里）——换更强指令重跑本档')
      throw new Error('模型本次传了 -1，窗口无界（判据无法成立，重跑；机理与残留见 BUG-022）')
    }
    const effectiveMs = (callTimeoutS ?? DEFAULT_WINDOW_S) * 1000
    console.log(`  NOTE 本次窗口 = ${String((callTimeoutS ?? DEFAULT_WINDOW_S))}s（${callTimeoutS === undefined ? '配置默认' : '模型单次覆盖'}）`)
    const deadline = Date.now() + effectiveMs + WINDOW_SLACK_MS
    let result = null
    while (Date.now() < deadline && result === null) {
      for (const event of await eventsOf()) {
        if (event?.type !== 'tool/result') continue
        // 实测形状：data.message.toolCallId（配 source.callId）；老形状兜底 data.callId。
        const id = event?.data?.message?.toolCallId ?? event?.data?.callId ?? event?.data?.id
        if (id !== callId) continue
        result = event
      }
      if (result === null) await sleep(5000)
    }
    if (result === null) throw new Error(`窗口（${String((callTimeoutS ?? DEFAULT_WINDOW_S))}s）+ 宽容内没有该 call 的 tool/result——前台窗口仍无界（timed 没生效？）`)
    const text = JSON.stringify(result)
    if (!text.includes('pending')) throw new Error(`tool/result 里没有 pending：${text.slice(0, 240)}`)
    console.log('  NOTE tool/result 含 pending：窗口到点后工具已返回，人仍可后答')
  })

  await check('③ 轮能收口：出现 turn/end（legacy 形态下 turn 永不收口、会话最终掉线）', async () => {
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      if ((await eventsOf()).some(event => event?.type === 'turn/end')) return
      await sleep(3000)
    }
    throw new Error('60s 内没有 turn/end（会话仍挂在问询上）')
  })

  await check('④ RPC 能答：userQuestions/answer 返回 true（continued 态）', async () => {
    if (callId === null) throw new Error('① 未拿到 callId')
    const answer = await rpc('userQuestions/answer', {
      agentId: sessionId,
      callId,
      answer: { answers: questionIds.map((id, index) => ({ id, selected: [firstLabels[index] ?? firstLabels[0] ?? '选项一'] })) },
    })
    if (answer === false) throw new Error('answer 返回 false——问询不在 continued 态（timed 窗口没转？）')
    if (answer?.ok === false) throw new Error(`answer 远程错误：${JSON.stringify(answer.error).slice(0, 200)}`)
    console.log(`  NOTE answer 回执：${JSON.stringify(answer).slice(0, 120)}`)
  })

  await check('⑤ 答案回到会话：其后新 turn 的消息里能看到作答内容', async () => {
    const deadline = Date.now() + REPLY_GRACE_MS
    while (Date.now() < deadline) {
      const events = await eventsOf()
      // 答案按 pending 回执的约定以 `answer_to_pending_question` 身份进来（或至少带选中 label）。
      const hit = events.find(event => event?.type === 'user/message'
        && (JSON.stringify(event.data).includes('answer_to_pending_question')
          || (firstLabels[0] !== undefined && JSON.stringify(event.data).includes(firstLabels[0]))))
      if (hit !== undefined) {
        console.log(`  NOTE 迟到答案以 ${String(hit.type)} 进入会话（seq ${String(hit.seq ?? '?')}）`)
        return
      }
      await sleep(4000)
    }
    throw new Error('容忍期内没看到携带作答的消息——答案没回到会话')
  })
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures.length === 0
  ? '\nask-user-timed-probe: ALL PASS（真模型：问询窗口有界 → pending → turn 收口 → RPC 可答 → 答案回会话）'
  : `\nask-user-timed-probe: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)

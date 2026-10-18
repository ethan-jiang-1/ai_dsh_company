/**
 * 问询停点判定（BUG-022）：驱动"看到停点就停并报"，而不是干等（BUG-021 现场：跑到 26 步的动议挂 40 分钟后掉线）。
 *
 * 只看**会话日志可观测面**：`tool/call`（`name = ask_user_question`）与配对的 `tool/result`。
 * 不依赖 UI、投影或问询服务的私有面——驱动手里只有日志。
 *
 * 三种结论：
 * - `null`：没停在问询上（没有未配对的问询调用，或已拿到 `pending`/答案——后者人仍可后答，驱动该继续干活）；
 * - `window: 'bounded'` + `action: 'wait'`：窗口还在走（默认 120s，preset 钉的值；模型可单次覆盖）；
 * - `window: 'unbounded'` 或逾期 ⇒ `action: 'stop'`：判定给出去向（谁问的、问的哪几问、为什么解不了）。
 *
 * 实测形状（真跑留证，别照文档猜）：
 * - `tool/call.data = { turn, step, callId, name, arguments }`，**`arguments` 是 JSON 字符串**；
 * - `tool/result.data.message.toolCallId` 与调用配对（老形状兜底 `data.callId`）。
 *
 * keyless 判据 = `tests/harness/question-stop.spec.ts`；驱动侧用法 = `probes/session-context/ask-user-timed-probe.mjs`。
 */

/** 默认前台窗口（秒）——与五角色 preset 钉的 `timeout: 120` 同值。 */
export const DEFAULT_QUESTION_WINDOW_MS = 120_000
/** 超过这个窗口就"视同无界"（驱动不该陪着等一小时）。 */
export const DEFAULT_MAX_BOUNDED_WINDOW_MS = 900_000
/** 窗口到点后给工具/持久化的宽限；超过它仍无结果 = 逾期。 */
export const DEFAULT_SLACK_MS = 60_000

/** 判定结果的形状（`questionStopOf` 返回非 null 时）。 */
// export interface QuestionStop { … } —— 本仓 tools/lib 是 .mjs 纯逻辑，形状靠 JSDoc 与 spec 钉。

/** 解析调用参数（JSON 字符串；坏形状给空对象，绝不抛）。 */
function parseArguments(raw) {
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** 该事件是否是问询调用。 */
const isAskCall = (event) => event?.type === 'tool/call' && event?.data?.name === 'ask_user_question'

/** 该结果的配对 id（实测走 message.toolCallId；老形状兜底 data.callId）。 */
const resultCallId = (event) => event?.data?.message?.toolCallId ?? event?.data?.callId

/**
 * 判定会话是否停在问询上、以及这个停点能不能自己解。
 * @param events - 会话事件（顺序不限；只读 `type` / `time` / `data`）。
 * @param options - `now`（默认 `Date.now()`）、`defaultWindowMs`、`maxBoundedWindowMs`、`slackMs`。
 * @returns 无停点给 `null`；否则 `{ callId, questionIds, askedAt, waitingMs, window, windowMs, remainingMs, action, reason }`。
 */
export function questionStopOf(events, options = {}) {
  const now = options.now ?? Date.now()
  const defaultWindowMs = options.defaultWindowMs ?? DEFAULT_QUESTION_WINDOW_MS
  const maxBoundedWindowMs = options.maxBoundedWindowMs ?? DEFAULT_MAX_BOUNDED_WINDOW_MS
  const slackMs = options.slackMs ?? DEFAULT_SLACK_MS
  const list = Array.isArray(events) ? events : []
  const answered = new Set(list.filter(event => event?.type === 'tool/result').map(resultCallId).filter(id => id !== undefined))
  const pending = list
    .filter(isAskCall)
    .filter(event => !answered.has(event?.data?.callId))
    .sort((left, right) => (left?.time ?? 0) - (right?.time ?? 0))
  const oldest = pending[0]
  if (oldest === undefined) return null

  const callId = oldest.data.callId
  const askedAt = typeof oldest.time === 'number' ? oldest.time : now
  const waitingMs = Math.max(0, now - askedAt)
  const args = parseArguments(oldest.data.arguments)
  const questionIds = Array.isArray(args.questions)
    ? args.questions.map(question => question?.id).filter(id => typeof id === 'string')
    : []
  const base = { callId, questionIds, askedAt, waitingMs }

  const asked = args.timeout
  if (asked === -1) {
    return { ...base, window: 'unbounded', windowMs: null, remainingMs: null, action: 'stop',
      reason: `模型明示 timeout: -1（必须先得到答案）⇒ 前台窗口无界；RPC 答不了 'open' 态，需人在 UI 作答` }
  }
  const windowMs = typeof asked === 'number' && asked > 0 ? asked * 1000 : defaultWindowMs
  if (windowMs > maxBoundedWindowMs) {
    return { ...base, window: 'unbounded', windowMs, remainingMs: null, action: 'stop',
      reason: `模型要的窗口 ${String(Math.round(windowMs / 1000))}s 超过阈值 ${String(Math.round(maxBoundedWindowMs / 1000))}s，视同无界；需人参与或改小窗口` }
  }
  const remainingMs = Math.max(0, windowMs - waitingMs)
  if (remainingMs === 0 && waitingMs > windowMs + slackMs) {
    return { ...base, window: 'bounded', windowMs, remainingMs, action: 'stop',
      reason: `窗口 ${String(Math.round(windowMs / 1000))}s 已过且逾期 ${String(Math.round((waitingMs - windowMs) / 1000))}s 仍无 tool/result——工具没按窗口收口，需人查现场` }
  }
  return { ...base, window: 'bounded', windowMs, remainingMs, action: 'wait',
    reason: `窗口 ${String(Math.round(windowMs / 1000))}s 未到点，还剩 ${String(Math.round(remainingMs / 1000))}s（到点后工具返回 pending，人仍可后答）` }
}

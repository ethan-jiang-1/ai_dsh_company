// 纯逻辑：把一段会话日志事件折成「失败摘要」。只读、零模型、无 I/O。
//
// 为什么：2026-10-20 审计发现日志有数据面（session JSONL / export）但缺查询面——fresh agent
// 要手工解 zstd、grep、猜哪些事件是异常。本模块把判据收成一处：非 completed 的 turn、
// tool/result isError、非 allow 的审批、待答问询、present 调用、最后 assistant 正文。
// 输出里的 token URL 一律脱敏。

const TOKEN_QUERY = /([?&]token=)[^\s&"'<>]+/g

/** 脱敏文本里的 token URL（值不留在输出里）。 */
export function redactTokenUrls(text) {
  return String(text ?? '').replace(TOKEN_QUERY, '$1<redacted>')
}

/** 安全取一段文本（数组 content / message.content 都兼容）。 */
function textOf(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(item => textOf(item)).filter(Boolean).join(' ')
  if (value !== null && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text
    if (value.message !== undefined) return textOf(value.message)
    if (value.content !== undefined) return textOf(value.content)
  }
  return ''
}

function decisionOf(data) {
  return data?.decision?.kind ?? data?.decision ?? data?.answer ?? data?.approval?.decision ?? ''
}

function isAllowedDecision(value) {
  return ['allowed-once', 'allowed', 'approved', 'allow', 'accept', 'accepted'].includes(String(value))
}

/**
 * 折会话事件。
 * @param {ReadonlyArray<{ type?: string, data?: object }>} records 会话日志事件（按盘上顺序）。
 * @param {{ recent?: number }} [options] `recent` = 最多保留的最近 assistant 文本条数。
 * @returns {object} 失败摘要（JSON 可序列化）。
 */
export function summarizeSessionEvents(records, { recent = 1 } = {}) {
  const headerRecord = records.find(record => record?.type === 'session') ?? {}
  // 真日志的 session 头字段在顶层（id/cwd/agentPreset）；测试/旧夹具可能包在 data 里，两种都收。
  const header = headerRecord.data ?? headerRecord
  const summary = {
    session: {
      id: header.id ?? header.sessionId ?? '',
      cwd: header.cwd ?? '',
      preset: header.agentPreset ?? header.preset ?? '',
      createdAt: header.createdAt ?? '',
    },
    total: records.length,
    turns: 0,
    nonCompletedTurns: [],
    toolErrors: [],
    approvals: [],
    pendingQuestions: [],
    presentCalls: [],
    lastAssistant: [],
  }
  const assistantTexts = []
  for (const record of records) {
    const type = record?.type
    const data = record?.data ?? {}
    if (type === 'turn/end') {
      summary.turns++
      const reason = data.reason ?? {}
      const kind = reason.kind ?? (reason.error !== undefined ? 'error' : 'unknown')
      if (kind !== 'completed') {
        summary.nonCompletedTurns.push({
          turn: data.turn ?? null,
          kind,
          detail: redactTokenUrls(String(reason.error ?? reason.detail ?? '')).slice(0, 300),
        })
      }
    } else if (type === 'tool/result') {
      const message = data.message ?? {}
      const isError = message.isError === true || data.isError === true
      if (isError) {
        summary.toolErrors.push({
          toolCallId: message.toolCallId ?? data.toolCallId ?? '',
          text: redactTokenUrls(textOf(message.content) || message.error || data.error || '').slice(0, 400),
        })
      }
    } else if (type === 'approval/decided') {
      const decision = decisionOf(data)
      if (!isAllowedDecision(decision)) {
        summary.approvals.push({
          toolName: data.toolName ?? data.message?.toolName ?? '',
          decision: redactTokenUrls(String(decision)).slice(0, 120),
        })
      }
    } else if (type === 'user-questions/request') {
      const questions = Array.isArray(data.questions) ? data.questions : []
      summary.pendingQuestions.push({
        count: questions.length,
        first: redactTokenUrls(String(questions[0]?.question ?? '')).slice(0, 300),
      })
    } else if (type === 'tool/call') {
      const name = data.name ?? data.toolName ?? data.message?.name ?? ''
      if (name === 'present') summary.presentCalls.push({ callId: data.id ?? data.callId ?? '' })
    } else if (type === 'assistant/message') {
      const text = redactTokenUrls(textOf(data.message) || data.text || '').trim()
      if (text !== '') assistantTexts.push(text)
    }
  }
  summary.lastAssistant = assistantTexts.slice(-Math.max(1, recent)).map(text => text.slice(-600))
  return summary
}

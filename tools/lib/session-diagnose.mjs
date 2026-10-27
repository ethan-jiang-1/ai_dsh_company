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

/** 对象安全取文：字符串原样，对象 JSON 序列化（不渲染 [object Object]）。 */
function detailOf(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try { return JSON.stringify(value) } catch { return String(value) }
}

// 审批事件的真实 v4 形状（vendor persistence-catalog）：approval/asked {id,toolName,callId?,reason?}
// 之后必跟 approval/decided {id,outcome}（同一 id）；outcome 枚举 = allowed-once | rejected |
// cancelled | unavailable。BUG-030 教训：不要读想象键（decision/answer）——夹具必须取真形状。
function decisionOf(data) {
  return data?.outcome ?? ''
}

function isAllowedDecision(value) {
  return value === 'allowed-once'
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
    /** 有 turn/start 但没有配对 turn/end 的轮次（被杀/中断/崩溃——不是「无失败」）。 */
    interruptedTurns: [],
    /** tool/call 总数与按名字的计数（成功的调用此前完全不可见）。 */
    toolCalls: { total: 0, byName: {} },
    nonCompletedTurns: [],
    toolErrors: [],
    /** bash 非零退出（tool/result 或 job/settled）；不是 isError，但绝不能整份摘要绿掉。 */
    toolNonZeroExits: [],
    approvals: [],
    /** asked 后没有 decided 的审批（等待人，不是进程崩溃）。 */
    pendingApprovals: [],
    pendingQuestions: [],
    /** team/member.phase=failed（队友 provision/运行失败）。 */
    teamFailures: [],
    /** 中断轮的归因（等人回答/等审批/真崩溃）。 */
    interruptedHints: [],
    presentCalls: [],
    lastAssistant: [],
  }
  const assistantTexts = []
  const askedApprovals = new Map()
  const pendingApprovalById = new Map()
  const toolNameByCall = new Map()
  const lastToolByTurn = new Map()
  const nonZeroSeen = new Set()
  const startedTurns = new Set()
  for (const record of records) {
    const type = record?.type
    const data = record?.data ?? {}
    if (type === 'turn/start') {
      startedTurns.add(data.turn ?? null)
      lastToolByTurn.delete(data.turn ?? null)
    } else if (type === 'turn/end') {
      startedTurns.delete(data.turn ?? null)
      summary.turns++
      const reason = data.reason ?? {}
      const kind = reason.kind ?? (reason.error !== undefined ? 'error' : 'unknown')
      if (kind !== 'completed') {
        summary.nonCompletedTurns.push({
          turn: data.turn ?? null,
          kind,
          detail: redactTokenUrls(detailOf(reason.error ?? reason.detail)).slice(0, 300),
        })
      }
    } else if (type === 'tool/result') {
      const message = data.message ?? {}
      const isError = message.isError === true || data.isError === true
      const toolCallId = message.toolCallId ?? data.toolCallId ?? ''
      const text = redactTokenUrls(textOf(message.content) || detailOf(message.error) || detailOf(data.error)).slice(0, 400)
      if (isError) {
        summary.toolErrors.push({ toolCallId, text })
      } else if (toolCallId !== '' && !nonZeroSeen.has(toolCallId) && toolNameByCall.get(toolCallId) === 'bash') {
        const match = /\[exit code: (\d+)\]/.exec(text)
        if (match !== null && Number(match[1]) !== 0) {
          nonZeroSeen.add(toolCallId)
          summary.toolNonZeroExits.push({ toolCallId, toolName: 'bash', code: Number(match[1]), text: text.slice(0, 300) })
        }
      }
    } else if (type === 'job/settled') {
      // bash 的 job/settled 也带退出码；和 tool/result 按 callId 去重。
      const toolCallId = data.toolCall?.callId ?? data.jobId ?? ''
      const detail = String(data.detail ?? '')
      const match = /exit code: (\d+)/.exec(detail)
      if (data.kind === 'bash' && toolCallId !== '' && match !== null && Number(match[1]) !== 0 && !nonZeroSeen.has(toolCallId)) {
        nonZeroSeen.add(toolCallId)
        summary.toolNonZeroExits.push({ toolCallId, toolName: 'bash', code: Number(match[1]), text: String(data.label ?? detail).slice(0, 300) })
      }
    } else if (type === 'approval/asked') {
      askedApprovals.set(data.id, data.toolName ?? '')
      pendingApprovalById.set(data.id, {
        id: data.id,
        toolName: data.toolName ?? '',
        reason: redactTokenUrls(String(data.reason ?? '')).slice(0, 300),
      })
    } else if (type === 'approval/decided') {
      pendingApprovalById.delete(data.id)
      const decision = decisionOf(data)
      if (!isAllowedDecision(decision)) {
        summary.approvals.push({
          toolName: askedApprovals.get(data.id) ?? '',
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
      const callId = data.callId ?? data.id ?? ''
      if (callId !== '' && typeof name === 'string') toolNameByCall.set(callId, name)
      lastToolByTurn.set(data.turn ?? null, { name, callId })
      summary.toolCalls.total += 1
      if (typeof name === 'string' && name !== '') {
        summary.toolCalls.byName[name] = (summary.toolCalls.byName[name] ?? 0) + 1
      }
      if (name === 'present') summary.presentCalls.push({ callId: data.id ?? data.callId ?? '' })
    } else if (type === 'team/member' || type === 'agent-team/member') {
      const phase = data.phase ?? data.status ?? ''
      if (phase === 'failed') {
        summary.teamFailures.push({
          member: data.member ?? data.id ?? data.name ?? '',
          detail: redactTokenUrls(detailOf(data.error ?? data.detail ?? data.reason)).slice(0, 300),
        })
      }
    } else if (type === 'assistant/message') {
      const text = redactTokenUrls(textOf(data.message) || data.text || '').trim()
      if (text !== '') assistantTexts.push(text)
    }
  }
  summary.interruptedTurns = [...startedTurns].sort((left, right) => Number(left ?? 0) - Number(right ?? 0))
  summary.pendingApprovals = [...pendingApprovalById.values()].slice(0, 10)
  summary.interruptedHints = summary.interruptedTurns.map(turn => {
    const last = lastToolByTurn.get(turn)
    if (last?.name === 'ask_user_question') return { turn, kind: 'waiting-user', detail: last.name }
    if (pendingApprovalById.size > 0) return { turn, kind: 'waiting-approval', detail: [...pendingApprovalById.values()][0]?.toolName ?? '' }
    return { turn, kind: 'interrupted', detail: last?.name ?? '' }
  })
  summary.lastAssistant = assistantTexts.slice(-Math.max(1, recent)).map(text => text.slice(-600))
  return summary
}

// 状态：常驻
// Durable event evidence owned by the recovery and taskboard-scope probes.
function callResultPairs(events, toolName) {
  const calls = new Map()
  const results = new Map()
  for (const event of events) {
    const data = event?.data ?? {}
    if (event?.type === 'tool/call' && typeof data.callId === 'string' && data.name === toolName) calls.set(data.callId, { data, seq: eventSeq(event) })
    if (event?.type === 'tool/result' && typeof data.message?.toolCallId === 'string') results.set(data.message.toolCallId, { data, seq: eventSeq(event) })
  }
  return [...calls.entries()].map(([callId, call]) => ({ callId, call: call.data, callSeq: call.seq, result: results.get(callId)?.data, resultSeq: results.get(callId)?.seq }))
}

function successful(result) {
  return result?.message?.isError === false && result.error === undefined
}

function completedPair(pair) {
  return successful(pair.result) && Number.isSafeInteger(pair.callSeq) && Number.isSafeInteger(pair.resultSeq)
    && pair.resultSeq > pair.callSeq
}

function resultText(result) {
  return (result?.message?.content ?? []).filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text).join('\n')
}

function resultJson(result) {
  try { return JSON.parse(resultText(result)) } catch { return undefined }
}

function eventSeq(event) {
  return Number.isSafeInteger(event?.seq) ? event.seq : -1
}

function markerMessage(events, marker) {
  const matches = events.filter(event => event?.type === 'team/message/queued'
    && typeof event.data?.message?.id === 'string'
    && JSON.stringify(event.data.message.content ?? []).includes(marker))
  if (matches.length !== 1) return { event: undefined, messageId: undefined, count: matches.length }
  return { event: matches[0], messageId: matches[0].data.message.id, count: 1 }
}

export function recoveryEvidence({ events, marker, markerMessageId, restartPrompt, watermarkSeq, leadId }) {
  const afterWatermark = events.filter(event => eventSeq(event) > watermarkSeq)
  const prompts = afterWatermark.filter(event => event?.type === 'user/message'
    && JSON.stringify(event.data?.content ?? []).includes(restartPrompt))
  const restartPromptSeq = prompts.length === 1 ? eventSeq(prompts[0]) : -1
  const afterPrompt = restartPromptSeq < 0 ? [] : afterWatermark.filter(event => eventSeq(event) > restartPromptSeq)

  const markerEvidence = markerMessage(events.filter(event => eventSeq(event) <= watermarkSeq), marker)
  const markerMemberIds = new Set(events.filter(event => event?.type === 'team/member'
    && eventSeq(event) <= watermarkSeq && event.data?.member?.name === 'res'
    && typeof event.data.member.id === 'string').map(event => event.data.member.id))
  const markerQueuedByLead = markerEvidence.event?.data?.message?.senderId === leadId
    && markerMemberIds.has(markerEvidence.event?.data?.message?.targetId)
  const markerIdMatches = markerMessageId !== undefined && markerEvidence.messageId === markerMessageId && markerQueuedByLead
  const markerDeliveries = events.filter(event => event?.type === 'team/message/delivered'
    && event.data?.messageId === markerMessageId)
  const sameMarkerIdQueues = events.filter(event => event?.type === 'team/message/queued'
    && eventSeq(event) <= watermarkSeq && event.data?.message?.id === markerMessageId
    && JSON.stringify(event.data.message.content ?? []).includes(marker))
  const resMemberIds = markerMemberIds

  const rosterCalls = callResultPairs(afterPrompt, 'list_agents')
  const roster = resMemberIds.size === 1 && rosterCalls.some(pair => {
    if (!completedPair(pair) || pair.callSeq <= restartPromptSeq || pair.resultSeq <= restartPromptSeq) return false
    const { result } = pair
    let rosterRows
    try { rosterRows = JSON.parse(resultText(result)) } catch { return false }
    return Array.isArray(rosterRows) && rosterRows.some(item => item?.target === 'res')
  })

  const replyQueues = afterPrompt.filter(event => event?.type === 'team/message/queued'
    && event.data?.message?.senderName === 'res'
    && resMemberIds.has(event.data?.message?.senderId)
    && event.data?.message?.targetId === leadId
    && JSON.stringify(event.data.message.content ?? []).includes(marker)
    && JSON.stringify(event.data.message.content ?? []).includes('收到恢复标记')
    && typeof event.data.message.id === 'string')
  const replyIds = new Set(replyQueues.map(event => event.data.message.id))
  const replyDeliveries = afterPrompt.filter(event => event?.type === 'team/message/delivered'
    && replyIds.has(event.data?.messageId)
    && event.data?.targetId === leadId)
  const reply = resMemberIds.size === 1 && replyQueues.length > 0 && replyDeliveries.length === replyQueues.length
    && replyQueues.every(queue => replyDeliveries.some(delivery => delivery.data.messageId === queue.data.message.id))

  const completedTurn = afterPrompt.some(event => event?.type === 'turn/end'
    && eventSeq(event) > restartPromptSeq && event.data?.reason?.kind === 'completed')
  return {
    watermarkValid: Number.isSafeInteger(watermarkSeq) && watermarkSeq >= 0,
    restartPromptFound: prompts.length === 1,
    restartPromptSeq,
    markerQueuedOnce: markerEvidence.count === 1 && markerIdMatches,
    markerMessageId: markerEvidence.messageId,
    markerDeliveredExactlyOnce: markerIdMatches && sameMarkerIdQueues.length === 1 && markerDeliveries.length === 1,
    roster,
    reply,
    replyMessageIds: [...replyIds],
    completedTurn,
  }
}

function taskRows(result) {
  const parsed = resultJson(result)
  return Array.isArray(parsed?.tasks) ? parsed.tasks.filter(task => task && typeof task === 'object') : undefined
}

export function taskboardScopeEvidence({ cfoEvents, cooEvents }) {
  const cfoCreates = callResultPairs(cfoEvents, 'team_task_create')
    .filter(({ call }) => /renewal-z/.test(JSON.stringify(call.arguments ?? '')))
    .filter(completedPair)
  const createdTasks = cfoCreates.map(({ result }) => resultJson(result))
    .filter(task => task && typeof task.id === 'string' && /^renewal-z(?:\s|$)/i.test(task.subject ?? ''))
  const oneExpectedCreate = cfoCreates.length === 1 && createdTasks.length === 1
  const successfulCreates = cfoCreates
  const cfoLists = callResultPairs(cfoEvents, 'team_task_list')
    .filter(({ callSeq }) => successfulCreates.some(create => create.callSeq < callSeq))
    .filter(completedPair)
  const cfoListed = createdTasks.some(created => cfoLists.some(({ result }) =>
    taskRows(result)?.some(task => task.id === created.id && task.subject === created.subject)))
  const b1 = oneExpectedCreate && cfoListed

  const cooLists = callResultPairs(cooEvents, 'team_task_list')
  const successfulCooLists = cooLists.filter(({ result }) => successful(result))
  const everyCooListSucceeded = cooLists.length > 0 && successfulCooLists.length === cooLists.length
  const b2 = everyCooListSucceeded && successfulCooLists.every(({ result }) => {
    const rows = taskRows(result)
    return rows !== undefined && !rows.some(task => /^renewal-z(?:\s|$)/i.test(task.subject ?? ''))
  })
  const b3 = oneExpectedCreate && everyCooListSucceeded
    && cooLists.every(({ result }) => {
      const rows = taskRows(result)
      return rows !== undefined && !rows.some(task => createdTasks.some(created =>
        task.subject === created.subject && task.description === created.description))
    })
  return { b1, b2, b3, pass: b1 && b2 && b3 }
}

// 状态：常驻
// Pure verdicts shared by the concurrency, atomicity and filesystem-guard probes.
export function indexToolEvents(events) {
  const calls = new Map()
  const results = new Map()
  for (const [index, event] of events.entries()) {
    const data = event?.data ?? {}
    if (event?.type === 'tool/call' && typeof data.callId === 'string') calls.set(data.callId, { ...data, index })
    if (event?.type === 'tool/result' && typeof data.message?.toolCallId === 'string') results.set(data.message.toolCallId, { ...data, index })
  }
  return { calls, results }
}

export function toolArguments(call) {
  try { return JSON.parse(call?.arguments ?? '{}') } catch { return {} }
}

export function toolResultText(result) {
  return (result?.message?.content ?? []).filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text).join('\n')
}

export function toolResultJson(result) {
  try { return JSON.parse(toolResultText(result)) } catch { return undefined }
}

export function successfulToolResult(result) {
  return result?.message?.isError === false && result.error === undefined
}

export function latestTasks(events) {
  const tasks = new Map()
  for (const event of events) {
    if (event?.type === 'team/task' && event.data?.task?.id) tasks.set(event.data.task.id, event.data.task)
  }
  return tasks
}

export function hasExactRows(text, expected) {
  const rows = text.replace(/\r\n/g, '\n').split('\n')
  if (rows.at(-1) === '') rows.pop()
  return rows.length === expected.length && expected.every(row => rows.filter(line => line === row).length === 1)
}

function targets(call, filename) {
  const path = toolArguments(call).file_path
  return typeof path === 'string' && (path === filename || path.endsWith(`/${filename}`))
}

export function pairedCalls(events, names, filename) {
  const { calls, results } = indexToolEvents(events)
  return [...calls.entries()].filter(([, call]) => names.includes(call.name) && (!filename || targets(call, filename)))
    .map(([id, call]) => ({ id, call, result: results.get(id) }))
    .filter(item => item.result === undefined || item.result.index > item.call.index)
}

export function deliveredMessages(events) {
  const queued = new Map()
  const delivered = new Map()
  for (const [index, event] of events.entries()) {
    const data = event?.data ?? {}
    if (event?.type === 'team/message/queued' && data.message?.id) queued.set(data.message.id, { ...data.message, index })
    if (event?.type === 'team/message/delivered' && data.messageId) delivered.set(data.messageId, { ...data, index })
  }
  return [...queued.entries()].filter(([id, message]) => {
    const delivery = delivered.get(id)
    return delivery && delivery.index > message.index && delivery.targetId === message.targetId
  }).map(([id, message]) => ({ id, message, delivery: delivered.get(id) }))
}

// The last turn must be completed; a previous completion cannot hide a new active/error turn.
export function hasCompletedTurn(events) {
  const last = events.filter(event => ['turn/start', 'turn/end'].includes(event?.type)).at(-1)
  return last?.type === 'turn/end' && last.data?.reason?.kind === 'completed'
}

export function teamRunComplete(leadEvents, memberEvents, names, artifactExists) {
  return artifactExists && hasCompletedTurn(leadEvents) && names.every(name => hasCompletedTurn(memberEvents[name] ?? []))
}

export function concurrencyEvidence({ leadEvents, memberEvents, memberIds, file }) {
  const fileExact = hasExactRows(file, ['w1 was here', 'w2 was here'])
  const task = [...latestTasks(leadEvents).values()].find(item => /竞写观察/.test(item.subject ?? ''))
  const claims = []
  const writes = []
  for (const name of ['w1', 'w2']) {
    const events = memberEvents[name] ?? []
    for (const pair of pairedCalls(events, ['team_task_update'])) {
      const args = toolArguments(pair.call)
      if (task && args.action === 'claim' && args.task_id === task.id) {
        claims.push({ name, memberId: memberIds[name], expectedRevision: args.expected_revision, ...pair })
      }
    }
    writes.push(...pairedCalls(events, ['write', 'edit'], 'journal/team-concurrency-probe.md').map(pair => ({ name, ...pair })))
  }
  // Compare each member's first claim: later retries do not erase the observed same-revision race.
  const initial = ['w1', 'w2'].map(name => claims.find(claim => claim.name === name))
  const success = initial.filter(claim => claim && successfulToolResult(claim.result))
  const stale = initial.filter(claim => claim?.result?.error?.code === 'TEAM_TASK_STALE_REVISION' && claim.result.message?.isError === true)
  const winner = success.length === 1 ? success[0] : undefined
  const winnerTask = toolResultJson(winner?.result)
  const claimRace = initial.every(Boolean) && Number.isSafeInteger(initial[0]?.expectedRevision)
    && initial[0].expectedRevision === initial[1].expectedRevision && success.length === 1 && stale.length === 1
    && typeof winner?.memberId === 'string' && task?.ownerId === winner.memberId
    && winnerTask?.id === task.id && winnerTask?.ownerName === winner.name
    && winnerTask?.revision === winner.expectedRevision + 1
  const attemptedWriteRejected = writes.some(write => write.result?.message?.isError === true
    && ['FS_NOT_OBSERVED', 'FS_STALE_VERSION'].includes(write.result.error?.code))
  const leadId = leadEvents.find(event => event?.type === 'team/task')?.data?.teamId
  const deliveries = deliveredMessages(leadEvents)
  const reports = typeof leadId === 'string' && ['w1', 'w2'].every(name => typeof memberIds[name] === 'string'
    && deliveries.some(item => item.message.senderId === memberIds[name] && item.delivery.targetId === leadId))
  const membersEnded = ['w1', 'w2'].every(name => hasCompletedTurn(memberEvents[name] ?? []))
  return { fileExact, attemptedWriteRejected, claimRace, reports, membersEnded, task, claims, writes }
}

function readRows(result) {
  const meta = result?.meta
  if (!successfulToolResult(result) || !Array.isArray(meta?.lines) || meta.offset !== 1 || meta.lines.length !== meta.totalLines) return undefined
  return meta.lines.map(line => line.text)
}

export function atomicityEvidence({ leadEvents, memberEvents, file }) {
  const expected = ['w1 round 1', 'w1 round 2', 'w1 round 3', 'w2 round 1', 'w2 round 2', 'w2 round 3']
  const fileExact = hasExactRows(file, expected)
  const readbacks = {}
  for (const name of ['w1', 'w2']) {
    const events = memberEvents[name] ?? []
    const attempts = pairedCalls(events, ['write', 'edit'], 'journal/atomicity-probe.md')
    const writes = attempts.filter(pair => successfulToolResult(pair.result))
    const reads = pairedCalls(events, ['read'], 'journal/atomicity-probe.md')
    readbacks[name] = writes.length === 3 && writes.every((write, index) => {
      const round = index + 1
      const args = toolArguments(write.call)
      const payload = args.content ?? args.new_string ?? ''
      if (!payload.split(/\r?\n/).includes(`${name} round ${round}`)) return false
      const nextWrite = attempts.find(candidate => candidate.call.index > write.call.index)
      return reads.some(read => read.call.index > write.result.index && (!nextWrite || read.result?.index < nextWrite.call.index)
        && (() => {
          const rows = readRows(read.result)
          return rows && rows.includes(`${name} round ${round}`) && rows.every(row => expected.includes(row))
            && new Set(rows).size === rows.length && rows.filter(row => row.startsWith(`${name} round `)).length === round
        })())
    })
  }
  const warningVisible = [leadEvents, ...Object.values(memberEvents)].some(events =>
    pairedCalls(events, ['team_task_list']).some(({ result }) => {
      if (!successfulToolResult(result)) return false
      const tasks = toolResultJson(result)?.tasks
      return Array.isArray(tasks) && tasks.some(task => (task.writeScopeWarnings ?? []).some(warning => tasks.some(other =>
        other.id !== task.id && other.status === 'in_progress' && warning === `write scopes overlap with ${other.id}`
        && ((/scope-a/.test(task.subject ?? '') && /scope-b/.test(other.subject ?? ''))
          || (/scope-b/.test(task.subject ?? '') && /scope-a/.test(other.subject ?? '')))
        && Array.isArray(task.writeScopes) && Array.isArray(other.writeScopes)
        && task.writeScopes.some(left => other.writeScopes.some(right => left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`))))))
    }))
  return { fileExact, readbacks, warningVisible }
}

export function createRaceEvidence(eventsB, eventsC, target, finalContent) {
  const attempted = (events, payload) => pairedCalls(events, ['write', 'edit'], target).some(({ call, result }) => {
    const args = toolArguments(call)
    const content = args.content ?? args.new_string
    return typeof content === 'string' && content.trim() === payload
      && (successfulToolResult(result) || (result?.message?.isError === true
        && ['FS_NOT_OBSERVED', 'FS_STALE_VERSION', 'FS_ALREADY_EXISTS'].includes(result.error?.code)))
  })
  return attempted(eventsB, 'RACE-FROM-B') && attempted(eventsC, 'RACE-FROM-C')
    && ['RACE-FROM-B', 'RACE-FROM-C'].includes(finalContent)
}

export function judgeWriteGuard(events, targetName) {
  const { calls } = indexToolEvents(events)
  const observed = new Set()
  const readsAtWrite = new Map()
  let denied = false
  let blindSuccess = false
  let successfulWriteAfterRead = false
  let targetWriteCount = 0
  for (const event of events) {
    const data = event?.data ?? {}
    if (event?.type === 'tool/call') {
      const call = calls.get(data.callId)
      if (['write', 'edit'].includes(call?.name) && targets(call, targetName)) {
        targetWriteCount++
        readsAtWrite.set(data.callId, observed.has(toolArguments(call).file_path))
      }
    }
    if (event?.type !== 'tool/result') continue
    const id = data.message?.toolCallId
    const call = calls.get(id)
    if (!call || !targets(call, targetName)) continue
    if (call.name === 'read' && successfulToolResult(data)) observed.add(toolArguments(call).file_path)
    if (!readsAtWrite.has(id)) continue
    if (data.message?.isError === true && data.error?.code === 'FS_NOT_OBSERVED') denied = true
    if (successfulToolResult(data)) {
      if (readsAtWrite.get(id)) successfulWriteAfterRead = true
      else blindSuccess = true
    }
  }
  const judge = targetWriteCount > 0 && (denied || successfulWriteAfterRead) && !blindSuccess
  const shape = blindSuccess ? '盲写成功——观察策略不在场！'
    : denied ? '机械拒（目标写被 FS_NOT_OBSERVED 拒）'
      : successfulWriteAfterRead ? '先读后写（成功 read 与目标 write/edit 结果配对）'
        : '(没有可判定的目标写入闭环)'
  return { judge, shape, targetWriteCount, denied, successfulWriteAfterRead, blindSuccess }
}

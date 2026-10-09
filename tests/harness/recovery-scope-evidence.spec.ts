import { describe, expect, it } from 'vitest'
import { recoveryEvidence, taskboardScopeEvidence } from '../../tools/lib/recovery-scope-evidence.mjs'

const call = (seq: number, callId: string, name: string, args: unknown = {}) => ({
  type: 'tool/call', seq, data: { callId, name, arguments: JSON.stringify(args) },
})
const result = (seq: number, callId: string, value: unknown, error?: string) => ({
  type: 'tool/result', seq, data: {
    message: { toolCallId: callId, isError: Boolean(error), content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] },
    ...(error ? { error: { code: error } } : {}),
  },
})
const recoveryPrompt = 'restart-check-unique'

function goodRecoveryEvents() {
  return [
    { type: 'team/member', seq: 2, data: { member: { id: 'res-42', name: 'res' } } },
    { type: 'team/message/queued', seq: 8, data: { message: {
      id: 'marker-1', senderId: 'lead-id', senderName: 'lead', targetId: 'res-42',
      content: [{ type: 'text', text: 'marker-token' }],
    } } },
    { type: 'user/message', seq: 10, data: { content: [{ type: 'text', text: recoveryPrompt }] } },
    call(11, 'roster', 'list_agents'),
    result(12, 'roster', [{ target: 'res', role: 'teammate', status: 'inactive' }]),
    call(13, 'message-res', 'send_message', { target: 'res', message: '恢复后请把 marker-token 原样回报 lead' }),
    result(14, 'message-res', { messageId: 'reply-1' }),
    { type: 'team/message/queued', seq: 15, data: { message: {
      id: 'reply-1', senderId: 'res-42', senderName: 'res', targetId: 'lead-id',
      content: [{ type: 'text', text: '收到恢复标记 marker-token 回复 lead' }],
    } } },
    { type: 'team/message/delivered', seq: 16, data: { messageId: 'reply-1', targetId: 'lead-id' } },
    { type: 'team/message/delivered', seq: 17, data: { messageId: 'marker-1', targetId: 'res-42' } },
    { type: 'turn/end', seq: 18, data: { reason: { kind: 'completed' } } },
  ]
}

const recoveryInput = (events: unknown[]) => ({
  events, marker: 'marker-token', markerMessageId: 'marker-1', restartPrompt: recoveryPrompt,
  watermarkSeq: 9, leadId: 'lead-id',
})

function goodScopeEvents() {
  const cfo = [
    call(1, 'create', 'team_task_create', { subject: 'renewal-z', description: 'scope fixture' }),
    result(2, 'create', { id: 'task-1', subject: 'renewal-z 测算', description: '合同额 $96k，成本 $69k，给毛利口径与结论' }),
    call(3, 'cfo-list', 'team_task_list'),
    result(4, 'cfo-list', { tasks: [{ id: 'task-1', subject: 'renewal-z 测算', description: '合同额 $96k，成本 $69k，给毛利口径与结论' }] }),
  ]
  const coo = [
    call(1, 'coo-list', 'team_task_list'),
    result(2, 'coo-list', { tasks: [] }),
  ]
  return { cfoEvents: cfo, cooEvents: coo }
}

describe('recovery and scope evidence', () => {
  it('accepts post-watermark roster, exact marker delivery, resumed reply, and a completed turn', () => {
    const events = goodRecoveryEvents()
    expect(recoveryEvidence(recoveryInput(events))).toMatchObject({
      watermarkValid: true,
      restartPromptFound: true,
      markerQueuedOnce: true,
      markerDeliveredExactlyOnce: true,
      roster: true,
      reply: true,
      completedTurn: true,
    })
    expect(recoveryEvidence(recoveryInput(events.filter(event => event.type !== 'tool/call' || event.data?.name !== 'send_message'))).reply).toBe(true)
  })

  it('rejects historical prose, absent tool results, wrong marker delivery IDs, and pre-prompt turns', () => {
    const historyOnly = [
      { type: 'team/member', seq: 2, data: { member: { id: 'res-42', name: 'res' } } },
      { type: 'team/message/queued', seq: 8, data: { message: { id: 'marker-1', content: [{ type: 'text', text: 'marker-token' }] } } },
      { type: 'team/message/delivered', seq: 9, data: { messageId: 'marker-1', targetId: 'res-42' } },
      { type: 'assistant/message', seq: 3, data: { message: { content: [{ type: 'text', text: 'res 收到恢复标记' }] } } },
      { type: 'team/message/queued', seq: 8, data: { message: { id: 'marker-1', content: [{ type: 'text', text: 'marker-token' }] } } },
      { type: 'team/message/delivered', seq: 9, data: { messageId: 'other-id' } },
      { type: 'user/message', seq: 11, data: { content: [{ type: 'text', text: recoveryPrompt }] } },
      call(12, 'roster', 'list_agents'),
      result(13, 'roster', [{ target: 'res', status: 'inactive' }]),
      { type: 'turn/end', seq: 14, data: { reason: { kind: 'completed' } } },
    ]
    const evidence = recoveryEvidence(recoveryInput(historyOnly))
    expect(evidence).toMatchObject({
      markerDeliveredExactlyOnce: false,
      roster: true,
      reply: false,
      completedTurn: true,
    })
    expect(recoveryEvidence(recoveryInput([]))).toMatchObject({
      restartPromptFound: false,
      markerQueuedOnce: false,
      roster: false,
      reply: false,
      completedTurn: false,
    })
    const stalePrompt = goodRecoveryEvents().map(event => event.type === 'user/message' && event.data?.content?.[0]?.text === recoveryPrompt
      ? { ...event, seq: 8 } : event)
    expect(recoveryEvidence(recoveryInput(stalePrompt)).restartPromptFound).toBe(false)
  })

  it('rejects missing or unsuccessful roster calls and duplicate marker delivery', () => {
    const missingRoster = goodRecoveryEvents().filter(event => event.type !== 'tool/result' || event.data?.message?.toolCallId !== 'roster')
    expect(recoveryEvidence(recoveryInput(missingRoster)).roster).toBe(false)

    const duplicate = [...goodRecoveryEvents(), { type: 'team/message/delivered', seq: 19, data: { messageId: 'marker-1' } }]
    expect(recoveryEvidence(recoveryInput(duplicate)).markerDeliveredExactlyOnce).toBe(false)
  })

  it('requires paired CFO create/list results and every COO list to prove isolation', () => {
    expect(taskboardScopeEvidence(goodScopeEvents())).toEqual({ b1: true, b2: true, b3: true, pass: true })

    const { cfoEvents, cooEvents } = goodScopeEvents()
    expect(taskboardScopeEvidence({
      cfoEvents: cfoEvents.filter(event => event.type !== 'tool/result' || event.data?.message?.toolCallId !== 'cfo-list'),
      cooEvents,
    }).b1).toBe(false)
    expect(taskboardScopeEvidence({ cfoEvents, cooEvents: [] }).b2).toBe(false)
    expect(taskboardScopeEvidence({
      cfoEvents,
      cooEvents: [call(1, 'coo-list', 'team_task_list'), result(2, 'coo-list', { tasks: [{ id: 'task-77', subject: 'renewal-z 测算', description: 'different task in the other Team' }] })],
    })).toMatchObject({ b1: true, b2: false, b3: true, pass: false })
    expect(taskboardScopeEvidence({
      cfoEvents,
      cooEvents: [...cooEvents, call(3, 'extra-list', 'team_task_list')],
    }).b3).toBe(false)
    expect(taskboardScopeEvidence({
      cfoEvents,
      cooEvents: [call(1, 'coo-list-a', 'team_task_list'), result(2, 'coo-list-a', { tasks: [] }),
        call(3, 'coo-list-b', 'team_task_list'), result(4, 'coo-list-b', { tasks: [{ id: 'task-99', subject: 'renewal-z 其他条目' }] })],
    })).toMatchObject({ b1: true, b2: false, b3: true, pass: false })
    expect(taskboardScopeEvidence({
      cfoEvents,
      cooEvents: [call(1, 'coo-list', 'team_task_list'), result(2, 'coo-list', { tasks: [{ id: 'task-1', subject: 'renewal-z 测算', description: '合同额 $96k，成本 $69k，给毛利口径与结论' }] })],
    })).toMatchObject({ b1: true, b2: false, b3: false, pass: false })
  })
})

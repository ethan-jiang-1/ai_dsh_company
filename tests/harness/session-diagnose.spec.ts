import { describe, expect, it } from 'vitest'
import { redactTokenUrls, summarizeSessionEvents } from '../../tools/lib/session-diagnose.mjs'

const token = '0123456789abcdefghij'

describe('session-diagnose 纯逻辑', () => {
  it('折出失败 turn / 工具错误 / 非 allow 审批 / 待答问询 / present / 最后正文', () => {
    const summary = summarizeSessionEvents([
      { type: 'session', id: 's1', cwd: '/company', agentPreset: 'ceo' },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'turn/end', data: { turn: 2, reason: { kind: 'error', error: 'boom' } } },
      { type: 'tool/result', data: { message: { isError: true, toolCallId: 'c1', content: [{ type: 'text', text: `failed ${`https://example.invalid/?token=${token}`}` }] } } },
      { type: 'approval/decided', data: { toolName: 'request_signoff', decision: 'rejected' } },
      { type: 'user-questions/request', data: { questions: [{ question: 'need data?' }] } },
      { type: 'tool/call', data: { name: 'present', callId: 'p1' } },
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: `done ${`https://example.invalid/?token=${token}`}` }] } } },
    ])
    expect(summary.session).toMatchObject({ id: 's1', cwd: '/company', preset: 'ceo' })
    expect(summary.turns).toBe(2)
    expect(summary.nonCompletedTurns).toEqual([{ turn: 2, kind: 'error', detail: 'boom' }])
    expect(summary.toolErrors).toHaveLength(1)
    expect(summary.toolErrors[0].toolCallId).toBe('c1')
    expect(summary.approvals).toEqual([{ toolName: 'request_signoff', decision: 'rejected' }])
    expect(summary.pendingQuestions).toEqual([{ count: 1, first: 'need data?' }])
    expect(summary.presentCalls).toEqual([{ callId: 'p1' }])
    expect(summary.lastAssistant.join('\n')).not.toContain(token)
  })

  it('completed turn 与非 allow 之外的 decision 不误报；空日志给出零值', () => {
    const summary = summarizeSessionEvents([
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'approval/decided', data: { decision: 'allowed-once' } },
    ])
    expect(summary.nonCompletedTurns).toEqual([])
    expect(summary.approvals).toEqual([])
    expect(summary.total).toBe(2)
  })

  it('redactTokenUrls 只脱敏值，不吞 URL 结构', () => {
    expect(redactTokenUrls(`x https://example.invalid/p?token=${token}&a=1 y`))
      .toBe('x https://example.invalid/p?token=<redacted>&a=1 y')
  })
})

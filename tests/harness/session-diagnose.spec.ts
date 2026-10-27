import { describe, expect, it } from 'vitest'
import { redactTokenUrls, summarizeSessionEvents } from '../../tools/lib/session-diagnose.mjs'

const token = '0123456789abcdefghij'

// BUG-030 守卫：审批判读按真 v4 日志形状——approval/asked {id,toolName,callId?,reason?} +
// approval/decided {id,outcome}（权威 = vendor persistence-catalog「approval/asked」「approval/decided」；
// outcome 枚举 = allowed-once | rejected | cancelled | unavailable）。
// 负例留证 2026-10-20：BUG-030 —— 旧 decisionOf 读想象键（decision/answer），真会话
// session-1d120f37（data={id,outcome:"rejected"}）渲染成「approval ? → 」（无名无结论无 outcome）；
// 且本夹具当时就用想象形状 {toolName,decision}，套件全绿也发现不了。红配方：把下方任一
// approval/decided 的 outcome 键换回 decision ⇒ 配对与枚举断言立红；绿 = decisionOf 读 outcome
// + asked/decided 按 id 配对（实跑与卡 = _backlog/_archive/fixed_bugs/BUG-030-diagnose-approval-outcome.md）。
describe('session-diagnose 纯逻辑（BUG-030 审批判读守卫）', () => {
  it('综合折叠：失败 turn / 工具错误 / 待答问询 / present / 最后正文（token 脱敏）', () => {
    const summary = summarizeSessionEvents([
      { type: 'session', id: 's1', cwd: '/company', agentPreset: 'ceo' },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'turn/end', data: { turn: 2, reason: { kind: 'error', error: 'boom' } } },
      { type: 'tool/result', data: { message: { isError: true, toolCallId: 'c1', content: [{ type: 'text', text: `failed https://example.invalid/?token=${token}` }] } } },
      { type: 'user-questions/request', data: { questions: [{ question: 'need data?' }] } },
      { type: 'tool/call', data: { name: 'present', callId: 'p1' } },
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: `done https://example.invalid/?token=${token}` }] } } },
    ])
    expect(summary.session).toMatchObject({ id: 's1', cwd: '/company', preset: 'ceo' })
    expect(summary.turns).toBe(2)
    expect(summary.nonCompletedTurns).toEqual([{ turn: 2, kind: 'error', detail: 'boom' }])
    expect(summary.toolErrors).toHaveLength(1)
    expect(summary.toolErrors[0].toolCallId).toBe('c1')
    expect(summary.toolErrors[0].text).toContain('token=<redacted>')
    expect(summary.pendingQuestions).toEqual([{ count: 1, first: 'need data?' }])
    expect(summary.presentCalls).toEqual([{ callId: 'p1' }])
    expect(summary.lastAssistant.join('\n')).not.toContain(token)
  })

  it('中断轮（有 turn/start 无 turn/end）单独点名——不能渲染成「无失败」（R3-02）', () => {
    const summary = summarizeSessionEvents([
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'turn/start', data: { turn: 2 } },
      { type: 'tool/call', data: { name: 'bash' } },
    ])
    expect(summary.turns).toBe(1)
    expect(summary.interruptedTurns).toEqual([2])
  })

  it('工具调用计数按名字聚合（成功调用此前完全不可见）', () => {
    const summary = summarizeSessionEvents([
      { type: 'tool/call', data: { name: 'read' } },
      { type: 'tool/call', data: { name: 'read' } },
      { type: 'tool/call', data: { name: 'present', callId: 'p1' } },
    ])
    expect(summary.toolCalls).toEqual({ total: 3, byName: { read: 2, present: 1 } })
  })

  it('审批按真 v4 形状判读：asked/decided 按 id 配对拿工具名，outcome 进失败行', () => {
    const summary = summarizeSessionEvents([
      { type: 'approval/asked', data: { id: 'a1', toolName: 'request_signoff', callId: 'c9', reason: '双签线' } },
      { type: 'approval/decided', data: { id: 'a1', outcome: 'rejected' } },
    ])
    expect(summary.approvals).toEqual([{ toolName: 'request_signoff', decision: 'rejected' }])
  })

  it('allowed-once 不入失败；rejected/cancelled/unavailable 入失败（vendor 枚举，fail-closed）', () => {
    const decided = (id: string, outcome: string) => ({ type: 'approval/decided', data: { id, outcome } })
    const summary = summarizeSessionEvents([
      { type: 'approval/asked', data: { id: 'ok', toolName: 'bash' } },
      decided('ok', 'allowed-once'),
      { type: 'approval/asked', data: { id: 'r', toolName: 'request_signoff' } },
      decided('r', 'rejected'),
      { type: 'approval/asked', data: { id: 'c', toolName: 'bash' } },
      decided('c', 'cancelled'),
      { type: 'approval/asked', data: { id: 'u', toolName: 'bash' } },
      decided('u', 'unavailable'),
    ])
    expect(summary.approvals).toEqual([
      { toolName: 'request_signoff', decision: 'rejected' },
      { toolName: 'bash', decision: 'cancelled' },
      { toolName: 'bash', decision: 'unavailable' },
    ])
  })

  it('asked 缺席（日志裁剪/导入）时工具名如实为空，不猜', () => {
    const summary = summarizeSessionEvents([
      { type: 'approval/decided', data: { id: 'orphan', outcome: 'rejected' } },
    ])
    expect(summary.approvals).toEqual([{ toolName: '', decision: 'rejected' }])
  })

  it('turn/end 与 tool/result 的 error 为对象时序列化，不渲染 [object Object]', () => {
    const summary = summarizeSessionEvents([
      { type: 'turn/end', data: { turn: 2, reason: { kind: 'error', error: { code: 'EACCES', path: '/x' } } } },
      { type: 'tool/result', data: { message: { isError: true, toolCallId: 'c2', error: { code: 'ENOENT' } } } },
    ])
    expect(summary.nonCompletedTurns[0].detail).toBe('{"code":"EACCES","path":"/x"}')
    expect(summary.toolErrors[0].text).toBe('{"code":"ENOENT"}')
  })

  it('bash 非零退出进 toolNonZeroExits（tool/result 与 job/settled 按 callId 去重）', () => {
    const summary = summarizeSessionEvents([
      { type: 'tool/call', data: { name: 'bash', callId: 'b1', turn: 1 } },
      { type: 'tool/result', data: { turn: 1, message: { isError: false, toolCallId: 'b1', content: [{ type: 'text', text: 'stat: missing\n[exit code: 1]' }] } } },
      { type: 'job/settled', data: { kind: 'bash', jobId: 'j1', toolCall: { callId: 'b1' }, detail: 'exit code: 1', label: 'stat missing' } },
    ])
    expect(summary.toolErrors).toEqual([])
    expect(summary.toolNonZeroExits).toEqual([
      { toolCallId: 'b1', toolName: 'bash', code: 1, text: 'stat: missing\n[exit code: 1]' },
    ])
  })

  it('中断轮的最后工具是 ask_user_question → 标「等人回答」，不再冒充进程崩溃', () => {
    const summary = summarizeSessionEvents([
      { type: 'turn/start', data: { turn: 7 } },
      { type: 'tool/call', data: { name: 'ask_user_question', callId: 'q1', turn: 7 } },
    ])
    expect(summary.interruptedTurns).toEqual([7])
    expect(summary.interruptedHints).toEqual([{ turn: 7, kind: 'waiting-user', detail: 'ask_user_question' }])
  })

  it('approval/asked 没有 decided → pendingApprovals（不是已完成审批）', () => {
    const summary = summarizeSessionEvents([
      { type: 'approval/asked', data: { id: 'a1', toolName: 'request_signoff', reason: '毛利 <30%' } },
      { type: 'turn/start', data: { turn: 3 } },
      { type: 'tool/call', data: { name: 'request_signoff', callId: 's1', turn: 3 } },
    ])
    expect(summary.approvals).toEqual([])
    expect(summary.pendingApprovals).toEqual([{ id: 'a1', toolName: 'request_signoff', reason: '毛利 <30%' }])
    expect(summary.interruptedHints).toEqual([{ turn: 3, kind: 'waiting-approval', detail: 'request_signoff' }])
  })

  it('team/member.phase=failed 折进 teamFailures', () => {
    const summary = summarizeSessionEvents([
      { type: 'team/member', data: { member: 'vp-eng', phase: 'failed', error: 'provision timeout' } },
    ])
    expect(summary.teamFailures).toEqual([{ member: 'vp-eng', detail: 'provision timeout' }])
  })

  it('redactTokenUrls 只脱敏值，不吞 URL 结构', () => {
    expect(redactTokenUrls(`x https://example.invalid/p?token=${token}&a=1 y`))
      .toBe('x https://example.invalid/p?token=<redacted>&a=1 y')
  })
})

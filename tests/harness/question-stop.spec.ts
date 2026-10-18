/**
 * 问询停点判定的 keyless 判据（BUG-022）：驱动的"**看到停点就停并报**"靠它。
 *
 * 为什么单独立一条：驱动死在问询上过一次（BUG-021：跑到 26 步的动议挂 40 分钟后掉线），
 * 补了 timed 默认后又被模型的单次 `timeout: -1` 打回无界（BUG-022）。判定必须只看**会话日志可观测面**
 * （`tool/call name=ask_user_question` 与配对的 `tool/result`），不依赖 UI 或投影私有面——
 * 驱动手里只有日志，判据也得只用日志。
 * 红证（先红后绿）：本 spec 在 `tools/lib/question-stop.mjs` 存在前 import 即红。
 */
import { describe, expect, it } from 'vitest'
import { questionStopOf } from '../../tools/lib/question-stop.mjs'

const T0 = 1_700_000_000_000
/** 一条 tool/call（`arguments` 是 JSON 字符串——实测形状）。 */
const call = (callId, { timeout, ids = ['q1'], at = T0 } = {}) => ({
  type: 'tool/call',
  seq: 1,
  time: at,
  data: {
    turn: 1,
    step: 1,
    callId,
    name: 'ask_user_question',
    arguments: JSON.stringify({
      questions: ids.map(id => ({ id, question: '选哪个？', options: [{ label: '甲' }, { label: '乙' }] })),
      ...(timeout === undefined ? {} : { timeout }),
    }),
  },
})
/** 一条 tool/result（配对用 `data.message.toolCallId`——实测形状）。 */
const result = (callId, { at = T0 + 1000, text = '{"pending":true}' } = {}) => ({
  type: 'tool/result',
  seq: 2,
  time: at,
  data: { turn: 1, step: 1, message: { role: 'tool', source: { kind: 'tool', callId }, toolCallId: callId, content: [{ type: 'text', text }], isError: false, id: 'm1' } },
})
/** 与本卡无关的事件（不该干扰判定）。 */
const noise = () => ({ type: 'assistant/message', seq: 3, time: T0, data: { text: '干活中' } })

// 负例留证 2026-10-18：BUG-022——① 本 spec 在 `tools/lib/question-stop.mjs` 存在前 import 即红（模块缺失）；
//   ② 判定本身的红证 = 真模型探针 `--unbounded` 档：模型传 `timeout: -1` 时，若判定不认这条路，
//   探针会在 ② 卡到 30s 超时（实跑对照：判定在位时 **0s** 给出「需人参与」+ callId/question.id）。
describe('questionStopOf：停在问询上吗？这个停点驱动能不能自己解？', () => {
  it('没有问询调用 ⇒ 无停点（null）', () => {
    expect(questionStopOf([noise()], { now: T0 + 60_000 })).toBeNull()
  })

  it('已配对的问询不算停点（pending 之后人仍可后答，驱动该继续干活）', () => {
    expect(questionStopOf([call('c1'), result('c1')], { now: T0 + 121_000 })).toBeNull()
  })

  it('默认窗口未到点 ⇒ 建议 wait，并给出剩余毫秒（preset 钉 120s）', () => {
    const verdict = questionStopOf([call('c1')], { now: T0 + 30_000 })
    expect(verdict).toMatchObject({ callId: 'c1', window: 'bounded', action: 'wait', windowMs: 120_000, remainingMs: 90_000 })
  })

  it('模型明示 timeout: -1 ⇒ 窗口无界，立刻建议 stop（BUG-022 的反例路径）', () => {
    const verdict = questionStopOf([call('c1', { timeout: -1 })], { now: T0 + 5_000 })
    expect(verdict).toMatchObject({ callId: 'c1', window: 'unbounded', action: 'stop', remainingMs: null })
    expect(verdict.reason).toContain('-1')
  })

  it('超长窗口（超阈值）视同无界：驱动不该陪着等一小时', () => {
    const verdict = questionStopOf([call('c1', { timeout: 3600 })], { now: T0 + 5_000, maxBoundedWindowMs: 900_000 })
    expect(verdict).toMatchObject({ window: 'unbounded', action: 'stop' })
    expect(verdict.reason).toContain('3600')
  })

  it('有界但已超出窗口 + 宽限仍无结果 ⇒ 也建议 stop（并把"逾期"说清楚）', () => {
    const verdict = questionStopOf([call('c1')], { now: T0 + 300_000, slackMs: 60_000 })
    expect(verdict).toMatchObject({ window: 'bounded', action: 'stop', remainingMs: 0 })
    expect(verdict.reason).toContain('逾期')
  })

  it('多条问询：取最老那条未配对的（后面的不该顶掉前面的）', () => {
    const verdict = questionStopOf([call('c1', { at: T0 }), call('c2', { at: T0 + 10_000 }), result('c2')], { now: T0 + 20_000 })
    expect(verdict).toMatchObject({ callId: 'c1', action: 'wait' })
  })

  it('question.id 一并带出（报给人时要能点名问的是哪几问）', () => {
    const verdict = questionStopOf([call('c1', { ids: ['a', 'b'] })], { now: T0 + 1_000 })
    expect(verdict.questionIds).toEqual(['a', 'b'])
  })

  it('坏 arguments / 缺时间戳不炸：按默认窗口判，且给得出 verdict', () => {
    const broken = { type: 'tool/call', seq: 1, time: T0, data: { callId: 'c1', name: 'ask_user_question', arguments: '不是 JSON' } }
    const verdict = questionStopOf([broken], { now: T0 + 1_000 })
    expect(verdict).toMatchObject({ callId: 'c1', window: 'bounded', action: 'wait', questionIds: [] })
    const noTime = { type: 'tool/call', seq: 1, data: { callId: 'c2', name: 'ask_user_question', arguments: '{}' } }
    expect(questionStopOf([noTime], { now: T0 }).waitingMs).toBe(0)
  })

  it('非问询工具的未配对调用不算停点（别的工具挂住是别的问题）', () => {
    const other = { type: 'tool/call', seq: 1, time: T0, data: { callId: 'x', name: 'bash', arguments: '{}' } }
    expect(questionStopOf([other], { now: T0 + 600_000 })).toBeNull()
  })
})

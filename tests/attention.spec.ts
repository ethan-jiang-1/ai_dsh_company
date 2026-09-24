/** 「需要你」注意力读模型（驾驶舱①切片一的 keyless 完成定义）。 */
import { describe, expect, it } from 'vitest'
import {
  ESCALATION_MARK,
  PRESENT_TOOL_NAME,
  STREAM_ITEM_CAP,
  attentionLabel,
  attentionTone,
  mergeAttention,
  streamAttention,
  type AttentionEventLike,
  type LivePending,
} from '../packages/company-pack/src/lib/attention.ts'
import { createAttentionRegistry } from '../packages/company-pack/src/client/attention-registry.ts'

/**
 * 只测纯函数与登记处生命周期（毫秒级）。真页面的观察者链路（远端事件 → 面板行）是认证档：
 * `client-load-smoke`（装配零失败）+ 真会话挂起问询实证（guides/dev-loop §9.1 分层）。
 */

/** 造一条 team/message/queued 事件。 */
const messageEvent = (senderName: string, text: string, time = 1_000): AttentionEventLike => ({
  type: 'team/message/queued',
  time,
  data: { message: { senderName, content: [{ type: 'text', text }] } },
})

/** 造一条 tool/call 事件。 */
const toolCallEvent = (name: string, argumentsJson: string | undefined, time = 1_000): AttentionEventLike => ({
  type: 'tool/call',
  time,
  data: { callId: `call-${time}`, name, arguments: argumentsJson },
})

describe('streamAttention · 升级待处理', () => {
  it('只折带【待澄清】前缀的消息，摘要去掉标记', () => {
    const items = streamAttention([
      messageEvent('vp-eng', `${ESCALATION_MARK}现场支持谁顶？`),
      messageEvent('vp-sales', '客户没有异议'),
    ], 'lead-1', 'CEO')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'escalation', who: 'vp-eng', what: '现场支持谁顶？', jumpTo: 'lead-1' })
  })

  it('多行消息取首行；空升级消息给（空）占位', () => {
    const items = streamAttention([
      messageEvent('coo', `${ESCALATION_MARK}并行池已满\n要不要挪项目？`),
      messageEvent('cfo', ESCALATION_MARK),
    ], 'lead-1', 'CEO')
    expect(items[0]!.what).toBe('并行池已满')
    expect(items[1]!.what).toBe('（空）')
  })

  it('超过上限只留最近 STREAM_ITEM_CAP 条', () => {
    const events = Array.from({ length: STREAM_ITEM_CAP + 3 }, (_, i) =>
      messageEvent('vp-eng', `${ESCALATION_MARK}问题 ${i}`, i + 1))
    const items = streamAttention(events, 'lead-1', 'CEO')
    expect(items).toHaveLength(STREAM_ITEM_CAP)
    expect(items.at(-1)!.what).toBe(`问题 ${STREAM_ITEM_CAP + 2}`)
  })
})

describe('streamAttention · 完成通知', () => {
  it('只折 present 工具调用；参数解析出 title 摘要', () => {
    const items = streamAttention([
      toolCallEvent('skill', '{"name":"chairing"}', 900),
      toolCallEvent(PRESENT_TOOL_NAME, '{"title":"支持 SLA 承诺页","slug":"support-sla-page"}', 1_000),
    ], 'lead-1', 'CEO')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'completion', who: 'CEO', what: '交付完成：支持 SLA 承诺页', jumpTo: 'lead-1' })
  })

  it('参数缺失 / 非法 JSON / 无已知字段都给「交付物」兜底', () => {
    const items = streamAttention([
      toolCallEvent(PRESENT_TOOL_NAME, undefined, 1),
      toolCallEvent(PRESENT_TOOL_NAME, '{oops', 2),
      toolCallEvent(PRESENT_TOOL_NAME, '{"other":1}', 3),
    ], 'lead-1', 'CEO')
    expect(items.map(item => item.what)).toEqual(['交付完成：交付物', '交付完成：交付物', '交付完成：交付物'])
  })
})

describe('mergeAttention', () => {
  const live: LivePending[] = [
    { kind: 'approval', sessionId: 's-approval', what: '预算 $600/月', since: 3_000 },
    { kind: 'question', sessionId: 's-question', what: '今晚吃什么？', since: 5_000 },
  ]

  it('等人的（挂起）在前按时间倒序，告知的在后', () => {
    const items = mergeAttention(live, [
      { kind: 'completion', who: 'CEO', what: '交付完成：X', time: 9_000, jumpTo: 'lead-1' },
    ])
    expect(items.map(item => item.kind)).toEqual(['question', 'approval', 'completion'])
  })

  it('问询/审批条目的 who 是 sessionId 占位（面板负责 displayTitle 解析）', () => {
    const [first] = mergeAttention(live, [])
    expect(first).toMatchObject({ who: 's-question', jumpTo: 's-question' })
  })
})

describe('标签与色调', () => {
  it('四类标签齐备且等人类醒目', () => {
    expect(attentionLabel('question')).toBe('待答问询')
    expect(attentionLabel('approval')).toBe('待批审批')
    expect(attentionLabel('escalation')).toBe('升级待处理')
    expect(attentionLabel('completion')).toBe('完成通知')
    expect(attentionTone('approval')).toBe('danger')
    expect(attentionTone('completion')).toBe('outline')
  })
})

describe('createAttentionRegistry · 生命周期', () => {
  it('begin 登记 / 返回的销账函数移除；多实例互不干扰', () => {
    const registry = createAttentionRegistry()
    expect(registry.list()).toHaveLength(0)
    const doneA = registry.begin({ kind: 'question', sessionId: 's-a', what: 'A', since: 1 })
    registry.begin({ kind: 'approval', sessionId: 's-b', what: 'B', since: 2 })
    expect(registry.list()).toHaveLength(2)
    doneA()
    expect(registry.list()).toMatchObject([{ kind: 'approval', sessionId: 's-b' }])
  })
})

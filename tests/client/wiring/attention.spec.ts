/** 「待办」注意力读模型（原「需要你」；keyless 完成定义）。 */
import { describe, expect, it } from 'vitest'
import {
  ESCALATION_MARK,
  PRESENT_TOOL_NAME,
  STREAM_ITEM_CAP,
  ATTENTION_SUMMARY_MAX,
  attentionSummary,
  attentionTone,
  mergeAttention,
  pendingApprovals,
  streamAttention,
  type AttentionEventLike,
  type LivePending,
} from '../../../packages/company-pack/src/lib/presence/attention.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'

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
  it('只折带 canonical 升级标记的消息，摘要去掉标记', () => {
    const items = streamAttention([
      messageEvent('vp-eng', `${ESCALATION_MARK}现场支持谁顶？`),
      messageEvent('vp-sales', '客户没有异议'),
    ], 'lead-1', 'CEO')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'escalation', who: 'vp-eng', what: '现场支持谁顶？', jumpTo: 'lead-1' })
  })

  it('canonical 升级标记是 [NEEDS-CLARIFICATION]，字面量可直接折', () => {
    expect(ESCALATION_MARK).toBe('[NEEDS-CLARIFICATION]')
    const items = streamAttention([
      messageEvent('vp-eng', '[NEEDS-CLARIFICATION]现场支持谁顶？'),
    ], 'lead-1', 'CEO')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'escalation', what: '现场支持谁顶？' })
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
  it('类别色调：等人的醒目、告知的低调', () => {
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

describe('pendingApprovals · 待办历史重建（刷新后仍能看到已挂起审批；事故背景见 _backlog/bugs 的同名卡）', () => {
  const asked = (id: string, time: number, toolName = 'request_signoff', reason = '双签线') => ({
    type: 'approval/asked',
    time,
    data: { id, toolName, reason },
  })
  const decided = (id: string, time: number) => ({ type: 'approval/decided', time, data: { id, outcome: 'allowed-once' } })

  it('问了没答 → 一条待批；答了 → 消失', () => {
    expect(pendingApprovals([asked('a1', 1000)], 's1')).toHaveLength(1)
    expect(pendingApprovals([asked('a1', 1000), decided('a1', 2000)], 's1')).toHaveLength(0)
  })

  it('多个请求只保留仍挂起的那条，按时间倒序', () => {
    const items = pendingApprovals([asked('a1', 1000), asked('a2', 3000), decided('a1', 4000)], 's1')
    expect(items.map(item => item.time)).toEqual([3000])
    expect(items[0]?.kind).toBe('approval')
    expect(items[0]?.jumpTo).toBe('s1')
    expect(items[0]?.what).toContain('request_signoff')
  })

  it('mergeAttention 对同一条挂起去重（活体优先）', () => {
    const live = [{ kind: 'approval' as const, sessionId: 's1', what: 'request_signoff：双签线', since: 1000 }]
    const merged = mergeAttention(live, pendingApprovals([asked('a1', 1000)], 's1'))
    expect(merged).toHaveLength(1)
    expect(merged[0]?.time).toBe(1000)
  })
})

// 分支补齐（coverage ratchet 要求「只升不降」）：重建器的边角形态——缺工具名、reason 只有空白、
// 无关 id 的 decided、超出上限被截断。这些分支此前只在真页面/事件流里偶然走到。
describe('pendingApprovals · 边角形态', () => {
  const asked = (id: string, time: number, data: Record<string, unknown>) => ({ type: 'approval/asked', time, data: { id, ...data } })
  const decided = (id: string, time: number) => ({ type: 'approval/decided', time, data: { id } })

  it('缺 toolName ⇒ 占位文案，仍算挂起', () => {
    const [item] = pendingApprovals([asked('a1', 1000, {})], 's1')
    expect(item?.what).toContain('工具名缺失')
  })

  it('reason 只有空白 ⇒ 只显示工具名（不挂一串空格）', () => {
    const [item] = pendingApprovals([asked('a1', 1000, { toolName: 'bash', reason: '   ' })], 's1')
    expect(item?.what).toBe('bash')
  })

  it('decided 指向别的 id ⇒ 原挂起项不动', () => {
    expect(pendingApprovals([asked('a1', 1000, { toolName: 'bash' }), decided('other', 2000)], 's1')).toHaveLength(1)
  })

  it('非审批事件 / 缺 id 的事件被忽略', () => {
    const events = [
      { type: 'user/message', time: 1, data: { text: 'x' } },
      { type: 'approval/asked', time: 2, data: {} },
      { type: 'approval/asked', time: 3, data: null },
    ]
    expect(pendingApprovals(events as never, 's1')).toHaveLength(0)
  })

  it('超过 STREAM_ITEM_CAP ⇒ 截断到上限', () => {
    const many = Array.from({ length: STREAM_ITEM_CAP + 3 }, (_, i) => asked(`a${String(i)}`, 1000 + i, { toolName: 'bash' }))
    expect(pendingApprovals(many, 's1')).toHaveLength(STREAM_ITEM_CAP)
  })
})

describe('attentionTone（类别 → 色调）', () => {
  it('四类各给一种色调（面板 Tag 外观的唯一来源）', () => {
    expect([attentionTone('question'), attentionTone('approval'), attentionTone('escalation'), attentionTone('completion')])
      .toEqual(['warning', 'danger', 'info', 'outline'])
  })
})

// 摘要边界（BUG-295）：外部文本（模型写的审批理由）长度无上界，列表行必须折叠；
// 活体登记与历史重建必须用**同一个**折叠函数，否则 mergeAttention 的去重键对不上、同一条会重复。
// 负例留证 2026-11-22：把 attentionSummary 改成恒等函数（不折叠）后 `vitest run tests/client/wiring/attention.spec.ts` 3 failed（钳制/压平/去重）；还原后 23/23 绿。BUG-295
describe('attentionSummary · 摘要边界（BUG-295）', () => {
  const long = `折扣线双签：${'理由'.repeat(500)}`

  it('短文本原样；长文本被折叠到上限并带省略号', () => {
    expect(attentionSummary('双签')).toBe('双签')
    const summary = attentionSummary(long)
    expect(summary.length).toBeLessThanOrEqual(ATTENTION_SUMMARY_MAX)
    expect(summary.endsWith('…')).toBe(true)
  })

  it('换行与连续空白压成单空格（列表行不会被多段撑开）', () => {
    expect(attentionSummary('第一段\n\n第二段\t第三段')).toBe('第一段 第二段 第三段')
  })

  it('活体与历史同源折叠 ⇒ 同一条审批去重后只剩一行', () => {
    const live = [{ kind: 'approval' as const, sessionId: 's-b', what: attentionSummary(`request_signoff：${long}`), since: 1000 }]
    const items = mergeAttention(live, pendingApprovals([
      { type: 'approval/asked', time: 1000, data: { id: 'a1', toolName: 'request_signoff', reason: long } },
    ], 's-b'))
    expect(items).toHaveLength(1)
    expect(items[0]?.what.length).toBeLessThanOrEqual(ATTENTION_SUMMARY_MAX)
  })

  it('完整详情仍可达：重建条目带 detail（未折叠）', () => {
    const [item] = pendingApprovals([
      { type: 'approval/asked', time: 1000, data: { id: 'a1', toolName: 'request_signoff', reason: long } },
    ], 's-b')
    expect(item?.detail).toContain(long.slice(0, 40))
    expect(item?.detail?.length).toBeGreaterThan(ATTENTION_SUMMARY_MAX)
  })
})

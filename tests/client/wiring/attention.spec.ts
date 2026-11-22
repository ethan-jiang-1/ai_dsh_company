/** 「待办」注意力读模型（原「需要你」；keyless 完成定义）。 */
import { describe, expect, it } from 'vitest'
import {
  ESCALATION_MARK,
  PRESENT_TOOL_NAME,
  STREAM_ITEM_CAP,
  ATTENTION_SUMMARY_MAX,
  attentionItemKey,
  attentionSummary,
  attentionTone,
  hasBoundary,
  mergeAttention,
  pendingApprovals,
  pendingAsks,
  pendingQuestions,
  questionListOf,
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
    expect(pendingApprovals([asked('a1', 1000)], 's1').items).toHaveLength(1)
    expect(pendingApprovals([asked('a1', 1000), decided('a1', 2000)], 's1').items).toHaveLength(0)
  })

  it('多个请求只保留仍挂起的那条，按时间倒序', () => {
    const items = pendingApprovals([asked('a1', 1000), asked('a2', 3000), decided('a1', 4000)], 's1').items
    expect(items.map(item => item.time)).toEqual([3000])
    expect(items[0]?.kind).toBe('approval')
    expect(items[0]?.jumpTo).toBe('s1')
    expect(items[0]?.what).toContain('request_signoff')
  })

  it('mergeAttention 对同一条挂起去重（活体优先）', () => {
    // 同一条 = 同一身份：活体现在带审批 id（观察者从 approval/request 透传），去重按 id 而非摘要。
    const live = [{ kind: 'approval' as const, sessionId: 's1', id: 'a1', what: 'request_signoff：双签线', since: 1000 }]
    const merged = mergeAttention(live, pendingApprovals([asked('a1', 1000)], 's1').items)
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
    const [item] = pendingApprovals([asked('a1', 1000, {})], 's1').items
    expect(item?.what).toContain('工具名缺失')
  })

  it('reason 只有空白 ⇒ 只显示工具名（不挂一串空格）', () => {
    const [item] = pendingApprovals([asked('a1', 1000, { toolName: 'bash', reason: '   ' })], 's1').items
    expect(item?.what).toBe('bash')
  })

  it('decided 指向别的 id ⇒ 原挂起项不动', () => {
    expect(pendingApprovals([asked('a1', 1000, { toolName: 'bash' }), decided('other', 2000)], 's1').items).toHaveLength(1)
  })

  it('非审批事件 / 缺 id 的事件被忽略', () => {
    const events = [
      { type: 'user/message', time: 1, data: { text: 'x' } },
      { type: 'approval/asked', time: 2, data: {} },
      { type: 'approval/asked', time: 3, data: null },
    ]
    expect(pendingApprovals(events as never, 's1').items).toHaveLength(0)
  })

  it('超过 STREAM_ITEM_CAP ⇒ 截断到上限', () => {
    const many = Array.from({ length: STREAM_ITEM_CAP + 3 }, (_, i) => asked(`a${String(i)}`, 1000 + i, { toolName: 'bash' }))
    expect(pendingApprovals(many, 's1').items).toHaveLength(STREAM_ITEM_CAP)
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
    const live = [{ kind: 'approval' as const, sessionId: 's-b', id: 'a1', what: attentionSummary(`request_signoff：${long}`), since: 1000 }]
    const items = mergeAttention(live, pendingApprovals([
      { type: 'approval/asked', time: 1000, data: { id: 'a1', toolName: 'request_signoff', reason: long } },
    ], 's-b').items)
    expect(items).toHaveLength(1)
    expect(items[0]?.what.length).toBeLessThanOrEqual(ATTENTION_SUMMARY_MAX)
  })

  it('完整详情仍可达：重建条目带 detail（未折叠）', () => {
    const [item] = pendingApprovals([
      { type: 'approval/asked', time: 1000, data: { id: 'a1', toolName: 'request_signoff', reason: long } },
    ], 's-b').items
    expect(item?.detail).toContain(long.slice(0, 40))
    expect(item?.detail?.length).toBeGreaterThan(ATTENTION_SUMMARY_MAX)
  })
})

// 身份 ≠ 摘要（BUG-299）：两条**不同 id** 的挂起审批，哪怕理由一字不差，也必须显示两条——
// 少一条 = 一次审批被藏起来。同一 id 的 live+history 仍只一条（不能反向重复）。
// 负例留证 2026-11-22：把 attentionItemKey 改回 kind+jumpTo+what 后 `vitest run tests/client/wiring/attention.spec.ts` 1 failed（两条同摘要审批塌成一条）；还原后 27/27 绿。BUG-299
describe('mergeAttention · 按身份去重（BUG-299）', () => {
  const asked = (id: string, time: number, reason: string) => ({
    type: 'approval/asked' as const, time, data: { id, toolName: 'request_signoff', reason },
  })

  it('两条同摘要、不同 id ⇒ 2 条（不被摘要吞掉）', () => {
    const rebuilt = pendingApprovals([asked('a1', 1000, 'same reason'), asked('a2', 2000, 'same reason')], 's-1')
    expect(mergeAttention([], rebuilt.items)).toHaveLength(2)
  })

  it('同一 id 的 live + history ⇒ 1 条（身份相同不重复）', () => {
    const live = [{ kind: 'approval' as const, sessionId: 's-1', id: 'a1', what: attentionSummary('request_signoff：same reason'), since: 1000 }]
    const rebuilt = pendingApprovals([asked('a1', 1000, 'same reason')], 's-1')
    expect(mergeAttention(live, rebuilt.items)).toHaveLength(1)
  })

  it('活体条目的 detail 在 merge 后仍在（刷新前后都能看全文）', () => {
    const live = [{
      kind: 'approval' as const, sessionId: 's-1', id: 'a1',
      what: attentionSummary(`request_signoff：${'长理由'.repeat(50)}`),
      detail: `request_signoff：${'长理由'.repeat(50)}`,
      since: 1000,
    }]
    const [item] = mergeAttention(live, [])
    expect(item?.detail).toContain('request_signoff')
    expect(item?.id).toBe('a1')
  })

  it('列表 key 同一身份一致、不同身份不同（不会撞 key）', () => {
    const one = pendingApprovals([asked('a1', 1000, 'same')], 's-1').items[0]!
    const two = pendingApprovals([asked('a2', 1000, 'same')], 's-1').items[0]!
    expect(attentionItemKey(one)).not.toBe(attentionItemKey(two))
    expect(attentionItemKey(one)).toBe(attentionItemKey({ ...one }))
  })
})

// 身份不许回落到内容（BUG-312）：问询活体在登记时合成 id；
// 无 id 的消息类用时间定位，**绝不**用摘要（同文两条会撞 key）。
// 负例留证 2026-11-22：把 key 的无 id 分支改回按 what 后 `vitest run tests/client/wiring/attention.spec.ts` 1 failed（同文消息类撞 key）。BUG-312
describe('attentionItemKey · 同文不同条不撞 key（BUG-312）', () => {
  it('两条时间不同的同文消息类 ⇒ 两个 key（不按摘要）', () => {
    const base = { kind: 'escalation' as const, who: 'CEO', what: '同一句话', jumpTo: 's-1' }
    expect(attentionItemKey({ ...base, time: 1 })).not.toBe(attentionItemKey({ ...base, time: 2 }))
  })

  it('有 id 的条目按 id 区分（同文同日也各不相同）', () => {
    const base = { kind: 'approval' as const, who: 's-1', what: '同文', time: 1, jumpTo: 's-1' }
    expect(attentionItemKey({ ...base, id: 'a' })).not.toBe(attentionItemKey({ ...base, id: 'b' }))
  })
})

// 负例留证 2026-11-22：`pendingApprovals` 不带 `capped` 后 `vitest run tests/client/wiring/attention.spec.ts` 1 failed。BUG-320
// 审批流上限必须报出来：同一会话 6 条挂起审批只显示 5 条，第 6 条不能静默消失。
describe('pendingApprovals：上限与计数（BUG-320）', () => {
  it('多出上限 ⇒ capped = 超出的条数', () => {
    const many = Array.from({ length: STREAM_ITEM_CAP + 1 }, (_, i) => ({ type: 'approval/asked' as const, time: 1000 + i, data: { id: `a${String(i)}`, toolName: 'bash' } }))
    const rebuilt = pendingApprovals(many, 's1')
    expect(rebuilt.items).toHaveLength(STREAM_ITEM_CAP)
    expect(rebuilt.capped).toBe(1)
  })

  it('没超上限 ⇒ capped = 0', () => {
    expect(pendingApprovals([{ type: 'approval/asked', time: 1, data: { id: 'a', toolName: 'bash' } }], 's1').capped).toBe(0)
  })
})

// 问询也要能从历史重建（BUG-319）：日志里问询是 ask_user_question 的 tool/call，
// 答案以同 callId 的 tool/result 落回；没有配对结果的就是「问了没答」。
// 负例留证 2026-11-23：`pendingAsks` 只返回审批后 `vitest run tests/client/wiring/attention.spec.ts` 4 failed（未答问询不出现）。BUG-319
describe('pendingAsk/重建问询（BUG-319）', () => {
  const call = (callId: string, question: string, time: number) => ({
    type: 'tool/call' as const, time, data: { callId, name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ question }] }) },
  })
  const result = (callId: string, time: number) => ({ type: 'tool/result' as const, time, data: { callId } })

  it('未答问询 ⇒ 进「等你处理」（刷新后仍在）', () => {
    const items = pendingAsks([call('c1', '要不要并行两条线？', 1000)], 's-1').items
    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('question')
    expect(items[0]?.what).toContain('并行')
  })

  it('有配对的 result ⇒ 不出现（答过的不算）', () => {
    expect(pendingAsks([call('c1', '要不要并行？', 1000), result('c1', 2000)], 's-1').items).toHaveLength(0)
  })

  it('arguments 坏 / 缺问题 ⇒ 占位文案，仍算挂起（不静默丢）', () => {
    const broken = [
      { type: 'tool/call' as const, time: 1, data: { callId: 'c1', name: 'ask_user_question', arguments: '{not json' } },
      { type: 'tool/call' as const, time: 2, data: { callId: 'c2', name: 'ask_user_question', arguments: JSON.stringify({ questions: [] }) } },
    ]
    const items = pendingAsks(broken, 's-1').items
    expect(items).toHaveLength(2)
    expect(items[0]?.what).toContain('问询内容缺失')
  })

  it('审批与问询一起回来，按时间倒序', () => {
    const events = [
      { type: 'approval/asked' as const, time: 1000, data: { id: 'a1', toolName: 'request_signoff', reason: 'r' } },
      call('c1', '问题', 2000),
    ]
    const items = pendingAsks(events, 's-1').items
    expect(items.map(item => item.kind)).toEqual(['question', 'approval'])
  })
})

// 问询重建的分支补齐：缺 arguments / 空字符串 / 非字符串、data 为 null、
// user-questions/answered 口径、带 detail 的正例。少一条就少一个「下次坏这里没人发现」。
describe('pendingAsks · 形状边角（重建问询）', () => {
  it('缺 arguments / 空串 / 非字符串 ⇒ 占位；data null 的事件被忽略', () => {
    const items = pendingAsks([
      { type: 'tool/call', time: 1, data: { callId: 'a', name: 'ask_user_question' } },
      { type: 'tool/call', time: 2, data: { callId: 'b', name: 'ask_user_question', arguments: '   ' } },
      { type: 'tool/call', time: 3, data: { callId: 'c', name: 'ask_user_question', arguments: 42 } },
      { type: 'tool/call', time: 4, data: null },
    ] as never, 's-1').items
    expect(items).toHaveLength(3)
    expect(items.every(item => (item.what ?? '').includes('问询内容缺失'))).toBe(true)
  })

  it('正例带 detail（悬停可看全文）', () => {
    const items = pendingAsks([{
      type: 'tool/call', time: 1,
      data: { callId: 'c1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ question: '全文在这里' }] }) },
    }], 's-1').items
    expect(items[0]?.detail).toBe('全文在这里')
  })

  it('user-questions/answered 口径同样算「答过」', () => {
    const items = pendingAsks([
      { type: 'tool/call', time: 1, data: { callId: 'c1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ question: 'q' }] }) } },
      { type: 'user-questions/answered', time: 2, data: { id: 'c1' } },
    ] as never, 's-1').items
    expect(items).toHaveLength(0)
  })
})

// 负例留证 2026-11-23：去掉 hasBoundary 的任一维后 `vitest run tests/client/wiring/attention.spec.ts` 1 failed。BUG-327/328/330
// 边界汇总：判据只有一处 hasBoundary；任一维度异常就不许说「没有」。
describe('AttentionBoundaries · 单一空态判据（BUG-328）', () => {
  const none = { eventsTruncated: false, candidates: { total: 0, capped: 0 }, asksCapped: 0, window: 'none' as const, failed: 0 }

  it('六维全清 ⇒ hasBoundary=false（可以说「没有」）', () => {
    expect(hasBoundary(none)).toBe(false)
  })

  it('任一维异常 ⇒ true（空态必须压住）', () => {
    expect(hasBoundary({ ...none, eventsTruncated: true })).toBe(true)
    expect(hasBoundary({ ...none, candidates: null })).toBe(true)
    expect(hasBoundary({ ...none, candidates: { total: 25, capped: 5 } })).toBe(true)
    expect(hasBoundary({ ...none, asksCapped: 1 })).toBe(true)
    expect(hasBoundary({ ...none, window: 'some' })).toBe(true)
    expect(hasBoundary({ ...none, failed: 2 })).toBe(true)
  })
})

// 跨源身份（BUG-325）：问询的活体 id 是合成的、历史 id 是 callId——同一条问询只许出现一次；
// 源内仍按 id（保 312：同文两条不同 id 不合并）。
// 负例留证 2026-11-23：去掉跨源内容去重后 `vitest run tests/client/wiring/attention.spec.ts` 1 failed（同一条问询两行）。BUG-325
describe('mergeAttention · 跨源问询去重（BUG-325）', () => {
  const live = (what: string, id: string) => ({ kind: 'question' as const, sessionId: 's-1', id, what, since: 1000 })
  const history = (what: string, id: string) => ({ kind: 'question' as const, who: 's-1', id, what, time: 1000, jumpTo: 's-1' })

  it('活体与历史同文同源 ⇒ 合并成一条（活体优先）', () => {
    const merged = mergeAttention([live('要不要并行？', 'question:1:1')], [history('要不要并行？', 'call-1')])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).toBe('question:1:1')
  })

  it('两条活体同文不同 id ⇒ 仍是两条（312 的成果不许回退）', () => {
    expect(mergeAttention([live('要不要并行？', 'question:1:1'), live('要不要并行？', 'question:1:2')], [])).toHaveLength(2)
  })

  it('两条历史同文不同 callId ⇒ 仍是两条（源内按 id）', () => {
    expect(mergeAttention([], [history('要不要并行？', 'call-1'), history('要不要并行？', 'call-2')])).toHaveLength(2)
  })
})

// 多问题（BUG-331）：一次 ask_user_question 带 N 个问题 ⇒ 一条条目 + 「共 N 个问题」，detail 放全部。
// 负例留证 2026-11-23：只读第一个问题后 `vitest run tests/client/wiring/attention.spec.ts` 1 failed（缺「共 N 个问题」）。BUG-331
describe('pendingQuestions · 多问题请求（BUG-331）', () => {
  const call = (argumentsText: string) => ({ type: 'tool/call' as const, time: 1000, data: { callId: 'c1', name: 'ask_user_question', arguments: argumentsText } })

  it('三个问题 ⇒ 一条条目、what 带「共 3 个问题」、detail 列出全部', () => {
    const [item] = pendingQuestions([call(JSON.stringify({ questions: [{ question: 'A' }, { question: 'B' }, { question: 'C' }] }))], 's-1')
    expect(item?.what).toContain('共 3 个问题')
    expect(item?.detail).toContain('B')
    expect(item?.detail).toContain('C')
  })

  it('单个问题 ⇒ 不加计数后缀', () => {
    const [item] = pendingQuestions([call(JSON.stringify({ questions: [{ question: '只有一个' }] }))], 's-1')
    expect(item?.what).toBe('只有一个')
  })
})

// questionListOf 的形状边角（331 的读取函数）：非字符串问题 / 空问题被过滤；
// arguments 不是 JSON 时返回空数组（调用方给占位）。
describe('questionListOf · 形状边角', () => {
  it('非字符串与空问题被过滤', () => {
    expect(questionListOf(JSON.stringify({ questions: [{ question: 42 }, { question: '  ' }, { question: '真问题' }] }))).toEqual(['真问题'])
  })

  it('坏 JSON / 缺 questions ⇒ 空数组', () => {
    expect(questionListOf('{not json')).toEqual([])
    expect(questionListOf(JSON.stringify({}))).toEqual([])
    expect(questionListOf(undefined)).toEqual([])
  })
})

// @vitest-environment happy-dom
/**
 * 「待办」页签体的 keyless 渲染判据（R3-10，2026-10-27 第三轮六维度审计）。
 *
 * 为什么补：`AttentionTab.tsx` 的行覆盖长期停在 ~5%、分支 0——它是用户处理审批/问询的唯一入口，
 * 但此前没有任何测试渲染过它。一个永远空的待办收件箱（审批等着却没人看见）可以让 900+ 用例全绿。
 * 本档用 happy-dom + createRoot 真挂载：挂起项从登记处读、断流显式落错误行、空态说真话、
 * 「去处理」真的跳到发起会话。**不主张**真浏览器渲染（那层归 client-load-smoke / cdp-probe）。
 */
// 负例留证 2026-11-27：AttentionTab 去掉 shortSessionId / request_signoff 本地化 / zh-CN 24h formatWhen ⇒ 露出 session-、request_signoff: 与 AM/PM（BUG-390）；还原后绿。BUG-390
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttentionTab, formatAttentionWhat } from '../../../packages/company-pack/src/client/tabs/AttentionTab.tsx'
import { en, zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import type { LivePending } from '../../../packages/company-pack/src/lib/presence/attention.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** 工作区已就绪的会话桩：本会话有 cwd ⇒ 跨会话扫描不被 fail-closed 拦。 */
const resolvedSessions = () => (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown =>
  selector({ byId: { 'session-lead': { id: 'session-lead', cwd: '/ws', updatedAt: 9 } } })

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

/** 按组件真实注入面造 props；`useTabInfo`/`useSessions` 是平台 hook，测试用桩。 */
function props(over: Record<string, unknown> = {}) {
  return {
    sessionId: 'session-lead',
    useSessions: (selector: (state: { byId: Record<string, unknown> }) => unknown) => selector({ byId: {} }),
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/attention' } }),
    floatTab: () => {},
    unfloatTab: () => {},
    openSession: vi.fn(),
    leadOf: (id: string) => id,
    follow: async function* () { /* 空流 */ },
    getPending: () => [] as readonly LivePending[],
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  return host
}

describe('待办页签：挂起项、空态与断流（R3-10）', () => {
  it('没有挂起项且无边界时给诚实的空态，而不是一张空白面板', async () => {
    // 工作区已就绪（cwd 已解析）才算「真的没有」；未就绪属于边界，按 327/328 的规则压住空态。
    const host = await mount(createElement(AttentionTab, props({ useSessions: resolvedSessions() })))
    expect(host.textContent).toContain('等你处理')
    expect(host.textContent).toContain('没有等你的事')
    expect(host.textContent).toContain('暂无交付通知')
    expect(host.textContent).toContain('每 2 秒自动刷新')
  })

  // 作用域诚实（BUG-292）：面板的活体面是整页的，历史重建只覆盖**本会话**——
  // 空态必须说清这条边界，否则「没有等你的事」会被读成「公司里没人等你」（跨会话时是假的）。
  // 负例留证 2026-11-21：撤掉 locales 的 attention.emptyWaiting 改动后 `vitest run tests/client/tabs/attention-tab.spec.ts` 1 failed / 5 passed；接回后 6/6 绿。BUG-292
  it('空态说清作用域（BUG-292）：本会话与同工作区其它会话的挂起项都会出现在这里', async () => {
    const host = await mount(createElement(AttentionTab, props({ useSessions: resolvedSessions() })))
    expect(host.textContent).toContain('同工作区其它会话')
  })

  it('登记处的挂起项出现在「等你处理」：标签、会话名与正文都在', async () => {
    const registry = createAttentionRegistry()
    registry.begin({ kind: 'approval', sessionId: 'session-vp-eng', what: '签发技术方案', since: Date.now() })
    registry.begin({ kind: 'question', sessionId: 'session-cfo', what: '定价要不要让一步', since: Date.now() })
    const host = await mount(createElement(AttentionTab, props({ getPending: () => registry.list() })))
    expect(host.textContent).toContain('待批审批')
    expect(host.textContent).toContain('签发技术方案')
    expect(host.textContent).toContain('待答问询')
    expect(host.textContent).toContain('定价要不要让一步')
    // 会话名解析不到 durable title 时剥离 session- 前缀用短 id 降级链（BUG-390：不露裸 session-）
    expect(host.textContent).toContain('会话 vp-eng')
    expect(host.textContent).not.toContain('会话 session-')
  })

  it('本地化 request_signoff 摘要、剥离 session- 前缀并按 zh-CN 24 小时制格式时间（BUG-390）', async () => {
    const tZh = ((k: keyof typeof zh, p?: Record<string, string | number>) => {
      const tpl = zh[k]
      return p === undefined ? tpl : tpl.replace(/\{(\w+)\}/g, (_m, n: string) => String(p[n] ?? ''))
    }) as CompanyT
    const tEn = ((k: keyof typeof en, p?: Record<string, string | number>) => {
      const tpl = en[k]
      return p === undefined ? tpl : tpl.replace(/\{(\w+)\}/g, (_m, n: string) => String(p[n] ?? ''))
    }) as CompanyT

    expect(formatAttentionWhat({
      what: 'request_signoff: margin check',
      whatToken: { kind: 'approval', toolName: 'request_signoff', reason: 'margin check' },
    }, tZh)).toBe(`${zh['attention.tool.requestSignoff']}：margin check`)
    expect(formatAttentionWhat({
      what: 'request_signoff: margin check',
      whatToken: { kind: 'approval', toolName: 'request_signoff', reason: 'margin check' },
    }, tEn)).toBe(`${en['attention.tool.requestSignoff']}: margin check`)

    const registry = createAttentionRegistry()
    // 超过 1 小时以走到 HH:MM 分支（23:46 本地时间测试 24 小时制且无 AM/PM）
    const d = new Date()
    d.setHours(23, 46, 0, 0)
    const oldMs = d.getTime() > Date.now() - 3_600_000 ? d.getTime() - 86_400_000 : d.getTime()
    registry.begin({
      kind: 'approval',
      sessionId: 'session-abcdef1234',
      what: 'request_signoff: 折扣线',
      whatToken: { kind: 'approval', toolName: 'request_signoff', reason: '折扣线' },
      since: oldMs,
    })
    const host = await mount(createElement(AttentionTab, props({ t: tZh, getPending: () => registry.list() })))
    expect(host.textContent).toContain('会话 abcdef12')
    expect(host.textContent).toContain(`${zh['attention.tool.requestSignoff']}：折扣线`)
    expect(host.textContent).not.toContain('request_signoff:')
    expect(host.textContent).toContain('23:46')
    expect(host.textContent).not.toMatch(/\b(AM|PM)\b/i)
  })

  it('「去处理」把跳转落在发起这件事的会话上', async () => {
    const openSession = vi.fn()
    const registry = createAttentionRegistry()
    registry.begin({ kind: 'approval', sessionId: 'session-vp-eng', what: '签发技术方案', since: Date.now() })
    const host = await mount(createElement(AttentionTab, props({ getPending: () => registry.list(), openSession })))
    const button = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('去处理'))
    expect(button).toBeDefined()
    await act(async () => { button?.click() })
    expect(openSession).toHaveBeenCalledWith('session-vp-eng')
  })

  it('动态流断掉时显式落错误行（fail-loud，不静默）', async () => {
    // oxlint-disable-next-line eslint/require-yield -- 模拟传输断流：这条生成器的用途就是只抛不 yield
    const follow = async function* (): AsyncGenerator<never> {
      throw new Error('transport closed')
    }
    const host = await mount(createElement(AttentionTab, props({ follow })))
    expect(host.textContent).toContain('动态流不可用')
    expect(host.textContent).toContain('transport closed')
  })

  it('挂起项被销账后下一轮轮询回到空态（登记处是活的，不是一次性快照）', async () => {
    const registry = createAttentionRegistry()
    const release = registry.begin({ kind: 'question', sessionId: 'session-coo', what: '要不要并行', since: Date.now() })
    const host = await mount(createElement(AttentionTab, props({ getPending: () => registry.list() })))
    expect(host.textContent).toContain('要不要并行')
    await act(async () => { release() })
    // 组件 2s 轮询；直接触发一次 React 更新不等真实定时器：remount 以新快照渲染
    mounted?.unmount()
    mounted = createRoot(host)
    await act(async () => { mounted?.render(createElement(AttentionTab, props({ getPending: () => registry.list() }))) })
    expect(host.textContent).not.toContain('要不要并行')
  })
})

// 跨会话聚合（BUG-292 的 A 路线）：待办是公司级语义，历史那一半要走 `session/page` 读别的会话——
// `session/follow` 对未打开的会话零帧，所以注入口是 page 面而不是 follow。
describe('待办页签：跨会话挂起项（BUG-292）', () => {
  const sessionsById = {
    'session-lead': { id: 'session-lead', cwd: '/ws', updatedAt: 2 },
    'session-cfo': { id: 'session-cfo', cwd: '/ws', updatedAt: 1 },
  }
  const useSessionsStub = (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown =>
    selector({ byId: sessionsById })

  it('别的会话里挂着的审批，经 page 面重建后出现在「等你处理」', async () => {
    const pageHistory = vi.fn(async (request: { maxMessages?: number }) => (request.maxMessages === 1
      // 探游标：返回末条 seq；正式页返回那条挂起审批。
      ? { ok: true as const, value: { records: [{ type: 'event', event: { type: 'turn/start', seq: 9, time: 1, data: {} } }], hasMore: false } }
      : {
        ok: true as const,
        value: {
          records: [{ type: 'event', event: { type: 'approval/asked', seq: 9, time: 1_000, data: { id: 'x1', toolName: 'request_signoff', reason: '折扣线双签' } } }],
          hasMore: false,
        },
      }))
    const host = await mount(createElement(AttentionTab, props({ pageHistory, useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
    expect(pageHistory, '候选应被读到').toHaveBeenCalled()
    expect(host.textContent).toContain('折扣线双签')
    expect(host.textContent).toContain('待批审批')
  })

  it('page 面缺席时不报错、退回只覆盖本会话（空态仍诚实）', async () => {
    const host = await mount(createElement(AttentionTab, props({ useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    expect(host.textContent).toContain('没有等你的事')
    expect(host.textContent).toContain('同工作区其它会话')
  })
})

// 边界必须可见：全失败 ≠ 没有；窗口截断 ≠ 完整。
// 这两条是这一族唯一能被用户看见的地方——面板必须自己说出来。
// 负例留证 2026-11-22：把空态改回无条件渲染后 `vitest run tests/client/tabs/attention-tab.spec.ts` 1 failed（全失败仍说「没有等你的事」）；还原后 10/10 绿。BUG-305
describe('AttentionTab · 历史读取的边界（BUG-305）', () => {
  const sessionsById = {
    'session-lead': { id: 'session-lead', cwd: '/ws', updatedAt: 3 },
    'session-cfo': { id: 'session-cfo', cwd: '/ws', updatedAt: 1 },
  }
  const useSessionsStub = (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown =>
    selector({ byId: sessionsById })

  it('全部会话读失败 ⇒ 出现错误行，且不说「没有等你的事」', async () => {
    const pageHistory = vi.fn(async () => ({ ok: false as const, error: { message: 'gateway unavailable' } }))
    const host = await mount(createElement(AttentionTab, props({ pageHistory, useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
    expect(host.textContent).toContain('历史读不到')
    // 错误行自己会引用「不是『没有等你的事』」，所以这里断言的是空态原句（带破折号）不出现。
    expect(host.textContent).not.toContain('没有等你的事——')
  })

  it('窗口拿满一页 ⇒ 出现「只扫描了最近 N 条」提示', async () => {
    const pageHistory = vi.fn(async (request: { maxMessages?: number }) => (request.maxMessages === 1
      ? { ok: true as const, value: { records: [{ type: 'event', event: { type: 'turn/start', seq: 9, time: 1, data: {} } }], hasMore: false } }
      : { ok: true as const, value: { records: [], hasMore: true } }))
    const host = await mount(createElement(AttentionTab, props({ pageHistory, useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
    expect(host.textContent).toContain('只扫描了最近')
    expect(host.textContent).toContain('800')
  })
})

// 越界防线（BUG-323）：当前会话 cwd 未解析时，别的 workspace 的挂起审批**不许**出现在这里。
// 负例留证 2026-11-22：fail-open 过滤下 page 面会被调用并渲染别的 workspace 的审批（越界）。BUG-323
describe('AttentionTab · cwd 未解析时不跨工作区（BUG-323）', () => {
  it('cwd 缺失 ⇒ 不扫候选、出「工作区还没就绪」提示，且看不到其它工作区的审批', async () => {
    const byId = {
      'session-lead': { id: 'session-lead' },
      'session-other-ws': { id: 'session-other-ws', cwd: '/other-ws', updatedAt: 1 },
    }
    const useSessionsStub = (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown => selector({ byId })
    const pageHistory = vi.fn(async () => ({
      ok: true as const,
      value: { records: [{ type: 'event', event: { type: 'approval/asked', seq: 1, time: 1_000, data: { id: 'x', toolName: 'request_signoff', reason: '别的 workspace 的审批' } } }], hasMore: false },
    }))
    const host = await mount(createElement(AttentionTab, props({ pageHistory, useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
    expect(pageHistory).not.toHaveBeenCalled()
    expect(host.textContent).toContain('工作区还没就绪')
    expect(host.textContent).not.toContain('别的 workspace 的审批')
  })
})

// 负例留证 2026-11-22：去掉 `eventsSeen` 后「本会话事件超窗」用例 failure —— BUG-317
// 负例留证 2026-11-22：候选不带 `capped` 后「候选被截」用例 failure —— BUG-318
// 负例留证 2026-11-22：`approvalsCapped` 恒 0 后「审批流被截」用例 failure —— BUG-320
// 三处上限都要在面板上说出来，并且有边界时不许说「没有等你的事」。
describe('AttentionTab · 注意力管线的边界', () => {
  const many = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`s${String(i)}`, { id: `s${String(i)}`, cwd: '/ws', updatedAt: i }]))

  it('候选被截 ⇒ 「还有 N 个会话没扫」（BUG-318）', async () => {
    const useSessionsStub = (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown =>
      selector({ byId: { 'session-lead': { id: 'session-lead', cwd: '/ws' }, ...many(25) } })
    const pageHistory = vi.fn(async () => ({ ok: true as const, value: { records: [], hasMore: false } }))
    const host = await mount(createElement(AttentionTab, props({ pageHistory, useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
    expect(host.textContent).toContain('个会话没扫')
  })

  it('本会话事件超窗 ⇒ 「只保留最近 N 条事件」，且压住空态（BUG-317）', async () => {
    const frames = Array.from({ length: 1001 }, (_, i) => ({ kind: 'history' as const, events: [{ type: 'turn/start', time: 1000 + i, data: { i } }] }))
    const follow = async function* () { for (const frame of frames) yield frame as never }
    const host = await mount(createElement(AttentionTab, props({ follow })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)) })
    expect(host.textContent).toContain('只保留最近')
    expect(host.textContent).not.toContain('没有等你的事——')
  })
})

describe('AttentionTab · 审批流被截的信号（BUG-320）', () => {
  // 负例留证 2026-11-23：把文案改回只写「审批」后本用例 failure（问询被截时说成审批）。BUG-330
  it('历史重建里某会话超 5 条 ⇒ 「还有 N 条待你处理的事项未显示」（BUG-330）', async () => {
    const byId = { 'session-lead': { id: 'session-lead', cwd: '/ws' }, 'session-x': { id: 'session-x', cwd: '/ws', updatedAt: 1 } }
    const useSessionsStub = (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown => selector({ byId })
    const asked = Array.from({ length: 6 }, (_, i) => ({ type: 'event', event: { type: 'approval/asked', seq: i + 1, time: 1000 + i, data: { id: `a${String(i)}`, toolName: 'bash', reason: 'r' } } }))
    const pageHistory = vi.fn(async (request: { maxMessages?: number }) => (request.maxMessages === 1
      ? { ok: true as const, value: { records: [{ type: 'event', event: { type: 'turn/start', seq: 9, time: 1, data: {} } }], hasMore: false } }
      : { ok: true as const, value: { records: asked, hasMore: false } }))
    const host = await mount(createElement(AttentionTab, props({ pageHistory, useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
    expect(host.textContent).toContain('条待你处理的事项未显示')
  })
})

// 刷新后问询也要在（BUG-319）：历史重建走 pendingAsks，问询与审批同一套。
// 负例留证 2026-11-23：重建只认审批后 `vitest run tests/client/tabs/attention-tab.spec.ts` 1 failed（刷新后问询消失）。BUG-319
describe('AttentionTab · 问询从历史重建（BUG-319）', () => {
  it('别的会话里未答的问询 ⇒ 出现在「等你处理」', async () => {
    const byId = { 'session-lead': { id: 'session-lead', cwd: '/ws' }, 'session-x': { id: 'session-x', cwd: '/ws', updatedAt: 1 } }
    const useSessionsStub = (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown => selector({ byId })
    const events = [{ type: 'event', event: { type: 'tool/call', seq: 2, time: 1000, data: { callId: 'c1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ question: '刷新后还在吗？' }] }) } } }]
    const pageHistory = vi.fn(async (request: { maxMessages?: number }) => (request.maxMessages === 1
      ? { ok: true as const, value: { records: [{ type: 'event', event: { type: 'turn/start', seq: 9, time: 1, data: {} } }], hasMore: false } }
      : { ok: true as const, value: { records: events, hasMore: false } }))
    const host = await mount(createElement(AttentionTab, props({ pageHistory, useSessions: useSessionsStub })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
    expect(host.textContent).toContain('刷新后还在吗')
  })
})

// 负例留证 2026-11-23：去掉 ownAsks.capped 后「本会话审批被截」用例 failure；把空态改回手写三条件后矩阵五档 failure。BUG-327 / BUG-328
// 负例留证 2026-11-27：把 AttentionTab 的 hasBoundary(boundaries) 分支改回返回 null ⇒ BUG-388 边界占位用例红；还原后绿。BUG-388
// 边界组合矩阵：六个边界 × {空 / 有项}，每种组合下
// 「提示行出现」且「空态被压住」。这是上一轮漏掉的形状——单个边界对、组合起来漏。
describe('AttentionTab · 本会话 capped（BUG-327）', () => {
  const readyById = { 'session-lead': { id: 'session-lead', cwd: '/ws' }, 'session-x': { id: 'session-x', cwd: '/ws', updatedAt: 1 } }
  const stub = (byId: Record<string, unknown>) => (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown => selector({ byId })
  const ask = (time: number) => ({ type: 'approval/asked', time, data: { id: `a${String(time)}`, toolName: 'bash', reason: 'r' } })

  it('本会话 6 条挂起审批被截 ⇒ 提示「还有 N 条待你处理的事项未显示」且压住空态', async () => {
    const six = Array.from({ length: 6 }, (_, i) => ask(1000 + i))
    const follow = async function* () { yield { kind: 'history' as const, events: six } as never }
    const host = await mount(createElement(AttentionTab, props({ follow, useSessions: stub(readyById) })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
    expect(host.textContent).toContain('条待你处理的事项未显示')
    expect(host.textContent).not.toContain('没有等你的事——')
  })
})

describe('AttentionTab · 边界组合矩阵（BUG-328）', () => {
  const readyById = { 'session-lead': { id: 'session-lead', cwd: '/ws' }, 'session-x': { id: 'session-x', cwd: '/ws', updatedAt: 1 } }
  const stub = (byId: Record<string, unknown>) => (selector: (state: { byId: Record<string, unknown> }) => unknown): unknown => selector({ byId })
  const page = (records: unknown[], hasMore = false) => vi.fn(async (request: { maxMessages?: number }) => (request.maxMessages === 1
    ? { ok: true as const, value: { records: [{ type: 'event', event: { type: 'turn/start', seq: 9, time: 1, data: {} } }], hasMore: false } }
    : { ok: true as const, value: { records, hasMore } }))

  const expectBoundary = async (element: ReturnType<typeof createElement>, contains: string, absent = '没有等你的事——') => {
    const host = await mount(element)
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
    expect(host.textContent).toContain(contains)
    expect(host.textContent).not.toContain(absent)
  }

  it('① 工作区未就绪 ⇒ 提示「暂不扫描其它会话」且压住空态', async () => {
    await expectBoundary(createElement(AttentionTab, props()), '工作区还没就绪')
  })

  it('② 候选被截 ⇒ 提示「还有 N 个会话没扫」且压住空态', async () => {
    const many = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`s${String(i)}`, { id: `s${String(i)}`, cwd: '/ws', updatedAt: i }]))
    await expectBoundary(createElement(AttentionTab, props({ useSessions: stub({ ...readyById, ...many }), pageHistory: page([]) })), '个会话没扫')
  })

  it('④ 历史读取失败 ⇒ 错误行且压住空态', async () => {
    await expectBoundary(createElement(AttentionTab, props({ useSessions: stub(readyById), pageHistory: vi.fn(async () => ({ ok: false as const })) })), '历史读不到')
  })

  it('⑤ 历史窗口被截（hasMore）⇒ 提示「只扫描了最近 N 条」且压住空态', async () => {
    await expectBoundary(createElement(AttentionTab, props({ useSessions: stub(readyById), pageHistory: page([], true) })), '只扫描了最近')
  })

  it('⑥ 本会话事件超窗 ⇒ 提示「只保留最近 N 条」且压住空态', async () => {
    const frames = Array.from({ length: 1001 }, (_, i) => ({ kind: 'history' as const, events: [{ type: 'turn/start', time: i, data: {} }] }))
    const follow = async function* () { for (const frame of frames) yield frame as never }
    await expectBoundary(createElement(AttentionTab, props({ follow, useSessions: stub(readyById) })), '只保留最近')
  })

  it('⑦ 有边界且 waiting=0 时「等你处理」下不留白，渲染带边界限定的占位提示（BUG-388）', async () => {
    const many = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`s${String(i)}`, { id: `s${String(i)}`, cwd: '/ws', updatedAt: i }]))
    const host = await mount(createElement(AttentionTab, props({ useSessions: stub({ ...readyById, ...many }), pageHistory: page([]) })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
    const boundedEmpty = host.querySelector('[data-attention-empty-bounded]')
    expect(boundedEmpty).not.toBeNull()
    expect(boundedEmpty?.textContent).toContain('边界')
    expect(host.textContent).not.toContain('没有等你的事——')
  })
})

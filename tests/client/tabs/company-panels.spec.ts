// @vitest-environment happy-dom
// 负例留证 2026-11-27：BudgetPanel 未用 Number.isFinite 消毒 totalTokens 且 useCountUp cleanup 用终值覆写 fromRef ⇒ NaN 渲染为 'NaN tokens' 且连续更新插值回跳（BUG-401）；加限与 currentRef 后绿。BUG-401
/**
 * 在场 / 用量两个面板的静态渲染判据（R3-10，2026-10-27）。
 *
 * 为什么补：这两个面板此前**没有任何渲染测试**——公司视图与右栏页签体都在用它们，
 * 一个渲染即空白的回归可以全绿。本档只断言"用户能看到的事实"（行、状态、任务、金额口径、
 * 空态文案），不主张 CSS/布局（那层归视觉探针与 client-load）。
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { BudgetPanel, PresencePanel, StreamErrorNotice } from '../../../packages/company-pack/src/client/tabs/company-panels.tsx'
import type { BudgetSummary } from '../../../packages/company-pack/src/lib/accounting/budget.ts'
import type { ActivityEntry, PresenceRow } from '../../../packages/company-pack/src/lib/presence/presence.ts'

describe('在场面板', () => {
  it('空团队给空态，不渲染一张假名单', () => {
    const html = renderToStaticMarkup(createElement(PresencePanel, { rows: [], activity: [] }))
    expect(html).toContain('当前没有团队动议')
    expect(html).toContain('暂无动态')
    expect(html).not.toContain('wk-row-name')
  })

  it('成员行：显示名、Lead 标记、状态标签与当前任务（无任务给破折号）', () => {
    const rows: PresenceRow[] = [
      { id: 't1', name: 'lead', displayName: 'CEO', role: 'lead', status: 'running', statusLabel: '执行中', currentTasks: ['拆解动议'] },
      { id: 'm1', name: 'vp-eng', displayName: 'VP-Eng', role: 'teammate', status: 'idle', statusLabel: '待命', currentTasks: null },
    ]
    const html = renderToStaticMarkup(createElement(PresencePanel, { rows, activity: [] }))
    expect(html).toContain('CEO')
    expect(html).toContain('VP-Eng')
    expect(html).toContain('Lead')
    expect(html).toContain('执行中')
    expect(html).toContain('待命')
    expect(html).toContain('拆解动议')
    expect(html).toContain('—')          // 无任务不是空白
  })

  it('协作动态按条目渲染（内容是差分文本，不在这里编造）', () => {
    const activity: ActivityEntry[] = [
      { time: 1, kind: 'member', text: 'VP-Eng 加入团队' },
      { time: 2, kind: 'task', text: '任务「定价」改派 CFO' },
    ]
    const html = renderToStaticMarkup(createElement(PresencePanel, { rows: [], activity }))
    expect(html).toContain('VP-Eng 加入团队')
    expect(html).toContain('任务「定价」改派 CFO')
    expect(html).not.toContain('暂无动态')
  })
})

describe('用量面板', () => {
  it('总量、轮次/步数、工具占比与逐行份额都出现在可见文本里', () => {
    const summary: BudgetSummary = {
      totalTokens: 12_300,
      turns: 4,
      steps: 18,
      toolShare: 0.25,
      rows: [
        { id: 'output', label: '输出', tokens: 8_000, share: 0.65 },
        { id: 'cacheRead', label: '缓存读', tokens: 4_300, share: 0.35 },
      ],
    }
    const html = renderToStaticMarkup(createElement(BudgetPanel, { summary }))
    expect(html).toContain('12.3k')
    expect(html).toContain('轮次 4')
    expect(html).toContain('步数 18')
    expect(html).toContain('工具耗时占比 25%')
    expect(html).toContain('输出')
    expect(html).toContain('缓存读')
    expect(html).toContain('65%')
    expect(html).toContain('width:65%')
    expect(html).toContain('只显示令牌')   // 不编造金额的口径声明
  })

  it('缺轮次/步数/占比时给破折号或省略，不显示 0 冒充数据', () => {
    const summary: BudgetSummary = { totalTokens: 0, turns: null, steps: null, toolShare: null, rows: [] }
    const html = renderToStaticMarkup(createElement(BudgetPanel, { summary }))
    expect(html).toContain('轮次 —')
    expect(html).toContain('步数 —')
    expect(html).not.toContain('工具耗时占比')
    expect(html).toContain('只显示令牌')
  })
})

describe('流错误提示', () => {
  it('显示「实时流断开 / 投影快照可能过期」和具体错误', () => {
    const html = renderToStaticMarkup(createElement(StreamErrorNotice, { message: 'follow failed' }))
    expect(html).toContain('实时流断开')
    expect(html).toContain('follow failed')
  })

  it('useCountUp 支持 prefers-reduced-motion 与动态步进插值', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const baseSummary: BudgetSummary = { totalTokens: 100, turns: 1, steps: 2, toolShare: 0.1, rows: [] }
    const origMatchMedia = window.matchMedia
    try {
      let reduced = false
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: reduced && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia

      const rafQueue: FrameRequestCallback[] = []
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        rafQueue.push(cb)
        return rafQueue.length
      })
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

      act(() => { root.render(createElement(BudgetPanel, { summary: baseSummary })) })
      act(() => { root.render(createElement(BudgetPanel, { summary: { ...baseSummary, totalTokens: 2000 } })) })
      expect(rafQueue.length).toBeGreaterThan(0)
      act(() => { rafQueue.shift()?.(performance.now() + 1000) })
      expect(host.textContent).toContain('2k')

      reduced = true
      act(() => { root.render(createElement(BudgetPanel, { summary: { ...baseSummary, totalTokens: 5000 } })) })
      expect(host.textContent).toContain('5k')

      // BUG-401: non-finite totalTokens/row fields render 0 instead of NaN
      const nanSummary: BudgetSummary = {
        totalTokens: Number.NaN,
        turns: 1,
        steps: 2,
        toolShare: Number.NaN,
        rows: [{ id: 'output', label: '输出', tokens: Number.NaN, share: Number.NaN }],
      }
      act(() => { root.render(createElement(BudgetPanel, { summary: nanSummary })) })
      expect(host.textContent).not.toContain('NaN')
      expect(host.textContent).toContain('0 tokens')

      rafSpy.mockRestore()
      cancelSpy.mockRestore()
    } finally {
      window.matchMedia = origMatchMedia
      act(() => { root.unmount() })
      host.remove()
    }
  })

  it('BUG-401：useCountUp 在未完成的动画中途更新 target 时从当前插值起跳而非终值回跳', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const baseSummary: BudgetSummary = { totalTokens: 0, turns: 1, steps: 1, toolShare: null, rows: [] }
    const origMatchMedia = window.matchMedia
    let nowMs = 1000
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs)
    try {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia
      const callbacks: FrameRequestCallback[] = []
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        callbacks.push(cb)
        return callbacks.length
      })
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

      act(() => { root.render(createElement(BudgetPanel, { summary: { ...baseSummary, totalTokens: 0 } })) })
      act(() => { root.render(createElement(BudgetPanel, { summary: { ...baseSummary, totalTokens: 1000 } })) })
      // Advance halfway (160ms out of COUNT_UP_MS=320ms) -> 500 tokens
      nowMs = 1160
      act(() => { callbacks.shift()?.(1160) })
      expect(host.textContent).toContain('500')

      // Re-target to 600 mid-animation -> should start from 500, NOT jump back from 1000
      act(() => { root.render(createElement(BudgetPanel, { summary: { ...baseSummary, totalTokens: 600 } })) })
      nowMs = 1320
      act(() => { callbacks.shift()?.(1320) })
      expect(host.textContent).not.toContain('900')

      rafSpy.mockRestore()
      cancelSpy.mockRestore()
    } finally {
      nowSpy.mockRestore()
      window.matchMedia = origMatchMedia
      act(() => { root.unmount() })
      host.remove()
    }
  })
})

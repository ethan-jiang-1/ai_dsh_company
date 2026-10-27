/**
 * 在场 / 用量两个面板的静态渲染判据（R3-10，2026-10-27）。
 *
 * 为什么补：这两个面板此前**没有任何渲染测试**——公司视图与右栏页签体都在用它们，
 * 一个渲染即空白的回归可以全绿。本档只断言"用户能看到的事实"（行、状态、任务、金额口径、
 * 空态文案），不主张 CSS/布局（那层归视觉探针与 client-load）。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BudgetPanel, PresencePanel } from '../../packages/company-pack/src/client/company-panels.tsx'
import type { BudgetSummary } from '../../packages/company-pack/src/lib/budget.ts'
import type { ActivityEntry, PresenceRow } from '../../packages/company-pack/src/lib/presence.ts'

describe('在场面板', () => {
  it('空团队给空态，不渲染一张假名单', () => {
    const html = renderToStaticMarkup(createElement(PresencePanel, { rows: [], activity: [] }))
    expect(html).toContain('当前没有团队动议')
    expect(html).toContain('暂无动态')
    expect(html).not.toContain('wk-row-name')
  })

  it('成员行：显示名、Lead 标记、状态标签与当前任务（无任务给破折号）', () => {
    const rows: PresenceRow[] = [
      { id: 't1', name: 'lead', displayName: '梦之队 CEO', role: 'lead', status: 'running', statusLabel: '执行中', currentTask: '拆解动议' },
      { id: 'm1', name: 'vp-eng', displayName: '梦之队 VP-Eng', role: 'teammate', status: 'idle', statusLabel: '待命', currentTask: null },
    ]
    const html = renderToStaticMarkup(createElement(PresencePanel, { rows, activity: [] }))
    expect(html).toContain('梦之队 CEO')
    expect(html).toContain('梦之队 VP-Eng')
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
        { label: 'CEO', tokens: 8_000, share: 0.65 },
        { label: 'VP-Eng', tokens: 4_300, share: 0.35 },
      ],
    }
    const html = renderToStaticMarkup(createElement(BudgetPanel, { summary }))
    expect(html).toContain('12.3k')
    expect(html).toContain('轮次 4')
    expect(html).toContain('步数 18')
    expect(html).toContain('工具耗时占比 25%')
    expect(html).toContain('CEO')
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

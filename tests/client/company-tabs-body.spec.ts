/**
 * 五个公司页签体的 keyless 静态渲染判据（R5-06/D5，2026-11-03 A- 批次）。
 *
 * 为什么补：`company-tabs.tsx` 此前只测了 PanelFrame 与部分面板组件，`BoardTab`/`DagTab`/
 * `PresenceTab`/`BudgetTab`/`TasksTab` 五个页签体本身（146-281 行）未被渲染；一个整页空白/标题丢失
 * 的页签可以全绿。本档用 react-dom/server 喂空投影，断言五个页签都渲染出标题与空态。
 * **不主张**真浏览器浮窗/滚动（归 ui-scene-smoke / cdp-probe）。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab,
} from '../../packages/company-pack/src/client/company-tabs.tsx'

function props(over: Record<string, unknown> = {}) {
  return {
    sessionId: 'session-test',
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/board' } }),
    floatTab: () => {},
    unfloatTab: () => {},
    leadOf: (id: string) => id,
    useSessions: (selector: (state: { projectionsBySession: Record<string, unknown> }) => unknown) => selector({ projectionsBySession: {} }),
    useProjection: () => undefined,
    follow: async function* () { /* 空流 */ },
    openMember: async () => {},
    ...over,
  } as never
}

const render = (component: Parameters<typeof createElement>[0], over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(component, props(over)))

describe('公司页签体静态渲染（R5-06/D5）', () => {
  it('看板 / 依赖图 / 用量 / 任务板各自渲染标题与空态', () => {
    expect(render(BoardTab as never)).toContain('看板')
    expect(render(BoardTab as never)).toContain('这一列暂时是空的')
    expect(render(DagTab as never)).toContain('依赖图')
    expect(render(DagTab as never)).toContain('这场动议还没有任务依赖图')
    expect(render(BudgetTab as never)).toContain('用量')
    expect(render(BudgetTab as never)).toContain('tokens')
    expect(render(TasksTab as never)).toContain('任务板')
    expect(render(TasksTab as never)).toContain('读取团队状态…')
  })

  it('在场页签：没有团队动议时给空态，不是空白面板', () => {
    const html = render(PresenceTab as never)
    expect(html).toContain('在场')
    expect(html).toContain('当前没有团队动议')
    expect(html).toContain('协作动态')
  })
})

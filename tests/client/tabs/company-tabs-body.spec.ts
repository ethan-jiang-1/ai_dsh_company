// @vitest-environment happy-dom
/**
 * 五个公司页签体的 keyless 静态渲染判据（R5-06/D5，2026-11-03 A- 批次）。
 *
 * 为什么补：`company-tabs.tsx` 此前只测了 PanelFrame 与部分面板组件，`BoardTab`/`DagTab`/
 * `PresenceTab`/`BudgetTab`/`TasksTab` 五个页签体本身（146-281 行）未被渲染；一个整页空白/标题丢失
 * 的页签可以全绿。本档用 react-dom/server 喂空投影，断言五个页签都渲染出标题与空态。
 * **不主张**真浏览器浮窗/滚动（归 ui-scene-smoke / cdp-probe）。
 */
// 负例留证 2026-11-27：去掉 PresenceTab 表头与 Lead 行末的 .wk-row-aside-cell 占位列 ⇒ BUG-386 列对齐用例红；还原后绿。BUG-386
// 负例留证 2026-11-27：TasksTab 改回直接调 roleText(name) 不映射 'lead' ⇒ 成员列露出裸 'lead('（BUG-390）；还原后绿。BUG-390
// 负例留证 2026-11-27：zh['tasks.col.owner'] 保留小写 'owner' ⇒ 中文任务板第 4 列表头混出英文（BUG-397）；改为「负责人」后绿。BUG-397
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab,
} from '../../../packages/company-pack/src/client/tabs/company-tabs.tsx'
import { zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'

const t = ((key: keyof typeof zh) => zh[key]) as CompanyT

function props(over: Record<string, unknown> = {}) {
  return {
    t,
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

  it('在场页签：没有团队动议时给空态，不是空白面板；有成员时覆盖状态与点击', async () => {
    const html = render(PresenceTab as never)
    expect(html).toContain('在场')
    expect(html).toContain('当前没有团队动议')
    expect(html).toContain('协作动态')

    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    let clickedMember: unknown = null
    let asideTarget: unknown = null
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      const populatedState = {
        byId: {
          'session-test': { id: 'session-test', origin: 'human', running: true },
        },
        projectionsBySession: {
          'session-test': {
            values: {
              agentTeam: {
                members: [
                  { id: 'm-lead', name: 'lead', role: 'lead', phase: 'idle' },
                  { id: 'm-eng', name: 'vp_eng', role: 'teammate', phase: 'running' },
                  { id: 'm-cfo', name: 'cfo', role: 'teammate', phase: 'failed' },
                  { id: 'm-coo', name: 'coo', role: 'teammate', phase: 'stopped' },
                  { id: 'm-cmo', name: 'cmo', role: 'teammate', phase: 'spawning' },
                ],
                tasks: [
                  { id: 't1', subject: 'Build API', status: 'in_progress', ownerId: 'm-eng', revision: 1 },
                ],
              },
            },
          },
        },
      }
      await act(async () => {
        root.render(createElement(PresenceTab as never, props({
          useSessions: (selector: (state: unknown) => unknown) => selector(populatedState),
          openMember: async (_sid: string, m: unknown) => { clickedMember = m },
          openMemberAside: (sid: string, memberId: string) => { asideTarget = [sid, memberId] },
          follow: async function* () {
            yield {
              event: {
                type: 'team/message/queued',
                time: 1000,
                seq: 1,
                data: { message: { senderName: 'vp_eng', content: [{ type: 'text', text: 'Shipped PR' }] } },
              },
            }
            throw new Error('follow disconnected')
          },
        })))
        await new Promise(resolve => { setTimeout(resolve, 10) })
      })
      const btn = host.querySelector('.wk-row-button') as HTMLButtonElement | null
      await act(async () => { btn?.click() })
      expect(clickedMember).not.toBeNull()
      expect(host.querySelector('[data-presence-aside="m-lead"]')).toBeNull()
      expect(host.querySelector('.wk-row-head .wk-row-aside-cell')).not.toBeNull()
      const rowWraps = [...host.querySelectorAll('.wk-row-wrap')]
      expect(rowWraps.length).toBeGreaterThan(1)
      for (const wrap of rowWraps) {
        expect(wrap.querySelector('.wk-row-aside-cell')).not.toBeNull()
      }
      const asideBtn = host.querySelector('[data-presence-aside="m-eng"]') as HTMLButtonElement | null
      await act(async () => { asideBtn?.click() })
      expect(asideTarget).toEqual(['session-test', 'm-eng'])

      const htmlNoAside = renderToStaticMarkup(createElement(PresenceTab as never, props({
        useSessions: (selector: (state: unknown) => unknown) => selector(populatedState),
        openMember: async () => {},
      })))
      expect(htmlNoAside).not.toContain('wk-row-aside-cell')

      const failingFollow = (msg: string) => () => ({
        [Symbol.asyncIterator]: () => ({
          next: async () => { throw new Error(msg) },
        }),
      })
      await act(async () => {
        root.render(createElement(BoardTab as never, props({
          useSessions: (selector: (state: unknown) => unknown) => selector(populatedState),
          follow: failingFollow('board stream down'),
        })))
        await new Promise(resolve => { setTimeout(resolve, 10) })
      })
      await act(async () => {
        root.render(createElement(TasksTab as never, props({
          useSessions: (selector: (state: unknown) => unknown) => selector(populatedState),
          follow: failingFollow('tasks stream down'),
        })))
        await new Promise(resolve => { setTimeout(resolve, 10) })
      })
      await act(async () => {
        root.render(createElement(DagTab as never, props({
          useSessions: (selector: (state: unknown) => unknown) => selector(populatedState),
          follow: failingFollow('dag stream down'),
        })))
        await new Promise(resolve => { setTimeout(resolve, 10) })
      })
      const redrawBtn = host.querySelector('button[title]') as HTMLButtonElement | null
      await act(async () => { redrawBtn?.click() })
    } finally {
      act(() => { root.unmount() })
      host.remove()
    }
  })

  it('TasksTab 将 lead 成员映射为本地化 CEO 角色名而不漏裸 lead（BUG-390）', () => {
    const state = {
      projectionsBySession: {
        'session-test': {
          values: {
            agentTeam: {
              members: [
                { id: 'm-lead', name: 'lead', role: 'lead', phase: 'idle' },
              ],
              tasks: [
                { id: 't-lead', subject: 'Kickoff gate', status: 'in_progress', ownerId: 'm-lead', revision: 1 },
              ],
            },
          },
        },
      },
    }
    const useSessions = (selector: (s: typeof state) => unknown) => selector(state)
    const tInterp = ((key: keyof typeof zh, params?: Record<string, string | number>) => {
      const tpl = zh[key]
      return params === undefined ? tpl : tpl.replace(/\{(\w+)\}/g, (_m, n: string) => String(params[n] ?? ''))
    }) as CompanyT
    const html = renderToStaticMarkup(createElement(TasksTab, props({ useSessions, t: tInterp })))
    expect(html).toContain(zh['roles.ceo.label'])
    expect(html).not.toContain('lead(')
    expect(html).toContain('<th>负责人</th>')
    expect(html).not.toContain('<th>owner</th>')
  })
})

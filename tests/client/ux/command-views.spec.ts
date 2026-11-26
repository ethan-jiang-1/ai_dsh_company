// @vitest-environment happy-dom
/** Wave S1：`/req` / `/prd` / `/delivery` commandview 解析与卡片渲染。 */
import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { en, zh, type CompanyKey } from '../../../packages/company-pack/src/client/locales.ts'
import {
  CompanyCommandView,
  parseCheckCommandOutput,
} from '../../../packages/company-pack/src/client/ux/command-views.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const makeT = (dict: Record<string, string>) =>
  ((key: CompanyKey) => dict[key] ?? String(key)) as unknown as ComponentProps<typeof CompanyCommandView>['t']

const mounted: Array<{ root: Root; container: HTMLDivElement }> = []

function mountDom(node: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(node) })
  mounted.push({ root, container })
  return {
    container,
    rerender(next: ReactNode) {
      act(() => { root.render(next) })
    },
  }
}

afterEach(() => {
  while (mounted.length > 0) {
    const item = mounted.pop()!
    act(() => { item.root.unmount() })
    item.container.remove()
  }
})

describe('parseCheckCommandOutput · 结构化校验回执解析', () => {
  it('区分 pending / success / error 并提取首行摘要与明细条目', () => {
    expect(parseCheckCommandOutput(null)).toEqual({ status: 'pending', headline: '', bullets: [], rawText: '' })
    expect(parseCheckCommandOutput({
      kind: 'error',
      text: 'PRD 校验失败（demo）：\n- 缺 MRD 来源映射\n- 缺验收指标 AC-1',
    })).toEqual({
      status: 'error',
      headline: 'PRD 校验失败（demo）：',
      bullets: ['缺 MRD 来源映射', '缺验收指标 AC-1'],
      rawText: 'PRD 校验失败（demo）：\n- 缺 MRD 来源映射\n- 缺验收指标 AC-1',
    })
  })
})

describe('CompanyCommandView · /req /prd /delivery 结构化卡片', () => {
  it('展示标题、状态标签、问题清单与原文折叠，并支持双语及交付物跳转', () => {
    const openDeliverables = vi.fn()
    const { container, rerender } = mountDom(createElement(CompanyCommandView, {
      node: {
        kind: 'command',
        seq: 1,
        time: 1,
        commandId: 'c1',
        name: 'prd',
        args: 'check demo',
        outcome: { kind: 'error', text: 'PRD 校验失败（demo）：\n- 缺 MRD 来源映射' },
      },
      t: makeT(zh),
      openDeliverables,
    } as unknown as ComponentProps<typeof CompanyCommandView>))

    expect(container.textContent).toContain(zh['cmdCard.prdTitle'])
    expect(container.textContent).toContain(zh['cmdCard.status.error'])
    expect(container.textContent).toContain('缺 MRD 来源映射')

    const buttons = [...container.querySelectorAll('button')]
    const toggleBtn = buttons.find(b => b.textContent === zh['cmdCard.toggleRaw'])!
    act(() => { toggleBtn.click() })
    expect(container.querySelector('.wk-cmd-card-raw')?.textContent).toContain('PRD 校验失败（demo）：')

    const delivBtn = [...container.querySelectorAll('button')].find(b => b.textContent === zh['cmdCard.openDeliverables'])!
    act(() => { delivBtn.click() })
    expect(openDeliverables).toHaveBeenCalledOnce()

    rerender(createElement(CompanyCommandView, {
      node: {
        kind: 'command',
        seq: 2,
        time: 2,
        commandId: 'c2',
        name: 'delivery',
        args: 'check demo',
        outcome: { kind: 'success', text: 'Delivery readiness passed (demo)' },
      },
      t: makeT(en),
    } as unknown as ComponentProps<typeof CompanyCommandView>))
    expect(container.textContent).toContain(en['cmdCard.deliveryTitle'])
    expect(container.textContent).toContain(en['cmdCard.status.ok'])
    expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/u)

    rerender(createElement(CompanyCommandView, {
      node: { kind: 'command', seq: 3, time: 3, commandId: 'c3', name: null, args: '', outcome: null },
      t: makeT(zh),
    } as unknown as ComponentProps<typeof CompanyCommandView>))
    expect(container.textContent).toContain(zh['cmdCard.reqTitle'])
    expect(container.textContent).toContain(zh['cmdCard.status.pending'])
  })
})

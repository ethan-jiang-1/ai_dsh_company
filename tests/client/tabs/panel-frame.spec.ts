// @vitest-environment happy-dom
/**
 * PanelFrame 的浮窗接线判据（R5-06 剩余面，2026-11-03）。
 *
 * 为什么补：`company-tabs.tsx` 的浮窗/几何记忆路径（captureFloatRect / localStorage / float-unfloat）
 * 此前只有 `float-geometry.ts` 纯函数测试，接线本身 24.1%。一个「浮出」按钮没接上、收回不存几何的
 * 面板，1048 例全绿。本档用 happy-dom 真挂 `PanelFrame`：dock 态浮出、浮窗态收回、几何按 contentId 存档。
 * **不主张**真浏览器的拖拽/缩放（那层归 ui-scene-smoke / cdp-probe）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PanelFrame } from '../../../packages/company-pack/src/client/tabs/company-tabs.tsx'
import { storageKey } from '../../../packages/company-pack/src/client/ui/float-geometry.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
let host: HTMLDivElement | null = null
let wrapper: HTMLDivElement | null = null

beforeEach(() => { window.localStorage.clear() })

afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  host?.remove()
  wrapper?.remove()
  host = null
  wrapper = null
  document.body.innerHTML = ''
  window.localStorage.clear()
})

function props(over: Record<string, unknown> = {}) {
  return {
    title: '依赖图',
    tone: 'blue',
    refreshLabel: '每 5 秒自动刷新',
    tabProps: {
      useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/dag' } }),
      floatTab: vi.fn(),
      unfloatTab: vi.fn(),
    },
    children: createElement('div', null, 'panel body'),
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>, floating = false): Promise<HTMLElement> {
  wrapper = document.createElement('div')
  if (floating) wrapper.setAttribute('data-dockkit-float', 'pane-9')
  document.body.append(wrapper)
  host = document.createElement('div')
  wrapper.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  return host
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find(node => node.textContent?.includes(text))
  if (found === undefined) throw new Error(`找不到按钮：${text}`)
  return found as HTMLButtonElement
}

describe('PanelFrame 浮窗接线（R5-06）', () => {
  it('dock 态点「浮出」：调用 floatTab，并把存档几何一起交给平台', async () => {
    const tabProps = {
      useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/dag' } }),
      floatTab: vi.fn(),
      unfloatTab: vi.fn(),
    }
    window.localStorage.setItem(storageKey('dsh-company-pack/dag'), JSON.stringify({ x: 5, y: 6, width: 300, height: 200 }))
    const root = await mount(createElement(PanelFrame, props({ tabProps })))
    await act(async () => { buttonByText(root, '浮出').click() })
    expect(tabProps.floatTab).toHaveBeenCalledWith('tab-1', { x: 5, y: 6, width: 300, height: 200 })
  })

  it('浮窗态点「收回」：调用 unfloatTab，并按 contentId 存下几何', async () => {
    const tabProps = {
      useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/dag' } }),
      floatTab: vi.fn(),
      unfloatTab: vi.fn(),
    }
    const root = await mount(createElement(PanelFrame, props({ tabProps })), true)
    const pane = wrapper as HTMLDivElement
    pane.getBoundingClientRect = () => ({
      x: 10, y: 20, width: 300, height: 200, top: 20, left: 10, right: 310, bottom: 220,
      toJSON: () => ({}),
    }) as DOMRect
    await act(async () => { buttonByText(root, '收回').click() })
    expect(tabProps.unfloatTab).toHaveBeenCalledWith('pane-9')
    const saved = JSON.parse(window.localStorage.getItem(storageKey('dsh-company-pack/dag')) ?? 'null')
    expect(saved).toMatchObject({ x: 10, y: 20, width: 300, height: 200 })
  })

  it('浮窗态显示「收回」而不是「浮出」（状态感知），标题与刷新文案仍说真话', async () => {
    const root = await mount(createElement(PanelFrame, props()), true)
    expect(root.querySelector('[data-company-tab-title="依赖图"]')).not.toBeNull()
    expect(root.textContent).toContain('每 5 秒自动刷新')
    expect(() => buttonByText(root, '收回')).not.toThrow()
    expect([...root.querySelectorAll('button')].some(node => node.textContent?.includes('浮出'))).toBe(false)
  })
})

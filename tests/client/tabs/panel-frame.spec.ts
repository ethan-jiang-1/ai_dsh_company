// @vitest-environment happy-dom
/**
 * PanelFrame 浮出接线判据（真实 `SidebarRightTabInfo` 契约，不伪造 `.floating` 字段）。
 * 浮窗收回/拖拽/几何由 DSH `<DockLayout>` 原生标题栏持有；`PanelFrame` 负责「浮出」动作与保存几何钳制。
 */
// 负例留证 2026-11-27：PanelFrame 对缺省 floatTab 仍渲染「浮出」按钮 ⇒ BUG-391 用例红；条件隐藏后绿。BUG-391
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PanelFrame, type PanelFrameProps } from '../../../packages/company-pack/src/client/tabs/company-tabs.tsx'
import { storageKey } from '../../../packages/company-pack/src/client/ui/float-geometry.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => { window.localStorage.clear() })

afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  window.localStorage.clear()
})

function realTabInfo(tabId = 'tab-1', contentId = 'dsh-company-pack/ops', paneId = 'pane-dock') {
  return ({
    sidebar: { expanded: true, fullscreen: false },
    panel: { id: paneId },
    tab: { id: tabId, contentId },
  }) as unknown as ReturnType<PanelFrameProps['useTabInfo']>
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  return host
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find(node => node.textContent?.includes(text))
  if (found === undefined) throw new Error(`找不到按钮：${text}`)
  return found as HTMLButtonElement
}

describe('PanelFrame 浮出接线（真实 SidebarRightTabInfo 契约）', () => {
  it('有存档几何时，点「浮出」会把钳制后的 rect 交给平台 floatTab', async () => {
    const tabProps = {
      useTabInfo: () => realTabInfo('tab-1', 'dsh-company-pack/ops'),
      floatTab: vi.fn(),
    }
    window.localStorage.setItem(storageKey('dsh-company-pack/ops'), JSON.stringify({ x: 5, y: 6, width: 300, height: 200 }))
    const root = await mount(createElement(PanelFrame, {
      title: '作战板',
      tone: 'overview',
      refreshLabel: '投影更新',
      tabProps,
      children: createElement('div', null, 'panel body'),
    }))
    await act(async () => { buttonByText(root, '浮出').click() })
    expect(tabProps.floatTab).toHaveBeenCalledWith('tab-1', { x: 5, y: 6, width: 300, height: 200 })
    expect(root.querySelector('[data-company-tab-title="作战板"]')).not.toBeNull()
  })

  it('无存档几何且 contentId 为空时回落 tab.id 键并传 undefined 给 floatTab', async () => {
    const tabProps = {
      useTabInfo: () => realTabInfo('tab-fallback', ''),
      floatTab: vi.fn(),
    }
    const root = await mount(createElement(PanelFrame, {
      title: '团队',
      tone: 'people',
      tabProps,
      children: createElement('div', null, 'panel body'),
    }))
    expect(root.textContent).toContain('投影更新')
    await act(async () => { buttonByText(root, '浮出').click() })
    expect(tabProps.floatTab).toHaveBeenCalledWith('tab-fallback', undefined)
  })

  it('未传 floatTab（如 HQ 内嵌容器）时不渲染死「浮出」按钮（BUG-391）', async () => {
    const root = await mount(createElement(PanelFrame, {
      title: '台账',
      tone: 'ledger',
      tabProps: { useTabInfo: () => realTabInfo('hq-tab', 'dsh-company-pack/hq') },
      children: createElement('div', null, 'embedded body'),
    }))
    const floatBtn = [...root.querySelectorAll('button')].find(node => node.textContent?.includes('浮出'))
    expect(floatBtn).toBeUndefined()
  })
})

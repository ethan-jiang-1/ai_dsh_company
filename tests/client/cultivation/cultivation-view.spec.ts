// 负例留证 2026-11-27：stacked 模式下沿用 vertical 方向与 clientX / ArrowLeft-Right ⇒ ArrowUp/ArrowDown 与 clientY 拖拽均无效（BUG-396）；还原后绿。BUG-396
// @vitest-environment happy-dom
/**
 * 培养主视图（Wave S3 去 DOM/CSS hack 化）：
 * 1) 渲染左培养板 + 右原生总部工坊入口；
 * 2) 不再写入 `document.documentElement.dataset.dshCultivationView`；
 * 3) 分界拖曳与宽度持久化继续成立。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCultivationView } from '../../../packages/company-pack/src/client/cultivation/CultivationView.tsx'
import { zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import type { CultivationFiles } from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => { localStorage.clear() })

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

const files: CultivationFiles = {
  listJournal: async () => [],
  readHead: async () => null,
  readJournalMore: async () => null,
  listRecords: async () => ({ ok: true, names: [] }),
  readRecordHead: async () => null,
  readRecord: async () => ({ ok: false, reason: 'unavailable' }),
}

function props() {
  const state = {
    byId: { 'session-lead': { origin: 'human', cwd: '/tmp/company' } },
    projectionsBySession: { 'session-lead': { values: { agentPreset: 'ceo' } } },
  }
  return {
    sessionId: 'session-lead',
    t: ((key: keyof typeof zh) => zh[key]) as CompanyT,
    useProjection: () => undefined,
    useSessions: (selector: (value: typeof state) => unknown) => selector(state),
  } as never
}

async function mount(over: Record<string, unknown> = {}) {
  const openCompanyOverview = vi.fn()
  const openHqCultivation = vi.fn()
  const View = createCultivationView({
    sessions: { create: async () => 'session-cultivation', retain: () => ({ ready: new Promise(() => {}), release: () => {} }) } as never,
    cultivationFiles: files,
    cultivationActions: () => ({ run: async () => ({ ok: true, text: 'ok' }) }),
    roleSource: { subscribe: () => () => {}, getSnapshot: () => ({ projectionsBySession: {} }) },
    openCompanyOverview,
    openHqCultivation,
    ...over,
  } as never)
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(createElement(View, props())) })
  return { host, openCompanyOverview, openHqCultivation }
}

describe('CultivationView（Wave S3 去 Hack 化）', () => {
  it('左培养板 + 右总部工坊入口；绝不修改 documentElement.dataset.dshCultivationView', async () => {
    const { host, openCompanyOverview, openHqCultivation } = await mount()
    expect(host.textContent).toContain('让角色今后的工作更好')
    expect(host.querySelector('.wk-cult-view-split')).not.toBeNull()
    expect(host.querySelector('[data-company-cultivation-workshop]')).not.toBeNull()
    expect(document.documentElement.dataset.dshCultivationView).toBeUndefined()

    const overview = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('公司总览'))
    await act(async () => { overview?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(openCompanyOverview).toHaveBeenCalledOnce()

    const workshopBtn = [...host.querySelectorAll('button')].find(node => node.textContent?.includes(zh['hq.cultivationOpenWorkshop']))
    await act(async () => { workshopBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(openHqCultivation).toHaveBeenCalledOnce()
  })

  it('分界可拖/键盘调宽，宽度持久化', async () => {
    const { host } = await mount()
    const split = host.querySelector('.wk-cult-view-split') as HTMLElement
    const handle = host.querySelector('[role="separator"]') as HTMLElement
    expect(handle.getAttribute('aria-orientation')).toBe('vertical')
    expect(split.style.getPropertyValue('--wk-cult-chat-width')).toBe('390px')
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(split.style.getPropertyValue('--wk-cult-chat-width')).toBe('406px')
    expect(localStorage.getItem('dsh-company-cultivation-chat-width')).toBe('406')
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    })
    expect(split.style.getPropertyValue('--wk-cult-chat-width')).toBe('390px')
  })

  it('BUG-396：垂直堆叠模式分隔条为 horizontal，响应 ArrowUp/ArrowDown/clientY 与 blur 清理', async () => {
    const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 500 })
    try {
      const { host } = await mount()
      const split = host.querySelector('.wk-cult-view-split') as HTMLElement
      const handle = host.querySelector('[role="separator"]') as HTMLElement
      expect(split.getAttribute('data-stacked')).toBe('true')
      expect(handle.getAttribute('aria-orientation')).toBe('horizontal')
      expect(split.style.getPropertyValue('--wk-cult-chat-height')).toBe('260px')

      await act(async () => {
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      })
      expect(split.style.getPropertyValue('--wk-cult-chat-height')).toBe('276px')

      await act(async () => {
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      })
      expect(split.style.getPropertyValue('--wk-cult-chat-height')).toBe('260px')

      await act(async () => {
        handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientY: 300, bubbles: true }))
        document.dispatchEvent(new PointerEvent('pointermove', { clientY: 260, bubbles: true }))
        window.dispatchEvent(new Event('blur'))
      })
      expect(split.style.getPropertyValue('--wk-cult-chat-height')).toBe('300px')
      expect(split.classList.contains('dragging')).toBe(false)
    } finally {
      if (originalClientWidth !== undefined) {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth)
      } else {
        delete (HTMLElement.prototype as { clientWidth?: unknown }).clientWidth
      }
    }
  })
})

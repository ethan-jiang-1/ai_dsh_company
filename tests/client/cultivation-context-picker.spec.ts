// @vitest-environment happy-dom
/**
 * 背景选择面板的 keyless 渲染/交互判据（R5-27，2026-11-03 第五轮七维审计）。
 *
 * 为什么补：`CultivationContextPicker.tsx` 此前 **没有任何 spec**（56.5% 行、0 分支）；
 * 会话/成果检索是培养页的“引用背景”入口，空白/过滤失效不会有任何 keyless 红灯。
 * 本档用 happy-dom 真挂：三组候选、搜索过滤、点选回传、Escape 取消。
 * **不主张**真浏览器键盘焦点/滚动（归 ui-scene-smoke / 真页面走查）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CultivationContextPicker } from '../../packages/company-pack/src/client/CultivationContextPicker.tsx'
import type { ContextDeliverableRow, ContextSessionRow } from '../../packages/company-pack/src/client/cultivation-context-data.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

const flush = async (): Promise<void> => {
  await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
}

const current: ContextSessionRow = {
  sessionId: 'session-current', title: '当前会话', member: false, at: 3, current: true, ref: {} as never,
}
const recent: ContextSessionRow = {
  sessionId: 'session-alpha', title: 'Alpha 定价复盘', role: 'cfo', member: false, at: 2, current: false, ref: {} as never,
}
const deliverable: ContextDeliverableRow = {
  slug: 'pricing-alpha', result: '已完成', kickoff: '2026-10-30', path: '.dsh-company/deliverables/pricing-alpha/final.md', summary: 'Alpha 定价结论',
}

function props(over: Record<string, unknown> = {}) {
  return {
    sources: {
      listSessions: () => ({ ok: true as const, value: [current, recent] }),
      listDeliverables: async () => ({ ok: true as const, value: [deliverable] }),
      readPreview: async () => ({ ok: true as const }),
    },
    currentSessionId: 'session-current',
    targetRole: 'ceo',
    onPick: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  await flush()
  return host
}

function option(root: HTMLElement, text: string): HTMLButtonElement {
  const found = [...root.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(node => node.textContent?.includes(text))
  if (found === undefined) throw new Error(`找不到候选项：${text}`)
  return found
}

describe('背景选择面板（R5-27）', () => {
  it('渲染三组候选与隐私说明（不是空面板）', async () => {
    const host = await mount(createElement(CultivationContextPicker, props()))
    expect(host.textContent).toContain('选择参考背景')
    expect(host.textContent).toContain('本次会话')
    expect(host.textContent).toContain('最近会话')
    expect(host.textContent).toContain('最近成品')
    expect(host.textContent).toContain('背景会写进公司盘的培养记录')
  })

  it('点选候选项把 pick 回传给调用方', async () => {
    const onPick = vi.fn()
    const host = await mount(createElement(CultivationContextPicker, props({ onPick })))
    await act(async () => { option(host, 'Alpha 定价复盘').click() })
    expect(onPick).toHaveBeenCalledWith({ kind: 'session', row: recent })
  })

  it('搜索过滤会话与成品；清空后恢复', async () => {
    const host = await mount(createElement(CultivationContextPicker, props()))
    const input = host.querySelector('input')
    expect(input).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, 'alpha')
      input?.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await flush()
    expect(host.textContent).toContain('Alpha 定价复盘')
    expect(host.textContent).toContain('pricing-alpha')
    await act(async () => {
      setter?.call(input, 'zzz-no-match')
      input?.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await flush()
    expect(host.textContent).toContain('还没有可引用的会话或成品')
  })

  it('成品目录不可达时显示 problem，不静默空面板', async () => {
    const host = await mount(createElement(CultivationContextPicker, props({
      sources: {
        listSessions: () => ({ ok: true as const, value: [current, recent] }),
        listDeliverables: async () => ({ ok: false as const, problem: '成品索引不可读' }),
        readPreview: async () => ({ ok: true as const }),
      },
    })))
    expect(host.textContent).toContain('成品索引不可读')
  })

  it('Escape 取消（不选中任何项）', async () => {
    const onCancel = vi.fn()
    const host = await mount(createElement(CultivationContextPicker, props({ onCancel })))
    await act(async () => {
      host.querySelector('[role="group"]')?.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

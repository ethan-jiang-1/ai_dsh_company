// @vitest-environment happy-dom
/**
 * `useWorkspaceText` 的加载状态机（R4-05，2026-10-28 第四轮六维审计）。
 *
 * 为什么补：台账/成品/身份条三个用户可见面都靠这台状态机；此前 0 用例。
 * 一个“永远 loading”、null 被吞成空白、卸载后仍 setState 的回归，954 例全绿。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceText, type WorkspaceTextLoader } from '../../packages/company-pack/src/client/workspace-text.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

function Probe({ load, refreshMs }: { readonly load: WorkspaceTextLoader; readonly refreshMs?: number }) {
  const { state, reload } = useWorkspaceText(load, 'session-lead' as never, refreshMs === undefined ? {} : { refreshMs })
  return createElement('div', null,
    createElement('span', { 'data-status': state.status }, state.status),
    createElement('span', { 'data-text': '' }, state.status === 'ready' ? state.text : ''),
    createElement('button', { onClick: reload }, 'reload'),
  )
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  return host
}

const status = (host: HTMLElement): string | null => host.querySelector('[data-status]')?.textContent ?? null

describe('useWorkspaceText：loading → ready / null → unreadable / 卸载中止', () => {
  it('读取成功进入 ready，正文可见', async () => {
    const load = vi.fn(async () => '台账正文')
    const host = await mount(createElement(Probe, { load }))
    expect(status(host)).toBe('ready')
    expect(host.textContent).toContain('台账正文')
  })

  it('读取失败（null）进入 unreadable，不静默成空白', async () => {
    const load = vi.fn(async () => null)
    const host = await mount(createElement(Probe, { load }))
    expect(status(host)).toBe('unreadable')
    expect(host.querySelector('[data-text]')?.textContent).toBe('')
  })

  it('卸载会 abort 读取信号，晚到结果不再 setState', async () => {
    let signal: AbortSignal | undefined
    const load = vi.fn((_sessionId: never, nextSignal: AbortSignal) => {
      signal = nextSignal
      return new Promise<string | null>(() => { /* never resolves */ })
    }) as unknown as WorkspaceTextLoader
    await mount(createElement(Probe, { load }))
    expect(signal?.aborted).toBe(false)
    await act(async () => { mounted?.unmount() })
    mounted = null
    expect(signal?.aborted).toBe(true)
  })

  it('reload 触发重读，展示最新正文', async () => {
    let value = '第一版'
    const load = vi.fn(async () => value)
    const host = await mount(createElement(Probe, { load }))
    expect(host.textContent).toContain('第一版')
    value = '第二版'
    const button = [...host.querySelectorAll('button')].find(node => node.textContent === 'reload')
    await act(async () => { button?.click() })
    expect(load).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain('第二版')
  })
})

// @vitest-environment happy-dom
/**
 * 培养对话面板（2026-10-28 培养主视图第一切片）：
 * 空态、/cultivation 命令真执行、自由文本明确提示、结果按 host 返回渲染。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CultivationChatPanel } from '../../packages/company-pack/src/client/CultivationChatPanel.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

async function mount(actions: { run: (line: string) => Promise<{ ok: boolean, text: string }> }): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => {
    mounted?.render(createElement(CultivationChatPanel, { sessionId: 'session-lead' as never, actions }))
  })
  return host
}

function type(host: HTMLElement, value: string): void {
  const area = host.querySelector('textarea') as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(area, value)
  area.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('CultivationChatPanel', () => {
  it('空态说明只谈培养；/cultivation 命令走 actions 并显示真实返回', async () => {
    const run = vi.fn(async () => ({ ok: true, text: '已记录培养提案 20261028-abc' }))
    const host = await mount({ run })
    expect(host.textContent).toContain('培养对话')
    expect(host.textContent).toContain('只谈培养')
    await act(async () => { type(host, '/cultivation correct 先列未决 :: 收口前列出未决') })
    const button = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('发送'))
    await act(async () => { button?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(run).toHaveBeenCalledWith('/cultivation correct 先列未决 :: 收口前列出未决')
    expect(host.textContent).toContain('已记录培养提案 20261028-abc')
  })

  it('自由文本不冒充对话：明确提示阶段限制，不调 actions', async () => {
    const run = vi.fn(async () => ({ ok: true, text: 'x' }))
    const host = await mount({ run })
    await act(async () => { type(host, '把这条纠正整理成方法建议') })
    const button = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('发送'))
    await act(async () => { button?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(run).not.toHaveBeenCalled()
    expect(host.textContent).toContain('只接 /cultivation 命令')
  })
})

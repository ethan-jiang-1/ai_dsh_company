// @vitest-environment happy-dom
/**
 * 台账长摘要「全文/收起」的行为判据（R5-09，2026-11-03 第五轮七维审计）。
 *
 * 为什么补：`client-face.spec.ts` 此前用 7 条源码正则守“可展开”，行为保持的重构会红、
 * 行为回归只要拼写不变仍绿。这里真挂 `LedgerSummary` 点按钮：入口出现、aria 状态、class 切换。
 * **不主张**真实布局裁切（`scrollHeight/clientHeight` 归真浏览器）；CSS 两行边界仍由样式断言守。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { LedgerSummary } from '../../packages/company-pack/src/client/LedgerTab.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// happy-dom 没有 ResizeObserver；组件用它量溢出，测试里给一个 no-op。
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe(): void {}
  disconnect(): void {}
}

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

async function mount(summary: string): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(createElement(LedgerSummary, { summary })) })
  return host
}

function button(root: HTMLElement): HTMLButtonElement | undefined {
  return [...root.querySelectorAll('button')].find(node => node.textContent?.includes('全文') || node.textContent?.includes('收起')) as HTMLButtonElement | undefined
}

describe('台账摘要全文入口（R5-09）', () => {
  it('长摘要给「全文」入口，点开变「收起」并置 expanded 类/aria', async () => {
    const host = await mount('这是一条超过一百二十字的摘要。'.repeat(12))
    const open = button(host)
    expect(open).toBeDefined()
    expect(open?.textContent).toContain('全文')
    expect(open?.getAttribute('aria-expanded')).toBe('false')
    await act(async () => { open?.click() })
    const close = button(host)
    expect(close?.textContent).toContain('收起')
    expect(close?.getAttribute('aria-expanded')).toBe('true')
    expect(host.querySelector('.wk-row-summary')?.className).toContain('is-expanded')
  })

  it('短摘要且未裁切时不给入口（不制造噪声）', async () => {
    const host = await mount('短摘要')
    expect(button(host)).toBeUndefined()
  })
})

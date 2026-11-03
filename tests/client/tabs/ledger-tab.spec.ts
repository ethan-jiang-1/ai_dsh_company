// @vitest-environment happy-dom
/**
 * 台账页签 ready 路径的渲染判据（R5-09，2026-11-03）。
 *
 * 为什么补：`client-face.spec.ts` 此前用「源码里出现 parseMotionLedger」证明台账页签在解析，
 * 但没证明解析结果真的渲染出来。这里真挂 `LedgerTab`，喂一段合法台账，断言统计、行、成品标记。
 * **不主张**真文件读取/30s 轮询（`useWorkspaceText` 的时序归真页面）；只钉 ready 渲染。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { LedgerTab } from '../../../packages/company-pack/src/client/tabs/LedgerTab.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SAMPLE = [
  '| slug | 日期 | 类型 | 参与 | 墙钟 | 成品 | 一句话结论 |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  '| 2026-10-30-demo | 2026-10-30 | 动议 | CEO/CFO | 12m | ✅ | 结论 A |',
].join('\n')

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

function props(over: Record<string, unknown> = {}) {
  return {
    sessionId: 'session-test',
    readLedger: async () => SAMPLE,
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/ledger' } }),
    floatTab: () => {},
    unfloatTab: () => {},
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
  return host
}

describe('台账页签 ready 路径（R5-09）', () => {
  it('合法台账渲染统计、行与成品标记（不是只读源码断言）', async () => {
    const host = await mount(createElement(LedgerTab, props()))
    expect(host.textContent).toContain('共 1 场动议')
    expect(host.textContent).toContain('成品 1')
    expect(host.textContent).toContain('2026-10-30-demo')
    expect(host.textContent).toContain('2026-10-30 · 动议 · CEO/CFO')
    expect(host.textContent).toContain('结论 A')
    expect(host.textContent).toContain('成品')
  })

  it('读不到台账时明确不可读，不静默空面板', async () => {
    const host = await mount(createElement(LedgerTab, props({ readLedger: async () => null })))
    expect(host.textContent).toContain('台账不可读')
  })
})

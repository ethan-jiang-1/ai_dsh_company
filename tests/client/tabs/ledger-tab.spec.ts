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
import { LedgerTab, ledgerBannerOf } from '../../../packages/company-pack/src/client/tabs/LedgerTab.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SAMPLE = [
  '| slug | date | type | participants | wallClock | deliverable | summary |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  '| 2026-10-30-demo | 2026-10-30 | decision | CEO/CFO | 12m | ✅ | 结论 A |',
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
    readLedger: async () => ({ ok: true as const, eof: true, text: SAMPLE }),
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
    expect(host.textContent).toContain('2026-10-30 · 决策 · CEO/CFO')
    expect(host.textContent).toContain('结论 A')
    expect(host.textContent).toContain('成品')
  })

  it('读不到台账时明确不可读，不静默空面板', async () => {
    const host = await mount(createElement(LedgerTab, props({ readLedger: async () => ({ ok: false as const, reason: 'missing' }) })))
    expect(host.textContent).toContain('台账不可读')
  })
})


// 截断 ≠ 完整：300 行台账只读 240 行时，面板必须自己说「只读了前 N 行」。
describe('ledgerBannerOf：不可读 / 截断 / 正常', () => {
  it('不可读 ⇒ ledger.unreadable', () => {
    expect(ledgerBannerOf({ status: 'unreadable' })).toEqual({ key: 'ledger.unreadable' })
  })

  it('读到但文件更长 ⇒ ledger.truncated 带上限', () => {
    expect(ledgerBannerOf({ status: 'ready', truncated: true })).toEqual({ key: 'ledger.truncated', params: { limit: 240 } })
  })

  it('读完 ⇒ 无提示（不制造噪声）', () => {
    expect(ledgerBannerOf({ status: 'ready', truncated: false })).toBeNull()
  })
})

// 坏行必须可见（BUG-303）：4 行动议里 2 行格式不符时，面板不能只报「共 2 场」而不说它跳过了什么。
// 负例留证 2026-11-22：把 parseMotionLedger 的坏行分支改回静默 continue 后 `vitest run tests/client/tabs/ledger-tab.spec.ts` 1 failed（面板不提示跳过）；还原后 6/6 绿。BUG-303
describe('LedgerTab · 坏行提示（BUG-303）', () => {
  it('有坏行 ⇒ 出现「有 N 行格式不符已被跳过」', async () => {
    const text = [
      '| slug | date | type | participants | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '| a | 2026-11-22 | decision | CEO | 1h | ✅ | 结论一 |',
      '| 坏 | 少 | 列 |',
    ].join('\n')
    const host = await mount(createElement(LedgerTab, props({ readLedger: async () => ({ ok: true as const, eof: true, text }) })))
    expect(host.textContent).toContain('行格式不符已被跳过')
    expect(host.textContent).toContain('共 1 场动议')
  })
})

// 表头不符必须可见（BUG-311）：否则「共 0 场」会被读成「台账是空的」。
// 负例留证 2026-11-22：把 headerOk 恒置 true 后 `vitest run tests/client/tabs/ledger-tab.spec.ts` 1 failed（面板不提示表头不符）。BUG-311
describe('LedgerTab · 表头不符（BUG-311）', () => {
  it('表头写错一个词 ⇒ 出「表头与两种口径都对不上」', async () => {
    const text = [
      '| slug | date | type | 参与方 | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '| a | 2026-11-22 | decision | CEO | 1h | ✅ | 结论一 |',
    ].join('\n')
    const host = await mount(createElement(LedgerTab, props({ readLedger: async () => ({ ok: true as const, eof: true, text }) })))
    expect(host.textContent).toContain('表头与两种口径都对不上')
  })
})

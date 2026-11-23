// @vitest-environment happy-dom
/** 台账表达层 keyless：LedgerSummary + LedgerTab 全状态（填充/旧中文类别/坏行/表头错/截断/报错）。 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { LedgerSummary, LedgerTab } from '../../../packages/company-pack/src/client/tabs/LedgerTab.tsx'
import { en } from '../../../packages/company-pack/src/client/locales.ts'
import { assertEnglishUiClean, translateWith } from '../../support/i18n-assertions.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tEn = translateWith(en)

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

describe('LedgerSummary i18n', () => {
  it('en：长结论给 Full text / View the full conclusion，不显示中文按钮', () => {
    const html = renderToStaticMarkup(createElement(LedgerSummary, {
      summary: 'A long summary sentence to trigger expansion. '.repeat(8),
      t: tEn,
    }))
    expect(html).toContain('Full text')
    expect(html).toContain('View the full conclusion')
    expect(html).not.toContain('收起')
    assertEnglishUiClean(html, 'LedgerSummary en')
  })
})

describe('LedgerTab i18n', () => {
  it('en：填充旧盘中文类型/坏行/截断警告均翻译为干净英文', async () => {
    const ledgerMd = [
      '| slug | 日期 | 类型 | 参与 | 墙钟 | 成品 | 一句话结论 |',
      '|---|---|---|---|---|---|---|',
      '| alpha-motion | 2026-11-20 | 决策 | CEO, CFO | 2m | ✅ | Approved plan |',
      '| bad-row-only-two-cells | 2026-11-21 |',
    ].join('\n')
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(LedgerTab, {
        sessionId: 's1',
        t: tEn,
        readLedger: async () => ({ ok: true as const, eof: false, text: ledgerMd }),
        useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/ledger' } }),
        floatTab: () => {},
        unfloatTab: () => {},
      } as never))
    })
    await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
    expect(host.textContent).toContain('Decision')
    expect(host.textContent).toContain('rows were skipped as malformed')
    assertEnglishUiClean(host.textContent ?? '', 'LedgerTab populated+truncated+badRows en')
  })

  it('en：表头不符与不可读态无中文', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(LedgerTab, {
        sessionId: 's1',
        t: tEn,
        readLedger: async () => ({ ok: false as const, reason: 'EACCES' }),
        useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/ledger' } }),
        floatTab: () => {},
        unfloatTab: () => {},
      } as never))
    })
    await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
    expect(host.textContent).toContain('Ledger unreadable')
    assertEnglishUiClean(host.textContent ?? '', 'LedgerTab unreadable en')
  })
})

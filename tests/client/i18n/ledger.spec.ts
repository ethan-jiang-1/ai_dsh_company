/** 台账表达层 keyless：摘要全文/收起入口走字典；台账页签标题/统计在 zh 断言外补 en。 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LedgerSummary } from '../../../packages/company-pack/src/client/tabs/LedgerTab.tsx'
import { en, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'

const tEn = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = en[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

describe('LedgerSummary i18n', () => {
  it('en：长结论给 Full text / View the full conclusion，不显示中文按钮', () => {
    const html = renderToStaticMarkup(createElement(LedgerSummary, {
      summary: '这是一条足够长的结论，用来触发全文入口。'.repeat(8),
      t: tEn,
    }))
    expect(html).toContain('Full text')
    expect(html).toContain('View the full conclusion')
    expect(html).not.toContain('收起')
  })
})

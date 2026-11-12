/** 在场/用量的表达层 keyless 检查（P0 UI 双语）。协作动态文本的结构化 token 留下一批。 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BudgetPanel, PresencePanel } from '../../../packages/company-pack/src/client/tabs/company-panels.tsx'
import { en, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'

const tEn = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = en[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

describe('PresencePanel i18n', () => {
  it('en：空态与活动标题', () => {
    const html = renderToStaticMarkup(createElement(PresencePanel, { rows: [], activity: [], t: tEn }))
    expect(html).toContain('No team motion right now.')
    expect(html).toContain('Collaboration activity')
    expect(html).toContain('No activity yet')
  })
})

describe('BudgetPanel i18n', () => {
  it('en：轮次/步数/工具耗时/四路行/只令牌说明', () => {
    const html = renderToStaticMarkup(createElement(BudgetPanel, {
      t: tEn,
      summary: {
        totalTokens: 1234,
        turns: 2,
        steps: 5,
        toolShare: 0.25,
        rows: [
          { id: 'uncachedInput', label: '未缓存输入', tokens: 100, share: 0.5 },
          { id: 'output', label: '输出', tokens: 100, share: 0.5 },
        ],
      },
    }))
    expect(html).toContain('Turns 2')
    expect(html).toContain('Steps 5')
    expect(html).toContain('Tool time 25%')
    expect(html).toContain('Uncached input')
    expect(html).toContain('Output')
    expect(html).toContain('Tokens only')
  })
})

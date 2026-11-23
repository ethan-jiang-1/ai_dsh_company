/** 在场/用量的表达层 keyless 检查（P0 UI 双语）：空态、填充态、全部状态 enum 与错误态。 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BudgetPanel, PresencePanel, StreamErrorNotice } from '../../../packages/company-pack/src/client/tabs/company-panels.tsx'
import { en } from '../../../packages/company-pack/src/client/locales.ts'
import { assertEnglishUiClean, translateWith } from '../../support/i18n-assertions.ts'

const tEn = translateWith(en)

describe('PresencePanel i18n', () => {
  it('en：空态与活动标题无中文', () => {
    const html = renderToStaticMarkup(createElement(PresencePanel, { rows: [], activity: [], t: tEn }))
    expect(html).toContain('No team motion right now.')
    expect(html).toContain('Collaboration activity')
    expect(html).toContain('No activity yet')
    assertEnglishUiClean(html, 'PresencePanel empty en')
  })

  it('en：填充成员全状态与结构化动态 token + StreamErrorNotice 无中文与全角标点', () => {
    const html = renderToStaticMarkup(createElement(PresencePanel, {
      t: tEn,
      rows: [
        { id: '1', name: 'ceo', displayName: 'CEO', role: 'lead', status: 'running', statusLabel: 'running', currentTask: 'Chairing motion' },
        { id: '2', name: 'vp-eng', displayName: 'VP Eng', role: 'teammate', status: 'idle', statusLabel: 'idle', currentTask: null },
        { id: '3', name: 'cfo', displayName: 'CFO', role: 'teammate', status: 'failed', statusLabel: 'failed', currentTask: 'Budget review' },
      ],
      activity: [{
        time: 1,
        kind: 'task',
        text: 'placeholder',
        token: { key: 'presence.activity.taskCompleted', params: { owner: 'CEO', id: 't1' } },
      }],
      activityCapped: 4,
    }))
    expect(html).toContain('CEO completed t1')
    expect(html).toContain('Only the most recent 50 activity items are shown (4 older items are omitted).')
    expect(html).toContain('Running')
    expect(html).toContain('Idle')
    expect(html).toContain('Failed')
    assertEnglishUiClean(html, 'PresencePanel populated en')

    const errHtml = renderToStaticMarkup(createElement(StreamErrorNotice, { message: 'socket closed', t: tEn }))
    assertEnglishUiClean(errHtml, 'StreamErrorNotice en')
  })
})

describe('BudgetPanel i18n', () => {
  it('en：轮次/步数/工具耗时/四路行/只令牌说明无中文', () => {
    const html = renderToStaticMarkup(createElement(BudgetPanel, {
      t: tEn,
      summary: {
        totalTokens: 1234,
        turns: 2,
        steps: 5,
        toolShare: 0.25,
        rows: [
          { id: 'uncachedInput', label: 'uncachedInput', tokens: 100, share: 0.25 },
          { id: 'cacheRead', label: 'cacheRead', tokens: 100, share: 0.25 },
          { id: 'cacheWrite', label: 'cacheWrite', tokens: 100, share: 0.25 },
          { id: 'output', label: 'output', tokens: 100, share: 0.25 },
        ],
      },
    }))
    expect(html).toContain('Turns 2')
    expect(html).toContain('Steps 5')
    expect(html).toContain('Tool time 25%')
    expect(html).toContain('Uncached input')
    expect(html).toContain('Cache read')
    expect(html).toContain('Cache write')
    expect(html).toContain('Output')
    expect(html).toContain('Tokens only')
    assertEnglishUiClean(html, 'BudgetPanel populated en')
  })
})

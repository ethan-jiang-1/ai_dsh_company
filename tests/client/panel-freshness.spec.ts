import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PanelFrame } from '../../packages/company-pack/src/client/company-tabs.tsx'
import { LedgerTab } from '../../packages/company-pack/src/client/LedgerTab.tsx'

/**
 * 页签新鲜度文案的 keyless 层（2026-10-19 看板卡「共享事实唯一 owner」）。
 *
 * 为什么单独立一条：2026-10-18 走查只修了培养页签一处「说 5 秒实际 30 秒」；
 * 默认值仍是「每 5 秒自动刷新」，对看板/依赖图/在场/任务板（投影推送）和台账（30s）、
 * 待办（2s）都不真。这里钉住三类真实来源：推送 = 默认「投影更新」；轮询 = 调用方显式传间隔。
 */

const tabProps = {
  useTabInfo: () => ({ tab: { id: 'stub-tab', contentId: 'stub-content' } }),
  floatTab: () => {},
  unfloatTab: () => {},
} as never

describe('页签新鲜度文案', () => {
  it('PanelFrame 默认 = 投影更新（推送面板不再假装 5 秒轮询）', () => {
    const html = renderToStaticMarkup(createElement(PanelFrame, {
      title: '看板',
      tone: 'overview',
      tabProps,
      children: null,
    }))
    expect(html).toContain('投影更新')
    expect(html).not.toContain('每 5 秒')
  })

  it('LedgerTab 显式声明 30 秒轮询（默认值不再替它说话）', () => {
    const html = renderToStaticMarkup(createElement(LedgerTab, {
      sessionId: 'session-test',
      readLedger: async () => null,
      useTabInfo: () => ({ tab: { id: 'stub-tab', contentId: 'stub-content' } }),
      floatTab: () => {},
      unfloatTab: () => {},
    } as never))
    expect(html).toContain('每 30 秒自动刷新')
    expect(html).not.toContain('每 5 秒')
  })

})

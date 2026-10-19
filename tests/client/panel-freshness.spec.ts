import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { PanelFrame } from '../../packages/company-pack/src/client/company-tabs.tsx'
import { LedgerTab } from '../../packages/company-pack/src/client/LedgerTab.tsx'

/**
 * 页签新鲜度文案的 keyless 层（2026-10-19 看板卡「共享事实唯一 owner」）。
 *
 * 为什么单独立一条：2026-10-18 走查只修了培养页签一处「说 5 秒实际 30 秒」；
 * 默认值仍是「每 5 秒自动刷新」，对看板/依赖图/在场/任务板（投影推送）和台账（30s）、
 * 待办（2s）都不真。这里钉住三类真实来源：推送 = 默认「投影更新」；轮询 = 调用方显式传间隔。
 */

const CLIENT = join(ROOT, 'packages/company-pack/src/client')

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

  it('轮询面板各自声明真实间隔；推送面板不再出现 5 秒字面量', () => {
    const panelFrame = readFileSync(join(CLIENT, 'company-tabs.tsx'), 'utf8')
    expect(panelFrame, 'PanelFrame 默认必须是投影推送').toContain("refreshLabel = '投影更新'")
    expect(panelFrame, '默认值不许再写 5 秒').not.toContain('每 5 秒')

    const companyView = readFileSync(join(CLIENT, 'CompanyView.tsx'), 'utf8')
    expect(companyView, '公司视图推送子页应显示投影更新').toContain("'投影更新'")
    expect(companyView, '公司视图顶部不许再写 5 秒').not.toContain('每 5 秒刷新')

    const attention = readFileSync(join(CLIENT, 'AttentionTab.tsx'), 'utf8')
    expect(attention, '待办 2s 轮询必须显式说真话').toContain('refreshLabel="每 2 秒自动刷新"')

    const ledger = readFileSync(join(CLIENT, 'LedgerTab.tsx'), 'utf8')
    expect(ledger, '台账 30s 轮询必须显式说真话').toContain('refreshLabel={`每 ${String(REFRESH_MS / 1000)} 秒自动刷新`}')
  })
})

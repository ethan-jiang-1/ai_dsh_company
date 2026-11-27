// @vitest-environment happy-dom
// 负例留证 2026-11-27：CompanyGuideHub 调用 tab.actions.openTab(kind) 未传 { replaceTab: true } ⇒ 跳转后残留空「开始」页签（BUG-403）；透传 { replaceTab: true } 后绿。BUG-403
/** Wave S2 Guide Hub (`sidebar.right.tab.guide` chain 替换 + 上游透传) 单测。 */
import { act, createElement, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { SidebarRightGuideBox } from '../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-registry.ts'
import { zh, type CompanyKey } from '../../../packages/company-pack/src/client/locales.ts'
import {
  CompanyGuideHub,
  partitionGuideEntries,
} from '../../../packages/company-pack/src/client/ux/company-guide.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const t = ((key: CompanyKey) => zh[key]) as ComponentProps<typeof CompanyGuideHub>['t']

const SAMPLE_ENTRIES: readonly SidebarRightGuideBox[] = [
  {
    id: 'dsh-company-pack/ops',
    providerId: 'dsh-company-pack/ops',
    kind: 'company-ops',
    order: 20,
    title: () => '作战板',
    description: () => '看板与任务',
  },
  {
    id: 'dsh-company-pack/team',
    providerId: 'dsh-company-pack/team',
    kind: 'company-team',
    order: 30,
    title: () => '团队',
    description: () => '待办与在场',
  },
  {
    id: '@deepseek-ai/dsh-client-ui-sidebar-files:files',
    providerId: '@deepseek-ai/dsh-client-ui-sidebar-files',
    kind: 'files',
    order: 10,
    title: () => '文件',
  },
]

describe('Wave S2 CompanyGuideHub', () => {
  it('partitionGuideEntries separates company hubs from upstream tools without dropping upstream', () => {
    const parts = partitionGuideEntries(SAMPLE_ENTRIES)
    expect(parts.company.map(item => item.kind)).toEqual(['company-ops', 'company-team'])
    expect(parts.upstream.map(item => item.kind)).toEqual(['files'])
  })

  it('renders company .wk-guide-entry-label entries, split presets, and passes through upstream files openTab', async () => {
    const openTab = vi.fn()
    const openSplit = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(createElement(CompanyGuideHub, {
        useTabInfo: () => ({
          tab: { id: 'guide-tab', contentId: 'guide', actions: { openTab } },
        }),
        useGuideEntries: (sel: (items: readonly SidebarRightGuideBox[]) => unknown) => sel(SAMPLE_ENTRIES),
        openSplit,
        t,
      } as unknown as ComponentProps<typeof CompanyGuideHub>))
    })

    const labels = Array.from(host.querySelectorAll('.wk-guide-entry-label')).map(el => el.textContent?.trim())
    expect(labels).toEqual(['作战板', '团队'])

    const opsEntry = host.querySelector('[data-sidebar-right-guide-entry="company-ops"]') as HTMLButtonElement | null
    expect(opsEntry).not.toBeNull()
    await act(async () => { opsEntry!.click() })
    expect(openTab).toHaveBeenCalledWith('company-ops', { replaceTab: true })

    const filesTool = host.querySelector('[data-sidebar-right-guide-entry="files"]') as HTMLButtonElement | null
    expect(filesTool).not.toBeNull()
    await act(async () => { filesTool!.click() })
    expect(openTab).toHaveBeenCalledWith('files', { replaceTab: true })

    const opsSplitBtn = Array.from(host.querySelectorAll('button'))
      .find(btn => btn.textContent?.trim() === zh['layout.splitOps'])
    expect(opsSplitBtn).toBeDefined()
    await act(async () => { opsSplitBtn!.click() })
    expect(openSplit).toHaveBeenCalledWith('ops')

    const reviewBtn = Array.from(host.querySelectorAll('button'))
      .find(btn => btn.textContent?.trim() === zh['layout.splitReview'])
    expect(reviewBtn).toBeDefined()
    await act(async () => { reviewBtn!.click() })
    expect(openSplit).toHaveBeenCalledWith('review')

    const quietBtn = Array.from(host.querySelectorAll('button'))
      .find(btn => btn.textContent?.trim() === zh['layout.splitQuiet'])
    expect(quietBtn).toBeDefined()
    await act(async () => { quietBtn!.click() })
    expect(openSplit).toHaveBeenCalledWith('quiet')

    act(() => { root.unmount() })
    host.remove()
  })
})

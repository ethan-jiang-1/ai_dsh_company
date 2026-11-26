// @vitest-environment happy-dom
/** Wave S2 三合一集成页签（OpsHubTab / TeamHubTab / ArchiveHubTab）单测。 */
// 负例留证 2026-11-27：去掉 Hub 页签在 sidebar.fullscreen=true 时渲染的 [data-company-narrow-close] 收起按钮 ⇒ BUG-387 用例红；还原后绿。BUG-387
import { act, createElement, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { zh, type CompanyKey } from '../../../packages/company-pack/src/client/locales.ts'
import { ArchiveHubTab, OpsHubTab, TeamHubTab } from '../../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx'
import { createHubSubViewStore, type HubSubViewState } from '../../../packages/company-pack/src/client/tabs/hub-subview-store.ts'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const t = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const raw = zh[key]
  return params === undefined
    ? raw
    : raw.replace(/\{(\w+)\}/g, (_m, k: string) => String(params[k] ?? ''))
}) as ComponentProps<typeof OpsHubTab>['t']

function baseRuntime() {
  const store = createHubSubViewStore()
  const floatTab = vi.fn()
  const unfloatTab = vi.fn()
  const useTabInfo = () => ({ tab: { id: 'tab-hub', contentId: 'dsh-company-pack/ops' }, layout: 'dock' })
  const useSessions = (sel: (s: unknown) => unknown) => sel({ byId: {}, projectionsBySession: {} })
  const useProjection = () => undefined
  const useHubState = (sel: (s: HubSubViewState) => unknown) => sel(store.store.getSnapshot())
  return { store, floatTab, unfloatTab, useTabInfo, useSessions, useProjection, useHubState }
}

describe('Wave S2 cohesive hub tabs', () => {
  it('OpsHubTab exposes data-company-tab-title, switches sections via SegmentedControl, and triggers split', async () => {
    const rt = baseRuntime()
    const selectSection = vi.fn((hub, section) => { rt.store.select(hub, section) })
    const openSplit = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    const renderOps = async (withSplit = true) => {
      await act(async () => {
        root.render(createElement(OpsHubTab, {
          sessionId: 's-ops-1',
          useTabInfo: rt.useTabInfo,
          useSessions: rt.useSessions,
          useProjection: rt.useProjection,
          useHubState: rt.useHubState,
          selectSection,
          ...(withSplit ? { openSplit } : {}),
          floatTab: rt.floatTab,
          unfloatTab: rt.unfloatTab,
          t,
          leadOf: (id: string) => id,
          follow: async function* () {},
          startupStore: createStartupStore(),
          loadStartup: async () => {},
          saveStartup: async () => ({ ok: true as const }),
          resetStartup: async () => ({ ok: true as const }),
        } as unknown as ComponentProps<typeof OpsHubTab>))
      })
    }
    await renderOps(true)

    const pane = host.querySelector('[data-company-hub="ops"]')
    expect(pane?.getAttribute('data-company-tab-title')).toBe(zh['tabs.ops.label'])

    const tasksTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.tasks.label']) as HTMLButtonElement | undefined
    expect(tasksTab).toBeDefined()
    await act(async () => { tasksTab!.click() })
    await renderOps(true)
    expect(selectSection).toHaveBeenCalledWith('ops', 'tasks')

    const dagTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.dag.label']) as HTMLButtonElement | undefined
    await act(async () => { dagTab!.click() })
    await renderOps(true)
    expect(selectSection).toHaveBeenCalledWith('ops', 'dag')

    const startupTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.strategy.label']) as HTMLButtonElement | undefined
    await act(async () => { startupTab!.click() })
    await renderOps(false)
    expect(selectSection).toHaveBeenCalledWith('ops', 'strategy')

    await renderOps(true)
    const splitBtn = Array.from(host.querySelectorAll('button'))
      .find(el => el.textContent?.trim() === zh['layout.splitOps'])
    expect(splitBtn).toBeDefined()
    await act(async () => { splitBtn!.click() })
    expect(openSplit).toHaveBeenCalledWith('ops')

    act(() => { root.unmount() })
    host.remove()
  })

  it('TeamHubTab and ArchiveHubTab render cohesive tab titles and switch sections', async () => {
    const rt = baseRuntime()
    const selectSection = vi.fn((hub, section) => { rt.store.select(hub, section) })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    const renderTeam = async () => {
      await act(async () => {
        root.render(createElement(TeamHubTab, {
          sessionId: 's-team-1',
          useTabInfo: rt.useTabInfo,
          useSessions: rt.useSessions,
          useProjection: rt.useProjection,
          useHubState: rt.useHubState,
          selectSection,
          floatTab: rt.floatTab,
          unfloatTab: rt.unfloatTab,
          t,
          attention: createAttentionRegistry(),
          openSession: vi.fn(),
          openMember: vi.fn(async () => {}),
          openMemberAside: vi.fn(),
          pageHistory: vi.fn(async () => undefined),
          leadOf: (id: string) => id,
          follow: async function* () {},
        } as unknown as ComponentProps<typeof TeamHubTab>))
      })
    }
    await renderTeam()
    expect(host.querySelector('[data-company-hub="team"]')?.getAttribute('data-company-tab-title')).toBe(zh['tabs.team.label'])

    const budgetTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.budget.label']) as HTMLButtonElement | undefined
    expect(budgetTab).toBeDefined()
    await act(async () => { budgetTab!.click() })
    await renderTeam()
    expect(selectSection).toHaveBeenCalledWith('team', 'budget')

    const presenceTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.presence.label']) as HTMLButtonElement | undefined
    await act(async () => { presenceTab!.click() })
    await renderTeam()
    expect(selectSection).toHaveBeenCalledWith('team', 'presence')

    const attentionTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.attention.label']) as HTMLButtonElement | undefined
    await act(async () => { attentionTab!.click() })
    await renderTeam()
    expect(selectSection).toHaveBeenCalledWith('team', 'attention')

    const renderArchive = async () => {
      await act(async () => {
        root.render(createElement(ArchiveHubTab, {
          sessionId: 's-arch-1',
          useTabInfo: rt.useTabInfo,
          useSessions: rt.useSessions,
          useProjection: rt.useProjection,
          useHubState: rt.useHubState,
          selectSection,
          openSplit: vi.fn(),
          floatTab: rt.floatTab,
          unfloatTab: rt.unfloatTab,
          t,
          follow: async function* () {},
          cultivationFiles: {
            listJournal: vi.fn(async () => []),
            readHead: vi.fn(async () => null),
            listRecords: vi.fn(async () => ({ ok: true as const, names: [] })),
            readRecord: vi.fn(async () => null),
          },
          cultivationActions: vi.fn(() => ({})) as unknown as ComponentProps<typeof ArchiveHubTab>['cultivationActions'],
          roleSource: { getSnapshot: () => ({ projectionsBySession: {} }), subscribe: () => () => {} },
          readLedger: vi.fn(async () => ({ ok: true as const, text: '' })),
          readCatalog: vi.fn(async () => ({ ok: true as const, text: '' })),
          contextSources: vi.fn(() => ({ entries: [] })) as unknown as ComponentProps<typeof ArchiveHubTab>['contextSources'],
          openContext: vi.fn(async () => ({ ok: true as const })),
          openFinal: vi.fn(),
        } as unknown as ComponentProps<typeof ArchiveHubTab>))
      })
    }
    await renderArchive()
    expect(host.querySelector('[data-company-hub="archive"]')?.getAttribute('data-company-tab-title')).toBe(zh['tabs.archive.label'])

    const cultTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.cultivation.label']) as HTMLButtonElement | undefined
    await act(async () => { cultTab!.click() })
    await renderArchive()
    expect(selectSection).toHaveBeenCalledWith('archive', 'cultivation')

    const ledgerTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.ledger.label']) as HTMLButtonElement | undefined
    await act(async () => { ledgerTab!.click() })
    await renderArchive()
    expect(selectSection).toHaveBeenCalledWith('archive', 'ledger')

    const delivTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find(el => el.textContent?.trim() === zh['tabs.catalog.label']) as HTMLButtonElement | undefined
    await act(async () => { delivTab!.click() })
    await renderArchive()
    expect(selectSection).toHaveBeenCalledWith('archive', 'deliverables')

    const splitReviewBtn = Array.from(host.querySelectorAll('button'))
      .find(el => el.textContent?.trim() === zh['layout.splitReview'])
    await act(async () => { splitReviewBtn!.click() })

    act(() => { root.unmount() })
    host.remove()
  })

  it('BUG-387：右栏处于窄视口全屏态（fullscreen=true）时提供收起侧栏出口并隐藏双分屏按钮', async () => {
    const rt = baseRuntime()
    const fullscreenTabInfo = () => ({
      sidebar: { expanded: true, fullscreen: true },
      tab: { id: 'tab-hub', contentId: 'dsh-company-pack/ops' },
    })
    const openSplit = vi.fn()
    const selectSection = vi.fn((hub, section) => { rt.store.select(hub, section) })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(createElement(OpsHubTab, {
        sessionId: 's-ops-narrow',
        useTabInfo: fullscreenTabInfo,
        useSessions: rt.useSessions,
        useProjection: rt.useProjection,
        useHubState: rt.useHubState,
        selectSection,
        openSplit,
        floatTab: rt.floatTab,
        unfloatTab: rt.unfloatTab,
        t,
        leadOf: (id: string) => id,
        follow: async function* () {},
        startupStore: createStartupStore(),
        loadStartup: async () => {},
        saveStartup: async () => ({ ok: true as const }),
        resetStartup: async () => ({ ok: true as const }),
      } as unknown as ComponentProps<typeof OpsHubTab>))
    })

    const closeBtn = host.querySelector('[data-company-narrow-close]') as HTMLButtonElement | null
    expect(closeBtn).not.toBeNull()
    expect(Array.from(host.querySelectorAll('button')).some(el => el.textContent?.trim() === zh['layout.splitOps'])).toBe(false)
    await act(async () => { closeBtn!.click() })
    expect(openSplit).toHaveBeenCalledWith('quiet')

    await act(async () => {
      root.render(createElement(TeamHubTab, {
        sessionId: 's-team-narrow',
        useTabInfo: fullscreenTabInfo,
        useSessions: rt.useSessions,
        useProjection: rt.useProjection,
        useHubState: rt.useHubState,
        selectSection,
        openSplit,
        floatTab: rt.floatTab,
        unfloatTab: rt.unfloatTab,
        t,
        attention: createAttentionRegistry(),
        openSession: vi.fn(),
        openMember: vi.fn(async () => {}),
        openMemberAside: vi.fn(),
        pageHistory: vi.fn(async () => undefined),
        leadOf: (id: string) => id,
        follow: async function* () {},
      } as unknown as ComponentProps<typeof TeamHubTab>))
    })
    expect(host.querySelector('[data-company-narrow-close]')).not.toBeNull()

    await act(async () => {
      root.render(createElement(ArchiveHubTab, {
        sessionId: 's-arch-narrow',
        useTabInfo: rt.useTabInfo,
        useSessions: rt.useSessions,
        useProjection: rt.useProjection,
        useHubState: rt.useHubState,
        selectSection,
        openSplit,
        floatTab: rt.floatTab,
        unfloatTab: rt.unfloatTab,
        t,
        follow: async function* () {},
        cultivationFiles: {
          listJournal: vi.fn(async () => []),
          readHead: vi.fn(async () => null),
          listRecords: vi.fn(async () => ({ ok: true as const, names: [] })),
          readRecord: vi.fn(async () => null),
        },
        cultivationActions: vi.fn(() => ({})) as unknown as ComponentProps<typeof ArchiveHubTab>['cultivationActions'],
        roleSource: { getSnapshot: () => ({ projectionsBySession: {} }), subscribe: () => () => {} },
        readLedger: vi.fn(async () => ({ ok: true as const, text: '' })),
        readCatalog: vi.fn(async () => ({ ok: true as const, text: '' })),
        contextSources: vi.fn(() => ({ entries: [] })) as unknown as ComponentProps<typeof ArchiveHubTab>['contextSources'],
        openContext: vi.fn(async () => ({ ok: true as const })),
        openFinal: vi.fn(),
      } as unknown as ComponentProps<typeof ArchiveHubTab>))
    })
    expect(host.querySelector('[data-company-narrow-close]')).toBeNull()

    act(() => { root.unmount() })
    host.remove()
  })
})

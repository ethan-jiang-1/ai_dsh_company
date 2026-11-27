// @vitest-environment happy-dom
/** Wave S3 全局总部 (`main` 面板 + `sidebar.panellist` + 内嵌培养会话) 单测。 */
// 负例留证 2026-11-26：en 字典混入 CJK ⇒ company-hq.spec.ts BUG-308 用例红；清除后绿。BUG-308
// 负例留证 2026-11-26：去掉 company-hq.tsx catch 后 `if (cancelled) return` 守卫 ⇒ BUG-348 用例红（卸载后清 storage key 并建孤儿会话）；还原后绿。BUG-348
// 负例留证 2026-11-27：把 CompanyHqPage 改回 `primarySession = sessionList[0]` 且不追踪 knownCultivationIds ⇒ BUG-384 用例红（create 被调用 6 次陷入循环）；还原后绿。BUG-384
// 负例留证 2026-11-27：去掉 HqCultivationWorkshop / CultivationBoard 的 `language` 同步 ⇒ BUG-385 用例红（en 界面仍渲染「我的分身」）；还原后绿。BUG-385
// 负例留证 2026-11-27：HQ 台账与策略恢复传 `floatTab: noopFloat` 且 PanelFrame 忽略 floatTab 可选性 ⇒ BUG-391 用例红（HQ 内嵌卡片仍出现「浮出」死按钮）；还原后绿。BUG-391
// 负例留证 2026-11-27：HqCultivationConversationSlot 传 `hero: true`、或去掉 HqCultivationWorkshop 的 `retryNonce`/`mainSessionId` 复位及 HQ 总览 `pageHistory` 合并 ⇒ BUG-393 用例红；还原后绿。BUG-393
// 负例留证 2026-11-27：openCultivation 仅弹 toast 不入 composeIntentStore ⇒ HQ 培养表单不自动展开也无来源背景预填（BUG-398）；接通后绿。BUG-398
// 负例留证 2026-11-27：CultivationCompose 缺少 intentScope 区分 HQ 与侧栏实例且 deliverables-archive 未归一 ⇒ 侧栏表单先消费并误吞 HQ 意图或归档路径拒收（BUG-399）；还原后绿。BUG-399
// 负例留证 2026-11-27：CompanyHqPage 的 SegmentedControl 缺配对 id="company-hq-segments-<sec>-panel" role="tabpanel" ⇒ 4 个分段标签全产悬空 aria-controls（BUG-403）；接入 SegmentedTabPanels 后绿。BUG-403
import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { en, zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import { EMPTY_STARTUP_OPTIONS, EMPTY_STARTUP_SETTINGS } from '../../../packages/company-pack/src/lib/startup/startup-settings.ts'
import {
  COMPANY_HQ_CULTIVATION_SLOT,
  CompanyHqIcon,
  CompanyHqPage,
  createHqSectionStore,
  HqCultivationConversationSlot,
  type HqSection,
} from '../../../packages/company-pack/src/client/ux/company-hq.tsx'
import { registerWaveS3Ux } from '../../../packages/company-pack/src/client/ux/register-s3-ux.ts'
import { registerWaveS1Ux } from '../../../packages/company-pack/src/client/ux/register-s1-ux.ts'
import { createHubSubViewStore } from '../../../packages/company-pack/src/client/tabs/hub-subview-store.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import { CULTIVATION_COPY, setCultivationLanguage } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'
import { CultivationCompose } from '../../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx'
import { composeIntentStore } from '../../../packages/company-pack/src/client/cultivation/compose-intent-store.ts'
import { decodeContextToken } from '../../../packages/company-pack/src/lib/cultivation/cultivation-context.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const makeT = (dict: Record<CompanyKey, string>) =>
  ((key: CompanyKey, params?: Record<string, string | number>) => {
    const template = dict[key]
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, n: string) => String(params[n] ?? ''))
  }) as unknown as CompanyT

beforeEach(() => {
  localStorage.clear()
})

describe('Wave S3 CompanyHqPage & HqCultivationConversationSlot', () => {
  it('renders CompanyHqIcon in both idle and active states, and HQ copy has zero CJK in en (BUG-308)', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    act(() => {
      root.render(createElement(CompanyHqIcon, { size: 18, active: true } as unknown as ComponentProps<typeof CompanyHqIcon>))
    })
    expect(host.querySelector('[data-company-hq-icon="active"]')).not.toBeNull()

    act(() => {
      root.render(createElement(CompanyHqIcon, { size: 16, active: false } as unknown as ComponentProps<typeof CompanyHqIcon>))
    })
    expect(host.querySelector('[data-company-hq-icon="idle"]')).not.toBeNull()

    const hqKeys = Object.keys(zh).filter(k => k.startsWith('hq.')) as CompanyKey[]
    for (const key of hqKeys) {
      expect(zh[key].trim()).not.toBe('')
      expect(en[key].trim()).not.toBe('')
      expect(en[key]).not.toMatch(/[\u3400-\u9fff]/u)
    }

    act(() => { root.unmount() })
    host.remove()
  })

  it('switches sections (overview/ledger/strategy/cultivation), triggers returnToChat, and hosts embedded SessionProvider', async () => {
    const hqStore = createHqSectionStore()
    const startupStore = createStartupStore({
      loaded: true,
      settings: EMPTY_STARTUP_SETTINGS,
      options: EMPTY_STARTUP_OPTIONS,
      optionsProblem: null,
    })
    const returnToChat = vi.fn()
    const openSession = vi.fn()
    const release = vi.fn()
    const retain = vi.fn(() => ({
      id: 'cult-s-1' as SessionId,
      ready: Promise.resolve({}),
      release,
    }))
    const create = vi.fn(async () => 'cult-s-1' as SessionId)
    const renderSlot = vi.fn((name: string) => createElement('div', { 'data-rendered-slot': name }, 'Embedded Chat'))

    const sessionState = {
      byId: {
        'lead-1': {
          id: 'lead-1' as SessionId,
          origin: 'human',
          cwd: '/tmp/ws',
          updatedAt: 100,
          running: false,
          displayTitle: 'Lead Session',
        },
      },
      projectionsBySession: {
        'lead-1': { values: { agentPreset: 'ceo' } },
      },
    }

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    const renderPage = async (
      overrides?: {
        byId?: Record<string, unknown>
        attention?: readonly Record<string, unknown>[]
      },
    ) => {
      const currentState = overrides?.byId === undefined
        ? sessionState
        : { byId: overrides.byId, projectionsBySession: {} }
      const pending = overrides?.attention ?? []
      await act(async () => {
        root.render(createElement(CompanyHqPage, {
          t: makeT(zh),
          useHqSection: (sel: (v: HqSection) => unknown) => sel(hqStore.store.getSnapshot()),
          useAttentionItems: (sel: (v: readonly unknown[]) => unknown) => sel(pending),
          selectSection: (next: HqSection) => { hqStore.select(next) },
          returnToChat,
          openSession,
          useSessions: (sel: (v: typeof sessionState) => unknown) => sel(currentState as typeof sessionState),
          useProjection: () => undefined,
          sessions: { retain, create },
          cultivationFiles: {
            listJournal: async () => [],
            readHead: async () => null,
            listRecords: async () => ({ ok: true as const, names: [] }),
            readRecord: async () => ({ ok: false as const, reason: 'unavailable' as const }),
          },
          cultivationActions: () => ({ run: async () => ({ ok: true as const, text: 'ok' }) }),
          followEvents: async function* () {},
          readLedger: async () => ({ ok: true as const, text: '# Ledger' }),
          readCatalog: async () => ({ ok: true as const, text: '{"entries":[]}' }),
          contextSources: () => ({ entries: [] }),
          openContext: async () => ({ ok: true as const }),
          openFinal: vi.fn(),
          startupStore,
          loadStartup: async () => {},
          saveStartup: async () => ({ ok: true as const }),
          resetStartup: async () => ({ ok: true as const }),
          SessionProvider: ({ children }: { children?: ReactNode }) => createElement('div', { 'data-session-provider': '1' }, children),
          renderSlot,
        } as unknown as ComponentProps<typeof CompanyHqPage>))
      })
    }

    await renderPage({
      attention: [
        { kind: 'approval', sessionId: 'lead-1', id: 'a1', what: 'Signoff item', since: 10 },
        { kind: 'escalation', sessionId: 'lead-1', id: 'e1', what: 'Needs CEO', since: 11 },
      ],
    })
    expect(host.querySelector('[data-company-hq]')).not.toBeNull()
    expect(host.textContent).toContain('Lead Session')
    expect(host.textContent).toContain('Signoff item')

    // openSession works from both session row and pending attention row
    const openBtns = Array.from(host.querySelectorAll('button')).filter(b => b.textContent?.trim() === zh['hq.openSession'])
    await act(async () => { for (const btn of openBtns) btn.click() })
    expect(openSession).toHaveBeenCalledWith('lead-1')

    // Return to Chat invokes layout.selectPanel(null)
    const backBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === zh['hq.returnToChat'])!
    await act(async () => { backBtn.click() })
    expect(returnToChat).toHaveBeenCalledOnce()

    // Switch through ledger and strategy sections (populated and empty primarySession)
    hqStore.select('overview')
    hqStore.select('ledger')
    await renderPage()
    const ledgerFloatBtns = [...host.querySelectorAll('button')].filter(b => b.textContent?.trim() === zh['panel.float'])
    expect(ledgerFloatBtns).toHaveLength(0)
    hqStore.select('strategy')
    await renderPage()
    const strategyFloatBtns = [...host.querySelectorAll('button')].filter(b => b.textContent?.trim() === zh['panel.float'])
    expect(strategyFloatBtns).toHaveLength(0)
    await renderPage({ byId: {} })
    hqStore.select('ledger')
    await renderPage({ byId: {} })

    // Switch to Cultivation Workshop & start embedded session
    hqStore.select('cultivation')
    await renderPage()
    const startBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === zh['hq.cultivationStart'])!
    await act(async () => {
      startBtn.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(create).toHaveBeenCalledOnce()
    expect(retain).toHaveBeenCalledWith('cult-s-1', { source: 'companyCultivation' })
    expect(renderSlot).toHaveBeenCalledWith(COMPANY_HQ_CULTIVATION_SLOT, {})
    expect(host.querySelector('[data-rendered-slot="company.hq.cultivation.conversation"]')).not.toBeNull()

    // Unmount releases retained cultivation SessionReference cleanly
    act(() => { root.unmount() })
    expect(release).toHaveBeenCalledOnce()
    host.remove()
  })

  it('BUG-348：unmount before stored retain rejects preserves storage key and avoids orphan create', async () => {
    localStorage.setItem('dsh-company-hq-cultivation:lead-1', 'stale-cult')
    let rejectReady!: (err: Error) => void
    const release = vi.fn()
    const retain = vi.fn(() => ({
      id: 'stale-cult' as SessionId,
      ready: new Promise((_resolve, reject) => { rejectReady = reject }),
      release,
    }))
    const create = vi.fn(async () => 'orphan-never' as SessionId)
    const hqStore = createHqSectionStore()
    hqStore.select('cultivation')
    const startupStore = createStartupStore()
    const sessionState = {
      byId: { 'lead-1': { id: 'lead-1' as SessionId, origin: 'human', cwd: '/tmp/ws', updatedAt: 100 } },
      projectionsBySession: { 'lead-1': { values: { agentPreset: 'ceo' } } },
    }

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(createElement(CompanyHqPage, {
        t: makeT(zh),
        useHqSection: (sel: (v: HqSection) => unknown) => sel(hqStore.store.getSnapshot()),
        useAttentionItems: (sel: (v: readonly unknown[]) => unknown) => sel([]),
        selectSection: (next: HqSection) => { hqStore.select(next) },
        returnToChat: vi.fn(),
        openSession: vi.fn(),
        useSessions: (sel: (v: typeof sessionState) => unknown) => sel(sessionState),
        useProjection: () => undefined,
        sessions: { retain, create },
        cultivationFiles: { listJournal: async () => [], readHead: async () => null, listRecords: async () => ({ ok: true as const, names: [] }), readRecord: async () => ({ ok: false as const, reason: 'unavailable' as const }) },
        cultivationActions: () => ({ run: async () => ({ ok: true as const, text: 'ok' }) }),
        followEvents: async function* () {},
        readLedger: async () => ({ ok: true as const, text: '' }),
        readCatalog: async () => ({ ok: true as const, text: '' }),
        contextSources: () => ({ entries: [] }),
        openContext: async () => ({ ok: true as const }),
        openFinal: vi.fn(),
        startupStore,
        loadStartup: async () => {},
        saveStartup: async () => ({ ok: true as const }),
        resetStartup: async () => ({ ok: true as const }),
        SessionProvider: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
        renderSlot: () => null,
      } as unknown as ComponentProps<typeof CompanyHqPage>))
    })

    act(() => { root.unmount() })
    rejectReady(new Error('not found'))
    await Promise.resolve()
    await Promise.resolve()

    expect(release).toHaveBeenCalled()
    expect(localStorage.getItem('dsh-company-hq-cultivation:lead-1')).toBe('stale-cult')
    expect(create).not.toHaveBeenCalled()
    host.remove()
  })

  it('HqCultivationConversationSlot renders conversation.content with variant embedded', () => {
    const renderFactorySlot = vi.fn((_slot: string, _opts: unknown, config?: { slots?: { views?: (props: { renderSlot: (n: string, args: unknown) => ReactNode }) => ReactNode } }) => {
      const inner = config?.slots?.views?.({
        renderSlot: (name: string, args: unknown) => createElement('span', { 'data-inner-view': `${name}:${JSON.stringify(args)}` }),
      })
      return createElement('div', { 'data-embedded-ok': '1' }, inner)
    })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(HqCultivationConversationSlot, {
        sessionId: 'cult-1' as SessionId,
        useSession: (sel: (v: { blank: boolean; awaitingFirstTurn: boolean; running: boolean; promptAttempted: boolean; openState: string; subagent?: { address: { mode: string }; parentAvailable?: boolean } }) => unknown) =>
          sel({ blank: true, awaitingFirstTurn: false, running: false, promptAttempted: false, openState: 'open' }),
        useConversation: (sel: (v: { activeTargets: Set<string> }) => unknown) => sel({ activeTargets: new Set() }),
        useSessions: (sel: (v: { byId: Record<string, { blank: boolean }> }) => unknown) => sel({ byId: { 'cult-1': { blank: true } } }),
        renderFactorySlot,
      } as unknown as ComponentProps<typeof HqCultivationConversationSlot>))
    })
    expect(renderFactorySlot).toHaveBeenCalledWith(
      'conversation.content',
      { variant: 'embedded', phase: 'active', hero: false },
      expect.objectContaining({ slots: expect.any(Object) }),
    )
    expect(host.querySelector('[data-inner-view*="conversation.session"]')).not.toBeNull()

    act(() => {
      root.render(createElement(HqCultivationConversationSlot, {
        sessionId: 'cult-1' as SessionId,
        useSession: (sel: (v: { blank: boolean; awaitingFirstTurn: boolean; running: boolean; promptAttempted: boolean; openState: string }) => unknown) =>
          sel({ blank: true, awaitingFirstTurn: true, running: true, promptAttempted: true, openState: 'loading' }),
        useConversation: (sel: (v: { activeTargets: Set<string> }) => unknown) => sel({ activeTargets: new Set(['t1']) }),
        useSessions: (sel: (v: { byId: Record<string, { blank: boolean }> }) => unknown) => sel({ byId: { 'cult-1': { blank: false } } }),
        renderFactorySlot,
      } as unknown as ComponentProps<typeof HqCultivationConversationSlot>))
    })
    expect(renderFactorySlot).toHaveBeenLastCalledWith(
      'conversation.content',
      { variant: 'embedded', phase: 'active', hero: false },
      expect.objectContaining({ slots: expect.any(Object) }),
    )
    act(() => { root.unmount() })
    host.remove()
  })

  it('registerWaveS3Ux opens HQ via openHq with or without an explicit section and exposes label thunk', () => {
    const selectPanel = vi.fn()
    const registered: Array<{ name: string; label?: () => string }> = []
    const fakeCtx = {
      locale: { bind: () => makeT(zh) },
      inject: (_deps: readonly string[], fn: (scoped: unknown) => void) => {
        fn({
          slots: {
            inject: (_name: string, reg: () => void) => { reg() },
            register: (def: { name: string; label?: () => string }) => {
              registered.push(def)
              return () => {}
            },
          },
          layout: { selectPanel },
          sessions: { binding: () => undefined, list: { getSnapshot: () => ({ byId: {}, projectionsBySession: {} }), subscribe: () => () => {} } },
          uiWorkspace: { openSession: vi.fn() },
          remote: {
            session: { follow: async function* () {} },
            workspaceFiles: { read: async () => ({ ok: true, value: { text: '', eof: true } }) },
            commands: { execute: async () => ({ ok: true }) },
          },
          sidebarRight: { openResource: vi.fn() },
        })
      },
    }
    const handle = registerWaveS3Ux(fakeCtx as never, {
      attention: createAttentionRegistry(),
      startupStore: createStartupStore(),
    })
    handle.openHq()
    handle.openHq('cultivation')
    expect(selectPanel).toHaveBeenCalledTimes(2)
    const navDef = registered.find(d => d.name === 'sidebar.panellist')
    expect(navDef?.label?.()).toBe(zh['hq.panel'])
  })

  it('BUG-384：creating a cultivation session updates store updatedAt without bouncing primarySession or looping create', async () => {
    const hqStore = createHqSectionStore()
    hqStore.select('cultivation')
    const startupStore = createStartupStore()
    let storeState: {
      byId: Record<string, { id: SessionId; origin: string; cwd: string; updatedAt: number; displayTitle?: string }>
      projectionsBySession: Record<string, { values: { agentPreset: string } }>
    } = {
      byId: {
        'lead-1': { id: 'lead-1' as SessionId, origin: 'human', cwd: '/tmp/ws', updatedAt: 100, displayTitle: 'CEO Main' },
      },
      projectionsBySession: {
        'lead-1': { values: { agentPreset: 'ceo' } },
      },
    }
    const listeners = new Set<() => void>()
    const useSessionsMock = (sel: (v: typeof storeState) => unknown) => sel(storeState)

    let seq = 0
    const release = vi.fn()
    const retain = vi.fn((id: SessionId) => ({
      id,
      ready: Promise.resolve({}),
      release,
    }))
    const create = vi.fn(async () => {
      seq += 1
      const newId = `cult-new-${String(seq)}` as SessionId
      // 模拟真实 DSH sessions store：刚创建的顶层会话拥有最新 updatedAt，排到 sessionList[0]
      // 上限保护：防止回归时在 React act() 内无限微任务挂死测试进程
      if (seq <= 5) {
        storeState = {
          byId: {
            ...storeState.byId,
            [newId]: { id: newId, origin: 'human', cwd: '/tmp/ws', updatedAt: 200 + seq, displayTitle: 'Cultivation' },
          },
          projectionsBySession: {
            ...storeState.projectionsBySession,
            [newId]: { values: { agentPreset: 'ceo' } },
          },
        }
        for (const fn of listeners) fn()
      }
      return newId
    })
    const renderSlot = vi.fn((name: string) => createElement('div', { 'data-rendered-slot': name }, 'Embedded Chat'))

    const sessionsStub = { retain, create }
    const startupFiles = { listJournal: async () => [], readHead: async () => null, listRecords: async () => ({ ok: true as const, names: [] }), readRecord: async () => ({ ok: false as const, reason: 'unavailable' as const }) }
    const actionsStub = () => ({ run: async () => ({ ok: true as const, text: 'ok' }) })
    const followStub = async function* () {}
    const readEmpty = async () => ({ ok: true as const, text: '' })
    const contextStub = () => ({ entries: [] })
    const openContextStub = async () => ({ ok: true as const })
    const openFinalStub = vi.fn()
    const loadStub = async () => {}
    const saveStub = async () => ({ ok: true as const })
    const resetStub = async () => ({ ok: true as const })
    const returnStub = vi.fn()
    const openSessionStub = vi.fn()
    const selectSectionStub = (next: HqSection) => { hqStore.select(next) }
    const SessionProviderStub = ({ children }: { children?: ReactNode }) => createElement('div', { 'data-session-provider': '1' }, children)

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const renderCurrent = () => createElement(CompanyHqPage, {
      t: makeT(zh),
      useHqSection: (sel: (v: HqSection) => unknown) => sel(hqStore.store.getSnapshot()),
      useAttentionItems: (sel: (v: readonly unknown[]) => unknown) => sel([]),
      selectSection: selectSectionStub,
      returnToChat: returnStub,
      openSession: openSessionStub,
      useSessions: useSessionsMock,
      useProjection: () => undefined,
      sessions: sessionsStub,
      cultivationFiles: startupFiles,
      cultivationActions: actionsStub,
      followEvents: followStub,
      readLedger: readEmpty,
      readCatalog: readEmpty,
      contextSources: contextStub,
      openContext: openContextStub,
      openFinal: openFinalStub,
      startupStore,
      loadStartup: loadStub,
      saveStartup: saveStub,
      resetStartup: resetStub,
      SessionProvider: SessionProviderStub,
      renderSlot,
    } as unknown as ComponentProps<typeof CompanyHqPage>)

    listeners.add(() => {
      root.render(renderCurrent())
    })

    await act(async () => {
      root.render(renderCurrent())
    })

    const startBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === zh['hq.cultivationStart'])!
    await act(async () => {
      startBtn.click()
      for (let i = 0; i < 10; i++) await Promise.resolve()
    })

    expect(create).toHaveBeenCalledTimes(1)
    expect(retain).toHaveBeenCalledWith('cult-new-1', { source: 'companyCultivation' })
    expect(host.querySelector('[data-rendered-slot="company.hq.cultivation.conversation"]')).not.toBeNull()
    expect(host.textContent).not.toContain(zh['hq.cultivationCreating'])
    expect(localStorage.getItem('dsh-company-hq-cultivation:lead-1')).toBe('cult-new-1')

    act(() => { root.unmount() })
    host.remove()
  })

  it('BUG-385：opening HQ cultivation workshop directly in en locale renders English CultivationBoard without Chinese copy', async () => {
    setCultivationLanguage('zh')
    const hqStore = createHqSectionStore()
    hqStore.select('cultivation')
    const startupStore = createStartupStore()
    const sessionState = {
      byId: { 'lead-1': { id: 'lead-1' as SessionId, origin: 'human', cwd: '/tmp/ws', updatedAt: 100 } },
      projectionsBySession: { 'lead-1': { values: { agentPreset: 'ceo' } } },
    }
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    const renderWithLang = async (dict: Record<CompanyKey, string>) => {
      await act(async () => {
        root.render(createElement(CompanyHqPage, {
          t: makeT(dict),
          useHqSection: (sel: (v: HqSection) => unknown) => sel(hqStore.store.getSnapshot()),
          useAttentionItems: (sel: (v: readonly unknown[]) => unknown) => sel([]),
          selectSection: (next: HqSection) => { hqStore.select(next) },
          returnToChat: vi.fn(),
          openSession: vi.fn(),
          useSessions: (sel: (v: typeof sessionState) => unknown) => sel(sessionState),
          useProjection: () => undefined,
          sessions: { retain: vi.fn(), create: vi.fn() },
          cultivationFiles: { listJournal: async () => [], readHead: async () => null, listRecords: async () => ({ ok: true as const, names: [] }), readRecord: async () => ({ ok: false as const, reason: 'unavailable' as const }) },
          cultivationActions: () => ({ run: async () => ({ ok: true as const, text: 'ok' }) }),
          followEvents: async function* () {},
          readLedger: async () => ({ ok: true as const, text: '' }),
          readCatalog: async () => ({ ok: true as const, text: '' }),
          contextSources: () => ({ entries: [] }),
          openContext: async () => ({ ok: true as const }),
          openFinal: vi.fn(),
          startupStore,
          loadStartup: async () => {},
          saveStartup: async () => ({ ok: true as const }),
          resetStartup: async () => ({ ok: true as const }),
          SessionProvider: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
          renderSlot: () => null,
        } as unknown as ComponentProps<typeof CompanyHqPage>))
      })
    }

    await renderWithLang(en)
    const boardText = host.querySelector('.wk-hq-cultivation-board')?.textContent ?? ''
    expect(boardText).toContain('My double')
    expect(boardText).toContain('Needs me')
    expect(boardText).not.toMatch(/[\u3400-\u9fff]/u)

    await renderWithLang(zh)
    const boardTextZh = host.querySelector('.wk-hq-cultivation-board')?.textContent ?? ''
    expect(boardTextZh).toContain('我的分身')
    expect(boardTextZh).toContain('需要我处理')

    act(() => { root.unmount() })
    setCultivationLanguage('zh')
    host.remove()
  })

  // 负例留证 2026-11-27：HQ 总览会话标签与待办行恢复裸 item.id.slice(0,8) / item.kind / item.what ⇒ 露出 session- / approval / request_signoff:（BUG-390）；还原后绿。BUG-390
  it('BUG-390：HQ 总览剥离 session- 前缀并本地化待办类别与 request_signoff', async () => {
    const hqStore = createHqSectionStore()
    hqStore.select('overview')
    const startupStore = createStartupStore()
    const sessionState = {
      byId: { 'session-abc12345def': { id: 'session-abc12345def' as SessionId, title: 'Main CEO Session', origin: 'human', cwd: '/tmp/ws', updatedAt: 100 } },
      projectionsBySession: { 'session-abc12345def': { values: { agentPreset: 'ceo' } } },
    }
    const pendingItems = [{
      kind: 'approval' as const,
      sessionId: 'session-abc12345def',
      what: 'request_signoff: margin check',
      whatToken: { kind: 'approval' as const, toolName: 'request_signoff', reason: 'margin check' },
      since: 10,
    }]
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(createElement(CompanyHqPage, {
        t: makeT(zh),
        useHqSection: (sel: (v: HqSection) => unknown) => sel(hqStore.store.getSnapshot()),
        useAttentionItems: (sel: (v: readonly unknown[]) => unknown) => sel(pendingItems),
        selectSection: (next: HqSection) => { hqStore.select(next) },
        returnToChat: vi.fn(),
        openSession: vi.fn(),
        useSessions: (sel: (v: typeof sessionState) => unknown) => sel(sessionState),
        useProjection: () => undefined,
        sessions: { retain: vi.fn(), create: vi.fn() },
        cultivationFiles: { listJournal: async () => [], readHead: async () => null, listRecords: async () => ({ ok: true as const, names: [] }), readRecord: async () => ({ ok: false as const, reason: 'unavailable' as const }) },
        cultivationActions: () => ({ run: async () => ({ ok: true as const, text: 'ok' }) }),
        followEvents: async function* () {},
        readLedger: async () => ({ ok: true as const, text: '' }),
        readCatalog: async () => ({ ok: true as const, text: '' }),
        contextSources: () => ({ entries: [] }),
        openContext: async () => ({ ok: true as const }),
        openFinal: vi.fn(),
        startupStore,
        loadStartup: async () => {},
        saveStartup: async () => ({ ok: true as const }),
        resetStartup: async () => ({ ok: true as const }),
        SessionProvider: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
        renderSlot: () => null,
      } as unknown as ComponentProps<typeof CompanyHqPage>))
    })

    const overviewText = host.textContent ?? ''
    expect(overviewText).toContain('abc12345')
    expect(overviewText).not.toContain('session- ')
    const tags = [...host.querySelectorAll('.wk-hq-row')].map(row => row.textContent ?? '')
    expect(tags.some(text => text.includes('abc12345') && !text.includes('session-abc'))).toBe(true)
    expect(overviewText).toContain(zh['attention.kind.approval'])
    expect(overviewText).toContain(zh['attention.tool.requestSignoff'])
    expect(overviewText).not.toContain('approvalrequest_signoff:')
    expect(overviewText).not.toContain('request_signoff:')

    act(() => { root.unmount() })
    host.remove()
  })

  it('BUG-393：失败重试用 retryNonce 真正重试；切 mainSessionId 后 started 复位且不静默建会话；总览待办合并历史重建', async () => {
    const hqStore = createHqSectionStore()
    hqStore.select('cultivation')
    const startupStore = createStartupStore()
    const createFn = vi.fn()
      .mockRejectedValueOnce(new Error('boom-create-failed'))
      .mockResolvedValueOnce('cult-new-2' as SessionId)
    const retain = vi.fn((id: SessionId) => ({ id, ready: Promise.resolve({}), release: vi.fn() }))
    let storeState = {
      byId: {
        s1: { id: 's1' as SessionId, cwd: '/tmp/ws', updatedAt: 100, retainedBy: { mainView: 1 } as Record<string, number>, displayTitle: 'S1' },
        s2: { id: 's2' as SessionId, cwd: '/tmp/ws', updatedAt: 50, retainedBy: {} as Record<string, number>, displayTitle: 'S2' },
      },
      projectionsBySession: {
        s1: { values: { agentPreset: 'ceo' } },
        s2: { values: { agentPreset: 'ceo' } },
      },
    }
    const pageHistory = vi.fn(async ({ throughSeq }: { throughSeq: number }) => {
      if (throughSeq === Number.MAX_SAFE_INTEGER) {
        return { ok: true as const, value: { records: [{ event: { seq: 1 } }], hasMore: false } }
      }
      return {
        ok: true as const,
        value: {
          records: [
            { event: { seq: 1, type: 'approval/asked', time: 50, data: { id: 'app-hist-1', callId: 'call-hist-1', toolName: 'bash', reason: 'History check' } } },
          ],
          hasMore: false,
        },
      }
    })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const renderNode = () => createElement(CompanyHqPage, {
      t: makeT(zh),
      useHqSection: (sel: (v: HqSection) => unknown) => sel(hqStore.store.getSnapshot()),
      useAttentionItems: (sel: (v: readonly unknown[]) => unknown) => sel([]),
      selectSection: (next: HqSection) => { hqStore.select(next) },
      returnToChat: vi.fn(),
      openSession: vi.fn(),
      useSessions: (sel: (v: typeof storeState) => unknown) => sel(storeState),
      useProjection: () => undefined,
      sessions: { retain, create: createFn },
      cultivationFiles: { listJournal: async () => [], readHead: async () => null, listRecords: async () => ({ ok: true as const, names: [] }), readRecord: async () => ({ ok: false as const, reason: 'unavailable' as const }) },
      cultivationActions: () => ({ run: async () => ({ ok: true as const, text: 'ok' }) }),
      followEvents: async function* () {},
      readLedger: async () => ({ ok: true as const, text: '' }),
      readCatalog: async () => ({ ok: true as const, text: '' }),
      contextSources: () => ({ entries: [] }),
      openContext: async () => ({ ok: true as const }),
      openFinal: vi.fn(),
      pageHistory,
      startupStore,
      loadStartup: async () => {},
      saveStartup: async () => ({ ok: true as const }),
      resetStartup: async () => ({ ok: true as const }),
      SessionProvider: ({ children }: { children?: ReactNode }) => createElement('div', { 'data-session-provider': '1' }, children),
      renderSlot: (name: string) => createElement('div', { 'data-rendered-slot': name }, 'Embedded Chat'),
    } as unknown as ComponentProps<typeof CompanyHqPage>)

    await act(async () => { root.render(renderNode()) })
    const startBtn = [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === zh['hq.cultivationStart'])!
    await act(async () => { startBtn.click(); await Promise.resolve(); await Promise.resolve() })
    expect(createFn).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('boom-create-failed')

    // 重试按钮必须真正再次触发 create
    const retryBtn = [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === zh['hq.cultivationStart'])!
    await act(async () => { retryBtn.click(); await Promise.resolve(); await Promise.resolve() })
    expect(createFn).toHaveBeenCalledTimes(2)
    expect(retain).toHaveBeenCalledWith('cult-new-2', { source: 'companyCultivation' })

    // 切换到新主会话 s2：started 自动复位，不静默新建培养会话
    storeState = {
      ...storeState,
      byId: {
        s1: { ...storeState.byId.s1, retainedBy: {} },
        s2: { ...storeState.byId.s2, retainedBy: { mainView: 1 } },
      },
    }
    await act(async () => { root.render(renderNode()); await Promise.resolve(); await Promise.resolve() })
    expect(createFn).toHaveBeenCalledTimes(2)
    expect([...host.querySelectorAll('button')].some(b => b.textContent?.trim() === zh['hq.cultivationStart'])).toBe(true)

    // 总览页待办合并 pageHistory 历史重建项
    hqStore.select('overview')
    await act(async () => {
      root.render(renderNode())
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    expect(host.textContent).toContain('History check')

    act(() => { root.unmount() })
    host.remove()
  })

  it('BUG-398：从 final.md 发起复盘培养后跳转 HQ 时自动展开 CultivationCompose 并预填交付背景', async () => {
    const hqStore = createHqSectionStore()
    const hubStore = createHubSubViewStore()
    let registeredCultivate: ((ctx?: { messageId?: string; filePath?: string }) => void) | undefined
    registerWaveS1Ux({
      locale: { bind: () => makeT(zh) },
      inject: (deps: readonly string[], fn: (scoped: unknown) => void) => {
        if (deps.includes('layout')) { fn({ layout: { selectPanel: vi.fn() } }); return }
        fn({
          slots: {
            inject: (_n: string, reg: () => void) => { reg() },
            register: (def: { name: string; inject?: () => Record<string, unknown> }) => {
              if (def.name === 'sidebar.right.tab.document.actions') {
                registeredCultivate = def.inject?.().openCultivation as typeof registeredCultivate
              }
              return () => {}
            },
          },
          sidebarRight: { mounted: { getSnapshot: () => 's1', subscribe: () => () => {} }, openTab: vi.fn() },
          sessions: { binding: () => undefined },
        })
      },
    } as never, {
      attention: createAttentionRegistry(),
      hubStore,
      openHq: (section) => { if (section !== undefined) hqStore.select(section) },
    })

    registeredCultivate?.({ filePath: '/ws/.dsh-company/deliverables/2026-11-27-demo/final.md' })
    expect(hqStore.store.getSnapshot()).toBe('cultivation')

    const startupStore = createStartupStore()
    const storeState = {
      byId: { s1: { id: 's1' as SessionId, origin: 'human', cwd: '/ws', updatedAt: 100, displayTitle: 'Main', retainedBy: { mainView: 1 } } },
      projectionsBySession: { s1: { values: { agentPreset: 'ceo' } } },
    }
    const submittedLines: string[] = []
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(createElement(CompanyHqPage, {
        t: makeT(zh),
        useHqSection: (sel: (v: HqSection) => unknown) => sel(hqStore.store.getSnapshot()),
        useAttentionItems: (sel: (v: readonly unknown[]) => unknown) => sel([]),
        selectSection: (next: HqSection) => { hqStore.select(next) },
        returnToChat: vi.fn(),
        openSession: vi.fn(),
        useSessions: (sel: (v: typeof storeState) => unknown) => sel(storeState),
        useProjection: () => undefined,
        sessions: { retain: vi.fn(), create: vi.fn() },
        cultivationFiles: { listJournal: async () => [], readHead: async () => null, listRecords: async () => ({ ok: true as const, names: [] }), readRecord: async () => ({ ok: false as const, reason: 'unavailable' as const }) },
        cultivationActions: () => ({ run: async (line: string) => { submittedLines.push(line); return { ok: true as const, text: '已提交培养记录 r-398' } } }),
        followEvents: async function* () {},
        readLedger: async () => ({ ok: true as const, text: '' }),
        readCatalog: async () => ({ ok: true as const, text: '' }),
        contextSources: () => ({ listSessions: () => ({ ok: true as const, value: [] }), listDeliverables: async () => ({ ok: true as const, value: [] }), readPreview: async () => ({ ok: true as const }) }),
        openContext: async () => ({ ok: true as const }),
        openFinal: vi.fn(),
        startupStore,
        loadStartup: async () => {},
        saveStartup: async () => ({ ok: true as const }),
        resetStartup: async () => ({ ok: true as const }),
        SessionProvider: ({ children }: { children?: ReactNode }) => createElement('div', { 'data-session-provider': '1' }, children),
        renderSlot: () => createElement('div', null),
      } as unknown as ComponentProps<typeof CompanyHqPage>))
      await Promise.resolve()
    })

    expect(host.querySelector('textarea')).not.toBeNull()
    expect(host.textContent).toContain('2026-11-27-demo')
    expect(host.textContent).toContain('.dsh-company/deliverables/2026-11-27-demo/final.md')

    // BUG-398 盲审阻断补测：绝对路径归一成安全工作区相对路径，填期望后点提交可通过 encodeContextToken 并落盘命令行
    const expectationInput = host.querySelector('input') as HTMLInputElement
    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      nativeInputSetter.call(expectationInput, '交付前补充验收成本清单')
      expectationInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const submitBtn = [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === CULTIVATION_COPY.submit)!
    await act(async () => {
      submitBtn.click()
      await Promise.resolve()
    })
    expect(submittedLines).toHaveLength(1)
    expect(submittedLines[0]).toContain('--context=')
    const ctxToken = /--context=(\S+)/.exec(submittedLines[0] ?? '')?.[1]
    expect(decodeContextToken(ctxToken!)).toMatchObject({
      ok: true,
      command: { items: [{ kind: 'deliverable', ref: '.dsh-company/deliverables/2026-11-27-demo/final.md', label: '2026-11-27-demo' }] },
    })

    // 非工作区相对交付路径不注入无效 ref（避免提交被 encodeContextToken 拒收）
    await act(async () => {
      registeredCultivate?.({ filePath: '/tmp/outside.md' })
      await Promise.resolve()
    })
    expect(host.querySelector('.wk-cultivation-context-card')).toBeNull()

    // BUG-399：deliverables-archive 终稿也可归一并提交
    await act(async () => {
      registeredCultivate?.({ filePath: '/ws/.dsh-company/deliverables-archive/2026-11-27-archived/final.md' })
      await Promise.resolve()
    })
    expect(host.textContent).toContain('.dsh-company/deliverables-archive/2026-11-27-archived/final.md')

    act(() => { root.unmount() })
    host.remove()
  })

  it('BUG-399：双挂载 CultivationCompose 时 target=hq 只被 HQ 实例消费，不被侧栏抢占；openDeliverables 成功回调在异步切换后触发', async () => {
    const sidebarHost = document.createElement('div')
    const hqHost = document.createElement('div')
    document.body.append(sidebarHost, hqHost)
    const rSide = createRoot(sidebarHost)
    const rHq = createRoot(hqHost)
    const actions = { run: async () => ({ ok: true as const, text: 'ok' }) }

    const stubSources = {
      listSessions: () => ({ ok: true as const, value: [] }),
      listDeliverables: async () => ({ ok: true as const, value: [] }),
      readPreview: async () => ({ ok: true as const }),
    }
    await act(async () => {
      rSide.render(createElement(CultivationCompose, { viewerRole: 'ceo', actions, intentScope: 'sidebar', sources: stubSources, currentSessionId: 's1' }))
      rHq.render(createElement(CultivationCompose, { viewerRole: 'ceo', actions, intentScope: 'hq', sources: stubSources, currentSessionId: 's1' }))
    })
    await act(async () => {
      composeIntentStore.publish({ filePath: '/ws/.dsh-company/deliverables-archive/2026-11-27-old/final.md', target: 'hq' })
      await Promise.resolve()
    })
    expect(sidebarHost.querySelector('textarea')).toBeNull()
    expect(hqHost.querySelector('textarea')).not.toBeNull()
    expect(hqHost.textContent).toContain('.dsh-company/deliverables-archive/2026-11-27-old/final.md')

    act(() => { rSide.unmount(); rHq.unmount() })
    sidebarHost.remove()
    hqHost.remove()

    // openDeliverables 异步切换前不预判 toast.reviewOpened；mounted 就绪后才弹
    let mounted: string | undefined = undefined
    const listeners = new Set<() => void>()
    const openTab = vi.fn()
    const selectPanel = vi.fn(() => {
      mounted = 's-ready'
      for (const fn of listeners) fn()
    })
    let toastHook: ((sel: (v: unknown) => unknown) => unknown) | undefined
    let openDeliv: ((p?: string) => void) | undefined
    registerWaveS1Ux({
      locale: { bind: () => makeT(zh) },
      inject: (deps: readonly string[], fn: (scoped: unknown) => void) => {
        if (deps.includes('layout')) { fn({ layout: { selectPanel } }); return }
        fn({
          slots: {
            inject: (_n: string, reg: () => void) => { reg() },
            register: (def: { name: string; inject?: () => Record<string, unknown> }) => {
              if (def.name === 'shell.overlay') {
                const inj = def.inject?.() as { hooks?: { toastState?: { getSnapshot(): unknown } } }
                toastHook = sel => sel(inj.hooks?.toastState?.getSnapshot())
              }
              if (def.name === 'sidebar.right.tab.document.actions') {
                openDeliv = def.inject?.().openDeliverables as typeof openDeliv
              }
              return () => {}
            },
          },
          sidebarRight: {
            mounted: { getSnapshot: () => mounted, subscribe: (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } } },
            openTab,
          },
          sessions: { binding: () => undefined },
        })
      },
    } as never, { attention: createAttentionRegistry(), hubStore: createHubSubViewStore() })

    // 1. 先测 openTab 抛错 ⇒ 不弹 reviewOpened 成功提示
    openTab.mockImplementationOnce(() => { throw new Error('surface failed') })
    openDeliv?.()
    const errToast = toastHook?.(v => v) as { text?: string } | undefined
    expect(errToast?.text).toBe('surface failed')

    // 2. 再测成功切换 ⇒ 才弹 reviewOpened
    mounted = undefined
    openDeliv?.()
    const okToast = toastHook?.(v => v) as { text?: string } | undefined
    expect(okToast?.text).toBe(zh['toast.reviewOpened'])
  })

  it('BUG-403：CompanyHqPage 的全部 SegmentedControl 标签均有匹配 tabpanel', () => {
    const hqStore = createHqSectionStore()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(CompanyHqPage, {
        t: makeT(zh),
        useHqSection: <S,>(sel: (v: HqSection) => S) => sel(hqStore.store.getSnapshot()),
        useAttentionItems: <S,>(sel: (v: readonly unknown[]) => S) => sel([]),
        selectSection: (s: HqSection) => { hqStore.select(s) },
        returnToChat: vi.fn(),
        openSession: vi.fn(),
        useSessions: <S,>(sel: (v: { byId: Record<string, unknown>; projectionsBySession: Record<string, unknown> }) => S) =>
          sel({ byId: {}, projectionsBySession: {} }),
        sessions: { retain: vi.fn(), create: vi.fn() },
        cultivationFiles: { listJournal: vi.fn(async () => []), readHead: vi.fn(async () => null), listRecords: vi.fn(async () => ({ ok: true as const, names: [] })), readRecord: vi.fn(async () => null) },
        cultivationActions: () => ({ run: vi.fn(async () => ({ ok: true as const, text: 'ok' })) }),
        followEvents: async function* () {},
        readLedger: vi.fn(async () => ({ ok: true as const, text: '' })),
        readCatalog: vi.fn(async () => ({ ok: true as const, text: '' })),
        contextSources: vi.fn(() => ({ listSessions: () => ({ ok: true as const, value: [] }), listDeliverables: async () => ({ ok: true as const, value: [] }), readPreview: async () => ({ ok: true as const }) })),
        openContext: vi.fn(async () => ({ ok: true as const })),
        openFinal: vi.fn(),
        startupStore: createStartupStore(),
        loadStartup: vi.fn(async () => {}),
        saveStartup: vi.fn(async () => ({ ok: true as const })),
        resetStartup: vi.fn(async () => ({ ok: true as const })),
        renderSlot: () => null,
        SessionProvider: (({ children }: { children?: ReactNode }) => children) as unknown as ComponentProps<typeof CompanyHqPage>['SessionProvider'],
      } as unknown as ComponentProps<typeof CompanyHqPage>))
    })

    const tabs = [...host.querySelectorAll('[role="tab"]')]
    expect(tabs).toHaveLength(4)
    for (const tab of tabs) {
      const targetId = tab.getAttribute('aria-controls')!
      const panel = host.querySelector(`#${targetId}`)
      expect(panel?.getAttribute('role')).toBe('tabpanel')
    }
    act(() => { root.unmount() })
    host.remove()
  })
})

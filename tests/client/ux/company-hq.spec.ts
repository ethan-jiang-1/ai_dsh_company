// @vitest-environment happy-dom
/** Wave S3 全局总部 (`main` 面板 + `sidebar.panellist` + 内嵌培养会话) 单测。 */
// 负例留证 2026-11-26：en 字典混入 CJK ⇒ company-hq.spec.ts BUG-308 用例红；清除后绿。BUG-308
// 负例留证 2026-11-26：去掉 company-hq.tsx catch 后 `if (cancelled) return` 守卫 ⇒ BUG-348 用例红（卸载后清 storage key 并建孤儿会话）；还原后绿。BUG-348
// 负例留证 2026-11-27：把 CompanyHqPage 改回 `primarySession = sessionList[0]` 且不追踪 knownCultivationIds ⇒ BUG-384 用例红（create 被调用 6 次陷入循环）；还原后绿。BUG-384
// 负例留证 2026-11-27：去掉 HqCultivationWorkshop / CultivationBoard 的 `language` 同步 ⇒ BUG-385 用例红（en 界面仍渲染「我的分身」）；还原后绿。BUG-385
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
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import { setCultivationLanguage } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'

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
    hqStore.select('strategy')
    await renderPage()
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
      { variant: 'embedded', phase: 'hero', hero: true },
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
})

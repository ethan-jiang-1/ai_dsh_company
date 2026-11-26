/**
 * Wave S3 全局「梦之队总部 / Dream Team HQ」（`sidebar.panellist` + `main`）：
 * 1) 集中承接跨会话公司总览、待办审批、台账成品与项目策略；
 * 2) 培养工坊使用 DSH 官方内嵌会话（`SessionProvider` + `renderFactorySlot('conversation.content', { variant: 'embedded' })`），
 *    彻底淘汰手写聊天气泡、`<textarea>` 与全局输入框 CSS 隐藏 hack。
 */
import '../data/session-source.ts'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSnapshotStore, type ObservableSnapshot, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { Button, SegmentedControl, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  InjectFace,
  PropsLocale,
  PropsRenderFactories,
  PropsRenderSlots,
  PropsRuntime,
  SessionProviderComponent,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ISessions, SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConversationViewsProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { UseSidebarRightTabInfo } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { CultivationContext } from '../../lib/cultivation/cultivation-context.ts'
import { roleLabel } from '../../lib/cultivation/cultivation.ts'
import type { LivePending } from '../../lib/presence/attention.ts'
import type { StartupField } from '../../lib/startup/startup-settings.ts'
import { CultivationBoard } from '../cultivation/CultivationBoard.tsx'
import { setCultivationLanguage, type CultivationActionsFactory } from '../cultivation/cultivation-actions.ts'
import type { CultivationContextSources } from '../cultivation/cultivation-context-data.ts'
import {
  useCultivationFeedback,
  useCultivationPanelData,
  workspaceLabelOf,
  type CultivationFiles,
  type CultivationFollowEvents,
  type WorkspaceTextRead,
} from '../cultivation/cultivation-data.ts'
import type { CompanyT } from '../locales.ts'
import { roleText } from '../roles.ts'
import type { StrategyPanelProps } from '../startup/StrategyPanel.tsx'
import { StrategyPanel, type SaveResult } from '../startup/StrategyPanel.tsx'
import type { StartupStore } from '../startup/startup-store.ts'
import { DeliverablesTab, type DeliverablesTabProps } from '../tabs/DeliverablesTab.tsx'
import { LedgerTab, type LedgerTabProps } from '../tabs/LedgerTab.tsx'
import { readPresetFromSnapshot, sessionTitleOf } from '../ui/RoleBadge.tsx'

export const COMPANY_HQ_PANEL_ID = 'dsh-company-pack/hq' as MainPanelId
export const COMPANY_HQ_CULTIVATION_SLOT = 'company.hq.cultivation.conversation' as const

export type HqSection = 'overview' | 'ledger' | 'strategy' | 'cultivation'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'company.hq.cultivation.conversation': { kind: 'single'; scope: 'session' }
  }
}

export interface HqSectionStore {
  readonly store: SnapshotStore<HqSection>
  select(section: HqSection): void
}

/** 创建总部当前分区仓。 */
export function createHqSectionStore(): HqSectionStore {
  const store = createSnapshotStore<HqSection>('overview')
  return {
    store,
    select(section) {
      if (store.getSnapshot() === section) return
      store.set(section)
    },
  }
}

/** 左侧全局导航图标 (`sidebar.panellist`)。 */
export function CompanyHqIcon({ size, active }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      data-company-hq-icon={active ? 'active' : 'idle'}
    >
      <rect x="2.5" y="3" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M5.5 7.5h7M5.5 10.5h4.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="12.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  )
}

/** 固定 Chat 视图供总部培养工坊的 `embedded` 会话槽使用（仿 `ui-subagent`）。 */
export function FixedChatConversationView(props: ConversationViewsProps): ReactNode {
  return <>{props.renderSlot('conversation.session', { view: 'chat' })}</>
}

export type HqCultivationConversationSlotProps =
  PropsRuntime<'company.hq.cultivation.conversation'>
  & PropsRenderFactories

/** 在总部培养工坊内挂载官方 DSH 内嵌会话视图 (`conversation.content` embedded)。 */
export function HqCultivationConversationSlot({
  sessionId,
  useSession,
  useConversation,
  useSessions,
  renderFactorySlot,
}: HqCultivationConversationSlotProps): ReactNode {
  const session = useSession(value => value)
  const conversation = useConversation(value => value)
  const active = conversation.activeTargets.size > 0
    || (!session.blank && !session.awaitingFirstTurn)
    || session.running
  const shellPhase = active ? 'active' : session.promptAttempted ? 'engaging' : 'blank'
  const summaryBlank = useSessions(state => state.byId[sessionId]?.blank)
  const parentAvailabilityPending = session.subagent?.address.mode === 'continuable'
    && session.subagent.parentAvailable === undefined
  const settling = (shellPhase === 'blank' && session.openState === 'loading' && summaryBlank !== true)
    || parentAvailabilityPending
  const hero = shellPhase === 'blank' && (session.openState === 'open' || summaryBlank === true)
  const phase = settling ? 'settling' : hero ? 'hero' : 'active'
  return renderFactorySlot('conversation.content', { variant: 'embedded', phase, hero }, {
    slots: { views: FixedChatConversationView },
  })
}

export interface CompanyHqInjected {
  readonly hooks: {
    readonly hqSection: ObservableSnapshot<HqSection>
    readonly attentionItems: ObservableSnapshot<readonly LivePending[]>
  }
  readonly selectSection: (next: HqSection) => void
  readonly returnToChat: () => void
  readonly openSession: (sessionId: SessionId) => void
  readonly sessions: ISessions
  readonly cultivationFiles: CultivationFiles
  readonly cultivationActions: CultivationActionsFactory
  readonly followEvents: CultivationFollowEvents
  readonly readLedger: (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>
  readonly readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>
  readonly contextSources: (sessionId: SessionId) => CultivationContextSources
  readonly openContext: (sessionId: SessionId, context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false; readonly problem: string }>
  readonly openFinal: (sessionId: SessionId, path: string) => void
  readonly startupStore: StartupStore
  readonly loadStartup: (sessionId: SessionId, signal: AbortSignal) => Promise<void>
  readonly saveStartup: (sessionId: SessionId, field: StartupField, value: string | null) => Promise<SaveResult>
  readonly resetStartup: (sessionId: SessionId) => Promise<SaveResult>
}

export type CompanyHqPageProps =
  PropsRuntime<'main'>
  & PropsRenderSlots<'company.hq.cultivation.conversation'>
  & { readonly SessionProvider: SessionProviderComponent }
  & PropsLocale<'company'>
  & InjectFace<CompanyHqInjected>

type WorkshopState =
  | { readonly status: 'waiting' }
  | { readonly status: 'creating' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly reference: SessionReference }

const noopFloat = (): void => {}
const hqTabInfo: UseSidebarRightTabInfo = () => ({
  tab: { id: 'company-hq-tab', contentId: COMPANY_HQ_PANEL_ID },
}) as unknown as ReturnType<UseSidebarRightTabInfo>

const CULTIVATION_STORAGE_PREFIX = 'dsh-company-hq-cultivation:'

function readKnownCultivationIds(inMemory: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>(inMemory)
  if (typeof localStorage === 'undefined') return ids
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (storageKey !== null && storageKey.startsWith(CULTIVATION_STORAGE_PREFIX)) {
        const value = localStorage.getItem(storageKey)
        if (value !== null && value !== '') ids.add(value)
      }
    }
  } catch {
    // intentional-fallback: localStorage 不可读时仅使用内存已知培养会话集合。
  }
  return ids
}

function sessionSummaryList(state: {
  readonly byId: Readonly<Record<string, {
    readonly id: SessionId
    readonly origin?: string
    readonly blank?: boolean
    readonly running?: boolean
    readonly updatedAt?: number
    readonly cwd?: string
    readonly title?: string
    readonly displayTitle?: string
    readonly retainedBy?: { readonly mainView?: number }
  } | undefined>>
}) {
  return Object.values(state.byId)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined && entry.origin !== 'subagent')
    .toSorted((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
}

function pickPrimarySession<T extends { readonly id: SessionId; readonly retainedBy?: { readonly mainView?: number } }>(
  sessions: readonly T[],
  knownCultivationIds: ReadonlySet<string>,
  pinnedId: SessionId | undefined,
): T | undefined {
  const nonCultivation = sessions.filter(s => !knownCultivationIds.has(String(s.id)))
  const pool = nonCultivation.length > 0 ? nonCultivation : sessions
  const activeMain = pool.find(s => (s.retainedBy?.mainView ?? 0) > 0)
  if (activeMain !== undefined) return activeMain
  if (pinnedId !== undefined) {
    const pinned = pool.find(s => s.id === pinnedId)
    if (pinned !== undefined) return pinned
  }
  return pool[0]
}

function HqCultivationWorkshop({
  mainSessionId,
  cwd,
  viewerRole,
  sessions,
  cultivationFiles,
  cultivationActions,
  followEvents,
  contextSources,
  openContext,
  renderSlot,
  SessionProvider,
  isKnownCultivationSession,
  onCultivationSessionCreated,
  t,
}: {
  readonly mainSessionId: SessionId | undefined
  readonly cwd: string | undefined
  readonly viewerRole: string | null
  readonly sessions: ISessions
  readonly cultivationFiles: CultivationFiles
  readonly cultivationActions: CultivationActionsFactory
  readonly followEvents: CultivationFollowEvents
  readonly contextSources: (sessionId: SessionId) => CultivationContextSources
  readonly openContext: (sessionId: SessionId, context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false; readonly problem: string }>
  readonly renderSlot: CompanyHqPageProps['renderSlot']
  readonly SessionProvider: SessionProviderComponent
  readonly isKnownCultivationSession: (id: SessionId) => boolean
  readonly onCultivationSessionCreated: (id: SessionId) => void
  readonly t: CompanyT
}): ReactNode {
  const lang = t('meta.language') === 'en' ? 'en' : 'zh'
  setCultivationLanguage(lang)
  const effectiveSessionId = (mainSessionId ?? 'hq-none') as SessionId
  const panelData = useCultivationPanelData(cultivationFiles, effectiveSessionId)
  const feedback = useCultivationFeedback(followEvents, effectiveSessionId)
  const actions = useMemo(() => cultivationActions(effectiveSessionId), [cultivationActions, effectiveSessionId])
  const scopedSources = useMemo(() => contextSources(effectiveSessionId), [contextSources, effectiveSessionId])

  const [started, setStarted] = useState(false)
  const [workshop, setWorkshop] = useState<WorkshopState>({ status: 'waiting' })

  const key = mainSessionId === undefined ? null : `${CULTIVATION_STORAGE_PREFIX}${String(mainSessionId)}`
  const existingStoredId = key === null || typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  const shouldConnect = started || (existingStoredId !== null && existingStoredId !== '')

  useEffect(() => {
    if (mainSessionId === undefined || cwd === undefined || !shouldConnect) {
      setWorkshop({ status: 'waiting' })
      return
    }
    let cancelled = false
    let reference: SessionReference | undefined
    const storageKey = `${CULTIVATION_STORAGE_PREFIX}${String(mainSessionId)}`
    setWorkshop({ status: 'creating' })

    const open = async (targetId: SessionId): Promise<void> => {
      reference = sessions.retain(targetId, { source: 'companyCultivation' })
      await reference.ready
      if (cancelled) {
        reference.release()
        return
      }
      setWorkshop({ status: 'ready', reference })
    }

    const run = async (): Promise<void> => {
      if (isKnownCultivationSession(mainSessionId)) {
        await open(mainSessionId)
        return
      }
      const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey)
      if (stored !== null && stored !== '') {
        try {
          await open(stored as SessionId)
          return
        } catch {
          try { reference?.release() } catch { /* already released */ }
          reference = undefined
          // BUG-348：卸载/切换后 `ready` 才 reject 时不再清 key、更不新建会话。
          if (cancelled) return
          if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey)
        }
      }
      const created = await sessions.create({
        cwd,
        ...(viewerRole === null ? {} : { agentPreset: viewerRole }),
      })
      onCultivationSessionCreated(created)
      if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, String(created))
      if (cancelled) return
      await open(created)
    }

    run().catch((error: unknown) => {
      if (cancelled) return
      setWorkshop({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    })

    return () => {
      cancelled = true
      try { reference?.release() } catch { /* already released */ }
    }
  }, [sessions, mainSessionId, cwd, viewerRole, shouldConnect, isKnownCultivationSession, onCultivationSessionCreated])

  return (
    <div className="wk-hq-cultivation-split">
      <div className="wk-hq-cultivation-board">
        {mainSessionId === undefined ? (
          <div className="wk-hq-empty">{t('hq.cultivationWaiting')}</div>
        ) : (
          <CultivationBoard
            language={lang}
            viewerRole={viewerRole}
            viewerLabel={viewerRole === null ? null : roleText(viewerRole, 'label', t, roleLabel(viewerRole))}
            workspaceLabel={workspaceLabelOf(cwd)}
            recordsProblem={panelData.recordsProblem}
            roleLabel={role => roleText(role, 'label', t, roleLabel(role))}
            journalRows={panelData.journalRows}
            records={panelData.records}
            brokenRecords={panelData.brokenRecords}
            unexpandedRecords={panelData.unexpandedRecords}
            feedback={feedback}
            feedbackReachable
            actions={actions}
            onRefresh={panelData.refresh}
            contextSources={scopedSources}
            currentSessionId={mainSessionId}
            teammate={false}
            openContext={context => openContext(mainSessionId, context)}
          />
        )}
      </div>
      <section className="wk-hq-cultivation-chat" aria-label={t('hq.tab.cultivation')}>
        {mainSessionId === undefined ? (
          <div className="wk-hq-empty">{t('hq.cultivationWaiting')}</div>
        ) : workshop.status === 'ready' ? (
          <SessionProvider session={workshop.reference}>
            {renderSlot(COMPANY_HQ_CULTIVATION_SLOT, {})}
          </SessionProvider>
        ) : workshop.status === 'creating' ? (
          <div className="wk-hq-empty">{t('hq.cultivationCreating')}</div>
        ) : workshop.status === 'error' ? (
          <div className="wk-hq-empty">
            <p className="wk-error">{workshop.message}</p>
            <Button size="sm" variant="outline" onClick={() => { setStarted(true) }}>
              {t('hq.cultivationStart')}
            </Button>
          </div>
        ) : (
          <div className="wk-hq-empty">
            <p className="wk-hq-subtitle">{t('hq.cultivationWorkshopHint')}</p>
            <Button size="sm" variant="primary" onClick={() => { setStarted(true) }}>
              {t('hq.cultivationStart')}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

/** 梦之队全局总部主面板（`main` keyed 槽）。 */
export function CompanyHqPage(props: CompanyHqPageProps): ReactNode {
  const {
    t,
    useHqSection,
    useAttentionItems,
    selectSection,
    returnToChat,
    openSession,
    useSessions,
    sessions,
    cultivationFiles,
    cultivationActions,
    followEvents,
    readLedger,
    readCatalog,
    contextSources,
    openContext,
    openFinal,
    startupStore,
    loadStartup,
    saveStartup,
    resetStartup,
    renderSlot,
    SessionProvider,
  } = props

  const section = useHqSection(value => value)
  const pendingItems = useAttentionItems(value => value)
  const sessionList = useSessions(sessionSummaryList)
  const createdCultivationIdsRef = useRef<Set<string>>(new Set())
  const pinnedSessionIdRef = useRef<SessionId | undefined>(undefined)
  const knownCultivationIds = readKnownCultivationIds(createdCultivationIdsRef.current)
  const primarySession = pickPrimarySession(sessionList, knownCultivationIds, pinnedSessionIdRef.current)
  if (primarySession !== undefined && !knownCultivationIds.has(String(primarySession.id))) {
    pinnedSessionIdRef.current = primarySession.id
  }
  const onCultivationSessionCreated = useCallback(
    (createdId: SessionId) => { createdCultivationIdsRef.current.add(String(createdId)) },
    [],
  )
  const isKnownCultivationSession = useCallback(
    (id: SessionId) => readKnownCultivationIds(createdCultivationIdsRef.current).has(String(id)),
    [],
  )
  const viewerRole = useSessions(state => (
    primarySession === undefined
      ? null
      : readPresetFromSnapshot(state as unknown as Parameters<typeof readPresetFromSnapshot>[0], primarySession.id)
  ))

  return (
    <div className="wk-hq-page" data-company-hq="">
      <header className="wk-hq-header">
        <div className="wk-hq-header-title">
          <h1 className="wk-hq-title">{t('hq.title')}</h1>
          <p className="wk-hq-subtitle">{t('hq.subtitle')}</p>
        </div>
        <div className="wk-hq-header-actions">
          <SegmentedControl<HqSection>
            id="company-hq-segments"
            label={t('hq.title')}
            value={section}
            onChange={selectSection}
            options={[
              { value: 'overview', label: t('hq.tab.overview') },
              { value: 'ledger', label: t('hq.tab.ledger') },
              { value: 'strategy', label: t('hq.tab.strategy') },
              { value: 'cultivation', label: t('hq.tab.cultivation') },
            ]}
          />
          <Button size="sm" variant="outline" onClick={returnToChat}>
            {t('hq.returnToChat')}
          </Button>
        </div>
      </header>

      <div className="wk-hq-body">
        {section === 'overview' && (
          <div className="wk-hq-grid">
            <section className="wk-hq-card">
              <div className="wk-hq-card-title">{t('hq.sessionsHeading')}</div>
              {sessionList.length === 0 ? (
                <div className="wk-hq-empty">{t('hq.sessionsEmpty')}</div>
              ) : (
                <div className="wk-hq-list">
                  {sessionList.map(item => (
                    <div key={item.id} className="wk-hq-row">
                      <span className="wk-hq-row-label">{sessionTitleOf(item) ?? item.id}</span>
                      <Tag tone={item.running ? 'warning' : 'neutral'}>{item.id.slice(0, 8)}</Tag>
                      <Button size="sm" variant="ghost" onClick={() => { openSession(item.id) }}>
                        {t('hq.openSession')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="wk-hq-card">
              <div className="wk-hq-card-title">{t('hq.pendingHeading')}</div>
              {pendingItems.length === 0 ? (
                <div className="wk-hq-empty">{t('hq.pendingEmpty')}</div>
              ) : (
                <div className="wk-hq-list">
                  {pendingItems.map(item => (
                    <div key={`${item.kind}:${item.sessionId}:${String(item.since)}`} className="wk-hq-row">
                      <Tag tone={item.kind === 'approval' ? 'danger' : 'warning'}>
                        {item.kind}
                      </Tag>
                      <span className="wk-hq-row-label">{item.what}</span>
                      <Button size="sm" variant="ghost" onClick={() => { openSession(item.sessionId as SessionId) }}>
                        {t('hq.openSession')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {section === 'ledger' && (
          primarySession === undefined ? (
            <div className="wk-hq-empty">{t('hq.ledgerEmpty')}</div>
          ) : (
            <div className="wk-hq-grid">
              <section className="wk-hq-card">
                <LedgerTab
                  {...({
                    sessionId: primarySession.id,
                    useSessions,
                    useTabInfo: hqTabInfo,
                    floatTab: noopFloat,
                    unfloatTab: noopFloat,
                    readLedger,
                    t,
                  } as unknown as LedgerTabProps)}
                />
              </section>
              <section className="wk-hq-card">
                <DeliverablesTab
                  {...({
                    sessionId: primarySession.id,
                    useSessions,
                    useTabInfo: hqTabInfo,
                    floatTab: noopFloat,
                    unfloatTab: noopFloat,
                    readCatalog,
                    openFinal,
                    t,
                  } as unknown as DeliverablesTabProps)}
                />
              </section>
            </div>
          )
        )}

        {section === 'strategy' && (
          primarySession === undefined ? (
            <div className="wk-hq-empty">{t('hq.sessionsEmpty')}</div>
          ) : (
            <section className="wk-hq-card">
              <StrategyPanel
                {...({
                  sessionId: primarySession.id,
                  useSessions,
                  useTabInfo: hqTabInfo,
                  store: startupStore,
                  load: loadStartup,
                  save: saveStartup,
                  reset: resetStartup,
                  floatTab: noopFloat,
                  unfloatTab: noopFloat,
                  t,
                } as unknown as StrategyPanelProps)}
              />
            </section>
          )
        )}

        {section === 'cultivation' && (
          <HqCultivationWorkshop
            mainSessionId={primarySession?.id}
            cwd={primarySession?.cwd}
            viewerRole={viewerRole}
            sessions={sessions}
            cultivationFiles={cultivationFiles}
            cultivationActions={cultivationActions}
            followEvents={followEvents}
            contextSources={contextSources}
            openContext={openContext}
            renderSlot={renderSlot}
            SessionProvider={SessionProvider}
            isKnownCultivationSession={isKnownCultivationSession}
            onCultivationSessionCreated={onCultivationSessionCreated}
            t={t}
          />
        )}
      </div>
    </div>
  )
}

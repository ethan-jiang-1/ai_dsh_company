/**
 * 右栏 3 合一集成页签体（Wave S2）：
 * - OpsHubTab（作战板）：看板 · 依赖图 · 任务板 · 项目策略
 * - TeamHubTab（团队）：待办审批 · 团队在场 · 令牌用量
 * - ArchiveHubTab（档案）：成品目录 · 动议台账 · 角色培养
 *
 * 每个集成页签通过 DSH 原生 `SegmentedControl` 在内部切换子视图，
 * 并在根节点保留 `data-company-tab-title={t('tabs.<hub>.label')}` 供自动化探针识别。
 */
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { Button, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CultivationContext } from '../../lib/cultivation/cultivation-context.ts'
import type { StartupField } from '../../lib/startup/startup-settings.ts'
import type { CultivationActionsFactory } from '../cultivation/cultivation-actions.ts'
import type { CultivationContextSources } from '../cultivation/cultivation-context-data.ts'
import type { CultivationFiles, WorkspaceTextRead } from '../cultivation/cultivation-data.ts'
import type { CompanyDataInjected } from '../data/use-company-data.ts'
import type { CompanyT } from '../locales.ts'
import type { SessionPageFace } from '../presence/attention-history.ts'
import { StrategyPanel, type SaveResult } from '../startup/StrategyPanel.tsx'
import type { StartupStore } from '../startup/startup-store.ts'
import type { FloatRectLike } from '../ui/float-geometry.ts'
import type { RoleBadgeInjected } from '../ui/RoleBadge.tsx'
import type { AttentionRegistry } from '../wiring/attention-registry.ts'
import { AttentionTab } from './AttentionTab.tsx'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from './company-tabs.tsx'
import { CultivationTab } from './CultivationTab.tsx'
import { DeliverablesTab } from './DeliverablesTab.tsx'
import {
  type ArchiveSection,
  type HubId,
  type HubSubViewState,
  type OpsSection,
  type TeamSection,
} from './hub-subview-store.ts'
import { LedgerTab } from './LedgerTab.tsx'

export interface HubCommonInjected {
  readonly hooks: {
    readonly hubState: ObservableSnapshot<HubSubViewState>
  }
  readonly selectSection: <K extends HubId>(hub: K, section: HubSubViewState[K]) => void
  readonly openSplit?: ((preset: 'ops' | 'review' | 'quiet') => void) | undefined
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab?: ((paneId: string) => void) | undefined
  readonly t: CompanyT
}

export interface OpsHubInjected extends HubCommonInjected, CompanyDataInjected {
  readonly startupStore: StartupStore
  readonly loadStartup: (sessionId: SessionId, signal: AbortSignal) => Promise<void>
  readonly saveStartup: (sessionId: SessionId, field: StartupField, value: string | null) => Promise<SaveResult>
  readonly resetStartup: (sessionId: SessionId) => Promise<SaveResult>
}

export interface TeamHubInjected extends HubCommonInjected, CompanyDataInjected {
  readonly attention: AttentionRegistry
  readonly openSession: (sessionId: SessionId) => void
  readonly openMember: (sessionId: SessionId, member: { readonly id: string; readonly role: 'lead' | 'teammate' }) => Promise<void>
  readonly openMemberAside?: ((sessionId: SessionId, memberId: string) => void) | undefined
  readonly pageHistory: SessionPageFace
}

export interface ArchiveHubInjected extends HubCommonInjected {
  readonly follow: CompanyDataInjected['follow']
  readonly cultivationFiles: CultivationFiles
  readonly cultivationActions: CultivationActionsFactory
  readonly roleSource: RoleBadgeInjected['roleSource']
  readonly readLedger: (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>
  readonly readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>
  readonly contextSources: (sessionId: SessionId) => CultivationContextSources
  readonly openContext: (sessionId: SessionId, context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false; readonly problem: string }>
  readonly openFinal: (sessionId: SessionId, path: string) => void
}

export type OpsHubTabProps = PropsRuntime<'sidebar.right.pane.tab'> & InjectFace<OpsHubInjected>
export type TeamHubTabProps = PropsRuntime<'sidebar.right.pane.tab'> & InjectFace<TeamHubInjected>
export type ArchiveHubTabProps = PropsRuntime<'sidebar.right.pane.tab'> & InjectFace<ArchiveHubInjected>

function useSidebarFullscreen(useTabInfo: OpsHubTabProps['useTabInfo']): boolean {
  const info = useTabInfo() as { readonly sidebar?: { readonly fullscreen?: boolean } } | undefined
  return info?.sidebar?.fullscreen === true
}

/** 作战板：看板 · 依赖图 · 任务板 · 项目策略。 */
export function OpsHubTab(props: OpsHubTabProps): ReactNode {
  const section = props.useHubState((state: HubSubViewState) => state.ops)
  const { t, selectSection, openSplit, startupStore, loadStartup, saveStartup, resetStartup, ...tabRest } = props
  const isFullscreen = useSidebarFullscreen(props.useTabInfo)

  return (
    <div className="wk-hub-pane" data-company-hub="ops" data-company-tab-title={t('tabs.ops.label')}>
      <div className="wk-hub-bar">
        <SegmentedControl<OpsSection>
          id="company-ops-segments"
          label={t('tabs.ops.label')}
          value={section}
          onChange={(next) => { selectSection('ops', next) }}
          options={[
            { value: 'board', label: t('tabs.board.label') },
            { value: 'dag', label: t('tabs.dag.label') },
            { value: 'tasks', label: t('tabs.tasks.label') },
            { value: 'strategy', label: t('tabs.strategy.label') },
          ]}
        />
        {openSplit === undefined ? null : isFullscreen ? (
          <Button size="sm" variant="outline" data-company-narrow-close="" onClick={() => { openSplit('quiet') }}>
            {t('layout.closeRightbar')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { openSplit('ops') }}>
            {t('layout.splitOps')}
          </Button>
        )}
      </div>
      <div className="wk-hub-body">
        {section === 'board' && <BoardTab {...tabRest} t={t} />}
        {section === 'dag' && <DagTab {...tabRest} t={t} />}
        {section === 'tasks' && <TasksTab {...tabRest} t={t} />}
        {section === 'strategy' && (
          <StrategyPanel
            {...tabRest}
            t={t}
            store={startupStore}
            load={loadStartup}
            save={saveStartup}
            reset={resetStartup}
          />
        )}
      </div>
    </div>
  )
}

/** 团队：待办审批 · 团队在场 · 令牌用量。 */
export function TeamHubTab(props: TeamHubTabProps): ReactNode {
  const section = props.useHubState((state: HubSubViewState) => state.team)
  const { t, selectSection, openSplit, attention, openSession, openMember, openMemberAside, pageHistory, ...tabRest } = props
  const isFullscreen = useSidebarFullscreen(props.useTabInfo)

  return (
    <div className="wk-hub-pane" data-company-hub="team" data-company-tab-title={t('tabs.team.label')}>
      <div className="wk-hub-bar">
        <SegmentedControl<TeamSection>
          id="company-team-segments"
          label={t('tabs.team.label')}
          value={section}
          onChange={(next) => { selectSection('team', next) }}
          options={[
            { value: 'attention', label: t('tabs.attention.label') },
            { value: 'presence', label: t('tabs.presence.label') },
            { value: 'budget', label: t('tabs.budget.label') },
          ]}
        />
        {isFullscreen && openSplit !== undefined ? (
          <Button size="sm" variant="outline" data-company-narrow-close="" onClick={() => { openSplit('quiet') }}>
            {t('layout.closeRightbar')}
          </Button>
        ) : null}
      </div>
      <div className="wk-hub-body">
        {section === 'attention' && (
          <AttentionTab
            {...tabRest}
            t={t}
            getPending={() => attention.list()}
            openSession={openSession}
            pageHistory={pageHistory}
          />
        )}
        {section === 'presence' && (
          <PresenceTab
            {...tabRest}
            t={t}
            openMember={openMember}
            openMemberAside={openMemberAside}
          />
        )}
        {section === 'budget' && <BudgetTab {...tabRest} t={t} />}
      </div>
    </div>
  )
}

/** 档案：成品目录 · 动议台账 · 角色培养。 */
export function ArchiveHubTab(props: ArchiveHubTabProps): ReactNode {
  const section = props.useHubState((state: HubSubViewState) => state.archive)
  const {
    t,
    selectSection,
    openSplit,
    follow,
    cultivationFiles,
    cultivationActions,
    roleSource,
    readLedger,
    readCatalog,
    contextSources,
    openContext,
    openFinal,
    ...tabRest
  } = props
  const isFullscreen = useSidebarFullscreen(props.useTabInfo)

  return (
    <div className="wk-hub-pane" data-company-hub="archive" data-company-tab-title={t('tabs.archive.label')}>
      <div className="wk-hub-bar">
        <SegmentedControl<ArchiveSection>
          id="company-archive-segments"
          label={t('tabs.archive.label')}
          value={section}
          onChange={(next) => { selectSection('archive', next) }}
          options={[
            { value: 'deliverables', label: t('tabs.catalog.label') },
            { value: 'ledger', label: t('tabs.ledger.label') },
            { value: 'cultivation', label: t('tabs.cultivation.label') },
          ]}
        />
        {openSplit === undefined ? null : isFullscreen ? (
          <Button size="sm" variant="outline" data-company-narrow-close="" onClick={() => { openSplit('quiet') }}>
            {t('layout.closeRightbar')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { openSplit('review') }}>
            {t('layout.splitReview')}
          </Button>
        )}
      </div>
      <div className="wk-hub-body">
        {section === 'deliverables' && (
          <DeliverablesTab
            {...tabRest}
            t={t}
            readCatalog={readCatalog}
            openFinal={openFinal}
          />
        )}
        {section === 'ledger' && <LedgerTab {...tabRest} t={t} readLedger={readLedger} />}
        {section === 'cultivation' && (
          <CultivationTab
            {...tabRest}
            t={t}
            cultivationFiles={cultivationFiles}
            cultivationActions={cultivationActions}
            followEvents={follow}
            roleSource={roleSource}
            contextSources={contextSources}
            openContext={openContext}
          />
        )}
      </div>
    </div>
  )
}

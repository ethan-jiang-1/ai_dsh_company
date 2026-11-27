/**
 * 公司页签外框与各领域面板体（看板 / 依赖图 / 在场 / 用量 / 任务板）。
 *
 * 只有平台级 tab 才能被 `ctx.sidebarRight.float(tabId)` 拖出成浮窗或 split 并看；
 * 数据面统一走 `useCompanyData`（与全局 HQ 视图共用，零重复）。
 * 「在场」页签通过 `session/follow` 流式展示成员在线态、当前任务与实时协作动态。
 */
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { PresenceRow } from '../../lib/presence/presence.ts'
import { joinList, listSeparator } from '../ui/list-separator.ts'
import { memberDot } from '../../lib/presence/presence-status.ts'
import { clampRect, loadFloatRect, type FloatRectLike } from '../ui/float-geometry.ts'
import { BoardPanel, BudgetPanel, DagPanel, StateNote, StreamErrorNotice, activityText } from './company-panels.tsx'
import { DelegationFlowPanel } from './DelegationFlowPanel.tsx'
import { buildDelegationTree, type DelegationSessionSummaryLike } from '../../lib/delegation/delegation-tree.ts'
import { TasksTableView } from './TasksPanel.tsx'
import { MAX_ACTIVITY, useCompanyData, type CompanyDataInjected } from '../data/use-company-data.ts'
import { zh, type CompanyKey, type CompanyT } from '../locales.ts'
import { memberRoleText, presenceRoleText, roleTextForCanonical } from '../roles.ts'

/** 页签体注入面：数据面 + 平台浮出操作。 */
export interface CompanyTabInjected extends CompanyDataInjected {
  /** `ctx.sidebarRight.float`：把本页签拽出成浮窗（rect = 记忆摆位）。 */
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  /** `ctx.sidebarRight.dock`：保留给旧调用签名兼容（浮出收回由 DSH 原生浮窗栏接管）。 */
  readonly unfloatTab?: ((paneId: string) => void) | undefined
}

/** 页签体 props：槽标准 props（含 `sessionId` / `useProjection` / `useTabInfo`）+ 注入面。 */
export type CompanyTabProps = PropsRuntime<'sidebar.right.pane.tab'> & CompanyTabInjected & { readonly t: CompanyT }

/** 在场页签额外需要成员空间入口与旁路对话深链（行可点）。 */
export type PresenceTabProps = CompanyTabProps & {
  readonly openMember: (sessionId: SessionId, member: { readonly id: string; readonly role: 'lead' | 'teammate' }) => Promise<void>
  readonly openMemberAside?: ((sessionId: SessionId, memberId: string) => void) | undefined
}

/**
 * 页签体共用外框需要的最小 props（`useTabInfo` + 浮出操作）——「待办」页签（AttentionTab）
 * 复用同一外框，故收窄成独立接口导出（结构上 CompanyTabProps 天然满足）。
 */
export interface PanelFrameProps {
  readonly useTabInfo: CompanyTabProps['useTabInfo']
  readonly floatTab?: ((tabId: TabId, rect?: FloatRectLike) => void) | undefined
  readonly unfloatTab?: ((paneId: string) => void) | undefined
  readonly t?: CompanyT
}

/**
 * 页签体共用外框：tone 色条 + 标题 + 刷新说明 + 页签自备动作（可选） + 浮出 + 内容。
 * 浮出后的收回/拖拽/缩放全部交给 DSH 原生 DockLayout 浮窗标题栏，不伪造 `useTabInfo()` 字段。
 */
const defaultPanelT = ((key: CompanyKey) => zh[key]) as CompanyT

/** DockKit 浮出窗的 `pane.id` 统一带 `float` 前缀（上游 `minter.next('float')`），用于收敛仅限侧栏的动作。 */
export function isFloatingPaneInfo(info: { readonly panel?: { readonly id?: string } } | undefined): boolean {
  return typeof info?.panel?.id === 'string' && info.panel.id.startsWith('float')
}

export function PanelFrame({ title, tone, tabProps, action, children, refreshLabel }: {
  readonly title: string
  readonly tone: string
  readonly tabProps: PanelFrameProps
  readonly action?: ReactNode
  readonly children: ReactNode
  /** 页签头的新鲜度文案；**必须说真话**。 */
  readonly refreshLabel?: string
}) {
  const t = tabProps.t ?? defaultPanelT
  const info = tabProps.useTabInfo()
  const floatTab = tabProps.floatTab
  const isFloating = isFloatingPaneInfo(info)
  return (
    <div className="wk-pane">
      <div className={`wk-pane-strip wk-tone-${tone}`} aria-hidden="true" />
      <div className="wk-pane-head">
        <strong>{title}</strong>
        <span className="wk-meta">{refreshLabel ?? t('panel.projected')}</span>
        <span style={{ flex: 1 }} />
        {action}
        {floatTab === undefined || isFloating ? null : (
          <Button
            size="sm"
            variant="ghost"
            title={t('panel.floatTitle')}
            onClick={() => {
              const tabKey = info.tab.contentId !== '' ? info.tab.contentId : info.tab.id
              const saved = loadFloatRect(window.localStorage, tabKey)
              floatTab(info.tab.id, saved === null ? undefined : clampRect(saved, window.innerWidth, window.innerHeight))
            }}
          >
            {t('panel.float')}
          </Button>
        )}
      </div>
      {/* data-company-tab-title = 面板标题，给真实页面探针一个「面板体在场」的稳定锚；
          标题文本会出现在 tab strip，不能拿 body 里的标题词判断面板是否渲染。
          data-company-tab 保留平台 contentId（kind/id 语义由平台定），不作 catalog id 使用。 */}
      <div className="wk-pane-body" data-company-tab={info.tab.contentId} data-company-tab-title={title}>{children}</div>
    </div>
  )
}

/** 成员状态 → Tag 色调。 */
function memberTone(status: PresenceRow['status']): 'info' | 'danger' | 'warning' | 'outline' {
  if (status === 'running') return 'info'
  if (status === 'failed') return 'danger'
  if (status === 'provisioning') return 'warning'
  return 'outline'
}

/**
 * 看板页签体。
 * @param props - 槽 props + 注入数据面。
 * @returns 看板。
 */
/** 看板 owner 名的表达层映射（BUG-358）：canonical → 当前语言；抽成具名函数便于单测覆盖。 */
export const boardRoleLabel = (t: CompanyT) => (label: string): string => roleTextForCanonical(label, t)

export function BoardTab(props: CompanyTabProps) {
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions, { stream: true })
  return (
    <PanelFrame title={props.t('tabs.board.label')} tone="overview" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      {data.streamError === null ? null : <StreamErrorNotice message={data.streamError} t={props.t} />}
      <BoardPanel columns={data.columns} roleLabel={boardRoleLabel(props.t)} t={props.t} />
    </PanelFrame>
  )
}

/**
 * 依赖图页签体。
 * 「重画」（2026-09-28 用户令）：偶发渲染抽风时手动强制重画——`key` 递增 ⇒ DagPanel 整组件
 * 重挂载（重测容器宽、重放布局与入场动画）；平时不需要（5 秒自动刷新只换数据不重挂载）。
 * @param props - 槽 props + 注入数据面。
 * @returns 依赖图。
 */
export function DagTab(props: CompanyTabProps) {
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions, { stream: true })
  const byId = props.useSessions(state => (state as unknown as {
    readonly byId?: Readonly<Record<string, DelegationSessionSummaryLike>>
  }).byId)
  const tree = buildDelegationTree(byId === undefined ? {} : { byId }, props.leadOf(props.sessionId))
  const [redrawKey, setRedrawKey] = useState(0)
  return (
    <PanelFrame
      title={props.t('tabs.dag.label')}
      tone="structure"
      tabProps={props}
      action={(
        <Button
          size="sm"
          variant="ghost"
          title={props.t('dag.redrawTitle')}
          onClick={() => { setRedrawKey(previous => previous + 1) }}
        >
          {props.t('dag.redraw')}
        </Button>
      )}
    >
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      {data.streamError === null ? null : <StreamErrorNotice message={data.streamError} t={props.t} />}
      <DelegationFlowPanel tree={tree} t={props.t} />
      <DagPanel key={redrawKey} layout={data.dag} roleLabel={label => roleTextForCanonical(label, props.t)} t={props.t} />
    </PanelFrame>
  )
}

/**
 * 在场页签体（原驾驶舱升级）：成员行（点行进成员空间）+ 流式协作动态。
 * @param props - 槽 props + 注入数据面 + 成员空间入口。
 * @returns 在场面板。
 */
export function PresenceTab(props: PresenceTabProps) {
  const { openMember, openMemberAside, t, ...dataFace } = props
  const data = useCompanyData(dataFace, props.sessionId, props.useProjection, props.useSessions, { stream: true })
  const rows = data.rows.map(row => ({ ...row, displayName: presenceRoleText(row, t) }))
  return (
    <PanelFrame title={t('tabs.presence.label')} tone="people" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      {data.streamError !== null && <div className="wk-error">{t('presence.streamError', { message: data.streamError })}</div>}
      {rows.length === 0
        ? <StateNote text={t('presence.empty')} />
        : (
          <>
            <div className="wk-row wk-row-head" aria-hidden="true">
              <span className="wk-row-name">{t('presence.member')}</span>
              <span className="wk-row-status">{t('presence.statusColumn')}</span>
              <span className="wk-row-task">{t('presence.taskColumn')}</span>
              {openMemberAside !== undefined ? <span className="wk-row-aside-cell" /> : null}
            </div>
            <div role="list" aria-label={t('presence.boardAria')} className="wk-list">
              {rows.map(row => (
                <div key={row.id} role="listitem" className="wk-row-wrap">
                  <button
                    type="button"
                    className="wk-row wk-row-button"
                    aria-label={t('presence.rowAria', { name: row.displayName, status: t(`presence.status.${row.status}` as CompanyKey), task: row.currentTasks === null ? t('presence.noTask') : t('presence.task', { task: joinList(row.currentTasks, listSeparator(t)) }) })}
                    title={row.role === 'lead' ? t('presence.openLead') : t('presence.openMember')}
                    onClick={() => { void openMember(props.sessionId, { id: row.id, role: row.role }) }}
                  >
                    <span className="wk-row-name">
                      <StateDot state={memberDot(row.status)} />
                      {row.displayName}
                      {row.role === 'lead' ? <Tag tone="neutral">Lead</Tag> : null}
                    </span>
                    <span className="wk-row-status"><Tag tone={memberTone(row.status)}>{t(`presence.status.${row.status}` as CompanyKey)}</Tag></span>
                    <span className="wk-row-task" title={row.currentTasks === null ? '' : joinList(row.currentTasks, listSeparator(t))}>{row.currentTasks === null ? '—' : joinList(row.currentTasks, listSeparator(t))}</span>
                  </button>
                  {openMemberAside !== undefined ? (
                    <span className="wk-row-aside-cell">
                      {row.role === 'teammate' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-presence-aside={row.id}
                          onClick={() => { openMemberAside(props.sessionId, row.id) }}
                        >
                          {t('presence.openAside')}
                        </Button>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="wk-meta wk-lead-note">{t('presence.statusNote')}</div>
          </>
        )}
      <div className="wk-activity-block">
        <strong>{t('presence.activity')}</strong>
        {data.activityCapped > 0 && (
          <div className="wk-meta">{t('presence.activityCapped', { count: data.activityCapped, limit: MAX_ACTIVITY })}</div>
        )}
        {data.activity.length === 0
          ? <StateNote text={t('presence.emptyActivity')} />
          : (
            <ul className="wk-activity">
              {data.activity.map(entry => (
                <li key={`${String(entry.time)}-${entry.kind}-${entry.text}`}>{activityText(entry, t)}</li>
              ))}
            </ul>
          )}
      </div>
    </PanelFrame>
  )
}

/**
 * 用量页签体（只做令牌不做美元）。
 * @param props - 槽 props + 注入数据面。
 * @returns 用量面板。
 */
export function BudgetTab(props: CompanyTabProps) {
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions)
  return (
    <PanelFrame title={props.t('tabs.budget.label')} tone="burn" tabProps={props}>
      <BudgetPanel summary={data.summary} t={props.t} />
    </PanelFrame>
  )
}

/**
 * 任务板页签体（原头部弹窗的表格，现在也是平台页签 ⇒ 可浮出）。
 * @param props - 槽 props + 注入数据面。
 * @returns 任务板表格。
 */
export function TasksTab(props: CompanyTabProps) {
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions, { stream: true })
  return (
    <PanelFrame title={props.t('tabs.tasks.label')} tone="work" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      {data.streamError === null ? null : <StreamErrorNotice message={data.streamError} t={props.t} />}
      <TasksTableView view={data.team} roleLabel={(name: string) => memberRoleText(name, props.t)} t={props.t} />
    </PanelFrame>
  )
}

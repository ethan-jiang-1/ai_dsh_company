/**
 * 公司页签体（条目 ② S1b）：五个**平台页签**——看板 / 依赖图 / 在场 / 用量 / 任务板。
 *
 * 为什么这五个是平台页签而不是自造子页签（条目 ② 的首要决定 A1）：只有平台级 tab 才能被
 * `ctx.sidebarRight.float(tabId)` 拖出成浮窗（可移动 / 可缩放 / 最小 220×140 钳制 / 点击置顶），
 * 也才能被 split 并看。数据面走 `useCompanyData`（与公司视图共用同一实现，零重复）。
 *
 * 「在场」页签 = 原 R5b 驾驶舱内容（在场板 + 动态流）**升级**：行仍可点进成员空间，
 * 动态流由 5s 差分改成 `session/follow` 流式（打开即见全程）。
 */
import type { ReactNode } from 'react'
import { Button, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { PresenceRow } from '../lib/presence.ts'
import { BoardPanel, BudgetPanel, DagPanel, StateNote } from './company-panels.tsx'
import { TasksTableView } from './TasksPanel.tsx'
import { useCompanyData, type CompanyDataInjected } from './use-company-data.ts'

/** 页签体注入面：数据面 + 平台浮出操作。 */
export interface CompanyTabInjected extends CompanyDataInjected {
  /** `ctx.sidebarRight.float`：把本页签拽出成浮窗（可移动/缩放/置顶；收回由浮窗自带的 dock 按钮负责）。 */
  readonly floatTab: (tabId: TabId) => void
}

/** 页签体 props：槽标准 props（含 `sessionId` / `useProjection` / `useTabInfo`）+ 注入面。 */
export type CompanyTabProps = PropsRuntime<'sidebar.right.pane.tab'> & CompanyTabInjected

/** 在场页签额外需要成员空间入口（行可点）。 */
export type PresenceTabProps = CompanyTabProps & {
  readonly openMember: (sessionId: SessionId, member: { readonly id: string; readonly role: 'lead' | 'teammate' }) => Promise<void>
}

/**
 * 页签体共用外框需要的最小 props（`useTabInfo` + 浮出操作）——「待办」页签（AttentionTab）
 * 复用同一外框，故收窄成独立接口导出（结构上 CompanyTabProps 天然满足）。
 */
export interface PanelFrameProps {
  readonly useTabInfo: CompanyTabProps['useTabInfo']
  readonly floatTab: (tabId: TabId) => void
}

/**
 * 页签体共用外框：标题 + 刷新说明 + **「浮出」** + 内容。
 *
 * 「浮出」走平台服务 `float(tabId)`（tabId 由 `useTabInfo()` 给）——浮窗的移动（grip）、缩放
 * （`data-dockkit-float-resize`，最小 220×140 钳制）、置顶、**收回（浮窗自带的 dock 按钮）**
 * 全部是平台能力，我们不自造窗口管理（D13）。
 */
export function PanelFrame({ title, tabProps, children }: {
  readonly title: string
  readonly tabProps: PanelFrameProps
  readonly children: ReactNode
}) {
  const info = tabProps.useTabInfo()
  return (
    <div className="wk-pane">
      <div className="wk-pane-head">
        <strong>{title}</strong>
        <span className="wk-meta">每 5 秒自动刷新</span>
        <span style={{ flex: 1 }} />
        <Button
          size="sm"
          variant="ghost"
          title="把这个面板拽出成浮窗（可移动 / 可缩放）"
          onClick={() => { tabProps.floatTab(info.tab.id) }}
        >
          浮出
        </Button>
      </div>
      {children}
    </div>
  )
}

/** 成员状态 → StateDot 语义。 */
function memberDot(status: PresenceRow['status']): 'done' | 'ongoing' | 'warning' | 'error' | 'idle' {
  switch (status) {
    case 'running': return 'ongoing'
    case 'provisioning': return 'warning'
    case 'failed': return 'error'
    case 'idle': return 'done'
    default: return 'idle'
  }
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
export function BoardTab(props: CompanyTabProps) {
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions)
  return (
    <PanelFrame title="看板" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      <BoardPanel columns={data.columns} />
    </PanelFrame>
  )
}

/**
 * 依赖图页签体。
 * @param props - 槽 props + 注入数据面。
 * @returns 依赖图。
 */
export function DagTab(props: CompanyTabProps) {
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions)
  return (
    <PanelFrame title="依赖图" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      <DagPanel layout={data.dag} />
    </PanelFrame>
  )
}

/**
 * 在场页签体（原驾驶舱升级）：成员行（点行进成员空间）+ 流式协作动态。
 * @param props - 槽 props + 注入数据面 + 成员空间入口。
 * @returns 在场面板。
 */
export function PresenceTab(props: PresenceTabProps) {
  const { openMember, ...dataFace } = props
  const data = useCompanyData(dataFace, props.sessionId, props.useProjection, props.useSessions, { stream: true })
  return (
    <PanelFrame title="在场" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      {data.streamError !== null && <div className="wk-error">动态流不可用：{data.streamError}</div>}
      {data.rows.length === 0
        ? <StateNote text="当前没有团队动议。" />
        : (
          <>
            <div className="wk-row wk-row-head" aria-hidden="true">
              <span className="wk-row-name">成员</span>
              <span className="wk-row-status">团队内状态</span>
              <span className="wk-row-task">当前任务</span>
            </div>
            <div role="list" aria-label="组织在场板" className="wk-list">
              {data.rows.map(row => (
                <button
                  key={row.id}
                  type="button"
                  role="listitem"
                  className="wk-row wk-row-button"
                  aria-label={`${row.displayName}，${row.statusLabel}，${row.currentTask === null ? '无进行中任务' : `任务：${row.currentTask}`}`}
                  title={row.role === 'lead' ? '进入 CEO（Lead）空间' : '进入该成员的空间'}
                  onClick={() => { void openMember(props.sessionId, { id: row.id, role: row.role }) }}
                >
                  <span className="wk-row-name">
                    <StateDot state={memberDot(row.status)} />
                    {row.displayName}
                    {row.role === 'lead' ? <Tag tone="neutral">Lead</Tag> : null}
                  </span>
                  <span className="wk-row-status"><Tag tone={memberTone(row.status)}>{row.statusLabel}</Tag></span>
                  <span className="wk-row-task" title={row.currentTask ?? ''}>{row.currentTask ?? '—'}</span>
                </button>
              ))}
            </div>
            <div className="wk-meta wk-lead-note">状态 = 该分身在本场团队动议中的忙闲</div>
          </>
        )}
      <div className="wk-activity-block">
        <strong>协作动态</strong>
        {data.activity.length === 0
          ? <StateNote text="暂无动态（打开期间的变化会出现在这里）。" />
          : (
            <ul className="wk-activity">
              {data.activity.map(entry => (
                <li key={`${String(entry.time)}-${entry.kind}-${entry.text}`}>{entry.text}</li>
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
    <PanelFrame title="用量" tabProps={props}>
      <BudgetPanel summary={data.summary} />
    </PanelFrame>
  )
}

/**
 * 任务板页签体（原头部弹窗的表格，现在也是平台页签 ⇒ 可浮出）。
 * @param props - 槽 props + 注入数据面。
 * @returns 任务板表格。
 */
export function TasksTab(props: CompanyTabProps) {
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions)
  return (
    <PanelFrame title="任务板" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      <TasksTableView view={data.team} />
    </PanelFrame>
  )
}

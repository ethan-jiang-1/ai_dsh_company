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
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { PresenceRow } from '../lib/presence.ts'
import { clampRect, loadFloatRect, saveFloatRect, type FloatRectLike } from './float-geometry.ts'
import { BoardPanel, BudgetPanel, DagPanel, StateNote } from './company-panels.tsx'
import { TasksTableView } from './TasksPanel.tsx'
import { useCompanyData, type CompanyDataInjected } from './use-company-data.ts'

/** 页签体注入面：数据面 + 平台浮出操作。 */
export interface CompanyTabInjected extends CompanyDataInjected {
  /** `ctx.sidebarRight.float`：把本页签拽出成浮窗（可移动/缩放/置顶）；rect = 记忆摆位（浮窗几何记忆 RFC）。 */
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  /** `ctx.sidebarRight.unfloat`：把浮窗收回右栏（用户走查 2026-09-27：浮出态里「浮出」按钮无意义，换「收回」）。 */
  readonly unfloatTab: (paneId: string) => void
}

/** 页签体 props：槽标准 props（含 `sessionId` / `useProjection` / `useTabInfo`）+ 注入面。 */
export type CompanyTabProps = PropsRuntime<'sidebar.right.pane.tab'> & CompanyTabInjected

/** 在场页签额外需要成员空间入口（行可点）。 */
export type PresenceTabProps = CompanyTabProps & {
  readonly openMember: (sessionId: SessionId, member: { readonly id: string; readonly role: 'lead' | 'teammate' }) => Promise<void>
}

/**
 * 页签体共用外框需要的最小 props（`useTabInfo` + 浮出/收回操作）——「待办」页签（AttentionTab）
 * 复用同一外框，故收窄成独立接口导出（结构上 CompanyTabProps 天然满足）。
 */
export interface PanelFrameProps {
  readonly useTabInfo: CompanyTabProps['useTabInfo']
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
}

/**
 * 页签体共用外框：tone 色条 + 标题 + 刷新说明 + **页签自备动作（可选）** + 「浮出 / 收回」（状态感知）+ 内容。
 *
 * - 色条（用户走查 2026-09-27：浮窗背景全一样认不出哪个是哪个）：面板顶 3px tone 色
 *   （`background: currentColor` 吃 tone 类；浮窗头标题另有 tinted 色丸，见 styles.ts）。
 * - 页签自备动作（2026-09-28，用户令）：`action` 槽渲染在页签头右侧（与「浮出」同簇）——
 *   面板私有的小操作（如依赖图的「重画」）不为此另开机制。
 * - 浮出/收回：dock 态显示「浮出」（`float(tabId)`）；浮出态显示「收回」（`unfloat(paneId)`）。
 *   浮出态感知 = 每次渲染查 DOM 祖先 `[data-dockkit-float]`（其属性值 = paneId）——
 *   `useTabInfo()` 的 layout 是 observable，浮出/收回都会触发本组件重渲染，检查自然保持新鲜。
 *   浮窗的移动（grip）、缩放、置顶仍是平台能力，我们不自造窗口管理（D13）。
 */
export function PanelFrame({ title, tone, tabProps, action, children, refreshLabel = '每 5 秒自动刷新' }: {
  readonly title: string
  readonly tone: string
  readonly tabProps: PanelFrameProps
  readonly action?: ReactNode
  readonly children: ReactNode
  /** 页签头的新鲜度文案；**必须说真话**（各面板的数据轮询间隔不同——2026-10-18 走查抓到培养页签写 5 秒实际 30 秒）。 */
  readonly refreshLabel?: string
}) {
  const info = tabProps.useTabInfo()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [floatPaneId, setFloatPaneId] = useState<string | null>(null)
  useLayoutEffect(() => {
    const paneId = rootRef.current?.closest('[data-dockkit-float]')?.getAttribute('data-dockkit-float') ?? null
    setFloatPaneId(previous => previous === paneId ? previous : paneId)
  })
  /** 采集当前浮窗矩形并按稳定身份存档（浮窗几何记忆 RFC；浮出态外调用 = no-op）。
   *  key 用 `contentId`（= keyed 槽 key，如 `dsh-company-pack/dag`——`openContent` 的去重身份，
   *  页签关掉重开不变）而不是运行时 `tab.id`（`tab3` 这类生成 id，重开会换 ⇒ 存档孤儿化）。 */
  const captureFloatRect = (): void => {
    const pane = rootRef.current?.closest('[data-dockkit-float]') ?? null
    if (pane === null) return
    const rect = pane.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return // 未挂载/不可见：不采
    const tabKey = info.tab.contentId !== '' ? info.tab.contentId : info.tab.id
    saveFloatRect(window.localStorage, tabKey, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
  }
  // 浮出期间监听手势结束（拖拽/缩放都以 pointerup 落定）：每次落定即采一次；浮出瞬间先采一次
  // （默认位也进记忆 ⇒ 没拖过就收回、下次浮出仍在同一默认位）。收回时 pointerup 先于 click，
  // 最后一拖已入库；onClick 里再补采一次兜底（防无拖拽直接收回丢初始位）。
  useEffect(() => {
    if (floatPaneId === null) return
    captureFloatRect()
    document.addEventListener('pointerup', captureFloatRect)
    return () => { document.removeEventListener('pointerup', captureFloatRect) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- info.tab.id 在页签生命周期内不变
  }, [floatPaneId])
  return (
    <div className="wk-pane" ref={rootRef}>
      <div className={`wk-pane-strip wk-tone-${tone}`} aria-hidden="true" />
      <div className="wk-pane-head">
        <strong>{title}</strong>
        <span className="wk-meta">{refreshLabel}</span>
        <span style={{ flex: 1 }} />
        {action}
        {floatPaneId === null
          ? (
            <Button
              size="sm"
              variant="ghost"
              title="把这个面板拽出成浮窗（可移动 / 可缩放；下次浮出回到上次位置）"
              onClick={() => {
                const tabKey = info.tab.contentId !== '' ? info.tab.contentId : info.tab.id
                const saved = loadFloatRect(window.localStorage, tabKey)
                tabProps.floatTab(info.tab.id, saved === null ? undefined : clampRect(saved, window.innerWidth, window.innerHeight))
              }}
            >
              浮出
            </Button>
          )
          : (
            <Button
              size="sm"
              variant="ghost"
              title="收回右栏（浮窗回到侧栏页签）"
              onClick={() => { captureFloatRect(); tabProps.unfloatTab(floatPaneId) }}
            >
              收回
            </Button>
          )}
      </div>
      <div className="wk-pane-body">{children}</div>
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
    <PanelFrame title="看板" tone="overview" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      <BoardPanel columns={data.columns} />
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
  const data = useCompanyData(props, props.sessionId, props.useProjection, props.useSessions)
  const [redrawKey, setRedrawKey] = useState(0)
  return (
    <PanelFrame
      title="依赖图"
      tone="structure"
      tabProps={props}
      action={(
        <Button
          size="sm"
          variant="ghost"
          title="强制重画一次（重测栏宽、重放布局与动画）——偶发渲染不对时用"
          onClick={() => { setRedrawKey(previous => previous + 1) }}
        >
          重画
        </Button>
      )}
    >
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      <DagPanel key={redrawKey} layout={data.dag} />
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
    <PanelFrame title="在场" tone="people" tabProps={props}>
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
    <PanelFrame title="用量" tone="burn" tabProps={props}>
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
    <PanelFrame title="任务板" tone="work" tabProps={props}>
      {data.error !== null && <div className="wk-error">{data.error}</div>}
      <TasksTableView view={data.team} />
    </PanelFrame>
  )
}

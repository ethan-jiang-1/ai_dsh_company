/**
 * 公司整页视图（条目 ① S1，`conversation.view` id `company`）：把机制"演"出来。
 *
 * 四个面板（看板 / 依赖图 / 在场 / 用量）共用一份 team 快照；数据面三条：
 * - **team 状态**：`remote.agentTeams.view(lead)` 拉式轮询（5s，与既有任务板同节奏）。
 *   为什么走**注册处闭包**而不是槽的 `inject` 面：`conversation.view` 的槽声明没有 inject
 *   （catalog registerOptions 只有 id/order/label），而 team 投影是 **host-only**
 *   （`SessionProjectionStateMap`，无 `wire`）⇒ 客户端读不到。闭包是本插件内对 cordis
 *   服务的合法消费；跨插件值导入仍被禁（`packages/client/AGENTS.md`）。
 * - **协作动态**：`remote.session.follow`（WebSocket 流）——快照给历史、其后给实时；
 *   同一条流同时解决"打开即见全程"（不再是「暂无动态」）与实时性。
 * - **用量**：标准 props 的 `useProjection('tokenUsage'|'sessionStats')`（客户端可见投影）。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {} from '@deepseek-ai/dsh-token-meter/client'
import { boardColumns, tasksFromTeamView } from '../lib/board.ts'
import { budgetSummary } from '../lib/budget.ts'
import { layoutDag } from '../lib/dag.ts'
import {
  activityFromEvents,
  memberNames,
  rowsFromTeamView,
  type ActivityEntry,
  type TeamEventLike,
  type TeamStreamFrame,
  type TeamViewLike,
} from '../lib/presence.ts'
import { BoardPanel, BudgetPanel, DagPanel, PresencePanel } from './company-panels.tsx'

/** 本视图的 props（标准 session kit + owner props）。 */
export type CompanyViewProps = PropsRuntime<'conversation.view'>

/** 注册处闭包注入的数据面。 */
export interface CompanyViewInjected {
  /** 权威团队态（拉式，喂看板 / 依赖图 / 在场）。 */
  readonly load: (sessionId: SessionId) => Promise<RemoteResult<TeamView>>
  /** 团队事件流（`session/follow`）：快照给历史、其后给实时（喂协作动态）。 */
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncIterable<TeamStreamFrame>
}

/** 轮询间隔（与既有任务板/驾驶舱同节奏）。 */
const POLL_MS = 5_000

/** 动态流保留条数上限。 */
const MAX_ACTIVITY = 50

type PanelKey = 'board' | 'dag' | 'presence' | 'budget'

const PANELS: readonly { readonly key: PanelKey; readonly label: string }[] = [
  { key: 'board', label: '看板' },
  { key: 'dag', label: '依赖图' },
  { key: 'presence', label: '在场' },
  { key: 'budget', label: '用量' },
]

/**
 * 造公司视图组件（闭包捕获数据面）。
 * @param injected - team 视图拉取（注册处已绑好 lead 会话寻址）。
 * @returns 可注册到 `conversation.view` 的组件。
 */
export function createCompanyView(injected: CompanyViewInjected) {
  return function CompanyView(props: CompanyViewProps) {
    const { sessionId, useProjection } = props
    const [team, setTeam] = useState<TeamViewLike | null>(null)
    const [activity, setActivity] = useState<readonly ActivityEntry[]>([])
    const [error, setError] = useState<string | null>(null)
    const [streamError, setStreamError] = useState<string | null>(null)
    const [panel, setPanel] = useState<PanelKey>('board')

    const busyRef = useRef(false)
    const eventsRef = useRef<readonly TeamEventLike[]>([])
    const namesRef = useRef<ReadonlyMap<string, string>>(new Map())

    /** 重算动态（事件或名册任一变化都重算：名册迟到时把裸会话 id 换成成员名）。 */
    const refreshActivity = (): void => {
      setActivity(activityFromEvents(eventsRef.current, namesRef.current).slice(-MAX_ACTIVITY).reverse())
    }

    useEffect(() => {
      let cancelled = false
      /** 拉一次权威团队态（喂看板 / 依赖图 / 在场；动态另走事件流）。 */
      const refresh = async (): Promise<void> => {
        if (busyRef.current) return
        busyRef.current = true
        try {
          const result = await injected.load(sessionId)
          if (cancelled) return
          if (result.ok) {
            namesRef.current = memberNames(result.value)
            setTeam(result.value)
            setError(null)
            refreshActivity()
          } else {
            setError(result.error.message)
          }
        } catch (cause) {
          if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          busyRef.current = false
        }
      }
      void refresh()
      const timer = setInterval(() => { void refresh() }, POLL_MS)
      return () => {
        cancelled = true
        clearInterval(timer)
      }
    }, [sessionId])

    // 协作动态：`session/follow` 流（快照给历史 ⇒ 打开即见全程，不再是「暂无动态」；其后逐条实时）。
    // 流断了不致命（任务板/在场仍由 5s 轮询维持），但**不静默**：错误显式落在面板上（fail-loud）。
    useEffect(() => {
      const controller = new AbortController()
      eventsRef.current = []
      setActivity([])
      setStreamError(null)
      void (async () => {
        try {
          for await (const frame of injected.follow(sessionId, controller.signal)) {
            if (controller.signal.aborted) return
            eventsRef.current = frame.kind === 'history'
              ? frame.events
              : [...eventsRef.current, frame.event]
            refreshActivity()
          }
        } catch (cause) {
          if (!controller.signal.aborted) {
            setStreamError(cause instanceof Error ? cause.message : String(cause))
          }
        }
      })()
      return () => { controller.abort() }
    }, [sessionId])

    const tasks = useMemo(() => (team === null ? [] : tasksFromTeamView(team)), [team])
    const columns = useMemo(() => boardColumns(tasks), [tasks])
    const dag = useMemo(() => layoutDag(tasks), [tasks])
    const rows = useMemo(() => (team === null ? [] : rowsFromTeamView(team)), [team])
    const usage = useProjection('tokenUsage')
    const stats = useProjection('sessionStats')
    const summary = useMemo(() => budgetSummary(usage, stats), [usage, stats])

    return (
      <div className="wk-view">
        <div className="wk-view-tabs" role="tablist" aria-label="公司视图">
          {PANELS.map(entry => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              className="wk-tab"
              aria-selected={panel === entry.key}
              onClick={() => { setPanel(entry.key) }}
            >
              {entry.label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="wk-meta" style={{ alignSelf: 'center', paddingRight: '0.25rem' }}>每 5 秒刷新</span>
        </div>
        <div className="wk-view-body">
          {error !== null && <div className="wk-error">{error}</div>}
          {team === null && error === null && <div className="wk-meta">读取团队状态…</div>}
          {team !== null && panel === 'board' && <BoardPanel columns={columns} />}
          {team !== null && panel === 'dag' && <DagPanel layout={dag} />}
          {team !== null && panel === 'presence' && (
            <>
              {streamError !== null && <div className="wk-error">动态流不可用：{streamError}</div>}
              <PresencePanel rows={rows} activity={activity} />
            </>
          )}
          {panel === 'budget' && <BudgetPanel summary={summary} />}
        </div>
      </div>
    )
  }
}

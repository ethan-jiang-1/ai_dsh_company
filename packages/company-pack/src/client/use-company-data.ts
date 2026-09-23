/**
 * 公司数据 hook（条目 ② S1a 抽取）：把"团队态轮询 + 事件流 + 投影 + 四个读模型折算"收成**一处**，
 * 供公司视图（总览）与五个平台页签体共用——否则每个页签体会各拉一份数据、各开一条流。
 *
 * 数据面三条（与 `CompanyView` 头注同源）：
 * - **team 状态**：`remote.agentTeams.view(lead)` 拉式轮询（5s）
 * - **协作动态**：`remote.session.follow` 流（快照给历史 + 实时追加）——**只有需要它的面板才订阅**
 *   （`options.stream`）：看板/依赖图/任务板不需要，省一条 WebSocket
 * - **用量**：标准 props 的 `useProjection('tokenUsage'|'sessionStats')`（客户端可见投影）
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {} from '@deepseek-ai/dsh-token-meter/client'
import { boardColumns, tasksFromTeamView, type BoardColumn, type TaskRow } from '../lib/board.ts'
import { budgetSummary, type BudgetSummary } from '../lib/budget.ts'
import { layoutDag, type DagLayout } from '../lib/dag.ts'
import {
  activityFromEvents,
  memberNames,
  rowsFromTeamView,
  type ActivityEntry,
  type PresenceRow,
  type TeamEventLike,
  type TeamStreamFrame,
  type TeamViewLike,
} from '../lib/presence.ts'

/** 注册处闭包注入的数据面（与页签体/视图共用同一形状）。 */
export interface CompanyDataInjected {
  /** 权威团队态（拉式）。 */
  readonly load: (sessionId: SessionId) => Promise<RemoteResult<TeamView>>
  /** 团队事件流（`session/follow`）。 */
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncIterable<TeamStreamFrame>
}

export interface CompanyDataOptions {
  /** 是否订阅团队事件流（在场面板与总览需要；看板/依赖图/任务板不需要）。 */
  readonly stream?: boolean
}

/** 四个读模型 + 原始态的合并结果。 */
export interface CompanyData {
  readonly team: TeamViewLike | null
  readonly tasks: readonly TaskRow[]
  readonly columns: readonly BoardColumn[]
  readonly dag: DagLayout
  readonly rows: readonly PresenceRow[]
  readonly activity: readonly ActivityEntry[]
  readonly summary: BudgetSummary
  readonly error: string | null
  readonly streamError: string | null
}

/** 轮询间隔（与既有任务板/驾驶舱同节奏）。 */
const POLL_MS = 5_000

/** 动态流保留条数上限。 */
const MAX_ACTIVITY = 50

/**
 * 拉团队态 + （可选）订阅事件流 + 折四个读模型。
 * @param injected - 数据面（`load` / `follow`）。
 * @param sessionId - 当前会话（页签体由槽 props 给）。
 * @param useProjection - 槽标准 props 的投影读取钩子（`tokenUsage` / `sessionStats`）。
 * @param options - `stream: true` 才订阅事件流。
 * @returns 合并后的公司数据。
 */
export function useCompanyData(
  injected: CompanyDataInjected,
  sessionId: SessionId,
  useProjection: UseProjection,
  options: CompanyDataOptions = {},
): CompanyData {
  const stream = options.stream === true
  const [team, setTeam] = useState<TeamViewLike | null>(null)
  const [activity, setActivity] = useState<readonly ActivityEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)

  const busyRef = useRef(false)
  const eventsRef = useRef<readonly TeamEventLike[]>([])
  const namesRef = useRef<ReadonlyMap<string, string>>(new Map())

  /** 重算动态（事件或名册任一变化都重算：名册迟到时把裸会话 id 换成成员名）。 */
  const refreshActivity = (): void => {
    setActivity(activityFromEvents(eventsRef.current, namesRef.current).slice(-MAX_ACTIVITY).reverse())
  }

  useEffect(() => {
    let cancelled = false
    /** 拉一次权威团队态（喂看板 / 依赖图 / 在场 / 任务板）。 */
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
          if (stream) refreshActivity()
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
  }, [sessionId, stream])

  // 协作动态：`session/follow` 流（快照给历史 ⇒ 打开即见全程；其后逐条实时）。
  // 流断了不致命（任务板/在场仍由轮询维持），但**不静默**：错误显式落面板（fail-loud）。
  useEffect(() => {
    if (!stream) return
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
  }, [sessionId, stream])

  const tasks = useMemo(() => (team === null ? [] : tasksFromTeamView(team)), [team])
  const columns = useMemo(() => boardColumns(tasks), [tasks])
  const dag = useMemo(() => layoutDag(tasks), [tasks])
  const rows = useMemo(() => (team === null ? [] : rowsFromTeamView(team)), [team])
  const usage = useProjection('tokenUsage')
  const stats = useProjection('sessionStats')
  const summary = useMemo(() => budgetSummary(usage, stats), [usage, stats])

  return { team, tasks, columns, dag, rows, activity, summary, error, streamError }
}

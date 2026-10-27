/**
 * 公司数据 hook（条目 ② S1a 抽取；0.1.7 升 pin 时数据源改判）：把"团队投影 + 事件流 + 用量投影 +
 * 四个读模型折算"收成**一处**，供公司视图（总览）与全部平台页签体共用——否则每个页签体会各拉一份
 * 数据、各开一条流。
 *
 * 数据面三条（**0.1.7 起 team 态不再走 RPC**）：`remote.agentTeams` 在 0.1.7 随 agent-team 的
 * `./remote` 导出一并移除，官方消费方改为**从共享 Session store 读 Lead 会话的 `agentTeam` 投影**
 * （`projectionsBySession[lead].values.agentTeam`，见 rc.2 `client-ui-agent-team` 的 TeamAction）。
 * 本 hook 沿用同一读法：`useSessions` 由槽运行时 props 提供（与 `useProjection` 同一座位）。
 * - **team 投影**：槽 props 的 `useSessions` 座位读 `agentTeam`（Host 投影帧保持最新，无需轮询）
 * - **协作动态**：`remote.session.follow` 流（快照给历史 + 实时追加）——**只有需要它的面板才订阅**
 *   （`options.stream`）：看板/依赖图/任务板不需要，省一条 WebSocket
 * - **用量**：标准 props 的 `useProjection('tokenUsage'|'sessionStats')`（客户端可见投影）
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
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

/**
 * 会话 store 快照里本 hook 需要的部分（结构型声明：只依赖 wire 形状，不引 vendor 内部类型）。
 * `agentTeam` 投影值形状 = agent-team 的 `TeamProjectionState`，与 `TeamViewLike` 同形（members/tasks）。
 */
export interface SessionsStoreLike {
  /** Host 投影值按会话寻址（0.1.7 起 team 态的唯一客户端来源）。 */
  readonly projectionsBySession: Readonly<Record<string, { readonly values: { readonly agentTeam?: TeamViewLike } } | undefined>>
}

/** 槽运行时 props 的 `useSessions` 座位（选择器订阅）。 */
export type UseSessions = <T>(selector: (state: SessionsStoreLike) => T) => T

/** 注册处闭包注入的数据面（与页签体/视图共用同一形状）。 */
export interface CompanyDataInjected {
  /**
   * 团队态挂在 Lead 会话上：把任意会话归到它的 Lead。
   * 0.1.7 起这是纯函数（注册处读 `sessions.binding(...)`），**不再需要 team RPC**。
   */
  readonly leadOf: (sessionId: SessionId) => SessionId
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

/** 动态流保留条数上限。 */
const MAX_ACTIVITY = 50

/**
 * 读 Lead 的 `agentTeam` 投影 + （可选）订阅事件流 + 折四个读模型。
 * @param injected - 数据面（`leadOf` / `follow`）。
 * @param sessionId - 当前会话（页签体由槽 props 给）。
 * @param useProjection - 槽标准 props 的投影读取钩子（`tokenUsage` / `sessionStats`）。
 * @param useSessions - 槽标准 props 的会话 store 订阅钩子（读 `agentTeam` 投影）。
 * @param options - `stream: true` 才订阅事件流。
 * @returns 合并后的公司数据。
 */
export function useCompanyData(
  injected: CompanyDataInjected,
  sessionId: SessionId,
  useProjection: UseProjection,
  useSessions: UseSessions,
  options: CompanyDataOptions = {},
): CompanyData {
  const stream = options.stream === true
  const [activity, setActivity] = useState<readonly ActivityEntry[]>([])
  const [streamError, setStreamError] = useState<string | null>(null)

  const eventsRef = useRef<readonly TeamEventLike[]>([])
  const namesRef = useRef<ReadonlyMap<string, string>>(new Map())

  // team 态：Lead 会话的 Host 投影（0.1.7 官方读法；投影帧保持最新，故无轮询）。
  const lead = injected.leadOf(sessionId)
  const projection = useSessions((state) => state.projectionsBySession[lead]?.values.agentTeam)
  const team = projection ?? null
  const error = (projection as { readonly failure?: string } | undefined)?.failure ?? null

  /** 重算动态（事件或名册任一变化都重算：名册迟到时把裸会话 id 换成成员名）。 */
  const refreshActivity = (): void => {
    setActivity(activityFromEvents(eventsRef.current, namesRef.current).slice(-MAX_ACTIVITY).reverse())
  }

  // 名册来自投影：改了就把裸 id 映射刷新一遍（流里先到的裸 id 会被改名）。
  useEffect(() => {
    namesRef.current = team === null ? new Map() : memberNames(team)
    if (stream) refreshActivity()
  }, [team, stream])

  // 协作动态：`session/follow` 流（快照给历史 ⇒ 打开即见全程；其后逐条实时）。
  // 流断了不致命（任务板/在场仍由投影维持），但**不静默**：错误显式落面板（fail-loud）。
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

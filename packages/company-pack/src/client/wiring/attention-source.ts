/**
 * 合并待办注意力源（BUG-404）：
 * 将运行期活体 `attentionRegistry` 与跨会话历史重建 `readPendingAcrossSessions`
 * 合并为单一 `ObservableSnapshot<readonly AttentionItem[]>`，供顶栏角标、侧栏底角标、
 * 动议指挥带与输入框状态胶囊共享，避免页面刷新后在 `0`/「就绪」处误报。
 */
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import { mergeAttention, type AttentionItem } from '../../lib/presence/attention.ts'
import { historyCandidates, readPendingAcrossSessions, type CandidateSession, type SessionPageFace } from '../presence/attention-history.ts'
import type { AttentionRegistry } from './attention-registry.ts'

/** 跨会话历史重建最多扫描的兄弟会话数。 */
const DEFAULT_HISTORY_CAP = 20

/** 跨会话历史重扫周期（ms）。 */
const DEFAULT_REFRESH_MS = 15_000

/** 客户端 `sessions.list` 的最小只读面。 */
export interface SessionsSnapshotLike {
  readonly byId: Readonly<Record<string, (CandidateSession & {
    readonly retainedBy?: { readonly mainView?: number }
  }) | undefined>>
}

export interface SessionsListObservableLike {
  readonly getSnapshot: () => SessionsSnapshotLike
  readonly subscribe: (listener: () => void) => () => void
}

export interface MergedAttentionSourceOptions {
  readonly attention: AttentionRegistry
  readonly sessionsList: SessionsListObservableLike
  readonly pageHistory?: SessionPageFace | undefined
  readonly cap?: number
  readonly refreshMs?: number
}

export interface MergedAttentionBoundary {
  readonly candidatesCapped: number
  readonly candidatesTotal: number
  readonly asksCapped: number
  readonly failed: number
  readonly window: 'none' | 'some'
}

export interface MergedAttentionHandle {
  readonly observable: ObservableSnapshot<readonly AttentionItem[]>
  readonly boundary: () => MergedAttentionBoundary
  readonly refresh: () => void
  readonly dispose: () => void
}

/** 从会话快照选出用于定位当前工作区的基准会话（优先 mainView，其次非 subagent 会话）。 */
function pickBaseSessionId(byId: SessionsSnapshotLike['byId']): string | undefined {
  const entries = Object.values(byId).filter((s): s is NonNullable<typeof s> => s !== undefined)
  const main = entries.find(s => (s.retainedBy?.mainView ?? 0) > 0)
  if (main !== undefined) return main.id
  return entries.find(s => s.origin !== 'subagent')?.id ?? entries[0]?.id
}

function scanPlanFromSnapshot(
  snapshot: SessionsSnapshotLike,
  cap: number,
): { readonly ids: readonly string[]; readonly candidatesCapped: number; readonly candidatesTotal: number } {
  const baseId = pickBaseSessionId(snapshot.byId)
  if (baseId === undefined) return { ids: [], candidatesCapped: 0, candidatesTotal: 0 }
  const candidates = historyCandidates(snapshot.byId as Readonly<Record<string, CandidateSession>>, baseId, cap)
  if (!candidates.ok) {
    return { ids: [baseId], candidatesCapped: 0, candidatesTotal: 0 }
  }
  return {
    ids: [...new Set([baseId, ...candidates.ids])],
    candidatesCapped: candidates.capped,
    candidatesTotal: candidates.total,
  }
}

/** 创建可热替换底层源的注意力代理，供 `apply()` 早于 `sessions/remote.session` 注册槽位时绑定。 */
export function createSwitchableAttentionObservable(
  fallback: ObservableSnapshot<readonly Pick<AttentionItem, 'kind'>[]>,
): ObservableSnapshot<readonly Pick<AttentionItem, 'kind'>[]> & {
  readonly attach: (source: ObservableSnapshot<readonly Pick<AttentionItem, 'kind'>[]>) => () => void
} {
  let active = fallback
  let offActive: (() => void) | null = null
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const listener of Array.from(listeners)) listener()
  }

  const bindActive = (): void => {
    offActive?.()
    offActive = active.subscribe(notify)
  }

  return {
    getSnapshot: () => active.getSnapshot(),
    subscribe(listener) {
      if (listeners.size === 0) bindActive()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          offActive?.()
          offActive = null
        }
      }
    },
    attach(source) {
      active = source
      if (listeners.size > 0) bindActive()
      notify()
      return () => {
        if (active !== source) return
        active = fallback
        if (listeners.size > 0) bindActive()
        notify()
      }
    },
  }
}

/** 创建合并活体与跨会话历史重建的注意力可观察对象。 */
export function createMergedAttentionObservable(options: MergedAttentionSourceOptions): MergedAttentionHandle {
  const { attention, sessionsList, pageHistory } = options
  const cap = options.cap ?? DEFAULT_HISTORY_CAP
  const refreshMs = options.refreshMs ?? DEFAULT_REFRESH_MS
  const listeners = new Set<() => void>()
  let historical: readonly AttentionItem[] = []
  let boundaryState: MergedAttentionBoundary = {
    candidatesCapped: 0,
    candidatesTotal: 0,
    asksCapped: 0,
    failed: 0,
    window: 'none',
  }
  let cached: readonly AttentionItem[] = mergeAttention(attention.snapshot(), historical).filter(item => item.kind !== 'completion')
  let lastScanKey = ''
  let disposed = false
  let controller: AbortController | null = null

  const recompute = (): void => {
    const next = mergeAttention(attention.snapshot(), historical).filter(item => item.kind !== 'completion')
    cached = next
    for (const listener of Array.from(listeners)) listener()
  }

  const runScan = (plan: { readonly ids: readonly string[]; readonly candidatesCapped: number; readonly candidatesTotal: number }): void => {
    controller?.abort()
    controller = null
    const { ids, candidatesCapped, candidatesTotal } = plan
    if (disposed || pageHistory === undefined || ids.length === 0) {
      boundaryState = { candidatesCapped, candidatesTotal, asksCapped: 0, failed: 0, window: 'none' }
      if (historical.length > 0) {
        historical = []
        recompute()
      }
      return
    }
    const current = new AbortController()
    controller = current
    void readPendingAcrossSessions(pageHistory, ids, current.signal)
      .then((rebuilt) => {
        if (disposed || current.signal.aborted) return
        historical = rebuilt.items
        boundaryState = {
          candidatesCapped,
          candidatesTotal,
          asksCapped: rebuilt.asksCapped,
          failed: rebuilt.failed,
          window: rebuilt.window,
        }
        recompute()
      })
      .catch(() => { /* keep previous merged snapshot on transient history failure */ })
  }

  const syncFromSessions = (force: boolean): void => {
    if (disposed) return
    const plan = scanPlanFromSnapshot(sessionsList.getSnapshot(), cap)
    const key = plan.ids.join('\n')
    if (!force && key === lastScanKey) return
    lastScanKey = key
    runScan(plan)
  }

  const offAttention = attention.subscribe(() => { recompute() })
  let offSessions: (() => void) | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  const startRemoteObserving = (): void => {
    if (disposed || offSessions !== null) return
    offSessions = sessionsList.subscribe(() => { syncFromSessions(false) })
    timer = refreshMs > 0
      ? setInterval(() => {
          if (disposed) return
          runScan(scanPlanFromSnapshot(sessionsList.getSnapshot(), cap))
        }, refreshMs)
      : null
    syncFromSessions(true)
  }

  const stopRemoteObserving = (): void => {
    controller?.abort()
    controller = null
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    offSessions?.()
    offSessions = null
  }

  return {
    observable: {
      getSnapshot: () => cached,
      subscribe(listener) {
        if (listeners.size === 0) startRemoteObserving()
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
          if (listeners.size === 0) stopRemoteObserving()
        }
      },
    },
    boundary: () => boundaryState,
    refresh: () => {
      syncFromSessions(true)
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      stopRemoteObserving()
      offAttention()
      listeners.clear()
    },
  }
}

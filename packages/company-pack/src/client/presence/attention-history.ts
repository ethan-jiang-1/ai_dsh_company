/**
 * 跨会话挂起审批的重建（BUG-292 的 A 路线，2026-11-21）。
 *
 * 为什么不在客户端 retain：`sessions.retain()` 的 source 是 vendor 的封闭联合，本包不能自造；
 * `session/follow` 对**未打开**的会话零 history 帧（两轮实跑）。能用的唯一通道是 `remote.session.page`
 * ——它由网关自己按 `gateway` source 取会话，对未打开的会话同样可读（lane 一直这么轮询）。
 *
 * 形状沿用 lane 的 `readRecords`：`throughSeq` 必须是一个有效游标，所以先拿一个「已知越过头部」的请求
 * 探出游标（成功则取末条 seq；失败则从 `past cursor N` 里读），再按游标取一页。纯逻辑 + 注入的 page 面，
 * 因此在 keyless 层可测（`tests/client/presence/attention-history.spec.ts`）。
 */
import type { SessionAddress, SessionPage, SessionPageRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { type AttentionEventLike, type AttentionItem, pendingAsks } from '../../lib/presence/attention.ts'

/** 一页历史的最大条数（只给重建用：多取一点，避免把 asked 切在页外）。 */
export const HISTORY_PAGE_MESSAGES = 800

/** 一个会话历史页的最小面（= `remote.session.page`，只取重建要用的那部分）。 */
export type SessionPageFace = (
  request: SessionPageRequest,
  signal?: AbortSignal,
) => Promise<
  | { readonly ok: true, readonly value: SessionPage }
  | { readonly ok: false, readonly error?: { readonly message?: string } | undefined }
>

/**
 * 把 `remote.session.page` 包成本模块的 page 面（唯一用途：让注册处不必为透传多写一行闭包，
 * 那行在 `client/index.ts` 里是永远测不到的胶水）。
 * @param page - 生成的 remote 方法。
 * @returns 同签名的 page 面。
 */
export function asSessionPageFace(page: SessionPageFace): SessionPageFace {
  return (request, signal) => page(request, signal)
}

/** 从错误文案里读游标（vendor 原话：`session page through seq N is past cursor M`）。 */
function cursorFromError(message: string | undefined): number | undefined {
  const match = /past cursor (\d+)/.exec(message ?? '')
  return match === null ? undefined : Number(match[1])
}

/** 一个会话的历史读取结果：事件 + 这一页是否被窗口截断（BUG-304 的边界）。 */
export interface SessionEventsRead {
  readonly events: readonly AttentionEventLike[]
  /** true = 该会话在窗口之前还有更早的事件（看不见的挂起审批可能就在那里）。 */
  readonly windowTruncated: boolean
}

/**
 * 读一个会话的历史事件（探游标 → 取一页）。
 * @param page - 注入的 `remote.session.page`。
 * @param sessionId - 目标会话。
 * @param signal - 取消。
 * @returns 事件与窗口边界；探不到游标或这一页读失败时 undefined（调用方按「这条会话读不到」处理）。
 */
export async function readSessionEvents(
  page: SessionPageFace,
  sessionId: string,
  signal?: AbortSignal,
): Promise<SessionEventsRead | undefined> {
  const address: SessionAddress = { kind: 'session', sessionId: sessionId as SessionId }
  let cursor: number | undefined
  const probe = await page({ address, throughSeq: Number.MAX_SAFE_INTEGER, maxMessages: 1 }, signal)
  if (probe.ok) {
    cursor = probe.value.records.at(-1)?.event?.seq
  } else {
    cursor = cursorFromError(probe.error?.message)
  }
  if (cursor === undefined || cursor < 0) return undefined
  const full = await page({ address, throughSeq: cursor, maxMessages: HISTORY_PAGE_MESSAGES }, signal)
  if (!full.ok) return undefined
  // 会话事件与 attention 的「兜底」形状相容（type/time/data）；这里只做一次显式转换。
  const records = full.value.records
  return {
    events: records.map(record => record.event as unknown as AttentionEventLike),
    // 窗口是否被截断**只看 vendor 的 hasMore**（BUG-332）：「拿满一页」不等于「还有更早」——
    // 恰好 800 条的完整历史过去会被误报成「只扫了最近 800 条」。没有 hasMore 才退化为「多取一条」判断。
    windowTruncated: full.value.hasMore === true,
  }
}

/**
 * 跨会话重建的**结果态**：条目 + 这次重建的边界（BUG-304/305）。
 *
 * 为什么不能只返回数组：`[]` 同时意味着「真的没有挂起」和「读不到/窗口外」，
 * 面板于是把「读不到」说成「没有等你的事」。边界必须跟着结果一起回来。
 */
export interface PendingAcrossSessions {
  /** 仍挂起的审批（`jumpTo` = 所在会话）。 */
  readonly items: readonly AttentionItem[]
  /** 各会话「待你处理」（审批+问询）被 `STREAM_ITEM_CAP` 截掉的条数合计（BUG-320/330）。 */
  readonly asksCapped: number
  /** 实际扫到的会话数（候选数 − 读不到的）。 */
  readonly scanned: number
  /** 读失败的会话数；>0 时面板必须说「有 N 个会话的历史读不到」。 */
  readonly failed: number
  /**
   * 是否有会话的窗口被截断（更早事件没看）。
   * `'none'` = 全部读完；`'some'` = 至少一个会话只扫了最近 {@link HISTORY_PAGE_MESSAGES} 条。
   */
  readonly window: 'none' | 'some'
}

/**
 * 跨会话重建仍挂起的审批：每个候选会话取一页历史，配对 `approval/asked` ↔ `approval/decided`。
 * 单条会话读失败不致命（少了那一份历史），但**失败数与窗口边界要带回去**——面板据此说真话。
 * @param page - 注入的 `remote.session.page`。
 * @param sessionIds - 候选会话（调用方已按同工作区/最近活跃筛过并 cap）。
 * @param signal - 取消。
 * @returns 结果态（见 {@link PendingAcrossSessions}）。
 */
export async function readPendingAcrossSessions(
  page: SessionPageFace,
  sessionIds: readonly string[],
  signal?: AbortSignal,
): Promise<PendingAcrossSessions> {
  const results = await Promise.all(sessionIds.map(async (sessionId): Promise<
    { readonly ok: true, readonly items: readonly AttentionItem[], readonly capped: number, readonly truncated: boolean } | { readonly ok: false }
  > => {
    try {
      const read = await readSessionEvents(page, sessionId, signal)
      if (read === undefined) return { ok: false }
      // 审批 + 问询一起重建（BUG-319）：只重建审批会让「等你的事」在刷新后少一半。
      const asks = pendingAsks(read.events, sessionId)
      return { ok: true, items: asks.items, capped: asks.capped, truncated: read.windowTruncated }
    } catch {
      return { ok: false }
    }
  }))
  const ok = results.filter((result): result is { readonly ok: true, readonly items: readonly AttentionItem[], readonly capped: number, readonly truncated: boolean } => result.ok)
  return {
    items: ok.flatMap(result => result.items),
    asksCapped: ok.reduce((sum, result) => sum + result.capped, 0),
    scanned: ok.length,
    failed: results.length - ok.length,
    window: ok.some(result => result.truncated) ? 'some' : 'none',
  }
}

/** 候选会话的挑选结果（BUG-318/323）：要么明确「这一轮不扫」，要么给出扫哪些 + 被截掉多少。 */
export type HistoryCandidates =
  | { readonly ok: false, readonly reason: 'workspace-unknown' }
  | { readonly ok: true, readonly ids: readonly string[], readonly total: number, readonly capped: number }

/** 候选会话的最小形状（`sessions.list` 的 byId 值）。 */
export interface CandidateSession {
  readonly id: string
  readonly cwd?: string
  readonly origin?: string
  readonly updatedAt?: number
}

/**
 * 从会话清单里挑「跨会话重建」的候选（**fail-closed**，BUG-323）。
 *
 * 规矩：当前会话的 cwd 还没解析出来时**一个都不扫**——过去这里写的是
 * `currentCwd === undefined || summary.cwd === currentCwd`，把「未知」当成了「都匹配」，
 * 于是别的 workspace 的挂起审批会出现在本工作区的待办里（越界）。
 * 同时把「候选总数 / 被截掉多少」带回去（BUG-318：第 21 个会话静默消失）。
 * @param byId - 会话清单。
 * @param currentSessionId - 面板所在会话。
 * @param cap - 单次最多扫几个候选。
 * @returns 不扫的原因，或候选列表与边界。
 */
export function historyCandidates(
  byId: Readonly<Record<string, CandidateSession>>,
  currentSessionId: string,
  cap: number,
): HistoryCandidates {
  const currentCwd = byId[currentSessionId]?.cwd
  // cwd 未解析（会话刚建/清单还没加载）⇒ 不扫：宁可少扫，不可越界。
  if (currentCwd === undefined || currentCwd === '') return { ok: false, reason: 'workspace-unknown' }
  const sameWorkspace = Object.values(byId)
    .filter(summary => summary.id !== currentSessionId
      && summary.origin !== 'subagent'
      && summary.cwd === currentCwd)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  return {
    ok: true,
    ids: sameWorkspace.slice(0, cap).map(summary => summary.id),
    total: sameWorkspace.length,
    capped: Math.max(0, sameWorkspace.length - cap),
  }
}

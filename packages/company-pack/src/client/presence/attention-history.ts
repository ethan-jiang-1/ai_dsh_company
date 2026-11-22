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
import { type AttentionEventLike, type AttentionItem, pendingApprovals } from '../../lib/presence/attention.ts'

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
    // 拿满一页 ≠ 只有这一页：vender 的 hasMore 若有就直接用，否则「拿满」即视为可能还有更早的（保守）。
    windowTruncated: full.value.hasMore === true || records.length >= HISTORY_PAGE_MESSAGES,
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
    { readonly ok: true, readonly items: readonly AttentionItem[], readonly truncated: boolean } | { readonly ok: false }
  > => {
    try {
      const read = await readSessionEvents(page, sessionId, signal)
      if (read === undefined) return { ok: false }
      return { ok: true, items: pendingApprovals(read.events, sessionId), truncated: read.windowTruncated }
    } catch {
      return { ok: false }
    }
  }))
  const ok = results.filter((result): result is { readonly ok: true, readonly items: readonly AttentionItem[], readonly truncated: boolean } => result.ok)
  return {
    items: ok.flatMap(result => result.items),
    scanned: ok.length,
    failed: results.length - ok.length,
    window: ok.some(result => result.truncated) ? 'some' : 'none',
  }
}

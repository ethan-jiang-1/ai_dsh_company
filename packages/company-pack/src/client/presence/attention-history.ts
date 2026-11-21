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

/** 从错误文案里读游标（vendor 原话：`session page through seq N is past cursor M`）。 */
function cursorFromError(message: string | undefined): number | undefined {
  const match = /past cursor (\d+)/.exec(message ?? '')
  return match === null ? undefined : Number(match[1])
}

/**
 * 读一个会话的历史事件（探游标 → 取一页）。
 * @param page - 注入的 `remote.session.page`。
 * @param sessionId - 目标会话。
 * @param signal - 取消。
 * @returns 事件数组；探不到游标或这一页读失败时 undefined（调用方按「这条会话没有重建结果」处理）。
 */
export async function readSessionEvents(
  page: SessionPageFace,
  sessionId: string,
  signal?: AbortSignal,
): Promise<readonly AttentionEventLike[] | undefined> {
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
  return full.value.records.map(record => record.event as unknown as AttentionEventLike)
}

/**
 * 跨会话重建仍挂起的审批：每个候选会话取一页历史，配对 `approval/asked` ↔ `approval/decided`。
 * 单条会话读失败不致命（它只是少了那一份历史），整体不抛。
 * @param page - 注入的 `remote.session.page`。
 * @param sessionIds - 候选会话（调用方已按同工作区/最近活跃筛过并 cap）。
 * @param signal - 取消。
 * @returns 挂起审批条目（`jumpTo` = 该会话）。
 */
export async function readPendingAcrossSessions(
  page: SessionPageFace,
  sessionIds: readonly string[],
  signal?: AbortSignal,
): Promise<readonly AttentionItem[]> {
  const rebuilt = await Promise.all(sessionIds.map(async (sessionId) => {
    try {
      const events = await readSessionEvents(page, sessionId, signal)
      return events === undefined ? [] : [...pendingApprovals(events, sessionId)]
    } catch {
      // 单会话读不到 = 少了那一份历史，不是整体失败（活体面仍覆盖在场期）。
      return []
    }
  }))
  return rebuilt.flat()
}

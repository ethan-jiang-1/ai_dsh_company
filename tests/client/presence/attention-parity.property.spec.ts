// 负例留证 2026-11-23：在 `attention-history.ts` 把 `windowTruncated` 改回 `full.value.hasMore === true || records.length >= HISTORY_PAGE_MESSAGES` ⇒ `180 组随机工作区与历史响应` 当场红（expected 'some' to be 'none'），连同 `BUG-304/BUG-305/BUG-318/BUG-320/BUG-323/BUG-327/BUG-328/BUG-332` 边界/fail-open 守卫一起验红；还原即 4/4 全绿。
/**
 * `attention` 读模型性质与 Live ↔ History 同源差分测试（Tier 1-2，零新 npm 依赖）。
 *
 * 覆盖：
 * 1. 有界管线充要不变量（`historyCandidates` + `readPendingAcrossSessions` + `hasBoundary`，含 800 条无截断边界）；
 * 2. 身份与去重不变量（同文不同 id 不塌缩、React key 唯一）；
 * 3. `registerAttentionObservers`（Live）↔ `pendingAsks`（History）随机序列双源同源差分与畸形 `request` 防崩溃。
 */
import { describe, expect, it } from 'vitest'
import type { SessionPageRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import {
  HISTORY_PAGE_MESSAGES,
  historyCandidates,
  readPendingAcrossSessions,
  type CandidateSession,
  type SessionPageFace,
} from '../../../packages/company-pack/src/client/presence/attention-history.ts'
import { registerAttentionObservers } from '../../../packages/company-pack/src/client/wiring/attention-observers.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import {
  ASK_TOOL_NAME,
  attentionItemKey,
  hasBoundary,
  mergeAttention,
  pendingAsks,
  STREAM_ITEM_CAP,
  type AttentionBoundaries,
  type AttentionEventLike,
} from '../../../packages/company-pack/src/lib/presence/attention.ts'

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TRIALS = 180

describe('attention 有界管线充要性质（BUG-304/305/318/320/323/327/328/332）', () => {
  it('180 组随机工作区与历史响应严格满足 fail-closed 与 exact-boundary 充要条件', async () => {
    const rng = mulberry32(202611231)
    for (let t = 0; t < TRIALS; t++) {
      const cwdKnown = rng() < 0.85
      const sameWsCount = Math.floor(rng() * 14)
      const cap = 5
      const byId: Record<string, CandidateSession> = {
        current: { id: 'current', ...(cwdKnown ? { cwd: '/ws/a' } : {}), updatedAt: 1000 },
        other: { id: 'other', cwd: '/ws/b', updatedAt: 999 },
        sub: { id: 'sub', cwd: '/ws/a', origin: 'subagent', updatedAt: 998 },
      }
      for (let s = 0; s < sameWsCount; s++) {
        byId[`s-${String(s)}`] = { id: `s-${String(s)}`, cwd: '/ws/a', updatedAt: s }
      }
      const cand = historyCandidates(byId, 'current', cap)
      expect(cand.ok).toBe(cwdKnown)

      let failedCount = 0
      let truncatedAny = false
      let totalAsksCapped = 0
      const pageBySession = new Map<string, { fail: boolean; hasMore: boolean; count: number; asks: number }>()
      const ids = cand.ok ? cand.ids : []
      for (const id of ids) {
        const fail = rng() < 0.15
        const exactPageCase = t % 10 === 0 && id === ids[0]
        const hasMore = exactPageCase ? false : rng() < 0.2
        const count = exactPageCase ? HISTORY_PAGE_MESSAGES : Math.floor(rng() * 12)
        const asks = fail ? 0 : Math.floor(rng() * 8)
        if (fail) failedCount += 1
        if (!fail && hasMore) truncatedAny = true
        if (!fail && asks > STREAM_ITEM_CAP) totalAsksCapped += asks - STREAM_ITEM_CAP
        pageBySession.set(id, { fail, hasMore, count, asks })
      }

      const page: SessionPageFace = (async (req: SessionPageRequest) => {
        const sid = req.address.kind === 'session' ? String(req.address.sessionId) : ''
        const cfg = pageBySession.get(sid) ?? { fail: false, hasMore: false, count: 0, asks: 0 }
        if (req.maxMessages === 1) {
          return { ok: true as const, value: { records: [{ type: 'event' as const, event: { seq: 100, type: 'turn/start', time: 1, data: {} } }], hasMore: false } }
        }
        if (cfg.fail) return { ok: false as const, error: { message: 'boom' } }
        const events = [
          ...Array.from({ length: cfg.count }, (_, idx) => ({ type: 'turn/start', time: idx, data: {}, seq: idx + 1 })),
          ...Array.from({ length: cfg.asks }, (_, k) => ({
            type: 'approval/asked',
            time: cfg.count + k + 1,
            data: { id: `${sid}-a-${String(k)}`, toolName: 'bash', reason: `reason ${String(k)}` },
            seq: cfg.count + k + 1,
          })),
        ]
        return { ok: true as const, value: { records: events.map(event => ({ type: 'event' as const, event })), hasMore: cfg.hasMore } }
      }) as unknown as SessionPageFace

      const history = await readPendingAcrossSessions(page, ids)
      expect(history.failed).toBe(failedCount)
      expect(history.scanned).toBe(ids.length - failedCount)
      expect(history.asksCapped).toBe(totalAsksCapped)
      expect(history.window).toBe(truncatedAny ? 'some' : 'none')
      for (const item of history.items) expect(item.jumpTo).not.toBe('other')

      const eventsTruncated = rng() < 0.1
      const ownCapped = rng() < 0.1 ? 1 : 0
      const boundaries: AttentionBoundaries = {
        eventsTruncated,
        candidates: cand.ok ? { total: cand.total, capped: cand.capped } : null,
        asksCapped: ownCapped + history.asksCapped,
        window: history.window,
        failed: history.failed,
      }
      const expectedBoundary = eventsTruncated || !cwdKnown || sameWsCount > cap || boundaries.asksCapped > 0 || truncatedAny || failedCount > 0
      expect(hasBoundary(boundaries)).toBe(expectedBoundary)
    }
  })
})

describe('identity · mergeAttention 与 Live ↔ History 同源差分', () => {
  it('同摘要不同 id 的审批/问询永不塌缩且 key 互异', () => {
    const longSameText = 'x'.repeat(220)
    const a1: AttentionEventLike = { type: 'approval/asked', time: 100, data: { id: 'ap-1', toolName: 'bash', reason: longSameText } }
    const a2: AttentionEventLike = { type: 'approval/asked', time: 101, data: { id: 'ap-2', toolName: 'bash', reason: longSameText } }
    const q1: AttentionEventLike = { type: 'tool/call', time: 102, data: { callId: 'q-1', name: ASK_TOOL_NAME, arguments: JSON.stringify({ questions: [{ question: longSameText }] }) } }
    const q2: AttentionEventLike = { type: 'tool/call', time: 103, data: { callId: 'q-2', name: ASK_TOOL_NAME, arguments: JSON.stringify({ questions: [{ question: longSameText }] }) } }
    const asks = pendingAsks([a1, a2, q1, q2], 's1')
    expect(asks.items).toHaveLength(4)
    expect(new Set(asks.items.map(attentionItemKey)).size).toBe(4)
  })

  it('Live (registerAttentionObservers) ↔ History (pendingAsks) 200 轮随机交错流同源一致且去重零重行', async () => {
    const rng = mulberry32(202611232)
    for (let trial = 0; trial < 200; trial++) {
      const handlers = new Map<string, (this: unknown, request: never, next: () => unknown) => unknown>()
      const registry = createAttentionRegistry()
      const dispose = registerAttentionObservers({
        remote: {
          $on: (event, handler) => {
            handlers.set(event, handler)
            return () => { handlers.delete(event) }
          },
        },
        sessions: { scopeOf: owner => (owner as { sid?: string }).sid },
        attention: registry,
      })

      const resolves: Array<() => void> = []
      const events: AttentionEventLike[] = []
      const hasHistoryOnly = rng() < 0.35
      if (hasHistoryOnly) {
        events.push({
          type: 'approval/asked',
          time: 9_000,
          data: { id: 'hist-only', toolName: 'bash', reason: 'Pre-refresh pending item' },
        })
      }
      const count = 1 + Math.floor(rng() * (STREAM_ITEM_CAP + 3))
      let liveOpenCount = 0

      for (let i = 0; i < count; i++) {
        const settle = rng() < 0.4
        const time = 10_000 + i * 10
        if (rng() < 0.5) {
          const id = `ap-${String(i)}`
          const toolName = rng() < 0.15 ? undefined : pickTool(rng)
          const reason = rng() < 0.3 ? '' : `Need signoff #${String(i)} ${'a'.repeat(Math.floor(rng() * 190))}`
          const p = (handlers.get('approval/request')!).call(
            { sid: 'lead-1' },
            { id, toolName, reason } as never,
            () => new Promise<void>(resolve => {
              if (settle) resolve()
              else resolves.push(resolve)
            }),
          )
          events.push({ type: 'approval/asked', time, data: { id, toolName, reason } })
          if (settle) {
            events.push({ type: 'approval/decided', time: time + 1, data: { id, outcome: 'allowed-once' } })
            await p
          } else {
            liveOpenCount += 1
          }
        } else {
          const callId = `q-${String(i)}`
          const qPayload = pickQuestionPayload(rng, i)
          const p = (handlers.get('user-questions/request')!).call(
            { sid: 'lead-1' },
            qPayload.req as never,
            () => new Promise<void>(resolve => {
              if (settle) resolve()
              else resolves.push(resolve)
            }),
          )
          events.push({ type: 'tool/call', time, data: { callId, name: ASK_TOOL_NAME, arguments: qPayload.argsJson } })
          if (settle) {
            events.push({ type: 'tool/result', time: time + 1, data: { callId } })
            await p
          } else {
            liveOpenCount += 1
          }
        }
      }

      const live = registry.list()
      const totalOpen = liveOpenCount + (hasHistoryOnly ? 1 : 0)
      const history = pendingAsks(events, 'lead-1')
      expect(live).toHaveLength(liveOpenCount)
      expect(history.items.length).toBeLessThanOrEqual(STREAM_ITEM_CAP)
      expect(history.items.length + history.capped).toBe(totalOpen)

      const merged = mergeAttention(live, history.items)
      if (!hasHistoryOnly && totalOpen <= STREAM_ITEM_CAP) {
        expect(merged).toHaveLength(liveOpenCount)
      } else {
        expect(merged.length).toBeGreaterThanOrEqual(liveOpenCount)
        expect(merged.length).toBeLessThanOrEqual(totalOpen)
      }

      const normalize = (list: typeof merged) => [...list]
        .map(item => ({
          kind: item.kind,
          what: item.what,
          whatToken: item.whatToken,
          detail: item.detail,
        }))
        .sort((a, b) => `${a.kind}:${a.what}`.localeCompare(`${b.kind}:${b.what}`))

      if (totalOpen <= STREAM_ITEM_CAP && !hasHistoryOnly) {
        expect(normalize(mergeAttention(live, []))).toEqual(normalize(history.items))
        expect(normalize(merged)).toEqual(normalize(history.items))
      }

      for (const resolve of resolves) resolve()
      await Promise.resolve()
      dispose()
    }
  })

  it('同文双问询（1 活体+历史、1 仅历史）按多重集 1:1 抵消后保留 2 条，不静默误删历史项', () => {
    const merged = mergeAttention(
      [{ kind: 'question', sessionId: 'lead-1', id: 'question:100:1', what: 'Same question?', since: 200 }],
      [
        { kind: 'question', who: 'lead-1', id: 'call-1', what: 'Same question?', time: 190, jumpTo: 'lead-1' },
        { kind: 'question', who: 'lead-1', id: 'call-2', what: 'Same question?', time: 100, jumpTo: 'lead-1' },
      ],
    )
    expect(merged).toHaveLength(2)
  })

  it('registerAttentionObservers 收到畸形 user-questions/request 与 approval/request 均不崩溃并正常委托 next()', async () => {
    const handlers = new Map<string, (this: unknown, request: never, next: () => unknown) => unknown>()
    const registry = createAttentionRegistry()
    registerAttentionObservers({
      remote: { $on: (e, h) => { handlers.set(e, h); return () => {} } },
      sessions: { scopeOf: () => 'lead-1' },
      attention: registry,
    })
    const malformedInputs: readonly unknown[] = [null, undefined, 123, { questions: 123 }]
    let nextCalls = 0
    let activeDuringNext = 0
    for (const payload of malformedInputs) {
      await (handlers.get('user-questions/request')!).call({}, payload as never, async () => {
        nextCalls += 1
        activeDuringNext += registry.list().length
      })
      await (handlers.get('approval/request')!).call({}, payload as never, async () => {
        nextCalls += 1
        activeDuringNext += registry.list().length
      })
    }
    expect(nextCalls).toBe(malformedInputs.length * 2)
    expect(activeDuringNext).toBe(malformedInputs.length * 2)
    expect(registry.list()).toHaveLength(0)
  })
})

function pickTool(rng: () => number): string {
  const list = ['bash', 'request_signoff', 'write_file']
  return list[Math.floor(rng() * list.length)]!
}

function pickQuestionPayload(rng: () => number, index: number): { req: unknown; argsJson: string } {
  const variant = Math.floor(rng() * 4)
  if (variant === 0) return { req: { questions: [] }, argsJson: JSON.stringify({ questions: [] }) }
  if (variant === 1) {
    const req = { questions: [{ question: `Confirm step ${String(index)}?` }] }
    return { req, argsJson: JSON.stringify(req) }
  }
  if (variant === 2) {
    const req = { questions: [{ question: `First ${String(index)}` }, { question: `Second ${String(index)}` }] }
    return { req, argsJson: JSON.stringify(req) }
  }
  return { req: { questions: [{ question: '  ' }, { question: `Valid ${String(index)}` }] }, argsJson: JSON.stringify({ questions: [{ question: '  ' }, { question: `Valid ${String(index)}` }] }) }
}

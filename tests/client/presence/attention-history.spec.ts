/**
 * 跨会话挂起审批重建的 keyless 判据（BUG-292 的 A 路线）。
 *
 * 为什么单独一条：这条路径的全部难点在「游标」——`session/page` 的 `throughSeq` 必须是有效游标，
 * 先用一个越过头部的请求探出来（成功取末条 seq / 失败读 `past cursor N`），再取一页。判据钉三件事：
 * 探游标两种形态都对、`asked`/`decided` 配对只留「问了没答」、单会话读失败只少那一份不整体失败。
 */
import { describe, expect, it } from 'vitest'
import type { SessionPageRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import {
  readPendingAcrossSessions,
  readSessionEvents,
  type SessionPageFace,
} from '../../../packages/company-pack/src/client/presence/attention-history.ts'

const asked = (id: string) => ({ type: 'approval/asked', time: 100, data: { id, toolName: 'request_signoff', reason: '双签' } })
const decided = (id: string) => ({ type: 'approval/decided', time: 200, data: { id, outcome: 'rejected' } })

/** 造一个 page 面：probe 形态可控，正式页返回给定事件。 */
function face(options: {
  readonly probe?: { ok: true, cursor: number } | { ok: false, message: string }
  readonly events?: readonly unknown[]
  readonly failFull?: boolean
}): SessionPageFace {
  return (async (request: SessionPageRequest) => {
    if (request.maxMessages === 1) {
      if (options.probe?.ok === false) return { ok: false, error: { message: options.probe.message } }
      const cursor = options.probe?.ok === true ? options.probe.cursor : 0
      return { ok: true, value: { records: [{ type: 'event', event: { type: 'turn/start', seq: cursor, time: 1, data: {} } }], hasMore: false } }
    }
    if (options.failFull === true) return { ok: false, error: { message: 'boom' } }
    const events = options.events ?? []
    return { ok: true, value: { records: events.map((event, index) => ({ type: 'event', event: { ...(event as object), seq: index + 1 } })), hasMore: false } }
  }) as unknown as SessionPageFace
}

// 负例留证 2026-11-21：把探游标那一步改成固定失败后 `vitest run tests/client/presence/attention-history.spec.ts` 4 failed / 1 passed（重建不出任何挂起项）；还原后 5/5 绿。BUG-292
describe('跨会话挂起审批重建（BUG-292）', () => {
  it('探游标：成功时取末条 seq，据此取一页', async () => {
    const calls: number[] = []
    const base = face({ probe: { ok: true, cursor: 7 }, events: [asked('a1')] })
    const events = await readSessionEvents(async (request, signal) => { calls.push(request.throughSeq); return base(request, signal) }, 'session-b')
    expect(calls).toEqual([Number.MAX_SAFE_INTEGER, 7])
    expect(events?.map(event => event.type)).toContain('approval/asked')
  })

  it('探游标：vendor 报 past cursor N 时用 N', async () => {
    const calls: number[] = []
    const base = face({ probe: { ok: false, message: 'session page through seq 9007199254740991 is past cursor 42' }, events: [] })
    await readSessionEvents(async (request, signal) => { calls.push(request.throughSeq); return base(request, signal) }, 'session-b')
    expect(calls).toEqual([Number.MAX_SAFE_INTEGER, 42])
  })

  it('别的会话里 asked 未 decided ⇒ 重建出一条挂起项，jumpTo 指那条会话', async () => {
    const items = await readPendingAcrossSessions(face({ events: [asked('a1')] }), ['session-b'])
    expect(items).toHaveLength(1)
    expect(items[0]?.jumpTo).toBe('session-b')
    expect(items[0]?.kind).toBe('approval')
  })

  it('asked + decided 同一 id ⇒ 不出现（只留问了没答）', async () => {
    const items = await readPendingAcrossSessions(face({ events: [asked('a1'), decided('a1')] }), ['session-b'])
    expect(items).toHaveLength(0)
  })

  it('单条会话读失败只少那一份，不影响其它会话', async () => {
    const ok = face({ events: [asked('a1')] })
    const bad = face({ failFull: true })
    const items = await readPendingAcrossSessions(async (request, signal) => ((request.address as { sessionId?: string }).sessionId === 'session-ok' ? ok(request, signal) : bad(request, signal)), ['session-bad', 'session-ok'])
    expect(items).toHaveLength(1)
    expect(items[0]?.jumpTo).toBe('session-ok')
  })
})

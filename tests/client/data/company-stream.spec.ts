// 负例留证 2026-11-24：把 applyStreamFrame 改回无界 [...prev, event] ⇒ 「窗口封顶/丢弃计数」用例红。BUG-365
/** follow 流事件窗口（BUG-365）：数据层有界，保留尾部与丢弃计数。 */
import { describe, expect, it } from 'vitest'
import { applyStreamFrame, EMPTY_STREAM_WINDOW, EVENT_WINDOW, type StreamWindow } from '../../../packages/company-pack/src/client/data/company-stream.ts'
import type { TeamEventLike } from '../../../packages/company-pack/src/lib/presence/presence.ts'

const event = (n: number): TeamEventLike => ({ type: 'team/task', time: n, seq: n, data: { teamId: 't', task: { id: `T${String(n)}`, revision: 1, subject: 'x', status: 'pending' } } } as unknown as TeamEventLike)

describe('applyStreamFrame（BUG-365）', () => {
  it('history 裁到窗口并记丢弃数（保留尾部）', () => {
    const history = Array.from({ length: EVENT_WINDOW + 250 }, (_, index) => event(index))
    const next = applyStreamFrame(EMPTY_STREAM_WINDOW, { kind: 'history', events: history })
    expect(next.items).toHaveLength(EVENT_WINDOW)
    expect(next.dropped).toBe(250)
    expect((next.items[0] as unknown as { seq: number }).seq).toBe(250)
  })

  it('连续追加封顶：长度不超窗口，丢弃累计，最后一条仍在', () => {
    let state: StreamWindow = { items: Array.from({ length: EVENT_WINDOW }, (_, index) => event(index)), dropped: 0 }
    for (let index = EVENT_WINDOW; index < EVENT_WINDOW + 10; index += 1) {
      state = applyStreamFrame(state, { kind: 'event', event: event(index) })
    }
    expect(state.items).toHaveLength(EVENT_WINDOW)
    expect(state.dropped).toBe(10)
    expect((state.items[state.items.length - 1] as unknown as { seq: number }).seq).toBe(EVENT_WINDOW + 9)
  })
})

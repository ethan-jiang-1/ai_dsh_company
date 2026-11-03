/**
 * 错误上报中继（2026-11-03 第六轮 D6）：无会话时排队、会话出现后补送、节流窗口内不丢条目。
 *
 * 病类：旧实现是 `client/index.ts` 里的丢弃式闭包——`if (now - lastSent < 1000) return` 与
 * `if (current === undefined) return` 直接丢条目，首屏（还没有会话）报的错永远到不了
 * `company-client-errors.log`，用户症状没有盘上证据。本档用注入时钟/定时器把语义钉死。
 *
 * 证明不了：真实浏览器事件捕获（error-ring 自身）、远端命令真的写盘（client-error-chain-smoke）、
 * 会话服务的真实快照（company-client-composition）。
 */
import { describe, expect, it } from 'vitest'
import { createErrorRelay, type ClientErrorEntry } from '../../../packages/company-pack/src/client/wiring/error-ring.ts'

const entry = (message: string): ClientErrorEntry => ({ kind: 'error', message, at: 0 })

/** 注入式时钟 + 定时器；`runDue()` 只跑已到点的那一个。 */
function harness(options: { intervalMs?: number; maxPending?: number } = {}) {
  let now = 5_000
  let session: string | undefined
  const sent: { sessionId: string; entry: ClientErrorEntry }[] = []
  const timers: { fn: () => void; at: number }[] = []
  const errors: unknown[] = []
  const relay = createErrorRelay<string>({
    currentSessionId: () => session,
    send: (_sessionId, item) => { sent.push({ sessionId: _sessionId, entry: item }) },
    now: () => now,
    schedule: (fn, ms) => { const timer = { fn, at: now + ms }; timers.push(timer); return timer },
    cancel: handle => { const index = timers.indexOf(handle as { fn: () => void; at: number }); if (index >= 0) timers.splice(index, 1) },
    onSendError: error => errors.push(error),
    ...options,
  })
  return {
    relay,
    sent,
    errors,
    setSession: (id: string | undefined) => { session = id },
    advance(ms: number) { now += ms },
    runDue() {
      timers.sort((a, b) => a.at - b.at)
      const timer = timers[0]
      if (timer === undefined || timer.at > now) return false
      timers.shift()
      now = timer.at
      timer.fn()
      return true
    },
    pendingTimers: () => timers.length,
  }
}

describe('createErrorRelay（客户端错误上报）', () => {
  it('无会话时排队、不丢；会话出现后按序补送，节流后送完', () => {
    const h = harness()
    h.relay.push(entry('first'))
    h.relay.push(entry('second'))
    expect(h.sent).toHaveLength(0)
    expect(h.relay.pending()).toBe(2)

    h.setSession('s1')
    h.relay.flush()
    expect(h.sent).toEqual([{ sessionId: 's1', entry: expect.objectContaining({ message: 'first' }) }])
    expect(h.relay.pending()).toBe(1)

    h.advance(1_000)
    h.runDue()
    expect(h.sent.map(item => item.entry.message)).toEqual(['first', 'second'])
    expect(h.relay.pending()).toBe(0)
  })

  it('节流窗口内到达的条目排队，不当场丢弃（旧实现的病）', () => {
    const h = harness({ intervalMs: 1_000 })
    h.setSession('s1')
    h.relay.push(entry('a'))
    expect(h.sent).toHaveLength(1) // 距上次发送足够久：立即送
    h.relay.push(entry('b'))
    h.relay.push(entry('c'))
    expect(h.sent).toHaveLength(1) // 窗口内：排队，不丢
    expect(h.relay.pending()).toBe(2)
    h.advance(1_000)
    h.runDue()
    h.advance(1_000)
    h.runDue()
    expect(h.sent.map(item => item.entry.message)).toEqual(['a', 'b', 'c'])
  })

  it('队列有界：超出上限丢最旧，不无限涨', () => {
    const h = harness({ maxPending: 2 })
    h.relay.push(entry('1'))
    h.relay.push(entry('2'))
    h.relay.push(entry('3'))
    expect(h.relay.pending()).toBe(2)
    h.setSession('s1')
    h.relay.flush()
    h.advance(1_000)
    h.runDue()
    expect(h.sent.map(item => item.entry.message)).toEqual(['2', '3'])
  })

  it('发送失败进 onSendError，队列继续（不因一次失败卡死）', () => {
    const h = harness()
    h.setSession('s1')
    const failing = createErrorRelay<string>({
      currentSessionId: () => 's1',
      send: () => { throw new Error('boom') },
      now: () => 5_000,
      schedule: () => undefined,
      cancel: () => {},
      onSendError: error => h.errors.push(error),
    })
    failing.push(entry('a'))
    expect(h.errors).toHaveLength(1)
    expect(h.errors[0]).toBeInstanceOf(Error)
  })

  it('dispose 之后不再排定时器、不再发', () => {
    const h = harness()
    h.setSession('s1')
    h.relay.push(entry('a'))
    h.relay.push(entry('b'))
    h.relay.dispose()
    h.advance(10_000)
    h.runDue()
    expect(h.sent).toHaveLength(1)
  })
})

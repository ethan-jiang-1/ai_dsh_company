/**
 * 「待办」远端事件观察者的 keyless 判据（R3-10，2026-10-27）。
 *
 * 为什么补：观察者原先内联在 client 入口 `ctx.inject` 里，只有真 Web 会话才执行——907 例全绿时
 * 它一行没跑过。抽出 `registerAttentionObservers` 后这里断言三条真契约：
 * **永远委托 `next()`（观察者不是应答者）**、**按发起会话登记**、**`next()` 结算后销账**（含抛错）。
 */
import { describe, expect, it, vi } from 'vitest'
import { createAttentionRegistry } from '../../packages/company-pack/src/client/attention-registry.ts'
import { registerAttentionObservers, type AttentionRemote, type AttentionSessions } from '../../packages/company-pack/src/client/attention-observers.ts'

/** 假远端：记下 handler，测试自己派发（this 由调用方给）。 */
function fakeRemote() {
  const handlers = new Map<string, (this: unknown, request: unknown, next: () => unknown) => unknown>()
  const remote: AttentionRemote = {
    $on: (event, handler) => { handlers.set(event, handler as never); return () => {} },
  }
  return { remote, handlers }
}

/** 假会话服务：只有 owner-1 有归属。 */
const sessions: AttentionSessions = {
  scopeOf: (owner) => (owner === 'owner-1' ? 'session-vp-eng' : undefined),
}

describe('待办观察者：登记、委托与销账（R3-10）', () => {
  it('问询事件登记挂起项，并永远把 next() 的返回值原样交回', async () => {
    const { remote, handlers } = fakeRemote()
    const registry = createAttentionRegistry()
    registerAttentionObservers({ remote, sessions, attention: registry })
    const request = { questions: [{ question: '  要不要并行两条线？  ' }] }
    const next = vi.fn(async () => 'answered-by-platform')
    const result = await handlers.get('user-questions/request')?.call('owner-1', request, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(result).toBe('answered-by-platform')
    expect(registry.list()).toEqual([])   // next 结算后销账
  })

  it('挂起期间登记处可见；next 抛错也照样销账（finally）', async () => {
    const { remote, handlers } = fakeRemote()
    const registry = createAttentionRegistry()
    registerAttentionObservers({ remote, sessions, attention: registry })
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const next = vi.fn(async () => { await gate; throw new Error('denied') })
    const pending = handlers.get('approval/request')?.call('owner-1', { toolName: 'request_signoff', reason: ' 签发发布 ' }, next)
    await Promise.resolve()
    expect(registry.list()).toEqual([
      expect.objectContaining({ kind: 'approval', sessionId: 'session-vp-eng', what: 'request_signoff：签发发布' }),
    ])
    release()
    await expect(pending).rejects.toThrow('denied')
    expect(registry.list()).toEqual([])
  })

  it('问询内容缺失时给可读占位，不登记空串', async () => {
    const { remote, handlers } = fakeRemote()
    const registry = createAttentionRegistry()
    registerAttentionObservers({ remote, sessions, attention: registry })
    const next = vi.fn(async () => {
      expect(registry.list()[0]?.what).toBe('（问询内容缺失）')
      return 'ok'
    })
    await handlers.get('user-questions/request')?.call('owner-1', { questions: [] }, next)
  })

  it('解不出发起会话时只委托、不登记（不制造无主待办）', async () => {
    const { remote, handlers } = fakeRemote()
    const registry = createAttentionRegistry()
    registerAttentionObservers({ remote, sessions, attention: registry })
    const next = vi.fn(() => 'passthrough')
    const result = handlers.get('approval/request')?.call('owner-unknown', { toolName: 'request_signoff' }, next)
    expect(result).toBe('passthrough')
    expect(next).toHaveBeenCalledTimes(1)
    expect(registry.list()).toEqual([])
  })

  it('审批缺 reason 时用工具名，缺工具名时也给占位（不登记 undefined）', async () => {
    const { remote, handlers } = fakeRemote()
    const registry = createAttentionRegistry()
    registerAttentionObservers({ remote, sessions, attention: registry })
    const next = vi.fn(async () => {
      expect(registry.list()[0]?.what).toBe('（工具名缺失）')
      return 'ok'
    })
    await handlers.get('approval/request')?.call('owner-1', {}, next)
  })
})

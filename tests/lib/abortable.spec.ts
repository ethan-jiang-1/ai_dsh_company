/** `abortable`：host 阻塞原语的取消缝（BUG-053）。 */
import { getEventListeners } from 'node:events'
import { describe, expect, it } from 'vitest'
import { abortable } from '../../packages/company-pack/src/lib/abortable.ts'

describe('abortable', () => {
  it('signal 未 abort 时透传 operation 的值', async () => {
    const controller = new AbortController()
    await expect(abortable(Promise.resolve('ok'), controller.signal)).resolves.toBe('ok')
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
  })

  it('signal abort 后立即 reject（即使 operation 永不 resolve），并原样抛 reason', async () => {
    const controller = new AbortController()
    const never = new Promise<never>(() => {})
    const pending = abortable(never, controller.signal, 'subagent result')
    controller.abort(new Error('parent cancelled'))
    await expect(pending).rejects.toThrow('parent cancelled')
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
  })

  it('已 abort 的 signal：不发 operation 等待，直接 reject', async () => {
    const controller = new AbortController()
    controller.abort(new Error('retry aborted'))
    await expect(abortable(new Promise<never>(() => {}), controller.signal, 'retry')).rejects
      .toThrow('retry aborted')
  })

  it('operation 先结束：摘掉 abort 监听（不泄漏）', async () => {
    const controller = new AbortController()
    await expect(abortable('fast', controller.signal)).resolves.toBe('fast')
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
    controller.abort()
  })
})

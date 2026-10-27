/**
 * 浏览器侧错误环（R3-03）的 keyless 判据：捕获三类错误、有界去重、卸载还原。
 * 真页面侧的消费（cdp-probe / ui-scene-smoke 读 `window.__DSH_COMPANY_ERRORS__`）归浏览器车道。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  createErrorRing,
  ERROR_RING_KEY,
  installErrorCapture,
  type ErrorCaptureTarget,
} from '../../packages/company-pack/src/client/error-ring.ts'

/** 假 window：只有 error-ring 用到的四个面。 */
function fakeTarget(): {
  target: ErrorCaptureTarget
  emit: (type: string, event: unknown) => void
  consoleError: ReturnType<typeof vi.fn>
  listeners: Map<string, Set<(event: never) => void>>
} {
  const listeners = new Map<string, Set<(event: never) => void>>()
  const consoleError = vi.fn()
  const target = {
    addEventListener: (type: string, listener: (event: never) => void) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: (event: never) => void) => {
      listeners.get(type)?.delete(listener)
    },
    console: { error: consoleError },
    location: { href: 'http://127.0.0.1:1/?token=x' },
  } as unknown as ErrorCaptureTarget
  return {
    target,
    listeners,
    consoleError,
    emit: (type, event) => { for (const listener of listeners.get(type) ?? []) (listener as (value: unknown) => void)(event) },
  }
}

describe('客户端错误环（R3-03）', () => {
  it('捕获 error / unhandledrejection / console.error，并原样转发 console', () => {
    const ring = createErrorRing()
    const { target, emit, consoleError } = fakeTarget()
    const uninstall = installErrorCapture(target, ring)

    emit('error', { error: new Error('boom'), message: 'boom' })
    emit('unhandledrejection', { reason: 'promise said no' })
    ;(target.console as { error: (...args: unknown[]) => void }).error('render failed', 42)

    expect(ring.list().map(entry => entry.kind)).toEqual(['error', 'rejection', 'console'])
    expect(ring.list()[0].message).toContain('boom')
    expect(ring.list()[0].stack).toContain('Error: boom')
    expect(ring.list()[1].message).toContain('promise said no')
    expect(ring.list()[2].message).toContain('render failed 42')
    expect(consoleError).toHaveBeenCalledWith('render failed', 42)   // 不吞原输出
    uninstall()
  })

  it('reporter 收到条目且 token 已脱敏；reporter 抛错不影响环', () => {
    const seen: Array<{ message: string; href?: string }> = []
    const ring = createErrorRing(10, entry => { seen.push(entry) })
    const { target, emit } = fakeTarget()
    const uninstall = installErrorCapture(target, ring)
    emit('error', { error: new Error('boom https://example.invalid/?token=SECRET') })
    expect(seen).toHaveLength(1)
    expect(seen[0].message).toContain('boom')
    expect(seen[0].message).not.toContain('SECRET')
    expect(seen[0].href).not.toContain('SECRET')
    uninstall()

    const throwing = createErrorRing(10, () => { throw new Error('reporter down') })
    const second = fakeTarget()
    const uninstallSecond = installErrorCapture(second.target, throwing)
    second.emit('error', { error: new Error('still captured') })
    expect(throwing.list()).toHaveLength(1)
    uninstallSecond()
  })

  it('同一错误连续刷屏只留一条；环有界（旧条目被挤掉）', () => {
    const ring = createErrorRing(3)
    const { target, emit } = fakeTarget()
    const uninstall = installErrorCapture(target, ring)
    emit('error', { error: new Error('loop') })
    emit('error', { error: new Error('loop') })
    emit('error', { error: new Error('a') })
    emit('error', { error: new Error('b') })
    emit('error', { error: new Error('c') })
    expect(ring.list()).toHaveLength(3)
    expect(ring.list().map(entry => entry.message)).toEqual(['Error: a', 'Error: b', 'Error: c'])
    uninstall()
  })

  it('卸载后不再捕获、console.error 还原；全局引用回到安装前', () => {
    const ring = createErrorRing()
    const { target, emit, consoleError, listeners } = fakeTarget()
    const before = (target as unknown as Record<string, unknown>)[ERROR_RING_KEY]
    const uninstall = installErrorCapture(target, ring)
    expect((target as unknown as Record<string, unknown>)[ERROR_RING_KEY]).toBe(ring)
    uninstall()
    emit('error', { error: new Error('late') })
    expect(ring.list()).toEqual([])
    expect(listeners.get('error')?.size).toBe(0)
    expect((target as unknown as Record<string, unknown>)[ERROR_RING_KEY]).toBe(before)
    expect((target.console as { error: unknown }).error).toBe(consoleError)
  })
})

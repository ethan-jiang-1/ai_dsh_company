/**
 * 浏览器侧错误环（R3-03）的 keyless 判据：捕获三类错误、有界去重、卸载还原。
 * 真页面侧的消费（cdp-probe / ui-scene-smoke 读 `window.__DSH_COMPANY_ERRORS__`）归浏览器车道。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  createErrorRing,
  ERROR_RING_KEY,
  ERROR_RING_PERSIST_KEY,
  installErrorCapture,
  type ErrorCaptureTarget,
  type ErrorRing,
} from '../../../packages/company-pack/src/client/wiring/error-ring.ts'

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
    expect(ring.list()[0]!.message).toContain('boom')
    expect(ring.list()[0]!.stack).toContain('Error: boom')
    expect(ring.list()[1]!.message).toContain('promise said no')
    expect(ring.list()[2]!.message).toContain('render failed 42')
    expect(consoleError).toHaveBeenCalledWith('render failed', 42)   // 不吞原输出
    uninstall()
  })

  it('error 为 null 的 error 事件用 message，不记成 "null"（2026-11-13 假红教训）', () => {
    const ring = createErrorRing()
    const { target, emit } = fakeTarget()
    const uninstall = installErrorCapture(target, ring)
    emit('error', { error: null, message: 'Script error.' })
    expect(ring.list().map(entry => entry.message)).toEqual(['Script error.'])
    uninstall()
  })

  it('非 Error 的 error 对象不吞 event.message（{} / 跨 realm Error 两形状）', () => {
    const ring = createErrorRing()
    const { target, emit } = fakeTarget()
    const uninstall = installErrorCapture(target, ring)
    emit('error', { error: {}, message: 'real cross-realm message' })
    expect(ring.list().map(entry => entry.message)).toEqual(['real cross-realm message'])
    // 跨 realm 的 Error：instanceof Error 为 false，但 name/message 字段可读。
    emit('error', { error: { name: 'TypeError', message: 'cross realm' }, message: 'TypeError: cross realm' })
    expect(ring.list().map(entry => entry.message)).toEqual(['real cross-realm message', 'TypeError: cross realm'])
    // 没有 message 的对象取 reason / name；两者都没有才落到「未知」。
    emit('error', { error: { reason: 'promise said no' } })
    emit('error', { error: {} })
    expect(ring.list().map(entry => entry.message)).toEqual([
      'real cross-realm message', 'TypeError: cross realm', 'promise said no', '（未知页面错误）',
    ])
    uninstall()
  })

  it('ResizeObserver 循环通知是浏览器提示、不是页面异常：不入环', () => {
    const ring = createErrorRing()
    const { target, emit } = fakeTarget()
    const uninstall = installErrorCapture(target, ring)
    emit('error', { error: null, message: 'ResizeObserver loop completed with undelivered notifications.' })
    emit('error', { message: 'ResizeObserver loop limit exceeded' })
    expect(ring.list()).toEqual([])
    uninstall()
  })

  it('reporter 收到条目且 token 已脱敏；reporter 抛错不影响环', () => {
    const seen: Array<{ message: string; href?: string }> = []
    const ring = createErrorRing(10, entry => { seen.push(entry) })
    const { target, emit } = fakeTarget()
    const uninstall = installErrorCapture(target, ring)
    emit('error', { error: new Error('boom https://example.invalid/?token=SECRET') })
    expect(seen).toHaveLength(1)
    expect(seen[0]!.message).toContain('boom')
    expect(seen[0]!.message).not.toContain('SECRET')
    expect(seen[0]!.href).not.toContain('SECRET')
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

  it('sessionStorage 恢复：刷新后最近一页错误仍在，且不回放 reporter（R5-31）', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => { store.set(key, value) },
    }
    const first = fakeTarget()
    ;(first.target as unknown as { sessionStorage: typeof storage }).sessionStorage = storage
    const uninstallFirst = installErrorCapture(first.target)
    first.emit('error', { error: new Error('persist me') })
    const firstRing = (first.target as unknown as Record<string, unknown>)[ERROR_RING_KEY] as ErrorRing
    expect(firstRing.list().map(entry => entry.message)).toEqual(['Error: persist me'])
    expect(store.get(ERROR_RING_PERSIST_KEY)).toContain('persist me')
    uninstallFirst()

    // 新页面：同一 sessionStorage，新的环；历史条目恢复但不重新上报。
    const second = fakeTarget()
    ;(second.target as unknown as { sessionStorage: typeof storage }).sessionStorage = storage
    const seen: string[] = []
    const uninstallSecond = installErrorCapture(second.target, undefined, entry => { seen.push(entry.message) })
    const secondRing = (second.target as unknown as Record<string, unknown>)[ERROR_RING_KEY] as ErrorRing
    expect(secondRing.list().map(entry => entry.message)).toEqual(['Error: persist me'])
    expect(seen).toEqual([])
    uninstallSecond()
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

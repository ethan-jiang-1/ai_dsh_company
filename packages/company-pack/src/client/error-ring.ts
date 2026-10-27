/**
 * 客户端错误环（人为可见面的「浏览器侧证据」）。
 *
 * 为什么（2026-10-27 R3-03）：浏览器里的 `error` / `unhandledrejection` / `console.error` 此前只活
 * 在探针进程里（且只在失败时写盘），用户报「点了没反应 / 面板白」时，模型可见记录里零信息。
 * 本模块在**页面内**保留一个有界环，并挂到 `window.__DSH_COMPANY_ERRORS__`：
 * - 真页面探针（cdp-probe / ui-scene-smoke）读取它并计入 verdict/证据 → agent 能看见；
 * - 用户可以在 DevTools 里 `__DSH_COMPANY_ERRORS__` 直接看。
 *
 * 边界（诚实声明）：它**不写会话日志**（client 没有往 session 追加事件的合法通道；不为此自造 vendor
 * 机制）。所以它是「agent 通过真页面车道可见」，不是「模型在下一轮上下文里可见」。这条边界写在
 * docs/guides/cdp-probe.md 与 Note 里，不冒充模型可见。
 */

/** 一条客户端错误（JSON 可序列化，长度有界）。 */
export interface ClientErrorEntry {
  readonly kind: 'error' | 'rejection' | 'console'
  readonly message: string
  /** 首帧堆栈的前几行（浏览器给的字符串，原样截断）。 */
  readonly stack?: string
  readonly at: number
  readonly href?: string
}

/** 有界环：去重相邻重复、最多保留 limit 条。 */
export interface ErrorRing {
  readonly push: (entry: ClientErrorEntry) => void
  readonly list: () => readonly ClientErrorEntry[]
  readonly clear: () => void
}

export const ERROR_RING_LIMIT = 50
export const ERROR_RING_KEY = '__DSH_COMPANY_ERRORS__'

export function createErrorRing(limit = ERROR_RING_LIMIT): ErrorRing {
  const entries: ClientErrorEntry[] = []
  return {
    push(entry) {
      const last = entries[entries.length - 1]
      if (last !== undefined && last.kind === entry.kind && last.message === entry.message) {
        return   // 同一错误连续刷屏（渲染循环）只留第一条，别把环挤爆
      }
      entries.push(entry)
      while (entries.length > limit) entries.shift()
    },
    list: () => [...entries],
    clear: () => { entries.length = 0 },
  }
}

/** 只保留能安全 JSON 化的短文本（错误对象/事件各有各的形状）。 */
function textOf(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 500)
  if (value instanceof Error) return `${value.name}: ${value.message}`.slice(0, 500)
  try { return JSON.stringify(value)?.slice(0, 500) ?? '' } catch { return String(value).slice(0, 500) }
}

function stackOf(value: unknown): string | undefined {
  if (value instanceof Error && typeof value.stack === 'string') {
    return value.stack.split('\n').slice(0, 4).join('\n').slice(0, 1200)
  }
  return undefined
}

/** window 的最小面（测试用假对象；不引 DOM lib 依赖）。 */
export interface ErrorCaptureTarget {
  readonly addEventListener: (type: string, listener: (event: never) => void) => void
  readonly removeEventListener: (type: string, listener: (event: never) => void) => void
  readonly console?: { error: (...args: unknown[]) => void }
  readonly location?: { href?: string }
}

/**
 * 安装捕获；返回卸载函数（幂等：同一 target 重复安装只保留最后一份全局引用）。
 * @param target - 通常是 `window`。
 * @param ring - 环（由调用方持有，探针从 `target[ERROR_RING_KEY]` 读同一份）。
 */
export function installErrorCapture(target: ErrorCaptureTarget, ring: ErrorRing = createErrorRing()): () => void {
  const global = target as unknown as Record<string, unknown>
  const previous = global[ERROR_RING_KEY] as ErrorRing | undefined
  global[ERROR_RING_KEY] = ring

  const onError = (event: unknown): void => {
    const value = event as { error?: unknown; message?: unknown; filename?: unknown }
    ring.push({
      kind: 'error',
      message: textOf(value.error) || textOf(value.message) || '（未知页面错误）',
      ...(stackOf(value.error) !== undefined ? { stack: stackOf(value.error) as string } : {}),
      at: Date.now(),
      ...(typeof target.location?.href === 'string' ? { href: target.location.href } : {}),
    })
  }
  const onRejection = (event: unknown): void => {
    const value = event as { reason?: unknown }
    ring.push({
      kind: 'rejection',
      message: textOf(value.reason) || '（未知 unhandled rejection）',
      ...(stackOf(value.reason) !== undefined ? { stack: stackOf(value.reason) as string } : {}),
      at: Date.now(),
      ...(typeof target.location?.href === 'string' ? { href: target.location.href } : {}),
    })
  }
  target.addEventListener('error', onError as never)
  target.addEventListener('unhandledrejection', onRejection as never)

  // console.error：原始输出照旧（不吞），只镜像一份进环。
  const consoleFace = target.console
  const originalConsoleError = consoleFace?.error
  if (consoleFace !== undefined && typeof originalConsoleError === 'function') {
    consoleFace.error = (...args: unknown[]) => {
      ring.push({ kind: 'console', message: args.map(item => textOf(item)).join(' ').slice(0, 500), at: Date.now() })
      originalConsoleError.apply(consoleFace, args)
    }
  }

  return () => {
    target.removeEventListener('error', onError as never)
    target.removeEventListener('unhandledrejection', onRejection as never)
    if (consoleFace !== undefined && originalConsoleError !== undefined) consoleFace.error = originalConsoleError
    global[ERROR_RING_KEY] = previous
  }
}

/**
 * 客户端错误环（人为可见面的「浏览器侧证据」）。
 *
 * 为什么（2026-10-27 R3-03）：浏览器里的 `error` / `unhandledrejection` / `console.error` 此前只活
 * 在探针进程里（且只在失败时写盘），用户报「点了没反应 / 面板白」时，模型可见记录里零信息。
 * 本模块在**页面内**保留一个有界环，并挂到 `window.__DSH_COMPANY_ERRORS__`：
 * - 真页面探针（cdp-probe / ui-scene-smoke）读取它并计入 verdict/证据 → agent 能看见；
 * - 用户可以在 DevTools 里 `__DSH_COMPANY_ERRORS__` 直接看；
 * - client apply 可注入 reporter，把条目经 `/company-diagnostics` 写 `$DSH_HOME/logs/company-client-errors.log`
 *   ——agent 用 read 就能看到“用户那一页”的错误（仍不写会话事件；边界见 Note）。
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

/** 可选 reporter：client apply 注入，把条目交给 host 诊断命令（失败不影响环本身）。 */
export type ClientErrorReporter = (entry: ClientErrorEntry) => void

/** 有界环：去重相邻重复、最多保留 limit 条。 */
export interface ErrorRing {
  readonly push: (entry: ClientErrorEntry) => void
  readonly list: () => readonly ClientErrorEntry[]
  readonly clear: () => void
  /** 恢复持久化条目（不回放 reporter、不触发 onChange——它们是上一页已上报过的历史）。 */
  readonly restore: (entries: readonly ClientErrorEntry[]) => void
}

export const ERROR_RING_LIMIT = 50
export const ERROR_RING_KEY = '__DSH_COMPANY_ERRORS__'
/** sessionStorage 键：刷新后恢复最近一页的错误（只留当前标签页，不进 localStorage）。 */
export const ERROR_RING_PERSIST_KEY = '__DSH_COMPANY_ERRORS_V1__'

/** 错误正文/堆栈里的 token URL 不入日志（用户可读，但绝不把凭据抄进去）。 */
export function redactTokenUrls(text: string): string {
  return text.replace(/([?&]token=)[^\s&"'<>]+/g, '$1<redacted>')
}

export function createErrorRing(limit = ERROR_RING_LIMIT, onEntry?: ClientErrorReporter, onChange?: (entries: readonly ClientErrorEntry[]) => void): ErrorRing {
  const entries: ClientErrorEntry[] = []
  const changed = (): void => {
    try { onChange?.(entries) } catch { /* 持久化失败不改变环 */ }
  }
  return {
    push(entry) {
      const last = entries[entries.length - 1]
      if (last !== undefined && last.kind === entry.kind && last.message === entry.message) {
        return   // 同一错误连续刷屏（渲染循环）只留第一条，别把环挤爆
      }
      entries.push(entry)
      while (entries.length > limit) entries.shift()
      // reporter 是旁路：它抛错不能让页面错误捕获本身炸掉。
      try { onEntry?.(entry) } catch { /* reporter 自己的失败不改变环 */ }
      changed()
    },
    list: () => [...entries],
    clear: () => { entries.length = 0; changed() },
    restore(restored) {
      entries.length = 0
      for (const entry of restored.slice(-limit)) entries.push(entry)
    },
  }
}

/**
 * 从任意错误形状取可读短文本（错误对象/事件各有各的形状）。
 *
 * 关键：**普通对象先读有意义的字段**（`message` / `reason` / `name`），不要先 JSON 化——
 * `JSON.stringify({})` 是 `'{}'`（truthy），会抢在 `||` 回退前把 `event.message` 顶掉；
 * 跨 realm 的 `Error`（`instanceof Error` 为 false）经 JSON 化同样是 `{}`，但它的 `message`
 * 字段是可读的（BUG-159）。字段都没有时才退到 JSON；`{}` 这类无信息结果视为空串。
 */
function textOf(value: unknown): string {
  // null 必须落到空串：`JSON.stringify(null) === 'null'` 会抢在 `||` 回退前把
  // 有意义的 `event.message` 顶掉——浏览器给 `error === null` 的 error 事件
  // （跨源 Script error、ResizeObserver 通知）时，环里就只剩一条没头没尾的 "null"。
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.slice(0, 500)
  if (value instanceof Error) return `${value.name}: ${value.message}`.slice(0, 500)
  if (typeof value === 'object') {
    const record = value as { readonly message?: unknown; readonly reason?: unknown; readonly name?: unknown }
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    const message = typeof record.message === 'string' ? record.message.trim() : ''
    if (message !== '') return (name === '' ? message : `${name}: ${message}`).slice(0, 500)
    const reason = typeof record.reason === 'string' ? record.reason.trim() : ''
    if (reason !== '') return reason.slice(0, 500)
    if (name !== '') return name.slice(0, 500)
    try {
      const json = JSON.stringify(value)
      return json === undefined || json === '{}' ? '' : json.slice(0, 500)
    } catch { return String(value).slice(0, 500) }
  }
  return String(value).slice(0, 500)
}

/**
 * 浏览器把这两条 ResizeObserver 通知也当 `error` 事件派发（`error === null`），但它们是
 * **观察器循环的提示，不是页面异常**：既不中断渲染，也没有堆栈。2026-11-13 实测——开右栏
 * 触发一次，被误记成 client 错误（且因 `error` 为 null 显示成 "null"），`cdp-probe` 因此假红。
 * 放进环会污染「用户撞了什么」的证据，故在入口滤掉（真布局故障仍会以别的症状出现）。
 */
const BENIGN_ERROR_NOTICES = [
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
]

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
  /** 可选：刷新后仍留痕；缺席（旧测试/非浏览器）时自动跳过。 */
  readonly sessionStorage?: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
  }
}

/**
 * 安装捕获；返回卸载函数（幂等：同一 target 重复安装只保留最后一份全局引用）。
 * @param target - 通常是 `window`。
 * @param ring - 环（由调用方持有，探针从 `target[ERROR_RING_KEY]` 读同一份）。
 */
export function installErrorCapture(target: ErrorCaptureTarget, ring?: ErrorRing, onEntry?: ClientErrorReporter): () => void {
  const storage = target.sessionStorage
  const persist = (entries: readonly ClientErrorEntry[]): void => {
    if (storage === undefined) return
    try { storage.setItem(ERROR_RING_PERSIST_KEY, JSON.stringify(entries)) } catch { /* 配额/隐私模式：跳过 */ }
  }
  const capture = ring ?? createErrorRing(ERROR_RING_LIMIT, onEntry, persist)
  if (storage !== undefined) {
    try {
      const raw = storage.getItem(ERROR_RING_PERSIST_KEY)
      const parsed: unknown = raw === null ? [] : JSON.parse(raw)
      if (Array.isArray(parsed)) {
        capture.restore(parsed.filter((entry): entry is ClientErrorEntry =>
          entry !== null && typeof entry === 'object'
          && typeof (entry as ClientErrorEntry).kind === 'string'
          && typeof (entry as ClientErrorEntry).message === 'string'))
      }
    } catch { /* 坏存档：按空处理 */ }
  }
  const global = target as unknown as Record<string, unknown>
  const previous = global[ERROR_RING_KEY] as ErrorRing | undefined
  global[ERROR_RING_KEY] = capture

  const onError = (event: unknown): void => {
    const value = event as { error?: unknown; message?: unknown; filename?: unknown }
    const message = redactTokenUrls(textOf(value.error) || textOf(value.message) || '（未知页面错误）')
    if (BENIGN_ERROR_NOTICES.some(notice => message.includes(notice))) return
    capture.push({
      kind: 'error',
      message,
      ...(stackOf(value.error) !== undefined ? { stack: redactTokenUrls(stackOf(value.error) as string) } : {}),
      at: Date.now(),
      ...(typeof target.location?.href === 'string' ? { href: redactTokenUrls(target.location.href) } : {}),
    })
  }
  const onRejection = (event: unknown): void => {
    const value = event as { reason?: unknown }
    capture.push({
      kind: 'rejection',
      message: redactTokenUrls(textOf(value.reason) || '（未知 unhandled rejection）'),
      ...(stackOf(value.reason) !== undefined ? { stack: redactTokenUrls(stackOf(value.reason) as string) } : {}),
      at: Date.now(),
      ...(typeof target.location?.href === 'string' ? { href: redactTokenUrls(target.location.href) } : {}),
    })
  }
  target.addEventListener('error', onError as never)
  target.addEventListener('unhandledrejection', onRejection as never)

  // console.error：原始输出照旧（不吞），只镜像一份进环。
  const consoleFace = target.console
  const originalConsoleError = consoleFace?.error
  if (consoleFace !== undefined && typeof originalConsoleError === 'function') {
    consoleFace.error = (...args: unknown[]) => {
      capture.push({ kind: 'console', message: redactTokenUrls(args.map(item => textOf(item)).join(' ').slice(0, 500)), at: Date.now() })
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

/**
 * 错误上报中继（2026-11-03 第六轮 D6）：把「有当前会话才发、1s 节流」从一个**丢弃式闭包**改成
 * 可测的队列——无当前会话时条目留在队列里，等会话出现（`sessions.list.subscribe` 触发 flush）再发；
 * 节流窗口内到达的条目排队而不是被丢掉；队列有界（与错误环同上限）。
 *
 * 为什么：旧实现 `if (now - lastSent < 1000) return` + `if (current === undefined) return` 直接丢条目，
 * 首屏（还没有任何会话）报的错永远到不了 `company-client-errors.log`——用户症状因此没有盘上证据。
 * 证明边界：本模块不碰 DOM/远端；发送与定时器都靠注入，keyless 可判。
 */
export interface ErrorRelayOptions<Id = string> {
  /** 当前应接收错误的会话 id（无会话返回 undefined）。 */
  readonly currentSessionId: () => Id | undefined
  /** 真实发送（client 侧 = remote.commands.execute）。返回 thenable 时失败进 onSendError。 */
  readonly send: (sessionId: Id, entry: ClientErrorEntry) => unknown
  /** 两条发送之间的最小间隔（默认 1000ms，防刷屏）。 */
  readonly intervalMs?: number
  /** 队列上限（默认 = 错误环上限 50；超出丢最旧）。 */
  readonly maxPending?: number
  readonly now?: () => number
  readonly schedule?: (fn: () => void, ms: number) => unknown
  readonly cancel?: (handle: unknown) => void
  readonly onSendError?: (error: unknown) => void
}

/** 错误上报中继。 */
export interface ErrorRelay {
  readonly push: (entry: ClientErrorEntry) => void
  readonly flush: () => void
  readonly pending: () => number
  readonly dispose: () => void
}

/** 建一个中继；无会话时排队，会话出现后按节流逐个送出。 */
export function createErrorRelay<Id = string>(options: ErrorRelayOptions<Id>): ErrorRelay {
  const interval = options.intervalMs ?? 1000
  const maxPending = options.maxPending ?? ERROR_RING_LIMIT
  const now = options.now ?? (() => Date.now())
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms))
  const cancel = options.cancel ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>))
  const queue: ClientErrorEntry[] = []
  let lastSent = 0
  let timer: unknown
  let disposed = false

  const clearTimer = () => {
    if (timer === undefined) return
    cancel(timer)
    timer = undefined
  }

  const flush = () => {
    if (disposed) return
    clearTimer()
    if (queue.length === 0) return
    const sessionId = options.currentSessionId()
    if (sessionId === undefined) return // 没有会话：留在队列里，等 subscribe 再 flush
    const wait = interval - (now() - lastSent)
    if (wait > 0) {
      timer = schedule(() => { timer = undefined; flush() }, wait)
      return
    }
    const entry = queue.shift()
    if (entry === undefined) return
    lastSent = now()
    try {
      const result = options.send(sessionId, entry)
      if (result !== undefined && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch(error => options.onSendError?.(error))
      }
    } catch (error) {
      options.onSendError?.(error)
    }
    if (queue.length > 0) timer = schedule(() => { timer = undefined; flush() }, interval)
  }

  return {
    push(entry) {
      if (disposed) return
      queue.push(entry)
      while (queue.length > maxPending) queue.shift()
      flush()
    },
    flush,
    pending: () => queue.length,
    dispose() {
      disposed = true
      clearTimer()
    },
  }
}

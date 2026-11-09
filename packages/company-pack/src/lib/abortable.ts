/**
 * 可取消的 await（host 原语专用）：`operation` 与 `signal` race，abort 即抛。
 *
 * 为什么单开：BUG-053 的根因是阻塞 host 工具 `await activation.result` 不响应 `exec.signal`，
 * 取消 parent turn 后工具悬住、child 无终态。任何 `await` 子代结果的 host 工具都应走这条缝，
 * 不要各自手写 race（监听不摘会泄漏，语义也会漂）。
 *
 * 语义与 vendor `agent-loop` 的 `raceAbort` 对齐：`signal.reason` 是 Error 就原样抛，
 * 否则包成 `Error('<label> aborted')`；`finally` 摘监听，重复 resolve/reject 不会重复清理。
 * @param operation - 要等待的 promise（或已定值）。
 * @param signal - 调用者取消信号（工具 `exec.signal`）。
 * @param label - 非 Error reason 时的错误标签。
 * @returns operation 的值；signal 先 abort 则以错误 reject。
 */
export async function abortable<T>(
  operation: PromiseLike<T> | T,
  signal: AbortSignal,
  label = 'operation',
): Promise<T> {
  const toAbortError = (): Error => signal.reason instanceof Error
    ? signal.reason
    : new Error(`${label} aborted`, { cause: signal.reason })
  if (signal.aborted) throw toAbortError()
  const aborted = Promise.withResolvers<never>()
  const listener = (): void => { aborted.reject(toAbortError()) }
  signal.addEventListener('abort', listener, { once: true })
  try {
    return await Promise.race([Promise.resolve(operation), aborted.promise])
  } finally {
    signal.removeEventListener('abort', listener)
  }
}

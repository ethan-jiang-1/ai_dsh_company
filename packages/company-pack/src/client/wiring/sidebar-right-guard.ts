/**
 * 右栏打开统一守卫（BUG-393）：全局 `main` 面板（如 HQ）占位时 `sidebarRight.mounted` 为 undefined，
 * 直接调 `openTab`/`openResource` 会抛 `sidebarRight: no session surface is mounted`。
 * 本模块先触发 `returnToMain()` 切回会话，若 `mounted` 在当前 tick 尚未就绪，则一次性订阅
 * `mounted` 变化（附超时清理）直到主会话面重新挂载后再执行右栏操作。
 */

export interface MountedSurfaceSnapshot {
  readonly getSnapshot: () => string | undefined
  readonly subscribe: (listener: () => void) => () => void
}

export interface SidebarRightSurfaceLike {
  readonly mounted?: MountedSurfaceSnapshot | undefined
}

const SURFACE_WAIT_TIMEOUT_MS = 1_500

/** 先切回会话主区并在 `sidebarRight.mounted` 就绪后执行动作；异常走 `onError` 而不抛未捕获报错。 */
export function openOnSessionSurface(
  sidebarRight: SidebarRightSurfaceLike,
  returnToMain: (() => void) | undefined,
  action: () => void,
  onError?: (error: unknown) => void,
): void {
  const run = (): void => {
    try {
      action()
    } catch (error) {
      onError?.(error)
    }
  }
  const mounted = sidebarRight.mounted
  if (mounted === undefined || mounted.getSnapshot() !== undefined) {
    returnToMain?.()
    run()
    return
  }
  returnToMain?.()
  if (mounted.getSnapshot() !== undefined) {
    run()
    return
  }
  let done = false
  let unsubscribe = (): void => {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const cleanup = (): void => {
    if (done) return
    done = true
    unsubscribe()
    if (timer !== undefined) clearTimeout(timer)
  }
  unsubscribe = mounted.subscribe(() => {
    if (mounted.getSnapshot() === undefined) return
    cleanup()
    run()
  })
  if (mounted.getSnapshot() !== undefined) {
    cleanup()
    run()
    return
  }
  timer = setTimeout(cleanup, SURFACE_WAIT_TIMEOUT_MS)
}

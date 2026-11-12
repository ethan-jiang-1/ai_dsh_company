/**
 * 派生选项文件的新鲜度（2026-11-12，BUG-082）。
 *
 * `startup-options.json` 是 host 派生文件；只有 boot / 写设置时重算，所以 wiki 目录被搬走后
 * 面板会无限期显示旧结论，而 `show` / 注入段已经说失效。这里在 wiki 指针的盘上位置布两个
 * **非递归** watcher：
 * - 最近存在祖先：盯目标这一项的出现 / 删除 / 改名（目标不存在时也向上找，目录创建可被看见）；
 * - 目标目录本身（存在时）：盯 `index.md` 等子项的增删。
 *
 * 事件去抖后重算并重写派生文件；检查语义没变时**不重写**，避免 watcher 盯到自己的写盘
 * （wiki 直接落在 `.dsh-company/` 下时，兄弟文件的写入也会触发父 watcher）。
 *
 * 端口可注入：keyless spec 用假 watcher 触发事件，不需要真的等文件系统通知。
 */
import { existsSync, statSync, watch as fsWatch } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import type { StartupOptions, WikiCheck } from '../../lib/startup-settings.ts'
import {
  checkWikiPointer,
  enumerateStartupOptions,
  readStartupOptions,
  readStartupSettings,
  resolveWikiDir,
  startupOptionsPath,
  writeStartupOptionsFile,
} from './startup-store.ts'

/** 一个已布 watcher 的关闭句柄。 */
export interface WatchHandle {
  close(): void
}

/** watcher 的注入端口（生产 = `node:fs`；测试 = 假实现）。 */
export interface WatchPort {
  watch(path: string, listener: (filename: string | null) => void): WatchHandle
}

/** 一个 workspace 上已经布好的哨。 */
interface Armed {
  readonly target: string
  readonly parent: WatchHandle | null
  readonly dir: WatchHandle | null
  timer: ReturnType<typeof setTimeout> | null
}

export interface StartupOptionsWatchOptions {
  /** pack 的 `content/`（枚举可选项用）。 */
  readonly contentDir?: string
  /** watcher 端口；缺省 = node fs。 */
  readonly port?: WatchPort
  /** 事件去抖（毫秒）；缺省 120。 */
  readonly debounceMs?: number
  readonly logger?: { warn?: (message: string) => void }
}

/** 生产端口：`persistent: false`，不让 watcher 拖住进程退出。 */
const nodeWatchPort: WatchPort = {
  watch(path, listener) {
    const watcher = fsWatch(path, { persistent: false }, (_event, filename) => { listener(filename ?? null) })
    // 目标被删/改名后 watcher 可能报错；下一次 sync 会重布，不在这里重试轰炸。
    watcher.on('error', () => {})
    return { close: () => { try { watcher.close() } catch { /* 已关闭 */ } } }
  },
}

/** 从 path 向上找最近一个存在的目录（目标/父目录都可能不存在）。 */
function nearestExistingDir(path: string): string | null {
  let current = resolve(path)
  for (;;) {
    try {
      if (statSync(current).isDirectory()) return current
    } catch { /* 继续向上 */ }
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

/** 两次检查的**语义**是否相同（忽略时间戳）。 */
function sameCheck(a: WikiCheck, b: WikiCheck): boolean {
  return a.value === b.value && a.ok === b.ok && a.problem === b.problem && a.location === b.location
}

/** 两次派生内容的语义是否相同（忽略 `checkedAt`）。 */
function sameOptions(a: StartupOptions, b: StartupOptions): boolean {
  return a.productTypes.join('\u0000') === b.productTypes.join('\u0000')
    && a.deliveryModes.join('\u0000') === b.deliveryModes.join('\u0000')
    && sameCheck(a.wikiCheck, b.wikiCheck)
}

/**
 * 每个 workspace 一份的派生选项刷新器。
 *
 * 用一个对象而不是模块级单例：host 注册处持有它，`ctx.effect` 释放时能一次关掉所有 watcher；
 * 测试也能各造一份、互不串台。
 */
export class StartupOptionsWatch {
  private readonly port: WatchPort
  private readonly debounceMs: number
  private readonly armed = new Map<string, Armed>()
  private disposed = false

  constructor(private readonly options: StartupOptionsWatchOptions = {}) {
    this.port = options.port ?? nodeWatchPort
    this.debounceMs = options.debounceMs ?? 120
  }

  /**
   * 重算并（语义变化时）重写该 workspace 的派生文件，再按当前 wiki 指针重新布哨。
   * @param workspace - 项目 workspace 根（空串 = 无事可做）。
   * @returns 本次派生内容；空 workspace 返回 null。
   */
  sync(workspace: string): StartupOptions | null {
    if (this.disposed || workspace === '') return null
    const settings = readStartupSettings(workspace)
    const next: StartupOptions = {
      ...enumerateStartupOptions(this.options.contentDir),
      wikiCheck: checkWikiPointer(workspace, settings.wiki),
    }
    try {
      if (!existsSync(startupOptionsPath(workspace)) || !sameOptions(readStartupOptions(workspace), next)) {
        writeStartupOptionsFile(workspace, next)
      }
    } catch (error) {
      this.warn(`派生启动策略选项失败：${(error as Error).message}`)
    }
    this.rearm(workspace, settings.wiki)
    return next
  }

  /** 关闭该 workspace 的哨；`sync` 之后调用以清掉已不存在的指针。 */
  forget(workspace: string): void {
    const armed = this.armed.get(workspace)
    if (armed === undefined) return
    this.closeArmed(armed)
    this.armed.delete(workspace)
  }

  /** 关掉所有 watcher（宿主释放时调用）。 */
  dispose(): void {
    this.disposed = true
    for (const armed of this.armed.values()) this.closeArmed(armed)
    this.armed.clear()
  }

  /** 按 wiki 指针重布哨：目标项（父目录） + 目标目录内部（存在时）。 */
  private rearm(workspace: string, wiki: string | null): void {
    this.forget(workspace)
    if (this.disposed || wiki === null) return
    const target = resolveWikiDir(workspace, wiki)
    const parentDir = nearestExistingDir(dirname(target))
    const parent = parentDir === null
      ? null
      : this.arm(parentDir, (filename) => {
        if (filename !== null && filename !== basename(target)) return
        this.schedule(workspace)
      })
    let dir: WatchHandle | null = null
    try {
      if (statSync(target).isDirectory()) dir = this.arm(target, () => { this.schedule(workspace) })
    } catch { /* 目标不存在 = 只靠父哨等它出现 */ }
    this.armed.set(workspace, { target, parent, dir, timer: null })
  }

  /** 布一个 watcher；平台/权限失败只告警（新鲜度降级为时间戳，不挡主流程）。 */
  private arm(path: string, listener: (filename: string | null) => void): WatchHandle | null {
    try {
      return this.port.watch(path, listener)
    } catch (error) {
      this.warn(`watch ${path} 失败（新鲜度降级）：${(error as Error).message}`)
      return null
    }
  }

  /** 去抖后重算；重算会重新布哨（含关掉刚刚触发的那一个）。 */
  private schedule(workspace: string): void {
    const armed = this.armed.get(workspace)
    if (armed === undefined || this.disposed) return
    if (armed.timer !== null) clearTimeout(armed.timer)
    const timer = setTimeout(() => {
      const current = this.armed.get(workspace)
      if (current === undefined || this.disposed) return
      current.timer = null
      try {
        this.sync(workspace)
      } catch (error) {
        this.warn(`重算启动策略选项失败：${(error as Error).message}`)
      }
    }, this.debounceMs)
    // 后台 watcher 不该拖住宿主退出。
    ;(timer as unknown as { unref?: () => void }).unref?.()
    armed.timer = timer
  }

  private closeArmed(armed: Armed): void {
    if (armed.timer !== null) clearTimeout(armed.timer)
    armed.parent?.close()
    armed.dir?.close()
  }

  private warn(message: string): void {
    this.options.logger?.warn?.(`company-pack：${message}`)
  }
}

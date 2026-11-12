/**
 * 启动策略的松量共享状态（apply 闭包内一份；按钮与面板共用）。
 *
 * 为什么需要它：composer 按钮要显示「现在按什么跑」，而改动发生在右栏面板——
 * 两者不在同一棵组件树里。用一个极小的订阅仓把「读到的设置/选项」共享，面板保存后
 * 按钮当帧就跟着变，不靠轮询。
 */
import {
  EMPTY_STARTUP_OPTIONS,
  EMPTY_STARTUP_SETTINGS,
  type StartupOptions,
  type StartupSettings,
} from '../../lib/startup-settings.ts'

/** 一次读盘的结果。 */
export interface StartupFace {
  /** 是否已经读过盘（未读 = 按钮显示中性文案，不冒充实值）。 */
  readonly loaded: boolean
  readonly settings: StartupSettings
  readonly options: StartupOptions
}

/** 订阅仓（`useSyncExternalStore` 形状）。 */
export interface StartupStore {
  get(): StartupFace
  set(next: StartupFace): void
  subscribe(listener: () => void): () => void
}

/** 建一个仓；`get` 必须返回同一个对象直到 `set`，否则 React 会无限重渲染。 */
export function createStartupStore(initial: StartupFace = {
  loaded: false,
  settings: EMPTY_STARTUP_SETTINGS,
  options: EMPTY_STARTUP_OPTIONS,
}): StartupStore {
  let current = initial
  const listeners = new Set<() => void>()
  return {
    get: () => current,
    set: (next) => {
      current = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

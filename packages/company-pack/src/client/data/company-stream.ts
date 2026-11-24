/**
 * `session/follow` 事件窗口（BUG-365）：流是无限的，state 必须有界。
 *
 * 为什么在数据层裁：展示层 `takeBounded(activity)` 只约束**渲染条数**，事件数组仍线性增长，
 * 每次事件又整段重算（O(n²)）。这里按窗口保留尾部，并记下被丢掉的条数供面板说「更早的动态」。
 */
import type { TeamEventLike, TeamStreamFrame } from '../../lib/presence/presence.ts'
import { takeBounded } from '../../lib/shared/bounded.ts'

/** 数据层事件窗口（≥ 展示上限 MAX_ACTIVITY 的 20 倍，留足任务补齐/去重余量）。 */
export const EVENT_WINDOW = 1_000

export interface StreamWindow {
  readonly items: readonly TeamEventLike[]
  /** 窗口外更早事件的累计条数（面板用于「另有 N 条更早动态」）。 */
  readonly dropped: number
}

export const EMPTY_STREAM_WINDOW: StreamWindow = { items: [], dropped: 0 }

/**
 * 应用一帧到有界窗口。
 * @param prev - 当前窗口。
 * @param frame - follow 帧（history 重播种；event 追加）。
 * @param window - 窗口上限（测试/未来调参）。
 * @returns 新窗口；items 长度 ≤ window。
 */
export function applyStreamFrame(
  prev: StreamWindow,
  frame: TeamStreamFrame,
  window: number = EVENT_WINDOW,
): StreamWindow {
  if (frame.kind === 'history') {
    const bounded = takeBounded(frame.events, window, 'tail')
    return { items: bounded.items, dropped: bounded.capped }
  }
  const next = [...prev.items, frame.event]
  if (next.length <= window) return { items: next, dropped: prev.dropped }
  return { items: next.slice(next.length - window), dropped: prev.dropped + (next.length - window) }
}

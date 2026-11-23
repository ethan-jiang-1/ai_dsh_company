/**
 * 有界裁剪原语：把「取前/后 N 条 + 总数 + 被截条数」收成同一数据结构，
 * 避免各模块各自 `.slice()` 时遗漏 `capped` 上报。
 */

/** 有界裁剪结果（items + 边界计数，配合静态审计 R1 强制消费 `capped`/`truncated`）。 */
export interface Bounded<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly capped: number
  readonly truncated: boolean
}

/**
 * 按上限裁剪数组并返回精确边界（`items.length + capped === total`）。
 * @param source - 完整候选列表。
 * @param cap - 保留条数上限（负值按 0 处理，向下取整为整数）。
 * @param mode - `'head'` 保留前 `cap` 条（默认）；`'tail'` 保留末尾 `cap` 条。
 * @returns 带总数与截断计数的有界容器。
 */
export function takeBounded<T>(
  source: readonly T[],
  cap: number,
  mode: 'head' | 'tail' = 'head',
): Bounded<T> {
  const total = source.length
  const normalizedCap = Number.isNaN(cap)
    ? 0
    : cap === Number.POSITIVE_INFINITY
      ? total
      : Math.max(0, Math.floor(cap))
  const keep = Math.min(total, normalizedCap)
  const items = mode === 'tail' ? source.slice(total - keep) : source.slice(0, keep)
  const capped = total - items.length
  return { items, total, capped, truncated: capped > 0 }
}

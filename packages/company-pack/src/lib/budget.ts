/**
 * 预算 / 用量读模型（条目 ① S1）：**只做令牌，不做美元**。
 *
 * 为什么不做金额（研究 §1.7 一手核实）：wire 上只有 token 数（`tokenUsage` 投影 =
 * uncachedInput / output / cacheRead / cacheWrite），**没有货币化字段**（计价词表仅 host 侧
 * `llm/llm/src/types.ts:173-192`）。编一个单价出来 = 假事实，所以预算表达只给令牌与规则。
 *
 * 纯格式化函数，keyless 单测直接断言（数据来自 `useProjection('tokenUsage'|'sessionStats')`）。
 */

/** `tokenUsage` 投影的读取子集（`vendor/dsh/packages/llm/token-meter/src/projection.ts:71`）。 */
export interface TokenUsageLike {
  readonly uncachedInput?: number | undefined
  readonly output?: number | undefined
  readonly cacheRead?: number | undefined
  readonly cacheWrite?: number | undefined
}

/** `sessionStats` 投影的读取子集（`vendor/dsh/packages/session/session-stats/src/projection.ts:199-208`）。 */
export interface SessionStatsLike {
  readonly turns?: number | undefined
  readonly steps?: number | undefined
  readonly llmMs?: number | undefined
  readonly toolMs?: number | undefined
}

/** 一行用量。 */
export interface UsageRow {
  readonly label: string
  readonly tokens: number
  /** 占总量比例 0..1（总量 0 时为 0）。 */
  readonly share: number
}

/** 一屏可读的用量摘要。 */
export interface BudgetSummary {
  readonly totalTokens: number
  readonly rows: readonly UsageRow[]
  readonly turns: number | null
  readonly steps: number | null
  /** 工具耗时占比 0..1（llm+tool 都为 0 时 null）。 */
  readonly toolShare: number | null
}

/** 千分位缩写：`1.2k` / `3.4M`；< 1000 原样。 */
export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`
  if (value >= 1_000) return `${trim(value / 1_000)}k`
  return String(value)
}

/** 一位小数、整数不带尾巴（`1.5k` / `2k`，不是 `2.0k`）。 */
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * 令牌 / 会话统计 → 用量摘要（行序 = 成本直觉：未缓存输入 → 缓存读 → 缓存写 → 输出）。
 * @param usage - `tokenUsage` 投影（可缺）。
 * @param stats - `sessionStats` 投影（可缺）。
 * @returns 摘要（缺数据落 0 / null，不抛）。
 */
export function budgetSummary(usage: TokenUsageLike | undefined, stats: SessionStatsLike | undefined): BudgetSummary {
  const rows: UsageRow[] = [
    { label: '未缓存输入', tokens: usage?.uncachedInput ?? 0, share: 0 },
    { label: '缓存读', tokens: usage?.cacheRead ?? 0, share: 0 },
    { label: '缓存写', tokens: usage?.cacheWrite ?? 0, share: 0 },
    { label: '输出', tokens: usage?.output ?? 0, share: 0 },
  ]
  const totalTokens = rows.reduce((sum, row) => sum + row.tokens, 0)
  const llmMs = stats?.llmMs ?? 0
  const toolMs = stats?.toolMs ?? 0
  const busyMs = llmMs + toolMs
  return {
    totalTokens,
    rows: rows.map(row => ({ ...row, share: totalTokens === 0 ? 0 : row.tokens / totalTokens })),
    turns: stats?.turns ?? null,
    steps: stats?.steps ?? null,
    toolShare: busyMs === 0 ? null : toolMs / busyMs,
  }
}

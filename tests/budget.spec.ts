/** 预算 / 用量读模型（条目 ① S1）：令牌格式化与占比的 keyless 完成定义（只做令牌不做美元）。 */
import { describe, expect, it } from 'vitest'
import { budgetSummary, formatTokens } from '../packages/company-pack/src/lib/budget.ts'

describe('formatTokens', () => {
  it('千分位缩写：<1000 原样、k/M 一位小数、整数不带尾巴', () => {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(999)).toBe('999')
    expect(formatTokens(1_000)).toBe('1k')
    expect(formatTokens(1_500)).toBe('1.5k')
    expect(formatTokens(1_000_000)).toBe('1M')
    expect(formatTokens(1_250_000)).toBe('1.3M')
  })
})

describe('budgetSummary', () => {
  it('合计四路令牌并给出占比（占比和为 1）', () => {
    const summary = budgetSummary(
      { uncachedInput: 1_000, cacheRead: 2_000, cacheWrite: 0, output: 1_000 },
      { turns: 3, steps: 9, llmMs: 8_000, toolMs: 2_000 },
    )
    expect(summary.totalTokens).toBe(4_000)
    expect(summary.rows.map(row => row.label)).toEqual(['未缓存输入', '缓存读', '缓存写', '输出'])
    expect(summary.rows.map(row => row.tokens)).toEqual([1_000, 2_000, 0, 1_000])
    expect(summary.rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 10)
    expect(summary.turns).toBe(3)
    expect(summary.steps).toBe(9)
    expect(summary.toolShare).toBeCloseTo(0.2, 10)
  })

  it('缺数据落 0 / null，不抛', () => {
    const summary = budgetSummary(undefined, undefined)
    expect(summary.totalTokens).toBe(0)
    expect(summary.rows).toHaveLength(4)
    expect(summary.rows.every(row => row.tokens === 0 && row.share === 0)).toBe(true)
    expect(summary.turns).toBeNull()
    expect(summary.steps).toBeNull()
    expect(summary.toolShare).toBeNull()
  })

  it('总令牌为 0 时占比全 0（不产生 NaN）', () => {
    const summary = budgetSummary({ output: 0 }, { llmMs: 0, toolMs: 0 })
    expect(summary.rows.every(row => row.share === 0)).toBe(true)
    expect(summary.toolShare).toBeNull()
  })
})

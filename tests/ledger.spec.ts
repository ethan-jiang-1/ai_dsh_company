/** 动议台账读模型（呈现叙事切片一的 keyless 完成定义）。 */
import { describe, expect, it } from 'vitest'
import { ledgerStats, parseMotionLedger } from '../packages/company-pack/src/lib/ledger.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 纯函数测试 + **真台账文件**断言（fixture 即生产文件——台账是短表，直接读真盘保证解析器
 * 与事实家不漂移；文件长表结构变更会被这里抓住）。真页面渲染是认证档：浏览器开真页面走查。
 */

const REAL_LEDGER = readFileSync(join('company-workspace/kb/motion-ledger.md'), 'utf8')

describe('parseMotionLedger', () => {
  it('真台账：10 场动议全部解析，字段逐列正确', () => {
    const rows = parseMotionLedger(REAL_LEDGER)
    expect(rows).toHaveLength(10)
    expect(rows[0]).toMatchObject({ slug: 'agentic-coworker', date: '2026-09-22', kind: '评估', final: '✅' })
    const q3 = rows.find(row => row.slug === 'q3-business-review')
    expect(q3).toMatchObject({ wallClock: '241s', roles: 'CEO+CFO+COO' })
    expect(q3!.summary).toContain('判不了')
    const untimed = rows.find(row => row.slug === 'integration-50w-signoff')
    expect(untimed).toMatchObject({ final: '—', wallClock: '—' })
  })

  it('表头不符返回空（台账被改坏 → 面板空态而非渲染错行）', () => {
    expect(parseMotionLedger('| nope | 表 |\n|---|---|\n| a | b |')).toEqual([])
  })

  it('列数不符的行跳过；分隔行跳过；非表行跳过', () => {
    const text = [
      '# 头',
      '',
      '| slug | 日期 | 类型 | 参与 | 墙钟 | 成品 | 一句话结论 |',
      '|---|---|---|---|---|---|---|',
      '| a | d | k | r | w | ✅ | s |',
      '| 坏行 | 只有 | 三列 |',
      '| b | d2 | k2 | r2 | w2 | ✅ | s2 |',
    ].join('\n')
    const rows = parseMotionLedger(text)
    expect(rows.map(row => row.slug)).toEqual(['a', 'b'])
  })
})

describe('ledgerStats', () => {
  it('真台账统计：10 场 / 9 成品 / 7 未记（墙钟未记含「—」）', () => {
    const rows = parseMotionLedger(REAL_LEDGER)
    const stats = ledgerStats(rows)
    expect(stats.total).toBe(10)
    expect(stats.finals).toBe(9)
    expect(stats.untimed).toBe(7)
  })
})

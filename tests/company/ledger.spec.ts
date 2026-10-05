/** 动议台账读模型（呈现叙事切片一的 keyless 完成定义）。 */
import { repositoryRoot as ROOT } from '../../scripts/lib/repository-layout.mjs'
import { describe, expect, it } from 'vitest'
import { ledgerStats, parseMotionLedger } from '../../packages/company-pack/src/lib/ledger.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 纯函数测试 + **真台账文件**断言（fixture 即生产文件——台账是短表，直接读真盘保证解析器
 * 与事实家不漂移；文件长表结构变更会被这里抓住）。真页面渲染是认证档：浏览器开真页面走查。
 */

const REAL_LEDGER = readFileSync(join(ROOT, 'company-workspace/kb/motion-ledger.md'), 'utf8')

describe('parseMotionLedger', () => {
  it('真台账：全部行可解析、结构不变形（不钉总行数——台账每场动议都会长一行）', () => {
    const rows = parseMotionLedger(REAL_LEDGER)
    expect(rows.length).toBeGreaterThan(0)
    expect(new Set(rows.map(row => row.slug)).size).toBe(rows.length)
    for (const row of rows) {
      // 日期口径：真日期或占位（见公司手册「日期口径」）；不许出现推算值以外的脏值
      expect(row.date, `行 ${row.slug} 的日期不合口径`).toMatch(/^(\d{4}-\d{2}-\d{2}|日期待核)$/)
      expect(row.summary.length, `行 ${row.slug} 结论为空`).toBeGreaterThan(0)
    }
  })

  it('真台账：抽真样本逐列核对（字段解析不漂移）', () => {
    const rows = parseMotionLedger(REAL_LEDGER)
    expect(rows[0]).toMatchObject({ slug: 'agentic-coworker', date: '2026-09-22', kind: '评估', final: '✅' })
    const q3 = rows.find(row => row.slug === 'q3-business-review')
    expect(q3).toMatchObject({ wallClock: '241s', roles: 'CEO+CFO+COO' })
    expect(q3!.summary).toContain('判不了')
    const untimed = rows.find(row => row.slug === 'integration-50w-signoff')
    expect(untimed).toMatchObject({ final: '—', wallClock: '—' })
    // UX 实验场（renewal-x-2026）：双签被拒（fail-closed 实证）+ 缺口裁定进结论；日期已按会话日志修正。
    const renewal = rows.find(row => row.slug === 'renewal-x-2026')
    expect(renewal).toBeDefined()
    expect(renewal!.date).toBe('2026-09-26')
    expect(renewal!.summary).toContain('不签 8.2 折')
    expect(renewal!.summary).toContain('≤$200')
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
  it('统计口径（fixture：总场数 / 成品数 / 未记墙钟数）', () => {
    const rows = parseMotionLedger([
      '| slug | 日期 | 类型 | 参与 | 墙钟 | 成品 | 一句话结论 |',
      '|---|---|---|---|---|---|---|',
      '| a | 2026-09-26 | 评估 | CEO | 241s | ✅ | 结论一 |',
      '| b | 日期待核 | 评估 | CFO | 未记 | ✅ | 结论二 |',
      '| c | 2026-09-26 | 口径问答 | CFO | — | — | 结论三 |',
    ].join('\n'))
    expect(ledgerStats(rows)).toEqual({ total: 3, finals: 2, untimed: 2 })
  })
})

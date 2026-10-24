/** 动议台账读模型（呈现叙事切片一的 keyless 完成定义）。 */
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { describe, expect, it } from 'vitest'
import { ledgerStats, parseMotionLedger } from '../../packages/company-pack/src/lib/ledger.ts'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 纯函数测试 + **live bundle 真台账**断言（2026-10-24 起台账只住 dev run bundle，不进 git）。
 *
 * - 纯解析/统计：始终跑（无盘依赖）。
 * - 真台账：只在 dev bundle 在场时跑（`company-workspace/kb/motion-ledger.md`）；fresh clone / CI
 *   没有它，跳过而不是造一个假台账——live 数据口径由 `ledger-participation` 门禁在盘上时守。
 *   真页面渲染是认证档：浏览器开真页面走查。
 */

const LIVE_LEDGER = join(ROOT, 'company-workspace/kb/motion-ledger.md')
const LIVE_META = join(ROOT, 'company-workspace/deliverables-archive/2026-10-10-ai-transformation-2026-v4/meta.md')
const hasLive = existsSync(LIVE_LEDGER) && existsSync(LIVE_META)
const REAL_LEDGER = hasLive ? readFileSync(LIVE_LEDGER, 'utf8') : ''

describe('parseMotionLedger', () => {
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

// dev-only：台账是 run bundle 的扩张数据，不是产品源码；fresh clone 不保证在场。
describe.skipIf(!hasLive)('live bundle 台账（dev only）', () => {
  it('真台账：全部行可解析、结构不变形（不钉总行数——台账每场动议都会长一行）', () => {
    const rows = parseMotionLedger(REAL_LEDGER)
    expect(rows.length).toBeGreaterThan(0)
    expect(new Set(rows.map(row => row.slug)).size).toBe(rows.length)
    for (const row of rows) {
      expect(row.date, `行 ${row.slug} 的日期不合口径`).toMatch(/^(\d{4}-\d{2}-\d{2}|日期待核)$/)
      expect(row.summary.length, `行 ${row.slug} 结论为空`).toBeGreaterThan(0)
    }
  })

  it('V4 meta（已收敛归档）必须有对应台账行且结论逐字同源', () => {
    const rows = parseMotionLedger(REAL_LEDGER)
    const meta = readFileSync(LIVE_META, 'utf8')
    const summary = meta.match(/^一句话结论: (.+)$/m)?.[1]
    expect(summary).toBeDefined()
    const row = rows.find(candidate => candidate.slug === 'ai-transformation-2026-v4')
    expect(row, 'V4 活跃交付物必须在台账登记').toBeDefined()
    expect(row!.summary).toBe(summary)
    expect(summary!.length, 'V4 一句话结论不该退回 835 字原句').toBeLessThan(400)
    for (const fact of [/V4 达标/, /反事实未达标/, /缺陷已修复/]) {
      expect(summary!, `结论必须保留「${String(fact)}」这项事实`).toMatch(fact)
    }
    expect(summary!, '结论层不该把内部机制名当主体').not.toMatch(/workspace_doors|grep|闸门误伤/)
  })

  it('真台账：抽真样本逐列核对（字段解析不漂移）', () => {
    const rows = parseMotionLedger(REAL_LEDGER)
    expect(rows[0]).toMatchObject({ slug: 'agentic-coworker', date: '2026-09-22', kind: '评估', final: '✅' })
    const q3 = rows.find(row => row.slug === 'q3-business-review')
    expect(q3).toMatchObject({ wallClock: '241s', roles: 'CEO+COO+CFO' })
    expect(q3!.summary).toContain('判不了')
    const untimed = rows.find(row => row.slug === 'integration-50w-signoff')
    expect(untimed).toMatchObject({ final: '—', wallClock: '—' })
    const renewal = rows.find(row => row.slug === 'renewal-x-2026')
    expect(renewal).toBeDefined()
    expect(renewal!.date).toBe('2026-09-26')
    expect(renewal!.summary).toContain('不签 8.2 折')
    expect(renewal!.summary).toContain('≤$200')
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

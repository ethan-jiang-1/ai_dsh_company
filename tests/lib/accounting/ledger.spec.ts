/** 动议台账读模型（呈现叙事切片一的 keyless 完成定义）。 */
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'
import { describe, expect, it } from 'vitest'
import { ledgerStats, parseMotionLedger } from '../../../packages/company-pack/src/lib/accounting/ledger.ts'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 纯函数测试 + **live bundle 真台账**断言（2026-10-24 起台账只住 dev run bundle，不进 git）。
 *
 * - 纯解析/统计：始终跑（无盘依赖）。
 * - 真台账：只在 dev bundle 在场时跑（`company-workspace/.dsh-company/kb/motion-ledger.md`）；fresh clone / CI
 *   没有它，跳过而不是造一个假台账——live 数据口径由 `ledger-participation` 门禁在盘上时守。
 *   真页面渲染是认证档：浏览器开真页面走查。
 */

const LIVE_LEDGER = join(ROOT, 'company-workspace/.dsh-company/kb/motion-ledger.md')
const LIVE_META = join(ROOT, 'company-workspace/.dsh-company/deliverables-archive/2026-10-10-ai-transformation-2026-v4/meta.md')
const hasLive = existsSync(LIVE_LEDGER) && existsSync(LIVE_META)
const REAL_LEDGER = hasLive ? readFileSync(LIVE_LEDGER, 'utf8') : ''

describe('parseMotionLedger', () => {
  it('表头不符返回空（台账被改坏 → 面板空态而非渲染错行）', () => {
    expect(parseMotionLedger('| nope | 表 |\n|---|---|\n| a | b |')).toEqual({ rows: [], badRows: [], headerOk: false })
  })

  // 负例留证 2026-11-17：冷树（3 个 live 用例 skip）时该 false 分支无人覆盖、ledger 分支掉到 94.11%（BUG-204）；补本用例后冷/暖同形。
  it('行尾没有竖线也按同列切分（live 台账的真实形状之一，BUG-204）', () => {
    // 2026-11-17 BUG-204：live 台账有一行没有尾竖线，3 个 live 用例只在暖树跑；
    // 冷树（fresh clone / CI）跳过它们时这个 false 分支没人覆盖，ledger 分支掉到 94.11%。
    // 用无盘纯测试把「两种行尾」都钉住，冷/暖两形状同形。
    const text = [
      '| slug | date | type | participants | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '| a | 2026-10-13 | decision | CEO | 1h | ✅ | 结论',
    ].join('\n')
    expect(parseMotionLedger(text)).toEqual({
      rows: [{ slug: 'a', date: '2026-10-13', kind: 'decision', roles: 'CEO', wallClock: '1h', final: '✅', summary: '结论' }],
      badRows: [],
      headerOk: true,
    })
  })

  it('列数不符的行跳过；分隔行跳过；非表行跳过', () => {
    const text = [
      '# 头',
      '',
      '| slug | date | type | participants | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '| a | d | k | r | w | ✅ | s |',
      '| 坏行 | 只有 | 三列 |',
      '| b | d2 | k2 | r2 | w2 | ✅ | s2 |',
    ].join('\n')
    const parsed = parseMotionLedger(text)
    expect(parsed.rows.map(row => row.slug)).toEqual(['a', 'b'])
    // 坏行不能静默消失：它要被记账，面板才说得出「跳过 N 行」。
    expect(parsed.badRows).toEqual([{ line: 6, cells: 3, reason: 'cell-count' }])
  })
})

// dev-only：台账是 run bundle 的扩张数据，不是产品源码；fresh clone 不保证在场。
// skip 预期：dev home 真跑 3 例；fresh clone 0 例。新增 skip 的登记守卫 = tests/repo/budget/skip-budget.spec.ts。
describe.skipIf(!hasLive)('live bundle 台账（dev only）', () => {
  it('真台账：全部行可解析、结构不变形（不钉总行数——台账每场动议都会长一行）', () => {
    const { rows } = parseMotionLedger(REAL_LEDGER)
    expect(rows.length).toBeGreaterThan(0)
    expect(new Set(rows.map(row => row.slug)).size).toBe(rows.length)
    for (const row of rows) {
      expect(row.date, `行 ${row.slug} 的日期不合口径`).toMatch(/^(\d{4}-\d{2}-\d{2}|date-pending)$/)
      expect(row.summary.length, `行 ${row.slug} 结论为空`).toBeGreaterThan(0)
    }
  })

  it('V4 meta（已收敛归档）必须有对应台账行且结论逐字同源', () => {
    const { rows } = parseMotionLedger(REAL_LEDGER)
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
    const { rows } = parseMotionLedger(REAL_LEDGER)
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
    expect(renewal!.summary).toMatch(/≤\$\d+/)
  })
})

describe('ledgerStats', () => {
  it('统计口径（fixture：总场数 / 成品数 / 未记墙钟数）', () => {
    const { rows } = parseMotionLedger([
      '| slug | date | type | participants | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '| a | 2026-09-26 | decision | CEO | 241s | ✅ | 结论一 |',
      '| b | date-pending | decision | CFO | untimed | ✅ | 结论二 |',
      '| c | 2026-09-26 | qa | CFO | — | — | 结论三 |',
    ].join('\n'))
    expect(ledgerStats(rows)).toEqual({ total: 3, finals: 2, untimed: 2 })
  })
})

// 表头 mismatch 不是「台账空」（BUG-311）：出现过表行却一个表头都没认出来 ⇒ headerOk=false，
// 面板据此说「表头不符」，而不是显示「共 0 场」。
// 负例留证 2026-11-22：把 headerOk 恒置 true 后 `vitest run tests/lib/accounting/ledger.spec.ts` 1 failed（表头 typo 静默 0 行）。BUG-311
describe('parseMotionLedger：表头诊断（BUG-311）', () => {
  it('表头写错一个词 ⇒ headerOk=false（不是静默 0 行）', () => {
    const text = [
      '| slug | date | type | 参与方 | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '| a | 2026-11-22 | decision | CEO | 1h | ✅ | 结论一 |',
    ].join('\n')
    const parsed = parseMotionLedger(text)
    expect(parsed.headerOk).toBe(false)
    expect(parsed.rows).toEqual([])
  })

  it('空文件/纯文本 ⇒ headerOk=true（没有表行就不算表头错）', () => {
    expect(parseMotionLedger('').headerOk).toBe(true)
    expect(parseMotionLedger('# 台账\n\n正文\n').headerOk).toBe(true)
  })
})

// 负例留证 2026-11-24：把 splitTableRow 换回裸 split('|') ⇒ 本用例红（8 列坏行）。BUG-356
describe('台账表格方言：转义竖线（BUG-356）', () => {
  const LEDGER = [
    '| slug | date | type | participants | wallClock | deliverable | summary |',
    '|---|---|---|---|---|---|---|',
    '| 2026-11-20-a | 2026-11-20 | decision | ceo | 1m | ✅ | A\\|B 方案对比 |',
  ].join('\n')

  it('单元格里的 \\| 留在列内：1 行、0 坏行、summary 保留字面竖线', () => {
    const parsed = parseMotionLedger(LEDGER)
    expect(parsed.badRows).toEqual([])
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]?.summary).toBe('A|B 方案对比')
    expect(parsed.rows[0]?.slug).toBe('2026-11-20-a')
  })
})

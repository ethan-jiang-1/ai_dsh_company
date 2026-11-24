import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'
import { coverageReport, renderCoverage } from '../../../tools/lib/repo/bug-coverage.mjs'
import baseline from '../../support/bug-coverage-baseline.json' with { type: 'json' }

describe('历史缺陷 → 具名守卫覆盖（生成物）', () => {
  let cachedReport: ReturnType<typeof coverageReport> | undefined
  const getReport = () => (cachedReport ??= coverageReport(ROOT))

  // 覆盖率车道全量运行时扫描慢（>30s）：给宽松超时，避免棘轮把「慢」误判成「红」。
  it('tests/BUG-COVERAGE.generated.md 与盘面一致（漂了就跑 --write）', () => {
    const expected = renderCoverage(getReport())
    const current = readFileSync(join(ROOT, 'tests/BUG-COVERAGE.generated.md'), 'utf8')
    expect(current, 'bug-coverage 是生成物：运行 node tools/repo/bug-coverage.mjs --write').toBe(expected)
  }, 120_000)

  it('覆盖率是保守下界：已修卡与守卫两向都能解析', () => {
    const report = getReport()
    expect(report.total).toBeGreaterThan(100)
    expect(report.covered.length).toBeGreaterThan(0)
    expect(report.covered.length + report.uncovered.length).toBe(report.total)
  })

  it('具名守卫只升不降，新修 BUG 必须有具名守卫', () => {
    const report = getReport()
    expect(report.covered.length, `具名守卫从 ${String(baseline.covered)} 降到 ${String(report.covered.length)}`).toBeGreaterThanOrEqual(baseline.covered)
    const uncoveredNew = report.uncovered.filter(bug => /^\d{4}-\d{2}-\d{2}$/.test(bug.opened) && bug.opened >= baseline.newBugSince)
    expect(uncoveredNew.map(bug => bug.id), `新修 BUG 缺具名守卫：${uncoveredNew.map(bug => bug.id).join(', ')}`).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { NEW_FILE_FLOOR, compareCoverage, indexCoverage, nextBaseline } from '../../../tools/lib/coverage-baseline.mjs'

/**
 * 覆盖率棘轮的判据（研究 C 件）。四条规则各有负例——没有负例的阈值等于装饰：
 * 回归 / 新文件下限 / 已知空洞 / 过期豁免。
 */
const baseline = {
  files: { 'src/a.ts': { statements: 90, branches: 80 } },
  exemptions: [{ path: 'src/hole.ts', reason: '历史遗留', removeWhen: '下一次碰它时补测' }],
}

describe('覆盖率基线判据（棘轮）', () => {
  it('回归：低于基线即红（statements 与 branches 都判）', () => {
    const clean = { files: baseline.files, exemptions: [] }
    const { violations } = compareCoverage({ 'src/a.ts': { statements: 89, branches: 80 } }, clean)
    expect(violations).toEqual([{ kind: 'regressed', path: 'src/a.ts', detail: expect.stringContaining('89') }])
    const branch = compareCoverage({ 'src/a.ts': { statements: 90, branches: 79 } }, clean)
    expect(branch.violations[0]?.kind).toBe('regressed')
  })

  it('新文件：不在基线里的文件按下限判，exemptions 可豁免', () => {
    const clean = { files: {}, exemptions: [] }
    const low = compareCoverage({ 'src/new.ts': { statements: 40, branches: 20 } }, clean)
    expect(low.violations.map(v => v.kind)).toContain('new-below-floor')
    const exempt = { files: {}, exemptions: [{ path: 'src/new.ts', reason: 'x', removeWhen: 'y' }] }
    expect(compareCoverage({ 'src/new.ts': { statements: 40, branches: 20 } }, exempt).violations).toEqual([])
    expect(NEW_FILE_FLOOR).toEqual({ statements: 80, branches: 70 })
  })

  it('已知空洞：<50% 且没豁免 → 红；豁免了就放行', () => {
    const hole = compareCoverage({ 'src/zero.ts': { statements: 0, branches: 0 } }, baseline)
    expect(hole.violations.map(v => v.kind)).toContain('hole')
    expect(compareCoverage({ 'src/hole.ts': { statements: 12, branches: 0 } }, baseline).violations).toEqual([])
  })

  it('过期豁免：文件不存在 / 已到 50% / 缺字段 → 红（逼人删配对）', () => {
    const missing = compareCoverage({}, baseline)
    expect(missing.violations.map(v => v.kind)).toContain('stale-exemption')
    const healed = compareCoverage({ 'src/hole.ts': { statements: 75, branches: 60 } }, baseline)
    expect(healed.violations[0]?.detail).toContain('删掉这条豁免')
    const incomplete = compareCoverage({ 'src/hole.ts': { statements: 10, branches: 0 } }, { files: {}, exemptions: [{ path: 'src/hole.ts', reason: '', removeWhen: '' }] })
    expect(incomplete.violations.some(v => v.detail.includes('reason') || v.detail.includes('removeWhen'))).toBe(true)
  })

  it('nextBaseline 只升不降、保留有效豁免、移除过期豁免', () => {
    const current = {
      'src/a.ts': { statements: 85, branches: 95 },
      'src/hole.ts': { statements: 12, branches: 0 },
    }
    const next = nextBaseline(current, baseline, '2026-11-13')
    expect(next.generatedAt).toBe('2026-11-13')
    expect(next.files['src/a.ts']).toEqual({ statements: 90, branches: 95 }) // statements 不降，branches 升
    expect(next.exemptions.map(entry => entry.path)).toEqual(['src/hole.ts'])
  })

  it('indexCoverage 去掉根前缀并跳过 total', () => {
    const summary = {
      '/repo/total': { statements: { pct: 1 } },
      '/repo/src/a.ts': { statements: { pct: 91 }, branches: { pct: 81 } },
    }
    expect(indexCoverage(summary, '/repo')).toEqual({ 'src/a.ts': { statements: 91, branches: 81 } })
  })
})

import { describe, expect, it } from 'vitest'
import { NEW_FILE_FLOOR, compareCoverage, indexCoverage, nextBaseline } from '../../checks/lib/coverage-baseline.mjs'

/**
 * 覆盖率棘轮的判据（研究 C 件）。五条规则各有负例——没有负例的阈值等于装饰：
 * 回归 / 新文件下限 / 已知空洞 / 过期豁免 / 基线键消失（改名或删除必须显式）。
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
    const hole = compareCoverage({ 'src/a.ts': { statements: 90, branches: 80 }, 'src/zero.ts': { statements: 0, branches: 0 } }, baseline)
    expect(hole.violations.map(v => v.kind)).toContain('hole')
    expect(compareCoverage({ 'src/a.ts': { statements: 90, branches: 80 }, 'src/hole.ts': { statements: 12, branches: 0 } }, baseline).violations).toEqual([])
  })

  it('过期豁免：文件不存在 / 已到 50% / 缺字段 → 红（逼人删配对）', () => {
    const missing = compareCoverage({}, baseline)
    expect(missing.violations.map(v => v.kind)).toContain('stale-exemption')
    const healed = compareCoverage({ 'src/a.ts': { statements: 90, branches: 80 }, 'src/hole.ts': { statements: 75, branches: 60 } }, baseline)
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

// 负例留证 2026-11-17：基线键消失不判红 / 改名重置地板在本 spec 下红（BUG-203）；修复后绿。
describe('改名 / 删除：地板必须显式迁移或删除（BUG-203）', () => {
  const moved = { files: { 'pkg/old-home/moved.ts': { statements: 100, branches: 100 } }, exemptions: [] }
  const renames = [{ from: 'pkg/old-home/moved.ts', to: 'pkg/new-home/moved.ts' }]

  it('基线键消失且没有映射 → 红，不再只发 note', () => {
    const { violations, notes } = compareCoverage({ 'pkg/new-home/moved.ts': { statements: 85, branches: 75 } }, moved)
    expect(violations.map(v => v.kind)).toContain('missing-baseline')
    expect(violations.some(v => v.kind === 'new-below-floor')).toBe(false)
    expect(notes).toEqual([])
  })

  it('显式 rename 把旧地板迁到新键：低于旧地板红，等于/高于绿', () => {
    const low = compareCoverage({ 'pkg/new-home/moved.ts': { statements: 85, branches: 75 } }, moved, { renames })
    expect(low.violations.filter(v => v.kind === 'regressed')).toHaveLength(2)
    expect(low.violations[0]?.detail).toContain('pkg/old-home/moved.ts')
    const clean = compareCoverage({ 'pkg/new-home/moved.ts': { statements: 100, branches: 100 } }, moved, { renames })
    expect(clean.violations).toEqual([])
    expect(clean.notes.some(note => note.includes('pkg/old-home/moved.ts') && note.includes('pkg/new-home/moved.ts'))).toBe(true)
  })

  it('rename 后 nextBaseline 继承旧地板、移除旧键；不丢 100/100', () => {
    const next = nextBaseline({ 'pkg/new-home/moved.ts': { statements: 100, branches: 100 } }, moved, '2026-11-17', { renames })
    expect(next.files['pkg/new-home/moved.ts']).toEqual({ statements: 100, branches: 100 })
    expect(next.files['pkg/old-home/moved.ts']).toBeUndefined()
  })

  it('真新增文件 85/75 仍走新文件下限（不误红）', () => {
    expect(compareCoverage({ 'pkg/new-home/moved.ts': { statements: 85, branches: 75 } }, { files: {}, exemptions: [] }).violations).toEqual([])
  })

  it('显式 drop 才允许删除；没有 drop 的旧键在 nextBaseline 里保留地板', () => {
    const dropped = compareCoverage({}, moved, { drops: ['pkg/old-home/moved.ts'] })
    expect(dropped.violations).toEqual([])
    expect(dropped.notes.some(note => note.includes('已显式删除'))).toBe(true)
    expect(nextBaseline({}, moved, '2026-11-17', { drops: ['pkg/old-home/moved.ts'] }).files).toEqual({})
    expect(nextBaseline({}, moved, '2026-11-17').files['pkg/old-home/moved.ts']).toEqual({ statements: 100, branches: 100 })
    // 删除一个基线里没有的键 = 不自洽的删除，不是「无操作」。
    expect(compareCoverage({}, moved, { drops: ['pkg/ghost.ts'] }).violations.map(v => v.kind)).toContain('invalid-drop')
    // 盲审 S1：同名新键在场时 --drop 等于「换个路径重新起算」，必须逼用 --rename。
    const bypass = compareCoverage({ 'pkg/new-home/moved.ts': { statements: 85, branches: 75 } }, moved, { drops: ['pkg/old-home/moved.ts'] })
    expect(bypass.violations.map(v => v.kind)).toContain('invalid-drop')
    expect(bypass.violations.some(v => v.detail.includes('--rename'))).toBe(true)
  })

  it('变好只发 note（不判红），nextBaseline 保留有效豁免', () => {
    const improved = compareCoverage(
      { 'pkg/old-home/moved.ts': { statements: 100, branches: 100 } },
      { files: { 'pkg/old-home/moved.ts': { statements: 90, branches: 80 } }, exemptions: [] },
    )
    expect(improved.violations).toEqual([])
    expect(improved.notes.some(note => note.includes('变好'))).toBe(true)
    const next = nextBaseline(
      { 'src/hole.ts': { statements: 10, branches: 0 } },
      { files: {}, exemptions: [{ path: 'src/hole.ts', reason: 'x', removeWhen: 'y' }] },
      '2026-11-17',
    )
    expect(next.exemptions.map(entry => entry.path)).toEqual(['src/hole.ts'])
  })

  it('映射/删除本身不自洽 → invalid-rename / invalid-drop', () => {
    const ghost = compareCoverage({ 'pkg/new-home/moved.ts': { statements: 100, branches: 100 } }, moved, { renames: [{ from: 'pkg/missing.ts', to: 'pkg/new-home/moved.ts' }] })
    expect(ghost.violations.map(v => v.kind)).toContain('invalid-rename')
    const live = compareCoverage({ 'pkg/old-home/moved.ts': { statements: 100, branches: 100 } }, moved, { drops: ['pkg/old-home/moved.ts'] })
    expect(live.violations.map(v => v.kind)).toContain('invalid-drop')
    const duplicateFrom = compareCoverage(
      { 'pkg/new-home/moved.ts': { statements: 100, branches: 100 } },
      moved,
      { renames: [{ from: 'pkg/old-home/moved.ts', to: 'pkg/new-home/moved.ts' }, { from: 'pkg/old-home/moved.ts', to: 'pkg/other.ts' }] },
    )
    expect(duplicateFrom.violations.map(v => v.kind)).toContain('invalid-rename')
    const duplicateTo = compareCoverage(
      { 'pkg/new-home/moved.ts': { statements: 100, branches: 100 } },
      { files: { ...moved.files, 'pkg/other.ts': { statements: 100, branches: 100 } }, exemptions: [] },
      { renames: [{ from: 'pkg/old-home/moved.ts', to: 'pkg/new-home/moved.ts' }, { from: 'pkg/other.ts', to: 'pkg/new-home/moved.ts' }] },
    )
    expect(duplicateTo.violations.map(v => v.kind)).toContain('invalid-rename')
    // 目标没有出现在本次统计 / 旧键仍活着：两种映射都不可信。
    const noTarget = compareCoverage({}, moved, { renames: [{ from: 'pkg/old-home/moved.ts', to: 'pkg/ghost.ts' }] })
    expect(noTarget.violations.map(v => v.kind)).toContain('invalid-rename')
    const oldStillLive = compareCoverage(
      { 'pkg/old-home/moved.ts': { statements: 100, branches: 100 }, 'pkg/new-home/moved.ts': { statements: 100, branches: 100 } },
      moved,
      { renames: [{ from: 'pkg/old-home/moved.ts', to: 'pkg/new-home/moved.ts' }] },
    )
    expect(oldStillLive.violations.map(v => v.kind)).toContain('invalid-rename')
  })
})

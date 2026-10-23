import { describe, expect, it } from 'vitest'
import { selectPrunable } from '../../tools/lib/prune-runtime.mjs'

// 2026-10-23（P7）：运行时数据清扫的判据——>7 天 + 无 markdown 引用 + 非 tracked 才删。
// 用户口径：7 天前的数据一律清（插件内容除外）；最近但别扭的由人判断。
describe('runtime prune policy', () => {
  const now = Date.parse('2026-10-23T00:00:00Z')
  const entry = (path, daysAgo, extra = {}) => ({ path, mtimeMs: now - daysAgo * 86_400_000, ...extra })

  it('超过天数、无引用、未跟踪 ⇒ 删', () => {
    const { drop, keep } = selectPrunable([entry('runtime/e2e/old', 10)], { now, days: 7 })
    expect(drop.map(row => row.path)).toEqual(['runtime/e2e/old'])
    expect(keep).toEqual([])
  })

  it('未到天数 / 被 markdown 引用 / tracked ⇒ 留，并说原因', () => {
    const rows = [
      entry('runtime/e2e/fresh', 3),
      entry('runtime/human-exits-evidence', 30, { referenced: true }),
      entry('runtime/cold-storage', 30, { tracked: true }),
    ]
    const { drop, keep } = selectPrunable(rows, { now, days: 7 })
    expect(drop).toEqual([])
    expect(keep.map(row => `${row.path}:${row.reason}`)).toEqual([
      'runtime/e2e/fresh:fresh',
      'runtime/human-exits-evidence:referenced',
      'runtime/cold-storage:tracked',
    ])
  })

  it('README 永不删（不在候选里也会被兜住）', () => {
    const { keep } = selectPrunable([entry('runtime/README.md', 999)], { now, days: 7 })
    expect(keep[0]?.reason).toBe('protected')
  })
})

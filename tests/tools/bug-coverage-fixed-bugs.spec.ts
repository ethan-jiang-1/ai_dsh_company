/**
 * `fixedBugs()` 的读取口径（2026-11-22）：`fixed_bugs/` 也住「撤回/非缺陷」卡（`status: 已结`），
 * 它们不该被当成「需要具名守卫的已修卡」——目录位置不等于状态。这条判据钉住「按 status 过滤」。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fixedBugs } from '../../tools/lib/repo/bug-coverage.mjs'

function card(status: string, opened = '2026-11-20'): string {
  return ['---', `status: ${status}`, 'severity: P2', `opened: ${opened}`, '---', '', '# BUG-999：示例', ''].join('\n')
}

describe('fixedBugs：目录里有撤回卡时只收「已修」', () => {
  it('已修卡收入 / 已结（撤回）卡排除', () => {
    const root = mkdtempSync(join(tmpdir(), 'bugcov-'))
    try {
      const dir = join(root, '_backlog/_archive/fixed_bugs')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'BUG-901-real-fix.md'), card('已修'))
      writeFileSync(join(dir, 'BUG-902-retracted.md'), card('已结'))
      // 无 frontmatter 的卡：status 取不到 ⇒ 不进「已修」清单
      writeFileSync(join(dir, 'BUG-903-no-frontmatter.md'), '# BUG-903：裸卡\n')
      // opened 不是 YYYY-MM-DD：仍收入，但 opened 记「—」（不给下游一个假日期）
      writeFileSync(join(dir, 'BUG-904-bad-opened.md'), card('已修', '昨天'))
      const bugs = fixedBugs(root)
      expect(bugs.map(bug => bug.id)).toEqual(['901', '904'])
      expect(bugs[0]?.opened).toBe('2026-11-20')
      expect(bugs[1]?.opened).toBe('—')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})

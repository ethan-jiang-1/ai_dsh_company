/** 培养面板读模型（驾驶舱④切片四的 keyless 完成定义）。 */
import { describe, expect, it } from 'vitest'
import {
  CULTIVATION_ROLES,
  PREVIEW_LIMIT,
  inboxRows,
  journalTitle,
} from '../packages/company-pack/src/lib/cultivation.ts'

/**
 * 只测纯函数（毫秒级）。真数据渲染（company-workspace 真 journal 进面板）是认证档：
 * 浏览器开真页面走查（guides/dev-loop §9.1 分层）。
 */

describe('journalTitle', () => {
  it('优先取首个标题行；无标题取首段非空行', () => {
    expect(journalTitle('# 对账模块评估\n\n结论：接得住。')).toBe('对账模块评估')
    expect(journalTitle('## 2026-09-22 复盘\n细节…')).toBe('2026-09-22 复盘')
    expect(journalTitle('\n\n结论先行：三件事。\n后续')).toBe('结论先行：三件事。')
  })

  it('长标题截断；空文本给（空）', () => {
    expect(journalTitle(`# ${'长'.repeat(80)}`)).toBe(`${'长'.repeat(60)}…`)
    expect(journalTitle('   \n\n')).toBe('（空）')
  })
})

describe('inboxRows', () => {
  it('每角色一行：计数 + 文件名倒序前 3 条预览；已读条目用标题、未读降级文件名', () => {
    const rows = inboxRows(
      { ceo: ['b.md', 'a.md', 'c.md', 'd.md'], coo: ['only.md'] },
      { 'ceo/d.md': '# 最新复盘', 'ceo/c.md': '结论：预算内。' },
    )
    expect(rows).toHaveLength(CULTIVATION_ROLES.length)
    const ceo = rows.find(row => row.role === 'ceo')!
    expect(ceo.count).toBe(4)
    expect(ceo.entries.map(entry => entry.name)).toEqual(['d.md', 'c.md', 'b.md'])
    expect(ceo.entries[0]!.title).toBe('最新复盘')
    expect(ceo.entries[1]!.title).toBe('结论：预算内。')
    expect(ceo.entries[2]!.title).toBe('b') // 未读 → 文件名去后缀
    const coo = rows.find(row => row.role === 'coo')!
    expect(coo.count).toBe(1)
    expect(coo.entries).toHaveLength(1)
  })

  it('缺角色清单 = 0 条待审（不撒谎：全部存量就是待审）', () => {
    const rows = inboxRows({}, {})
    for (const row of rows) {
      expect(row.count).toBe(0)
      expect(row.entries).toHaveLength(0)
    }
    expect(rows.map(row => row.label)).toEqual(['CEO', 'VP-Eng', 'VP-Sales', 'COO', 'CFO'])
  })

  it('预览上限 = PREVIEW_LIMIT', () => {
    const names = Array.from({ length: 10 }, (_, i) => `j${String(i)}.md`)
    const [ceo] = inboxRows({ ceo: names }, {})
    expect(ceo.entries).toHaveLength(PREVIEW_LIMIT)
    expect(ceo.count).toBe(10)
  })
})

/**
 * 培养记录的时间口径（BUG-300）。
 *
 * 为什么单独一条：`decidedAt` 由 host 写成完整 ISO（审计需要精确值），但面板正文里
 * 「提出时间」是相对人话（`timeLabel`）——同一个面板里两种口径会逼用户脑内换算。
 * 判据钉两件：ISO 必须变成相对人话；解析失败回落原值（不编时间、不吞值）。
 */
import { describe, expect, it } from 'vitest'
import { decidedAtLabel } from '../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts'

// 负例留证 2026-11-22：把面板改回直接渲染 record.decidedAt（裸 ISO）后 `vitest run tests/client/cultivation/cultivation-board.spec.ts` 1 failed；改回 decidedAtLabel 后 27/27 绿。BUG-300
describe('decidedAtLabel（BUG-300）', () => {
  const now = Date.parse('2026-11-21T20:00:00.000Z')

  it('ISO ⇒ 相对人话（与提出时间同一种口径，不出现裸 ISO）', () => {
    const label = decidedAtLabel('2026-11-21T19:00:00.000Z', now)
    expect(label).not.toContain('T')
    expect(label).not.toContain('Z')
    expect(label.length).toBeGreaterThan(0)
  })

  it('解析失败 ⇒ 原样返回（不编时间）', () => {
    expect(decidedAtLabel('不是时间', now)).toBe('不是时间')
  })
})

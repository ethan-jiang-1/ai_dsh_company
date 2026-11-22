/**
 * 培养记录的时间口径（BUG-300）。
 *
 * 为什么单独一条：`decidedAt` 由 host 写成完整 ISO（审计需要精确值），但面板正文里
 * 「提出时间」是相对人话（`timeLabel`）——同一个面板里两种口径会逼用户脑内换算。
 * 判据钉两件：ISO 必须变成相对人话；解析失败回落原值（不编时间、不吞值）。
 */
import { describe, expect, it } from 'vitest'
import { decidedAtLabel, timeParts } from '../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts'

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

// 时间片段：表达层 helper 只产出结构，语言由渲染层决定；
// 五档分支各有断言，否则 en 面漏一档就没人发现。
// 负例留证 2026-11-22：把 timeParts 的『刚刚』分支阈值去掉后 `vitest run tests/lib/cultivation/cultivation-record-time.spec.ts` 1 failed。BUG-302
describe('timeParts（BUG-302）', () => {
  const now = Date.parse('2026-11-22T12:00:00.000Z')

  it('五档：刚刚 / 分钟 / 小时 / 昨天 / 日期', () => {
    expect(timeParts(now - 1_000, now).kind).toBe('just-now')
    expect(timeParts(now - 5 * 60_000, now)).toEqual({ kind: 'minutes', n: 5 })
    expect(timeParts(now - 3 * 3_600_000, now)).toEqual({ kind: 'hours', n: 3 })
    const yesterday = new Date(now - 86_400_000)
    expect(timeParts(yesterday.getTime(), now).kind).toBe('yesterday')
    expect(timeParts(Date.parse('2026-01-02T03:04:00.000Z'), now).kind).toBe('date')
  })
})

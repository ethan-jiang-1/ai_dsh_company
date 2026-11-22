/**
 * 两栏布局的**唯一计算**判据。
 *
 * 事故：`BOARD_MIN = 380` / `CHAT_MIN = 280` 早就声明，但 CSS 从没消费它们——
 * 768px 视口下容器 393px，右栏按 45% 拿 176、左板只剩 210，两侧都低于声明下限。
 * 判据钉三档容器宽（对应 375 / 768 / 1440 视口实测过的值）：
 * 放得下 ⇒ 两栏且各自 ≥ 下限；放不下 ⇒ 堆叠（各自拿满容器），不再压成窄条。
 */
import { describe, expect, it } from 'vitest'
import { BOARD_MIN, CHAT_MIN, SPLIT_GAP, splitLayout } from '../../../packages/company-pack/src/client/cultivation/CultivationView.tsx'

// 负例留证 2026-11-22：把 splitLayout 改回「永远两栏、右栏按期望宽」后 `vitest run tests/client/cultivation/cultivation-view-layout.spec.ts` 2 failed（393 容器下两侧都低于下限）。BUG-315
describe('splitLayout：声明下限成为唯一消费点（BUG-315）', () => {
  it('768 视口（容器 393）⇒ 堆叠，而不是 210/176 的窄条', () => {
    const layout = splitLayout(393, 390)
    expect(layout.stacked).toBe(true)
    expect(layout.chat).toBe(393)
  })

  it('1440 视口（容器 1100）⇒ 两栏且两侧都 ≥ 下限', () => {
    const layout = splitLayout(1100, 390)
    expect(layout.stacked).toBe(false)
    expect(layout.chat).toBe(390)
    expect(1100 - layout.chat - SPLIT_GAP).toBeGreaterThanOrEqual(BOARD_MIN)
    expect(layout.chat).toBeGreaterThanOrEqual(CHAT_MIN)
  })

  it('容器刚好放下 ⇒ 两栏；差 1px ⇒ 堆叠（边界明确）', () => {
    expect(splitLayout(BOARD_MIN + CHAT_MIN + SPLIT_GAP, 390).stacked).toBe(false)
    expect(splitLayout(BOARD_MIN + CHAT_MIN + SPLIT_GAP - 1, 390).stacked).toBe(true)
  })

  it('期望右栏很宽但容器不够 ⇒ 被压到「留给左板的最小剩余」，左板仍 ≥ 下限', () => {
    const available = BOARD_MIN + CHAT_MIN + SPLIT_GAP + 100
    const layout = splitLayout(available, 700)
    expect(layout.stacked).toBe(false)
    expect(available - layout.chat - SPLIT_GAP).toBeGreaterThanOrEqual(BOARD_MIN)
    expect(layout.chat).toBeGreaterThanOrEqual(CHAT_MIN)
  })

  it('容器还没量到（0/NaN）⇒ 不堆叠、右栏仍被 clamp（首帧不跳）', () => {
    expect(splitLayout(0, 390)).toEqual({ stacked: false, chat: 390 })
    expect(splitLayout(Number.NaN, 100)).toEqual({ stacked: false, chat: CHAT_MIN })
  })
})

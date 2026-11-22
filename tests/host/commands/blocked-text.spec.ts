/**
 * 停写回执的两种语言（BUG-326）。
 *
 * 事故：命令面已按 locale 出文案，停写回执仍是中文；`blockedCompanyTextPair` 是那次抽出的
 * 双语入口。判据钉住「原因原话上行」与「两端都不丢提示」。
 */
import { describe, expect, it } from 'vitest'
import { blockedCompanyText, blockedCompanyTextPair } from '../../../packages/company-pack/src/host/commands/blocked-text.ts'

// 负例留证 2026-11-26：去掉 `blockedCompanyTextPair`（回到只给中文）后 `vitest run tests/host/commands/blocked-text.spec.ts` 2 failed。BUG-326
describe('blockedCompanyTextPair（BUG-326）', () => {
  it('原因原话进两种语言，且都不为空', () => {
    const pair = blockedCompanyTextPair('没有 workspace', '培养', 'cultivating')
    expect(pair.zh).toContain('没有 workspace')
    expect(pair.en).toContain('没有 workspace')
    expect(pair.zh).toContain('培养')
    expect(pair.en).toContain('cultivating')
  })

  it('原因为空 ⇒ 两边都给缺省说法（不留空括号）', () => {
    const pair = blockedCompanyTextPair(undefined, '培养', 'cultivating')
    expect(pair.zh).toContain('运行前提未满足')
    expect(pair.en).toContain('runtime preconditions are not met')
  })

  it('单语版本保持原有措辞（不回归）', () => {
    expect(blockedCompanyText('x', '培养')).toContain('公司数据已停写')
  })
})

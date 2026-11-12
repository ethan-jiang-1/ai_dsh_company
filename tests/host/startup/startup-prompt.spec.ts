/**
 * `company:startup-settings` 注入文本的 keyless 判据（2026-11-12）。
 *
 * 判据：
 * ① 全自动 → 空串（不占上下文、也不给模型任何约束暗示）；
 * ② 有设值 → 只列已设项，并显式压住手册的「问一句 / 按特征猜」语义；
 * ③ `wiki` 带「先读 index 再钻页」的用法提示；
 * ④ 文本不是静态快照：同一设置对象重复取词结果一致（活读由注册处 thunk 保证）。
 */
import { describe, expect, it } from 'vitest'
import {
  STARTUP_SETTINGS_ORDER,
  STARTUP_SETTINGS_SECTION,
  startupSettingsText,
} from '../../../packages/company-pack/src/host/startup/startup-prompt.ts'
import { EMPTY_STARTUP_SETTINGS } from '../../../packages/company-pack/src/lib/startup-settings.ts'

describe('startupSettingsText', () => {
  it('全自动 → 空串', () => {
    expect(startupSettingsText(EMPTY_STARTUP_SETTINGS)).toBe('')
  })

  it('单字段：只列该项并压住问/猜', () => {
    const text = startupSettingsText({ ...EMPTY_STARTUP_SETTINGS, productType: 'business-software' })
    expect(text).toContain('产品类型：business-software')
    expect(text).toContain('不要再问用户')
    expect(text).not.toContain('交付模式')
    expect(text).not.toContain('参考资料')
  })

  it('三字段齐全时逐项出现（含 wiki 的 index 用法）', () => {
    const text = startupSettingsText({
      ...EMPTY_STARTUP_SETTINGS,
      productType: 'hardware-software',
      deliveryMode: 'project-services',
      wiki: '../team-wiki',
    })
    expect(text).toContain('产品类型：hardware-software')
    expect(text).toContain('交付模式：project-services')
    expect(text).toContain('参考资料 wiki：../team-wiki')
    expect(text).toContain('index.md')
  })

  it('section 名与顺序和手册错开（手册 500 → 本段 501）', () => {
    expect(STARTUP_SETTINGS_SECTION).toBe('company:startup-settings')
    expect(STARTUP_SETTINGS_ORDER).toBe(501)
  })
})

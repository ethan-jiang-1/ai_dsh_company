/**
 * `company:startup-settings` 注入文本的 keyless 判据（2026-11-12）。
 *
 * 判据：
 * ① 全自动 → 空串（不占上下文、也不给模型任何约束暗示）；
 * ② 有设值 → 只列已设项，并显式压住手册的「问一句 / 按特征猜」语义；
 * ③ `wiki` 带「先读 index 再钻页」的用法提示，且按指针位置分三档（A4：内可写 / 外只读 / 失效警示）；
 * ④ 文本不是静态快照：同一设置对象重复取词结果一致（活读由注册处 thunk 保证）。
 */
import { describe, expect, it } from 'vitest'
import {
  STARTUP_SETTINGS_ORDER,
  STARTUP_SETTINGS_SECTION,
  startupSettingsText,
} from '../../../packages/company-pack/src/host/startup/startup-prompt.ts'
import { EMPTY_STARTUP_SETTINGS, EMPTY_WIKI_CHECK } from '../../../packages/company-pack/src/lib/startup-settings.ts'

describe('startupSettingsText', () => {
  it('全自动 → 空串', () => {
    expect(startupSettingsText(EMPTY_STARTUP_SETTINGS, EMPTY_WIKI_CHECK)).toBe('')
  })

  it('单字段：只列该项并压住问/猜', () => {
    const text = startupSettingsText({ ...EMPTY_STARTUP_SETTINGS, productType: 'business-software' }, EMPTY_WIKI_CHECK)
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
    }, { value: '../team-wiki', ok: true, problem: null, location: 'inside' })
    expect(text).toContain('产品类型：hardware-software')
    expect(text).toContain('交付模式：project-services')
    expect(text).toContain('参考资料 wiki：../team-wiki')
    expect(text).toContain('index.md')
  })

  it('A4 三档：workspace 内可写 / workspace 外只读 / 失效警示（不含正常查页指引）', () => {
    const base = { ...EMPTY_STARTUP_SETTINGS, wiki: '/w' }
    const inside = startupSettingsText(base, { value: '/w', ok: true, problem: null, location: 'inside' })
    expect(inside).toContain('可以按 wiki 的维护协议新增/修改页面')
    expect(inside).not.toContain('只读')

    const outside = startupSettingsText(base, { value: '/w', ok: true, problem: null, location: 'outside' })
    expect(outside).toContain('只读')
    expect(outside).toContain('不要尝试写入')

    const broken = startupSettingsText(base, { value: '/w', ok: false, problem: 'no-index', location: 'outside' })
    expect(broken).toContain('已失效')
    expect(broken).toContain('目录里没有 index.md')
    expect(broken).toContain('不要')
    expect(broken).not.toContain('先读它下面的 index.md 再钻页')
  })

  it('A4 失效三因各说清楚（缺目录 / 非目录 / 缺 index）', () => {
    const base = { ...EMPTY_STARTUP_SETTINGS, wiki: '/w' }
    const of = (problem: 'missing' | 'not-directory' | 'no-index') =>
      startupSettingsText(base, { value: '/w', ok: false, problem, location: 'outside' })
    expect(of('missing')).toContain('目录不存在')
    expect(of('not-directory')).toContain('不是目录')
    expect(of('no-index')).toContain('没有 index.md')
  })

  it('section 名与顺序和手册错开（手册 500 → 本段 501）', () => {
    expect(STARTUP_SETTINGS_SECTION).toBe('company:startup-settings')
    expect(STARTUP_SETTINGS_ORDER).toBe(501)
  })
})

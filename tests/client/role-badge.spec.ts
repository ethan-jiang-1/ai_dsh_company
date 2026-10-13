/** 角色标记（角色身份 UX · B 段，keyless：纯读函数 + 静态渲染形状 + 座位标记形状）。 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ROLE_MARK, ROLE_SHORT, RoleBadge, readPresetOf, sessionTitleOf } from '../../packages/company-pack/src/client/RoleBadge.tsx'

const SID = 'session-1111-2222' as Parameters<typeof readPresetOf>[1]

/** 造一个最小快照源（ObservableSnapshot 形状）。 */
const sourceOf = (values: Record<string, unknown> | undefined) => ({
  getSnapshot: () => ({ projectionsBySession: { [SID]: values === undefined ? undefined : { values } } }),
  subscribe: () => () => {},
})

describe('readPresetOf（上游 agentPreset 投影的读法）', () => {
  it('字符串值 ⇒ 原样返回', () => {
    expect(readPresetOf(sourceOf({ agentPreset: 'cfo' }), SID)).toBe('cfo')
  })
  it('空串 / 缺席 / 非字符串 ⇒ null（优雅降级的判据）', () => {
    expect(readPresetOf(sourceOf({ agentPreset: '' }), SID)).toBeNull()
    expect(readPresetOf(sourceOf({}), SID)).toBeNull()
    expect(readPresetOf(sourceOf({ agentPreset: 42 }), SID)).toBeNull()
    expect(readPresetOf(sourceOf(undefined), SID)).toBeNull()
  })
})

describe('sessionTitleOf（会话行标题的防御性双读）', () => {
  it('displayTitle 优先，title 兜底，都没有 ⇒ undefined', () => {
    expect(sessionTitleOf({ displayTitle: '甲', title: '乙' })).toBe('甲')
    expect(sessionTitleOf({ title: '乙' })).toBe('乙')
    expect(sessionTitleOf({ displayTitle: '', title: '乙' })).toBe('乙')
    expect(sessionTitleOf({})).toBeUndefined()
  })
})

describe('ROLE_SHORT（角色 → 全称缩写）', () => {
  it('五角色齐全；非公司 preset 不在表内（⇒ 不渲染）', () => {
    expect(ROLE_SHORT.ceo).toBe('CEO')
    expect(ROLE_SHORT.cfo).toBe('CFO')
    expect(ROLE_SHORT.coo).toBe('COO')
    expect(ROLE_SHORT['vp-eng']).toBe('VPE')
    expect(ROLE_SHORT['vp-sales']).toBe('VPS')
    expect(ROLE_SHORT.standard).toBeUndefined()
  })
})

describe('ROLE_MARK（座位标记字母；16px 格里放得下）', () => {
  it('与 ROLE_SHORT 同键（两张表不许漂）：五角色齐全、非公司 preset 不在表内', () => {
    expect(Object.keys(ROLE_MARK).sort()).toEqual(Object.keys(ROLE_SHORT).sort())
  })
  it('每个标记都是单字母且互不相同（三字缩写 32.45px 塞不进 16px 座位——见 styles.ts 注释）', () => {
    const marks = Object.values(ROLE_MARK)
    expect(marks.every(mark => mark.length === 1)).toBe(true)
    expect(new Set(marks).size).toBe(marks.length)
  })
})

describe('RoleBadge（静态渲染形状）', () => {
  it('有角色 ⇒ 标记：类名 + data-wk-role + 座位字母 + 全称缩写 title', () => {
    const html = renderToStaticMarkup(createElement(RoleBadge, { sessionId: SID, roleSource: sourceOf({ agentPreset: 'cfo' }) }))
    expect(html).toContain('wk-role-badge')
    expect(html).toContain('data-wk-role="cfo"')
    expect(html).toContain('title="CFO"')
    expect(html).toContain('>F</span>')
  })
  it('无值 / 未知 preset ⇒ 不渲染任何角色痕迹（优雅降级）', () => {
    expect(renderToStaticMarkup(createElement(RoleBadge, { sessionId: SID, roleSource: sourceOf({}) }))).toBe('')
    expect(renderToStaticMarkup(createElement(RoleBadge, { sessionId: SID, roleSource: sourceOf({ agentPreset: 'standard' }) }))).toBe('')
  })
})

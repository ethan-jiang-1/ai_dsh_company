import { describe, expect, it } from 'vitest'
import { buildGolden, compareGolden, firstTextDiff, goldenProblems, normalizeText } from '../../tools/lib/ui-golden.mjs'

// 六维提分 D5：UI 金样纯逻辑（门禁与 ui-scene-smoke 共用；真页面车道另验）。
describe('UI 金样：归一化、构造与比较', () => {
  it('归一化折叠空白、去零宽与首尾', () => {
    expect(normalizeText('  等\u200b你\n\n处理  ')).toBe('等你 处理')
    expect(normalizeText(undefined)).toBe('')
  })

  it('构造金样按目录顺序、不含时间戳', () => {
    const golden = buildGolden({ catalog: ['待办', '看板'], tabTexts: { 待办: '  a\n b ', 看板: 'c' } })
    expect(golden).toEqual({ schema: 1, scene: 'company-shell', catalog: ['待办', '看板'], tabs: { 待办: 'a b', 看板: 'c' } })
  })

  it('比较：目录变化单独报，文本差异逐页签报', () => {
    const golden = buildGolden({ catalog: ['待办', '看板'], tabTexts: { 待办: 'a', 看板: 'b' } })
    const same = compareGolden(golden, { catalog: ['待办', '看板'], tabTexts: { 待办: ' a ', 看板: 'b' } })
    expect(same).toEqual({ catalogProblems: [], tabProblems: [] })
    const changed = compareGolden(golden, { catalog: ['待办', '看板'], tabTexts: { 待办: 'a2', 看板: 'b' } })
    expect(changed.catalogProblems).toEqual([])
    expect(changed.tabProblems).toEqual([{ tab: '待办', expected: 'a', actual: 'a2' }])
    const removed = compareGolden(golden, { catalog: ['待办'], tabTexts: { 待办: 'a' } })
    expect(removed.catalogProblems[0]).toContain('页签目录变了')
  })

  it('金样形状：schema/scene 错、空文本、多余页签都报', () => {
    const problems = goldenProblems({ schema: 2, scene: 'x', catalog: [], tabs: { 多出来: 'x' } }, ['待办'])
    expect(problems.join('\n')).toContain('schema 应为 1')
    expect(problems.join('\n')).toContain('scene 应为 company-shell')
    expect(problems.join('\n')).toContain('页签「待办」的金样文本为空')
    expect(problems.join('\n')).toContain('金样含注册面没有的页签：多出来')
  })

  it('首差片段带上下文（失败信息可读）', () => {
    const diff = firstTextDiff('AAA-BBB-CCC', 'AAA-XBB-CCC')
    expect(diff.at).toBe(4)
    expect(diff.expected).toContain('AAA-BBB')
    expect(diff.actual).toContain('AAA-XBB')
  })
})

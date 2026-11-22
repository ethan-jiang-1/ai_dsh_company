/**
 * 列表分隔符随语言（BUG-329）。
 *
 * 事故：`join('、')` 散在四处（任务成员 / 依赖 / 看板等待与分叉 / 培养坏记录），
 * en 面板里出现中文顿号。判据钉住「取分隔符只有一处」与中英两侧的渲染结果。
 */
import { describe, expect, it } from 'vitest'
import { joinList, listSeparator } from '../../../packages/company-pack/src/client/ui/list-separator.ts'
import { en, zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { setCultivationLanguage, cultivationListSeparator } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'

const tOf = (dict: Record<CompanyKey, string>): CompanyT =>
  ((key: CompanyKey, params?: Record<string, string | number>) => {
    const template = dict[key]
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
  }) as CompanyT

describe('listSeparator / joinList', () => {
  it('zh 用顿号、en 用逗号', () => {
    expect(listSeparator(tOf(zh))).toBe('、')
    expect(listSeparator(tOf(en))).toBe(', ')
  })

  it('joinList 按分隔符拼，空项被过滤', () => {
    expect(joinList(['a', '', 'b'], '、')).toBe('a、b')
    expect(joinList(['a', 'b'], ', ')).toBe('a, b')
    expect(joinList([], '、')).toBe('')
  })

  it('培养面用自己语言的分隔符（不串到 UI 字典）', () => {
    setCultivationLanguage('en')
    expect(cultivationListSeparator()).toBe(', ')
    setCultivationLanguage('zh')
    expect(cultivationListSeparator()).toBe('、')
  })
})

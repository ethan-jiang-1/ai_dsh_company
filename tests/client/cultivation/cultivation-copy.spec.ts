/** 培养文案表：按视图语言切换；zh 是缺省，en 不混中文。 */
import { afterEach, describe, expect, it } from 'vitest'
import { CULTIVATION_COPY, setCultivationLanguage } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'

afterEach(() => { setCultivationLanguage('zh') })

describe('CULTIVATION_COPY 语言代理', () => {
  it('zh 缺省：采纳 / 处理中', () => {
    setCultivationLanguage('zh')
    expect(CULTIVATION_COPY.adopt).toBe('采纳')
    expect(CULTIVATION_COPY.running).toBe('处理中…')
  })

  it('en：Adopt / Working / 函数仍带参数', () => {
    setCultivationLanguage('en')
    expect(CULTIVATION_COPY.adopt).toBe('Adopt')
    expect(CULTIVATION_COPY.running).toBe('Working…')
    expect(CULTIVATION_COPY.selfNote('CEO')).toContain('CEO')
    expect(CULTIVATION_COPY.selfNote('CEO')).toContain('your own role')
    expect(CULTIVATION_COPY.inboxTitle).toBe('Needs me')
    expect(CULTIVATION_COPY.inboxSuggestion('CFO')).toContain('CFO')
    expect(CULTIVATION_COPY.journalTitle).toContain('Journal')
    expect(CULTIVATION_COPY.feedbackPositive).toContain('👍')
    expect(CULTIVATION_COPY.mineTitle).toContain('Mine')
    expect(CULTIVATION_COPY.mineSuggestionFor('CFO')).toContain('CFO')
    expect(CULTIVATION_COPY.adoptedTitle).toBe('Adopted methods')
    expect(CULTIVATION_COPY.adoptedShowAll(3)).toContain('3')
    expect(CULTIVATION_COPY.boardHow).toBe('How to cultivate')
    expect(CULTIVATION_COPY.boardCmdCheck).toContain('/cultivation check')
    expect(CULTIVATION_COPY.chatTitle).toBe('Cultivation conversation')
    expect(CULTIVATION_COPY.chatSend).toBe('Send')
  })
})

/** 培养文案表：按视图语言切换；zh 是缺省，en 不混中文。 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  CULTIVATION_COPY,
  cultivationClauseSeparator,
  formatCultivationReadReason,
  renderThrown,
  setCultivationLanguage,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'
import { assertEnglishUiClean } from '../../support/i18n-assertions.ts'

afterEach(() => { setCultivationLanguage('zh') })

describe('CULTIVATION_COPY 语言代理', () => {
  it('zh 缺省：采纳 / 处理中 / 从句分隔符', () => {
    setCultivationLanguage('zh')
    expect(CULTIVATION_COPY.adopt).toBe('采纳')
    expect(CULTIVATION_COPY.running).toBe('处理中…')
    expect(cultivationClauseSeparator()).toBe('；')
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
    expect(CULTIVATION_COPY.composeAria).toContain('proposal')
    expect(CULTIVATION_COPY.composeTurn(2)).toContain('2')
    expect(cultivationClauseSeparator()).toBe('; ')
    expect(CULTIVATION_COPY.contextCatalogMissing).toContain('deliverables catalog')
    expect(CULTIVATION_COPY.contextCatalogBadShape).toContain('invalid shape')
    expect(CULTIVATION_COPY.contextCatalogReadFailed('boom')).toContain('boom')
    expect(CULTIVATION_COPY.contextCatalogSkipped(2)).toContain('2')
    expect(CULTIVATION_COPY.contextSessionsCapped(3, 8)).toContain('3')
    expect(CULTIVATION_COPY.contextDeliverablesCapped(5, 8)).toContain('5')
    assertEnglishUiClean(CULTIVATION_COPY.contextSessionsCapped(3, 8), 'contextSessionsCapped en')
    assertEnglishUiClean(CULTIVATION_COPY.contextDeliverablesCapped(5, 8), 'contextDeliverablesCapped en')
    expect(CULTIVATION_COPY.contextOpenSessionMissing).toContain('no longer be opened')
    expect(CULTIVATION_COPY.contextOpenFileMissing).toContain('missing')
    expect(CULTIVATION_COPY.contextOpenFileFailed('EIO')).toContain('EIO')
    expect(formatCultivationReadReason('dir-denied')).toBe(CULTIVATION_COPY.inboxUnreadDirDenied)
    expect(formatCultivationReadReason('read-denied: kb/a.md')).toContain('kb/a.md')
    expect(formatCultivationReadReason('raw-err')).toBe('raw-err')
    const poisoned = { toString() { throw new Error('bad') } }
    expect(renderThrown(poisoned)).toBe(CULTIVATION_COPY.unreadableThrown)
  })
})

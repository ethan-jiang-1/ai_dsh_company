// 负例留证 2026-11-24：把字典拆回去/删掉 sweep ⇒ 本 spec 的条目可执行与覆盖率用例红。BUG-340
// 负例留证 2026-11-27：cultivation-copy journalNote 恢复裸 Markdown `**` 星号 ⇒ BUG-391 用例红；清除后绿。BUG-391
/** 培养文案表：按视图语言切换；zh 是缺省，en 不混中文。 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  CULTIVATION_COPY,
  cultivationClauseSeparator,
  formatCultivationReadReason,
  renderThrown,
  setCultivationLanguage,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'
import { cultivationTimeLabel } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'
import { decidedTime } from '../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx'
import { timeParts } from '../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts'
import { assertEnglishUiClean } from '../../support/i18n-assertions.ts'
import {
  cultivationListSeparator as listSepFromCopy,
  cultivationTimeLabel as timeLabelFromCopy,
  CULTIVATION_COPY_ZH_FOR_TEST,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-copy.ts'

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

  it('zh/en 培养文案纯文本字段不残留裸 Markdown ** 星号（BUG-391）', () => {
    setCultivationLanguage('zh')
    expect(CULTIVATION_COPY.journalNote).not.toContain('**')
    setCultivationLanguage('en')
    expect(CULTIVATION_COPY.journalNote).not.toContain('**')
  })
})

// 负例留证 2026-11-23：让 decidedTime 直连 cultivationTimeLabel(timeParts(...)) ⇒ 本用例红（NaN-NaN-NaN）。BUG-335
describe('非法 decidedAt 的时间渲染（BUG-335）', () => {
  it('非法 ISO 回退原串；timeParts 的 invalid 片段给语言化「未知时间」', () => {
    expect(decidedTime('invalid-date-xyz', Date.now())).toBe('invalid-date-xyz')
    expect(cultivationTimeLabel(timeParts(Number.NaN, Date.now()))).not.toContain('NaN')
    setCultivationLanguage('en')
    expect(cultivationTimeLabel(timeParts(Number.NaN, Date.now()))).toBe('unknown time')
  })
})

// 覆盖 cultivation-copy 独立文件的六档时间与两种分隔符（BUG-340 拆文件后的下限）。
describe('cultivation-copy 独立字典面（BUG-340）', () => {
  it('六档时间片段 + 两种分隔符随语言', () => {
    setCultivationLanguage('zh')
    expect(listSepFromCopy()).toBe('、')
    expect(timeLabelFromCopy({ kind: 'just-now' })).toBe(CULTIVATION_COPY.timeJustNow)
    expect(timeLabelFromCopy({ kind: 'minutes', n: 5 })).toContain('5')
    expect(timeLabelFromCopy({ kind: 'hours', n: 2 })).toContain('2')
    expect(timeLabelFromCopy({ kind: 'yesterday', hhmm: '08:00' })).toContain('08:00')
    expect(timeLabelFromCopy({ kind: 'date', text: '11-23 08:00' })).toContain('11-23')
    expect(timeLabelFromCopy({ kind: 'invalid' })).toBe(CULTIVATION_COPY.timeInvalid)
    setCultivationLanguage('en')
    expect(listSepFromCopy()).toBe(', ')
    expect(timeLabelFromCopy({ kind: 'minutes', n: 5 })).toContain('5')
    assertEnglishUiClean(timeLabelFromCopy({ kind: 'yesterday', hhmm: '08:00' }), 'time yesterday en')
    setCultivationLanguage('zh')
  })
})

// 字典条目全部可执行：函数项用占位参数调一次，保证没有死文案/抛错分支（也是文件覆盖率下限的来源）。
describe('cultivation-copy 条目可执行（BUG-340）', () => {
  it('每个函数项都能被调用并返回非空字符串', () => {
    for (const [key, value] of Object.entries(CULTIVATION_COPY_ZH_FOR_TEST)) {
      if (typeof value !== 'function') continue
      let result: unknown
      try {
        result = (value as (...args: unknown[]) => unknown)(...Array.from({ length: Math.max(0, value.length) }, () => '占位'))
      } catch (error) {
        throw new Error(`copy.${key} 调用抛错：${String(error)}`)
      }
      expect(typeof result, `copy.${key}`).toBe('string')
      expect((result as string).length, `copy.${key}`).toBeGreaterThan(0)
    }
  })
})

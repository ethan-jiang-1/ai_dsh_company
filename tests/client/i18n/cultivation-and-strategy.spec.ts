// @vitest-environment happy-dom
/** 策略与培养两个复杂度最高面板的 en 双语 + 全态渲染断言（填充 / 坏形状 / 截断 / ISO 时间格式化）。 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { StrategyPanel } from '../../../packages/company-pack/src/client/startup/StrategyPanel.tsx'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import { CultivationTab } from '../../../packages/company-pack/src/client/tabs/CultivationTab.tsx'
import { en } from '../../../packages/company-pack/src/client/locales.ts'
import { assertEnglishUiClean, translateWith } from '../../support/i18n-assertions.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tEn = translateWith(en)

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

describe('StrategyPanel i18n（填充态 / 错误态 / 边界态）', () => {
  it('en：已选值、wiki outside 检查与损坏/不可读提示不漏中文与裸 ISO 时间戳', async () => {
    const store = createStartupStore({
      loaded: true,
      settings: { v: 1, updatedAt: null, productType: 'SaaS', deliveryMode: null, wiki: '/tmp/outside-wiki' },
      optionsProblem: 'unreadable',
      settingsProblem: 'corrupt',
      settingsField: 'productType',
      options: {
        productTypes: ['SaaS'],
        deliveryModes: ['Pragmatic'],
        wikiTemplate: '/ws/content/wiki-template',
        wikiCheck: {
          ok: false,
          value: '/tmp/outside-wiki',
          problem: 'no-index',
          location: 'outside',
          checkedAt: '2026-11-23T08:15:30.000Z',
        },
      },
    })
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(StrategyPanel, {
        sessionId: 's1',
        store,
        load: async () => {},
        save: async () => ({ ok: true as const }),
        reset: async () => ({ ok: true as const }),
        useTabInfo: () => ({ tab: { id: 'tab-s', contentId: 'dsh-company-pack/strategy' } }),
        floatTab: () => {},
        unfloatTab: () => {},
        t: tEn,
      } as never))
    })
    expect(host.textContent).toContain('Project strategy')
    expect(host.textContent).toContain('The directory has no index.md')
    expect(host.textContent).toContain('The options file is unreadable')
    assertEnglishUiClean(host.textContent ?? '', 'StrategyPanel populated+error en')
  })
})

describe('CultivationTab i18n（en 填充态 / 边界态 / 错态）', () => {
  it('en：journal、open+adopted 记录（含 session source / 验后历史）、feedback note、context picker 不漏中文', async () => {
    const openMd = [
      '---',
      'schema: 2',
      'kind: correction',
      'targetRole: ceo',
      'proposerRole: vp-eng',
      'proposerKind: agent',
      'work: Audit handoff',
      'expectation: Check all boundaries',
      'status: open',
      'source: （会话内提交）',
      '---',
      'Body details in plain English.',
    ].join('\n')
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(CultivationTab, {
        sessionId: 's1',
        t: tEn,
        useTabInfo: () => ({ tab: { id: 'tab-c', contentId: 'dsh-company-pack/cultivation' } }),
        floatTab: () => {},
        unfloatTab: () => {},
        useSessions: (selector: (state: { byId: Record<string, unknown> }) => unknown) =>
          selector({ byId: { s1: { origin: undefined, cwd: '/ws/company' } } }),
        roleSource: {
          subscribe: () => () => {},
          getSnapshot: () => ({ projectionsBySession: { s1: { values: { agentPreset: 'ceo' } } } }),
        },
        cultivationActions: () => ({ run: async () => ({ ok: true, text: 'ok' }) }),
        cultivationFiles: {
          listJournal: async () => ['j1.md'],
          readHead: async () => '# Journal item one\nDetails',
          readJournalMore: async () => null,
          listRecords: async () => ({ ok: true as const, names: ['20261123-080000-r1.md', 'bad.md'] }),
          readRecordHead: async (_s: string, path: string) => (path.includes('bad') ? null : openMd),
          readRecord: async (_s: string, path: string) =>
            path.includes('bad') ? { ok: false as const, reason: 'read-denied: cultivation/records/bad.md' } : { ok: true as const, eof: true, text: openMd },
        },
      } as never))
    })
    await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
    expect(host.textContent).toContain('Needs me')
    expect(host.textContent).toContain('source: submitted in-session')
    assertEnglishUiClean(host.textContent ?? '', 'CultivationTab populated en')
  })
})

// 负例留证 2026-11-23：把损坏诊断改回 lib 中文串（或删掉 contextProblem 渲染）⇒ 本用例红（en 漏中文/背景静默消失）。BUG-334
describe('CultivationTab 损坏诊断（BUG-334）', () => {
  it('en：损坏 verificationHistory 与 contexts 都给英文告警，零中文', async () => {
    const openCorrupt = [
      '---', 'schema: 2', 'kind: correction', 'targetRole: ceo', 'proposerRole: ceo', 'proposerKind: agent',
      'work: Keep handoffs clean', 'expectation: check the boundary', 'status: open', 'contexts: %ZZ',
      '---', 'Body in English.',
    ].join('\n')
    const adoptedCorrupt = [
      '---', 'schema: 2', 'kind: correction', 'targetRole: ceo', 'proposerRole: ceo', 'proposerKind: agent',
      'work: Keep handoffs clean', 'expectation: check the boundary', 'status: adopted', 'methodSlug: retry-check',
      'verification: pass', 'verificationHistory: %E0%A4%A', 'decidedAt: 2026-11-23T08:00:00.000Z',
      '---', 'Body in English.',
    ].join('\n')
    const contents: Record<string, string> = { 'open.md': openCorrupt, 'adopted.md': adoptedCorrupt }
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(CultivationTab, {
        sessionId: 's1',
        t: tEn,
        useTabInfo: () => ({ tab: { id: 'tab-c', contentId: 'dsh-company-pack/cultivation' } }),
        floatTab: () => {},
        unfloatTab: () => {},
        useSessions: (selector: (state: { byId: Record<string, unknown> }) => unknown) =>
          selector({ byId: { s1: { origin: undefined, cwd: '/ws/company' } } }),
        roleSource: {
          subscribe: () => () => {},
          getSnapshot: () => ({ projectionsBySession: { s1: { values: { agentPreset: 'ceo' } } } }),
        },
        cultivationActions: () => ({ run: async () => ({ ok: true, text: 'ok' }) }),
        cultivationFiles: {
          listJournal: async () => [],
          readHead: async () => null,
          readJournalMore: async () => null,
          listRecords: async () => ({ ok: true as const, names: ['open.md', 'adopted.md'] }),
          readRecordHead: async (_s: string, path: string) => contents[path.split('/').pop() ?? ''] ?? null,
          readRecord: async (_s: string, path: string) => {
            const text = contents[path.split('/').pop() ?? '']
            return text === undefined ? { ok: false as const, reason: 'missing' } : { ok: true as const, eof: true, text }
          },
        },
      } as never))
    })
    await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
    expect(host.textContent).toContain('Verification history is malformed')
    expect(host.textContent).toContain('Background context is malformed')
    assertEnglishUiClean(host.textContent ?? '', 'CultivationTab corrupt records en')
  })
})

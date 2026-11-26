// @vitest-environment happy-dom
/**
 * 待办页签的表达层 keyless 检查（P0 UI 双语）：空态 + 填充态（多源 token）+ 边界态 + 错误态。
 * 只证明字典与静态/happy-dom 渲染各语言都能出干净文案；真页面链路见 composition / E2E。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { AttentionTab } from '../../../packages/company-pack/src/client/tabs/AttentionTab.tsx'
import { en, zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { buildApprovalCopy, buildQuestionCopy, type LivePending } from '../../../packages/company-pack/src/lib/presence/attention.ts'
import { assertEnglishUiClean, translateWith } from '../../support/i18n-assertions.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tZh = translateWith(zh)
const tEn = translateWith(en)

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

function tabProps(t: CompanyT, over: Record<string, unknown> = {}) {
  return {
    sessionId: 's1',
    t,
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/attention' } }),
    follow: async function* () {},
    floatTab: () => {},
    unfloatTab: () => {},
    getPending: () => [],
    openSession: () => {},
    leadOf: () => 's1',
    // 工作区已就绪（cwd 已解析）才算「真的没有」；未就绪是边界，会压住空态（BUG-327/328）。
    useSessions: (selector: (state: { byId: Record<string, unknown> }) => unknown) => selector({ byId: { s1: { id: 's1', cwd: '/ws', updatedAt: 1 } } }),
    ...over,
  } as never
}

function render(t: CompanyT, over: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(createElement(AttentionTab, tabProps(t, over)))
}

async function mountTab(t: CompanyT, over: Record<string, unknown> = {}): Promise<string> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(createElement(AttentionTab, tabProps(t, over))) })
  return host.textContent ?? ''
}

describe('AttentionTab i18n', () => {
  it('zh 空态：标题、等你处理、刚完成', () => {
    const html = render(tZh)
    expect(html).toContain('待办')
    expect(html).toContain('等你处理')
    expect(html).toContain('没有等你的事')
    expect(html).toContain('刚完成')
  })

  it('en 空态：标题、waiting、completed，且不残留中文/全角标点/裸 ISO', () => {
    const html = render(tEn)
    expect(html).toContain('Inbox')
    expect(html).toContain('Waiting for you')
    expect(html).toContain('Nothing is waiting for you')
    expect(html).toContain('Just completed')
    assertEnglishUiClean(html, 'AttentionTab empty en')

    const unresolved = (selector: (state: { byId: Record<string, unknown> }) => unknown) => selector({ byId: {} })
    const boundedHtml = render(tEn, { useSessions: unresolved })
    expect(boundedHtml).toContain('data-attention-empty-bounded')
    expect(boundedHtml).toContain('within the covered boundary')
    assertEnglishUiClean(boundedHtml, 'AttentionTab bounded empty en')
  })

  it('en 填充态与边界态（多问题/缺工具名审批/带理由审批/未解析工作区）：zh/en 均干净', async () => {
    const missingTool = buildApprovalCopy(undefined, undefined)
    const approvalReason = buildApprovalCopy('bash', 'Deploy scripts check')
    const multiQ = buildQuestionCopy(['First question', 'Second question'])
    const missingQ = buildQuestionCopy([])
    const live: LivePending[] = [
      { kind: 'approval', sessionId: 's-missing', what: missingTool.what, whatToken: missingTool.whatToken, since: 1_000 },
      { kind: 'approval', sessionId: 's-bash', what: approvalReason.what, whatToken: approvalReason.whatToken, ...(approvalReason.detail === undefined ? {} : { detail: approvalReason.detail }), since: 2_000 },
      { kind: 'question', sessionId: 's-multi', what: multiQ.what, ...(multiQ.whatToken === undefined ? {} : { whatToken: multiQ.whatToken }), ...(multiQ.detail === undefined ? {} : { detail: multiQ.detail }), since: 3_000 },
      { kind: 'question', sessionId: 's-q0', what: missingQ.what, ...(missingQ.whatToken === undefined ? {} : { whatToken: missingQ.whatToken }), since: 4_000 },
    ]
    const unresolvedSessions = (selector: (state: { byId: Record<string, unknown> }) => unknown) => selector({ byId: {} })
    const textEn = await mountTab(tEn, { getPending: () => live, useSessions: unresolvedSessions })
    expect(textEn).toContain('(tool name missing)')
    expect(textEn).toContain('bash: Deploy scripts check')
    expect(textEn).toContain('First question (2 questions)')
    expect(textEn).toContain('(question missing)')
    expect(textEn).toContain('The workspace is not ready yet')
    assertEnglishUiClean(textEn, 'AttentionTab populated en')

    const textZh = await mountTab(tZh, { getPending: () => live, useSessions: unresolvedSessions })
    expect(textZh).toContain('（工具名缺失）')
    expect(textZh).toContain('bash：Deploy scripts check')
    expect(textZh).toContain('First question（共 2 个问题）')
    expect(textZh).toContain('（问询内容缺失）')
  })
})

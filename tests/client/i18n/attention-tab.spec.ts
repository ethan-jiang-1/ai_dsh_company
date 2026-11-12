/**
 * 待办页签的表达层 keyless 检查（P0 UI 双语）。
 * 只证明字典与静态渲染各语言都能出文案；不证明真页面 observer 链路（client-load-smoke/真会话管）。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AttentionTab } from '../../../packages/company-pack/src/client/tabs/AttentionTab.tsx'
import { en, zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'

const tOf = (dict: Record<CompanyKey, string>): CompanyT =>
  ((key: CompanyKey, params?: Record<string, string | number>) => {
    const template = dict[key]
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
  }) as CompanyT

function render(t: CompanyT): string {
  return renderToStaticMarkup(createElement(AttentionTab, {
    sessionId: 's1',
    t,
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/attention' } }),
    follow: async function* () {},
    floatTab: () => {},
    unfloatTab: () => {},
    getPending: () => [],
    openSession: () => {},
    leadOf: () => 's1',
    useSessions: (selector: (state: { byId: Record<string, unknown> }) => unknown) => selector({ byId: {} }),
  } as never))
}

describe('AttentionTab i18n', () => {
  it('zh 空态：标题、等你处理、刚完成', () => {
    const html = render(tOf(zh))
    expect(html).toContain('待办')
    expect(html).toContain('等你处理')
    expect(html).toContain('没有等你的事')
    expect(html).toContain('刚完成')
  })

  it('en 空态：标题、waiting、completed，且不残留中文', () => {
    const html = render(tOf(en))
    expect(html).toContain('Inbox')
    expect(html).toContain('Waiting for you')
    expect(html).toContain('Nothing is waiting for you')
    expect(html).toContain('Just completed')
    expect(html).not.toMatch(/[\u4e00-\u9fff]/u)
  })
})

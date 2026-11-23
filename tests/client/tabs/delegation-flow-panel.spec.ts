/** DelegationFlowPanel 静态渲染：只读树 → 流程列表；缺数据不伪造终态。 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DelegationFlowPanel } from '../../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx'
import { buildDelegationTree } from '../../../packages/company-pack/src/lib/delegation/delegation-tree.ts'
import { en, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { assertEnglishUiClean } from '../../support/i18n-assertions.ts'

const tree = buildDelegationTree({
  byId: {
    root: { displayTitle: 'CEO', running: true, projectionValues: { agentPreset: 'ceo', subagentCatalog: [
      { id: 'w1', label: 'worker-1', mode: 'subagent' },
      { id: 'w2', label: 'worker-2', mode: 'subagent' },
    ] } },
    w1: { parentId: 'root', origin: 'subagent', running: true, projectionValues: { agentPreset: 'worker', subagentTiming: { lastTurnCompleted: true } } },
    w2: { parentId: 'root', origin: 'subagent', running: false, projectionValues: { agentPreset: 'worker', subagentTiming: { lastTurnCompleted: false } } },
  },
}, 'root')

describe('DelegationFlowPanel', () => {
  it('渲染流程头、节点、preset/mode/depth，并明确终态以 host 图为准', () => {
    const html = renderToStaticMarkup(createElement(DelegationFlowPanel, { tree }))
    expect(html).toContain('委派流程')
    expect(html).toContain('3 个节点')
    expect(html).toContain('最深 1 层')
    expect(html).toContain('终态来自 host 投影')
    expect(html).toContain('worker-1')
    expect(html).toContain('worker-2')
    expect(html).toContain('>worker<')
    expect(html).toContain('>subagent<')
    expect(html).toContain('d1')
    expect(html).toContain('data-company-delegation="flow"')
    expect(html.match(/wk-delegation-flow-branch/g)?.length).toBe(2)
    expect(html).toContain('data-last="true"')
    expect(html).toContain('完成')
    expect(html).toContain('未完成')
    const interrupted = buildDelegationTree({ byId: { root: { displayTitle: 'Lead', projectionValues: { subagentCatalog: [{ id: 'x', mode: 'continuable' }] } }, x: { parentId: 'root', origin: 'subagent', projectionValues: { companyDelegationTerminal: { lastTurnEnd: 'interrupted' } } } } }, 'root')
    const interruptedHtml = renderToStaticMarkup(createElement(DelegationFlowPanel, { tree: interrupted }))
    expect(interruptedHtml).toContain('中断')
  })

  it('根缺席 → 空态，不渲染假流程', () => {
    const html = renderToStaticMarkup(createElement(DelegationFlowPanel, { tree: buildDelegationTree({ byId: {} }, 'root') }))
    expect(html).toContain('当前会话还没有委派记录')
    expect(html).not.toContain('data-company-delegation="flow"')
  })
})

// 负例留证 2026-11-23：把 missing 标签改回硬编码英文 ⇒ 中文用例红（BUG-337）。
describe('DelegationFlowPanel 的缺失标签（BUG-337）', () => {
  const missingTree = buildDelegationTree({
    byId: { root: { displayTitle: 'Lead', projectionValues: { subagentCatalog: [{ id: 'gone', label: 'vp-eng', mode: 'one-shot' }] } } },
  }, 'root')
  const tEn = ((key: keyof typeof en, params?: Record<string, string | number>) => {
    const template = en[key]
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
  }) as CompanyT

  it('zh 渲染「缺失」，en 渲染 missing', () => {
    const zhHtml = renderToStaticMarkup(createElement(DelegationFlowPanel, { tree: missingTree }))
    expect(zhHtml).toContain('缺失')
    const enHtml = renderToStaticMarkup(createElement(DelegationFlowPanel, { tree: missingTree, t: tEn }))
    expect(enHtml).toContain('>missing<')
    assertEnglishUiClean(enHtml)
  })
})

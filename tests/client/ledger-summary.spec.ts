import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LedgerSummary } from '../../packages/company-pack/src/client/LedgerTab.tsx'

/**
 * 台账摘要行的 keyless 层（Human Exits 批 3）。
 *
 * 为什么这层是主门禁：静态渲染能钉住**首屏形态**（长文首帧就带入口、短摘要不加噪声、摘要本体不挂 title），
 * 毫秒级、无浏览器。**「真被裁没裁」只有浏览器量得出来**（`scrollHeight > clientHeight`），
 * 那部分归真浏览器探针 `probes/browser-visual/ledger-summary-probe.mjs`（认证档，不进回归）——
 * 它同时断言两行边界（宽/窄视口 maxLines ≤ 2）与「被裁必有入口」（clipped == buttons）。
 *
 * 红配方（都实测过）：把入口条件改假 ⇒ 「超长 fixture 必须带入口」转红；
 * 短摘要也挂 title ⇒ 「摘要本体不挂 title」转红；`styles.ts` 里恢复
 * `.wk-row-summary:not(.is-long)` 解除裁剪 ⇒ `client-face.spec.ts` 的「不许有免裁切口子」转红。
 */
const LONG_FIXTURE = 'V4 达标，反事实未达标的原因是修复前的占位缺陷；真实缺陷已修复，结论保留对应来源与复核记录。'.repeat(3)
const SHORT_FIXTURE = '方向批做、只批只读窄口径（$50 首月/$200 硬顶），owner 未指派不启动'

describe('台账摘要行（Human Exits 批 3 keyless：长短 fixture 静态渲染）', () => {
  it('超长摘要：首帧就给可聚焦的全文入口，并标记长行', () => {
    expect(LONG_FIXTURE.length, 'fixture 必须超过 120 字首屏提示阈值').toBeGreaterThan(120)
    const html = renderToStaticMarkup(createElement(LedgerSummary, { summary: LONG_FIXTURE }))
    expect(html, '超长摘要没有全文入口 ⇒ 只能 hover，触屏/键盘读不全').toContain('查看完整结论')
    expect(html).toContain('aria-expanded="false"')
    // 按整段标签取，不受属性书写顺序影响（`<span title=… class="wk-row-task">` 也必须被抓住）。
    const summaryTag = /<span[^>]*wk-row-task[^>]*>/.exec(html)?.[0]
    expect(summaryTag, '没找到摘要本体').toBeDefined()
    expect(summaryTag, '摘要本体不挂 title：全文入口不是 hover 专属').not.toContain('title=')
  })

  it('短摘要：不预置入口（真需要时由布局量出的溢出补上）', () => {
    expect(SHORT_FIXTURE.length).toBeLessThanOrEqual(120)
    const html = renderToStaticMarkup(createElement(LedgerSummary, { summary: SHORT_FIXTURE }))
    expect(html, '短摘要不该先亮出一个多余的全文按钮').not.toContain('查看完整结论')
    expect(html, '短摘要同样受两行边界约束（行高稳定），入口按溢出补').toContain('wk-row-task')
  })

  it('首屏提示阈值：120 字不预置入口，121 字起预置', () => {
    const atThreshold = renderToStaticMarkup(createElement(LedgerSummary, { summary: '结'.repeat(120) }))
    const overThreshold = renderToStaticMarkup(createElement(LedgerSummary, { summary: '结'.repeat(121) }))
    expect(atThreshold).not.toContain('查看完整结论')
    expect(overThreshold).toContain('查看完整结论')
  })
})

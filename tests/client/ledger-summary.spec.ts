import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LedgerSummary } from '../../packages/company-pack/src/client/LedgerTab.tsx'

/**
 * 台账摘要行的 keyless 层（Human Exits 批 3）。
 *
 * 为什么这层是主门禁：摘要边界与全文入口是**摘要文本的纯函数**——毫秒级、无浏览器。
 * 宽/窄视口与键盘/触屏的真实交互留给真浏览器探针
 * （`probes/browser-visual/ledger-summary-probe.mjs`，认证档，不进回归）。
 *
 * 红配方（2026-10-11 实测过的两个真缺陷）：clamp 了却没有全文入口 → 本 spec 的
 * 「超长 fixture 必须带全文入口」转红；短摘要也被 clamp 隐藏 → 「短 fixture 不带入口也不裁切」
 * 转红（组件侧对应 `.wk-row-summary:not(.is-long) .wk-row-task` 解除裁切）。
 */
const LONG_FIXTURE = 'V4 达标，反事实未达标的原因是修复前的占位缺陷；真实缺陷已修复，结论保留对应来源与复核记录。'.repeat(3)
const SHORT_FIXTURE = '方向批做、只批只读窄口径（$50 首月/$200 硬顶），owner 未指派不启动'

describe('台账摘要行（Human Exits 批 3 keyless：长短 fixture 静态渲染）', () => {
  it('超长摘要：给可聚焦的全文入口，并标记为长行（进入两行边界）', () => {
    expect(LONG_FIXTURE.length, 'fixture 必须超过 120 字阈值').toBeGreaterThan(120)
    const html = renderToStaticMarkup(createElement(LedgerSummary, { summary: LONG_FIXTURE }))
    expect(html, '超长摘要没有全文入口 ⇒ 只能 hover，触屏/键盘读不全').toContain('查看完整结论')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('is-long')
    expect(html, '有全文入口时摘要本体不再挂 title（不把入口留在 hover）').not.toContain('class="wk-row-task" title=')
  })

  it('短摘要：直接可读，不加多余入口', () => {
    expect(SHORT_FIXTURE.length).toBeLessThanOrEqual(120)
    const html = renderToStaticMarkup(createElement(LedgerSummary, { summary: SHORT_FIXTURE }))
    expect(html).not.toContain('查看完整结论')
    expect(html).not.toContain('is-long')
    expect(html, '短摘要保留 title 兜底').toContain('title=')
  })

  it('阈值边界：120 字仍算短，121 字起才有全文入口', () => {
    const atThreshold = renderToStaticMarkup(createElement(LedgerSummary, { summary: '结'.repeat(120) }))
    const overThreshold = renderToStaticMarkup(createElement(LedgerSummary, { summary: '结'.repeat(121) }))
    expect(atThreshold).not.toContain('查看完整结论')
    expect(overThreshold).toContain('查看完整结论')
  })
})

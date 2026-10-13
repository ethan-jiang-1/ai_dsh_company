/**
 * 角色标记**五角色对照夹具的发射器**（2026-10-13 立）：
 *
 * 视觉认证档 `probes/browser-visual/sidebar-role-mark-probe.mjs` 的末段要一张"一次看全
 * C/F/O/E/S + 16px 座位关系"的对照图。标记必须来自**真组件**（`RoleBadge`，逐 preset 渲染成
 * 静态标记）与**真 CSS**（`styles.ts` 的 CSS 常量原文）——所以走本仓转换链发射，不在探针里手抄。
 *
 * 本测试**默认只断言夹具能渲染**（`pnpm test` 里零副作用）；设了 `SIDEBAR_ROLE_MARK_EMIT=<路径>`
 * 时把 `{ css, html }` 发射到该路径，供认证档注入真 web app（借真主题令牌）截图。
 * 图里的虚线框/标签是**图示层**（`DIAGRAM_CSS`，不随包发布），标记本体用的是发布 CSS。
 */
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ROLE_MARK, ROLE_SHORT, RoleBadge } from '../../packages/company-pack/src/client/RoleBadge.tsx'

/** 五角色（顺序 = 出厂 preset 顺序；表里的角色少一个就会在图里露馅）。 */
export const FIXTURE_ROLES: readonly string[] = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']

const SID = 'session-fixture-role-mark' as Parameters<typeof RoleBadge>[0]['sessionId']

/** 最小快照源：把某个 preset 喂给真组件。 */
const sourceOf = (preset: string) => ({
  getSnapshot: () => ({ projectionsBySession: { [SID]: { values: { agentPreset: preset } } } }),
  subscribe: () => () => {},
})

/** 从 styles.ts 源文里取发布 CSS（唯一真源；不复制到夹具里）。 */
export function shippedCss(): string {
  const source = readFileSync(join(ROOT, 'packages', 'company-pack', 'src', 'client', 'styles.ts'), 'utf8')
  const start = source.indexOf('const CSS = `') + 'const CSS = `'.length
  return source.slice(start, source.indexOf('`', start))
}

/** 图示层 CSS：只画座位虚线框/时钟占位/标签，与发布样式无关。 */
export const DIAGRAM_CSS = `
#role-mark-fixture { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: var(--dsw-font-family); font-size: 12px; }
#role-mark-fixture .fx-strip { display: flex; flex-direction: column; gap: 8px; }
#role-mark-fixture .fx-zoom { zoom: 6; }
#role-mark-fixture .fx-cells { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
#role-mark-fixture .fx-cell { display: flex; align-items: center; gap: 8px; }
#role-mark-fixture .fx-row { display: flex; align-items: center; height: 32px; }
#role-mark-fixture .fx-seat { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 20px; outline: 1px dashed var(--dsw-alias-border-l4); }
#role-mark-fixture .fx-clock { flex: none; width: 16px; height: 16px; border: 1px dashed var(--dsw-alias-border-l4); border-radius: 50%; }
#role-mark-fixture .fx-title { min-width: 0; margin: 0 6px 0 4px; padding-right: 14px; font-size: 14px; line-height: 20px; white-space: nowrap; }
#role-mark-fixture .fx-tag { flex: none; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
#role-mark-fixture .fx-cap { color: var(--dsw-alias-label-secondary); }
`

/** 一行：座位（虚线 16px 框）+ 真标记 + 真标题样例 + 右注（preset/字母/全称）。 */
function rowHtml(role: string, options: { readonly clock?: boolean } = {}): string {
  const badge = renderToStaticMarkup(createElement(RoleBadge, { sessionId: SID, roleSource: sourceOf(role) }))
  const clock = options.clock === true ? '<span class="fx-clock" title="计划任务时钟占位"></span>' : ''
  const tag = options.clock === true
    ? `${role} → ${ROLE_MARK[role] ?? '?'} · 同格时钟在场（12px 标记 + 16px 时钟跨度）`
    : `${role} → ${ROLE_MARK[role] ?? '?'} · ${ROLE_SHORT[role] ?? '?'}`
  const shared = options.clock === true ? ' data-fx-shared="true"' : ''
  return `  <div class="fx-row"${shared}><span class="fx-seat">${badge}${clock}</span><span class="fx-title">AI 赋能县域农业智能体平台</span><span class="fx-tag">${tag}</span></div>`
}

/** 放大条的一格：只放座位格 + 标记 + 短注（放整行会把标题/标签挤到一起，实测挤歪）。 */
function zoomCellHtml(role: string): string {
  const badge = renderToStaticMarkup(createElement(RoleBadge, { sessionId: SID, roleSource: sourceOf(role) }))
  return `    <div class="fx-cell"><span class="fx-seat">${badge}</span><span class="fx-tag">${role} → ${ROLE_MARK[role] ?? '?'}（${ROLE_SHORT[role] ?? '?'}）</span></div>`
}

/** 整块夹具：1× 看真实行内观感，6× 只看座位格与标记的比例。 */
export function fixtureHtml(): string {
  const rows = FIXTURE_ROLES.map(role => rowHtml(role)).join('\n')
  const shared = rowHtml('ceo', { clock: true })
  const cells = FIXTURE_ROLES.map(role => zoomCellHtml(role)).join('\n')
  return `<section id="role-mark-fixture">
  <div class="fx-strip" data-strip="1x">
    <div class="fx-cap">真尺寸（1×）：虚线框 = 官方 16px 座位，实心方块 = 角色标记</div>
${rows}
${shared}
  </div>
  <div class="fx-strip" data-strip="6x">
    <div class="fx-cap">放大 6×：虚线框 = 16px 座位，方块 = 12px 标记</div>
    <div class="fx-cells fx-zoom">
${cells}
    </div>
  </div>
</section>`
}

describe('角色标记对照夹具', () => {
  it('五角色各渲染一个 12px 标记（+ 同格时钟一行），并可按 SIDEBAR_ROLE_MARK_EMIT 发射', () => {
    const html = fixtureHtml()
    for (const role of FIXTURE_ROLES) {
      expect(html, `${role} 的标记没渲出来`).toContain(`data-wk-role="${role}"`)
    }
    // 1× 条 = 五角色 + 一行同格时钟；6× 条 = 五角色 ⇒ 11 个标记
    expect(html.match(/wk-role-badge/g)).toHaveLength(FIXTURE_ROLES.length * 2 + 1)
    expect(html).toContain('fx-clock')
    const css = shippedCss()
    expect(css).toContain('.wk-role-badge')
    expect(css).toContain('width: 12px')

    const emit = process.env.SIDEBAR_ROLE_MARK_EMIT
    if (emit !== undefined && emit !== '') {
      writeFileSync(emit, JSON.stringify({ css, diagramCss: DIAGRAM_CSS, html, roles: FIXTURE_ROLES }, null, 2), 'utf8')
    }
  })
})

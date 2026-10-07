/**
 * DAG 视觉夹具的**发射器**（2026-09-26 立）：
 *
 * 视觉认证档 `probes/browser-visual/dag-visual-probe.mjs` 需要"真组件渲染出的 SVG + 真 CSS"这两样，
 * 而它们只能在本仓的转换链里拿到（组件 import vendor 的 `*.module.css`，plain node 解不了）。
 * 所以：本测试**默认只断言夹具能渲染**（`pnpm test` 里零副作用）；设了 `DAG_VISUAL_EMIT=<路径>`
 * 时把 `{svg, css}` 发射到该路径，供认证档注入真 web app 截图。
 *
 * 夹具数据刻意覆盖三态 + 两个边角：悬空 blocker（新口径按未完成计）、多前置（等 2 项）。
 */
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DagPanel } from '../../packages/company-pack/src/client/company-panels.tsx'
import { layoutDag } from '../../packages/company-pack/src/lib/dag.ts'
import type { TaskRow } from '../../packages/company-pack/src/lib/board.ts'

const task = (id: string, blockedBy: readonly string[] = [], status: TaskRow['status'] = 'pending', ownerName = 'vp-eng'): TaskRow =>
  ({ id, subject: `T${id} 任务标题示例`, status, blockedBy, ownerName, ready: false, revision: 1 })

/** 三态同屏夹具（视觉判据的输入；改这里 = 改视觉档的取材）。 */
export const FIXTURE_TASKS: readonly TaskRow[] = [
  task('1', [], 'completed', 'vp-sales'),
  task('2', [], 'completed', 'cfo'),
  task('3', ['1'], 'in_progress', 'vp-eng'),
  task('4', ['1', '2'], 'pending', 'coo'),
  task('5', ['3'], 'pending', 'vp-sales'),
  task('6', ['3', '4'], 'pending', 'cfo'),
  task('7', ['ghost'], 'pending', 'coo'),
]

describe('DAG 视觉夹具', () => {
  it('渲染出三态同屏（7 节点 / 6 边），并可按 DAG_VISUAL_EMIT 发射', () => {
    const layout = layoutDag(FIXTURE_TASKS)
    const svg = renderToString(createElement(DagPanel, { layout }))
    expect(layout.nodes).toHaveLength(7)
    expect(layout.edges).toHaveLength(6)
    expect(svg).toContain('wk-node')
    expect(svg).toContain('wk-arrow-tip-done')

    const stylesSource = readFileSync(join(ROOT, 'packages', 'company-pack', 'src', 'client', 'styles.ts'), 'utf8')
    const start = stylesSource.indexOf('const CSS = `') + 'const CSS = `'.length
    const css = stylesSource.slice(start, stylesSource.indexOf('`', start))
    expect(css.length).toBeGreaterThan(1000)

    const emit = process.env.DAG_VISUAL_EMIT
    if (emit !== undefined && emit !== '') {
      writeFileSync(emit, JSON.stringify({ svg, css, tasks: FIXTURE_TASKS.length, edges: layout.edges.length }), 'utf8')
    }
  })
})

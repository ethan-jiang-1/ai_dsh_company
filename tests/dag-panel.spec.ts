/**
 * DagPanel 渲染结构 keyless 回归（2026-09-25 实验现场红证立的钉）：
 * CSS 动画的 transform 会覆盖 SVG <g> 的 transform 定位属性 ⇒ 定位与动画必须**分层**——
 * 外层 g 只带 translate(x,y)，内层 g 才带 wk-node（动画）。合并一层 = 动画结束态把定位吃掉，
 * 所有节点堆到 (0,0)（依赖图"只剩左上角一个"的事故形态）。client-load 看不见这类错
 * （不开会话不渲染面板），静态渲染是这层唯一 keyless 防线。
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DagPanel } from '../packages/company-pack/src/client/company-panels.tsx'
import { layoutDag } from '../packages/company-pack/src/lib/dag.ts'
import type { TaskRow } from '../packages/company-pack/src/lib/board.ts'

const task = (id: string, blockedBy: readonly string[] = []): TaskRow =>
  ({ id, subject: `任务 ${id}`, status: 'pending', blockedBy, ownerName: 'vp-eng', ready: blockedBy.length === 0, revision: 1 })

describe('DagPanel 渲染结构（定位/动画分层）', () => {
  const tasks = [task('a'), task('b'), task('c', ['a']), task('d', ['b'])]
  const layout = layoutDag(tasks)
  const html = renderToString(createElement(DagPanel, { layout }))

  it('节点全渲染（含 owner 与状态徽章）', () => {
    for (const id of ['a', 'b', 'c', 'd']) expect(html).toContain(`任务 ${id}`)
    expect(html).toContain('wk-dag-owner')
  })

  it('定位层数 = 节点数：外层 g 带 translate 且不带 wk-node', () => {
    const positioned = (html.match(/transform="translate\(/g) ?? []).length
    expect(positioned).toBe(4)
    // 事故形态回归钉：wk-node 与 transform 出现在同一个 g 上 = 动画会吃定位。
    expect(html).not.toMatch(/class="wk-node"[^>]*transform=|transform="[^"]*"[^>]*class="wk-node"/)
  })

  it('动画层数 = 节点数：wk-node 在内层独立 g 上', () => {
    expect((html.match(/class="wk-node"/g) ?? []).length).toBe(4)
  })

  it('边带箭头 marker', () => {
    expect(html).toContain('marker-end')
    expect(html).toContain('wk-arrow')
  })
})

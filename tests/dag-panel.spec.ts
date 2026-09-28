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

const task = (id: string, blockedBy: readonly string[] = [], status: TaskRow['status'] = 'pending'): TaskRow =>
  ({ id, subject: `任务 ${id}`, status, blockedBy, ownerName: 'vp-eng', ready: blockedBy.length === 0, revision: 1 })

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

describe('DagPanel 画布自适应栏宽（2026-09-28 试用反馈：右缘裁切）', () => {
  /* 事故形态：布局按内容算宽（4 根 = 832px），右栏常只有 ~731px，SVG 定宽 ⇒ 最右节点被
     拦腰切掉（overflow-x:auto 无常驻滚动条，看不出右边还有）。钉两件事：svg 带自适应类；
     min-width 下限 = 0.75 × 布局宽（再缩字不可读，回退横向滚动）。 */
  it('svg 带 wk-dag-svg 类与 min-width 下限（0.75 × 布局宽）', () => {
    const html = renderToString(createElement(DagPanel, {
      layout: layoutDag([task('a'), task('b'), task('c'), task('d')]),
    })) // 4 根并行一层 = 832px（现场 731px 栏里会裁切的形状）
    expect(html).toContain('wk-dag-svg')
    expect(html).toMatch(/min-width:\s*624px/)
  })

  it('下限随布局宽走：宽图下限更高（1040px 布局 → 780px），窄图不拉伸', () => {
    const wide = renderToString(createElement(DagPanel, {
      layout: layoutDag([task('a'), task('b'), task('c'), task('d'), task('e')]),
    }))
    expect(wide).toMatch(/min-width:\s*780px/)
    const narrow = renderToString(createElement(DagPanel, { layout: layoutDag([task('a')]) }))
    expect(narrow).toMatch(/min-width:\s*156px/)
  })
})

describe('DagPanel 状态徽章与箭头（2026-09-26 code-review 补的钉子）', () => {
  it('四态文案各自在场：可开工 / 进行中 / 已完成 / 等 N 项', () => {
    const layout = layoutDag([
      task('a'),
      task('b', [], 'in_progress'),
      task('c', [], 'completed'),
      task('d', ['a']),
    ])
    const html = renderToString(createElement(DagPanel, { layout }))
    expect(html).toContain('可开工')
    expect(html).toContain('进行中')
    expect(html).toContain('已完成')
    expect(html).toContain('等 1 项')
  })

  it('进行中不得被读成可开工：两态各自只出一种文案', () => {
    const inProgress = renderToString(createElement(DagPanel, { layout: layoutDag([task('a', [], 'in_progress')]) }))
    expect(inProgress).toContain('进行中')
    expect(inProgress).not.toContain('可开工')
    const pending = renderToString(createElement(DagPanel, { layout: layoutDag([task('a')]) }))
    expect(pending).toContain('可开工')
    expect(pending).not.toContain('进行中')
  })

  it('箭头 = 双 marker 显式上色（不依赖 SVG2 context-stroke）', () => {
    const layout = layoutDag([task('a', [], 'completed'), task('b', ['a']), task('c', ['b'])])
    const html = renderToString(createElement(DagPanel, { layout }))
    expect(html).toContain('id="wk-arrow-wait"')
    expect(html).toContain('id="wk-arrow-done"')
    expect(html).toContain('wk-arrow-tip-wait')
    expect(html).toContain('wk-arrow-tip-done')
    expect(html, 'context-stroke 在 Safari 无信号，不支持时箭头会变黑').not.toContain('context-stroke')
    expect(html).toContain('url(#wk-arrow-done)')
    expect(html).toContain('url(#wk-arrow-wait)')
  })
})

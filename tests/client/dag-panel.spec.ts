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
import { DagPanel, fitScale, wrapTitle } from '../../packages/company-pack/src/client/company-panels.tsx'
import { PanelFrame } from '../../packages/company-pack/src/client/company-tabs.tsx'
import { layoutDag } from '../../packages/company-pack/src/lib/dag.ts'
import type { TaskRow } from '../../packages/company-pack/src/lib/board.ts'

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

  it('定位层数：外层 g 带 translate 且不带 wk-node（每节点 3 处 translate：定位 + 内容 + meta）', () => {
    const positioned = (html.match(/transform="translate\(/g) ?? []).length
    expect(positioned).toBe(4 * 3)
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

describe('DagPanel 画布自适应栏宽（2026-09-28 两轮试用反馈：右缘裁切 + Safari 文字堆角）', () => {
  /* 第一轮：定宽 832px 的图在 ~731px 栏里右缘拦腰裁切 ⇒ 要缩放。
     第二轮：CSS 宽度缩放（max-width:100%）在 Safari 里 foreignObject 的 HTML 不跟缩——
     卡和线缩了、文字堆向左上角 ⇒ 改 **transform: scale()**（绘制级，整面一起缩）。 */
  it('fitScale：fit 容器宽优先、0.75 下限、宽容器不放大', () => {
    expect(fitScale(731, 832)).toBeCloseTo(731 / 832, 5) // 现场：832px 图在 731px 栏 → 0.879
    expect(fitScale(500, 832)).toBe(0.75) // 触底：再小字不可读，回退横向滚动
    expect(fitScale(2000, 832)).toBe(1) // 容器更宽也不放大（只缩不放）
    expect(fitScale(0, 832)).toBe(1) // 未测得容器宽（SSR/首帧）：不缩放
  })

  it('svg 用 transform 缩放（Safari 安全）且带量宽 wrapper；不用 CSS 宽度缩放', () => {
    const html = renderToString(createElement(DagPanel, {
      layout: layoutDag([task('a'), task('b'), task('c'), task('d')]),
    })) // 4 根并行一层 = 832px（现场 731px 栏里会裁切的形状）
    expect(html).toContain('wk-dag-fit') // 外层量容器宽的 wrapper（ResizeObserver 挂点）
    expect(html).toMatch(/transform:scale\(/) // 绘制级缩放（SSR 首帧 scale=1，测得后再缩）
    expect(html).not.toMatch(/max-width/) // CSS 宽度缩放已被 Safari 事故证伪
    expect(html).not.toMatch(/min-width/) // 旧下限机制由 fitScale 接管
  })

  it('PanelFrame 的 action 槽渲染页签自备动作（依赖图「重画」的机制面，2026-09-28 用户令）', () => {
    const html = renderToString(createElement(PanelFrame, {
      title: '依赖图',
      tone: 'structure',
      tabProps: {
        useTabInfo: (() => ({ tab: { id: 'stub-tab' } })) as never,
        floatTab: () => {},
        unfloatTab: () => {},
      },
      action: createElement('button', { type: 'button' }, '重画'),
      children: null,
    }))
    expect(html).toContain('重画') // action 槽进页签头（与「浮出」同簇）
    expect(html).toContain('投影更新') // 默认新鲜度文案：推送面板说真话，不再假装 5 秒轮询
    expect(html).not.toContain('每 5 秒')
  })

  it('节点内容禁用 foreignObject（「文字堆左上角」整类问题的根因，2026-09-28 移除防回潮）', () => {
    const html = renderToString(createElement(DagPanel, { layout: layoutDag([task('a'), task('b', ['a'])]) }))
    expect(html).not.toContain('foreignObject')
    expect(html).toContain('wk-dag-node-title') // 文字仍由依赖图标题元素承载（现在是 SVG text）
  })

  it('wrapTitle：短标题单行、长标题两行带省略号、单字超宽不死循环', () => {
    expect(wrapTitle('短标题', 145)).toEqual(['短标题', null])
    const [line1, line2] = wrapTitle('T7 CFO 互审 VP-Sales 稿（报价区间 ↔ 毛利底线与签字线）', 145)
    expect(line2).not.toBeNull() // 长标题折两行
    expect(line1!.length + line2!.length).toBeLessThan(40) // 且有截断
    expect(wrapTitle('长', 1)[0]).toBe('长') // 单字超宽不死循环
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

  it('进行中徽章用独立样式，不与可开工共用 wk-dag-ready', () => {
    const inProgress = renderToString(createElement(DagPanel, { layout: layoutDag([task('a', [], 'in_progress')]) }))
    expect(inProgress).toContain('wk-dag-progress')
    expect(inProgress, '进行中再穿可开工的绿色 = 同一枚徽章两个意思').not.toContain('wk-dag-ready')
    const pending = renderToString(createElement(DagPanel, { layout: layoutDag([task('a')]) }))
    expect(pending).toContain('wk-dag-ready')
    expect(pending).not.toContain('wk-dag-progress')
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

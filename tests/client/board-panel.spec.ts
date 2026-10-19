/**
 * 看板卡片的"声明 vs 板面"警示（2026-10-13 立；keyless 静态渲染）。
 *
 * 为什么单独立一条：`BoardPanel` 此前没有任何渲染面断言，而这次要防的是**看得见的假信号**——
 * 板面 `blockedBy=[]` 时卡片会印"依赖已就绪"，任务文本里却写着"依赖 T1,T2"（真事故：
 * 会话 session-663ff4b6 的 task-3，静默缺边到人工扫盘才发现）。判据 = 分叉 tag 在场、
 * 文案点名缺哪几条边，且**无分叉的卡不许出现这个 tag**（防"人人带警告"的假阳性）。
 * 真几何/真令牌渲染面 = 视觉夹具（`probes/browser-visual/board-drift-probe.mjs`）。
 * 反证：把 `company-panels.tsx` 里的 `card.drift !== null &&` 分支删掉 ⇒ 第一条红。
 */
// 负例留证 2026-10-19：守卫 BUG-027（依赖徽章只在待办卡上）。实地造红→还原→绿：把
//   `company-panels.tsx` 的徽章门槛从 `column.status === 'pending' && card.blockedBy.length > 0`
//   改回无条件的 `card.blockedBy.length > 0` ⇒ 本文件 2 条红（「已完成的卡不出现依赖徽章」与
//   「进行中的卡不出现依赖徽章」）；还原后 5 passed。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BoardPanel } from '../../packages/company-pack/src/client/company-panels.tsx'
import { boardColumns, tasksFromTeamView } from '../../packages/company-pack/src/lib/board.ts'
import type { TeamViewLike } from '../../packages/company-pack/src/lib/presence.ts'

/** 真事故的板面（task-3 声明了依赖 T1,T2，板面 blockedBy 为空）。 */
const INCIDENT: TeamViewLike = {
  members: [{ id: 'session-lead', name: 'lead', role: 'lead', phase: 'running' }],
  tasks: [
    { id: 'task-1', subject: 'T1 · VP-Sales：中美差异外化', status: 'in_progress', ownerName: 'vp-sales' },
    { id: 'task-2', subject: 'T2 · CFO：单位经济可判性', status: 'in_progress', ownerName: 'cfo' },
    {
      id: 'task-3',
      subject: 'T3 · VP-Eng：差异的技术解释',
      description: '依赖 T1,T2（等它们出稿后动笔，可先做不依赖它们的部分）。',
      status: 'in_progress',
      ownerName: 'vp-eng',
    },
    {
      id: 'task-4',
      subject: 'T4 · VP-Eng：技术-事实互审',
      description: '依赖 T1,T2（已落板）。',
      status: 'pending',
      ownerName: 'vp-eng',
      blockedBy: ['task-1', 'task-2'],
    },
  ],
}

const render = (view: TeamViewLike) =>
  renderToStaticMarkup(createElement(BoardPanel, { columns: boardColumns(tasksFromTeamView(view)) }))

describe('BoardPanel：声明 vs 板面分叉的可见警示', () => {
  it('分叉卡带警示 tag，文案点名缺哪几条边；板面的"看着自由"照旧（假信号与拆穿并存）', () => {
    const html = render(INCIDENT)
    expect(html).toContain('声明依赖未落板：T1、T2')
    // task-3 板面 blockedBy 为空 ⇒ 卡上**没有任何等待 tag**（看上去可开工）——这正是当时的假信号；
    // 依赖 tag 的"等 task-1、task-2"只出现在真落了边的 task-4 上。
    expect(html).toContain('等 task-1、task-2')
  })

  it('分叉 tag 只出现在真分叉的卡上（假阳性守卫：有且只有 task-3）', () => {
    const html = render(INCIDENT)
    const cards = html.split('<article').slice(1) // 每张卡一段（列顺序 ≠ 任务号顺序，别按全文字符串切片）
    const drifted = cards.filter(card => card.includes('声明依赖未落板'))
    expect(drifted).toHaveLength(1)
    expect(drifted[0]).toContain('task-3@')
  })
})

describe('BoardPanel：依赖徽章只在待办卡上（BUG-027 判据）', () => {
  /**
   * 为什么钉这条：「依赖已就绪 / 等 …」回答的是"这活现在能不能开工"，只对待办卡有意义。
   * 2026-10-19 真投影实测：147 枚徽章里 **129 枚挂在已完成的卡上**、2 枚挂在进行中的卡上，
   * 全是「等 …」的死信息——读它的人会以为板上还有 131 项活等着开工。
   * 反证：把 `company-panels.tsx` 的门槛从 `column.status === 'pending'` 改回无条件
   * `card.blockedBy.length > 0` ⇒ 第二、三条红。
   */
  const MIXED: TeamViewLike = {
    members: [{ id: 'session-lead', name: 'lead', role: 'lead', phase: 'running' }],
    tasks: [
      { id: 't1', subject: '前置', status: 'completed', ownerName: 'coo' },
      // 已完成的卡、依赖已全完成：官方 ready === false，**不该**有依赖徽章
      { id: 't2', subject: '做完了', status: 'completed', blockedBy: ['t1'], ready: false, ownerName: 'cfo' },
      // 进行中的卡：同样不该有
      { id: 't3', subject: '在跑', status: 'in_progress', blockedBy: ['t1'], ready: false, ownerName: 'vp-eng' },
      // 待办 + 依赖全完成：**该**有「依赖已就绪」
      { id: 't4', subject: '可开工', status: 'pending', blockedBy: ['t1'], ready: true, ownerName: 'vp-sales' },
      // 待办 + 依赖未完成：**该**有「等 …」
      { id: 't5', subject: '还等着', status: 'pending', blockedBy: ['t9'], ready: false, ownerName: 'coo' },
      { id: 't9', subject: '没做完的前置', status: 'in_progress', ownerName: 'coo' },
    ],
  }

  it('已完成的卡不出现依赖徽章', () => {
    const cards = render(MIXED).split('<article').slice(1)
    const done = cards.find(card => card.includes('t2@'))
    expect(done, '找不到 t2 的卡（夹具或渲染变了，复核本断言）').toBeDefined()
    expect(done, '已完成的卡不该挂「等 …」').not.toContain('等 t1')
    expect(done, '已完成的卡不该挂「依赖已就绪」').not.toContain('依赖已就绪')
  })

  it('进行中的卡不出现依赖徽章', () => {
    const cards = render(MIXED).split('<article').slice(1)
    const doing = cards.find(card => card.includes('t3@'))
    expect(doing, '找不到 t3 的卡').toBeDefined()
    expect(doing, '进行中的卡不该挂「等 …」').not.toContain('等 t1')
  })

  it('待办卡的两种真信号都还在（门槛别把合法标签一起吞掉）', () => {
    const cards = render(MIXED).split('<article').slice(1)
    expect(cards.find(card => card.includes('t4@')), '待办 + 依赖已就绪的卡丢了「依赖已就绪」').toContain('依赖已就绪')
    expect(cards.find(card => card.includes('t5@')), '待办 + 依赖未完成的卡丢了「等 …」').toContain('等 t9')
  })
})

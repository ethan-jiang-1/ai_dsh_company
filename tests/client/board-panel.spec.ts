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

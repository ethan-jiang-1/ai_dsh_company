/**
 * 任务板表格的「（阻塞）」标记（keyless 静态渲染）。
 *
 * 为什么单独立一条：`TasksTableView` 直接吃 wire 的 `ready` 字段，而 `ready === false` 对
 * **非 pending** 任务同样成立——官方语义是 `status === 'pending' && taskReady(...)`
 * （`vendor/dsh/packages/experimental/agent-team/src/task-view.ts:56`），即非 pending 恒 false。
 * 2026-10-19 真 wire 实测：298 行里 280 行挂了「（阻塞）」，其中 **273 行是非 pending**
 * （活都干完了还标阻塞）——同 BUG-027 族（徽章门槛不看 status）的第二处实例。
 */
// 负例留证 2026-10-19：守卫 BUG-027（「（阻塞）」只在待办行上）。实地造红→还原→绿：把
//   `TasksPanel.tsx` 的条件从 `task.status === 'pending' && task.ready === false` 改回
//   `task.ready === false` ⇒ 本文件 2 条红（「已完成的行不带阻塞标记」与「进行中的行不带阻塞标记」）；
//   还原后 3 passed。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TasksTableView } from '../../packages/company-pack/src/client/TasksPanel.tsx'
import type { TeamViewLike } from '../../packages/company-pack/src/lib/presence.ts'

/** 真 wire 形状（`TeamTaskView`）：带 ownerName / ready / revision / blockedBy。 */
const VIEW: TeamViewLike = {
  members: [{ id: 'session-lead', name: 'lead', role: 'lead', phase: 'active' }],
  tasks: [
    // 已完成、依赖全完成 ⇒ 官方 ready === false，但**不该**标阻塞（活已经干完了）
    { id: 't1', subject: '前置', status: 'completed', revision: 1, ready: false, ownerName: 'coo', blockedBy: [] },
    { id: 't2', subject: '做完了', status: 'completed', revision: 2, ready: false, ownerName: 'cfo', blockedBy: ['t1'] },
    // 进行中、依赖全完成 ⇒ 同样 ready === false，同样不该标
    { id: 't3', subject: '在跑', status: 'in_progress', revision: 1, ready: false, ownerName: 'vp-eng', blockedBy: ['t1'] },
    // 待办 + 依赖未完成 ⇒ 官方 ready === false，**该**标阻塞（这才是真信号）
    { id: 't4', subject: '真被卡', status: 'pending', revision: 1, ready: false, ownerName: 'vp-sales', blockedBy: ['t9'] },
    // 待办 + 依赖全完成 ⇒ 官方 ready === true，不该标
    { id: 't5', subject: '可开工', status: 'pending', revision: 1, ready: true, ownerName: 'coo', blockedBy: ['t1'] },
    { id: 't9', subject: '没做完的前置', status: 'in_progress', revision: 1, ready: false, ownerName: 'coo', blockedBy: [] },
  ],
}

const render = () => renderToStaticMarkup(createElement(TasksTableView, { view: VIEW }))

/** 取一行（`<tr>`）的 HTML；`id@` 前缀区分行。 */
function row(id: string): string {
  const rows = render().split('<tr').slice(1)
  const found = rows.find(item => item.includes(`>${id}@`))
  expect(found, `找不到 ${id} 的行（夹具或渲染变了，复核本断言）`).toBeDefined()
  return found!
}

describe('TasksTableView：「（阻塞）」只在待办行上（BUG-027 同族判据）', () => {
  it('已完成的行不带阻塞标记', () => {
    expect(row('t2'), '已完成的活不该标「（阻塞）」').not.toContain('（阻塞）')
  })

  it('进行中的行不带阻塞标记', () => {
    expect(row('t3'), '进行中的活不该标「（阻塞）」').not.toContain('（阻塞）')
  })

  it('真被卡的待办行仍标阻塞（门槛别把真信号一起吞掉）', () => {
    expect(row('t4'), '待办 + 依赖未完成的行丢了「（阻塞）」').toContain('（阻塞）')
    expect(row('t5'), '待办 + 依赖已就绪的行不该标「（阻塞）」').not.toContain('（阻塞）')
  })
})

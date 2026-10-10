/** 任务看板读模型（条目 ① S1）：列 / 卡 / 就绪 / 依赖边的 keyless 完成定义。 */
import { describe, expect, it } from 'vitest'
import {
  BOARD_STATUS_ORDER,
  UNASSIGNED_LABEL,
  boardColumns,
  dependencyEdges,
  readyOf,
  tasksFromTeamView,
  toTaskStatus,
} from '../../packages/company-pack/src/lib/board.ts'
import type { TeamViewLike } from '../../packages/company-pack/src/lib/presence.ts'

/** 造一个最小 TeamView（成员表对看板无关，但类型要求在场）。 */
function view(tasks: TeamViewLike['tasks']): TeamViewLike {
  return {
    members: [{ id: 'session-lead', name: 'lead', role: 'lead', status: 'running' }],
    tasks,
  }
}

describe('tasksFromTeamView', () => {
  it('过滤 deleted 墓碑、映射负责人显示名、缺省 revision 记 0', () => {
    const rows = tasksFromTeamView(view([
      { id: 't1', subject: '出两档方案', status: 'in_progress', ownerName: 'vp-eng', revision: 3 },
      { id: 't2', subject: '已删的', status: 'deleted' },
      { id: 't3', subject: '无主的', status: 'pending' },
    ]))
    expect(rows.map(row => row.id)).toEqual(['t1', 't3'])
    expect(rows[0]?.ownerName).toBe('梦之队 VP-Eng')
    expect(rows[0]?.revision).toBe(3)
    expect(rows[1]?.ownerName).toBeNull()
    expect(rows[1]?.revision).toBe(0)
  })

  it('ownerName = lead 时按 CEO 映射（任务归 lead 不显示裸 lead）', () => {
    const rows = tasksFromTeamView(view([{ id: 't1', subject: '收口', status: 'in_progress', ownerName: 'lead' }]))
    expect(rows[0]?.ownerName).toBe('梦之队 CEO')
  })

  it('ready 缺省时按 blockedBy 现算（官方 taskReady 同义）', () => {
    const rows = tasksFromTeamView(view([
      { id: 't1', subject: '前置', status: 'pending' },
      { id: 't2', subject: '被卡', status: 'pending', blockedBy: ['t1'] },
      { id: 't3', subject: '悬空依赖', status: 'pending', blockedBy: ['ghost'] },
    ]))
    expect(rows.find(row => row.id === 't1')?.ready).toBe(true)
    expect(rows.find(row => row.id === 't2')?.ready).toBe(false)
    expect(rows.find(row => row.id === 't3')?.ready).toBe(false)
  })

  it('前置完成后被卡任务转就绪', () => {
    const rows = tasksFromTeamView(view([
      { id: 't1', subject: '前置', status: 'completed' },
      { id: 't2', subject: '被卡', status: 'pending', blockedBy: ['t1'] },
    ]))
    expect(rows.find(row => row.id === 't2')?.ready).toBe(true)
  })

  it('view 自带 ready 时优先采信官方值（不覆盖 host 判定）', () => {
    const rows = tasksFromTeamView(view([
      { id: 't1', subject: '前置', status: 'pending' },
      { id: 't2', subject: '被卡', status: 'pending', blockedBy: ['t1'], ready: true },
    ]))
    expect(rows.find(row => row.id === 't2')?.ready).toBe(true)
  })
})

describe('readyOf', () => {
  it('空依赖 = 就绪；悬空 id = 未就绪', () => {
    const statuses = new Map([['t1', 'completed'] as const])
    expect(readyOf([], statuses)).toBe(true)
    expect(readyOf(['t1'], statuses)).toBe(true)
    expect(readyOf(['ghost'], statuses)).toBe(false)
  })
})

describe('boardColumns', () => {
  it('三列顺序固定、空列保留（看板形状不抖）', () => {
    const columns = boardColumns(tasksFromTeamView(view([
      { id: 't1', subject: '甲', status: 'completed' },
    ])))
    expect(columns.map(column => column.status)).toEqual([...BOARD_STATUS_ORDER])
    expect(columns.map(column => column.label)).toEqual(['待办', '进行中', '完成'])
    expect(columns[0]?.cards).toHaveLength(0)
    expect(columns[1]?.cards).toHaveLength(0)
    expect(columns[2]?.cards).toHaveLength(1)
  })

  it('卡带 owner 文案、修订号、依赖与就绪', () => {
    const columns = boardColumns(tasksFromTeamView(view([
      { id: 't1', subject: '前置', status: 'in_progress', ownerName: 'vp-eng', revision: 2 },
      { id: 't2', subject: '被卡', status: 'pending', blockedBy: ['t1'] },
    ])))
    const doing = columns.find(column => column.status === 'in_progress')
    expect(doing?.cards[0]).toMatchObject({
      id: 't1', subject: '前置', ownerLabel: '梦之队 VP-Eng', revision: 2, ready: true,
    })
    const todo = columns.find(column => column.status === 'pending')
    expect(todo?.cards[0]).toMatchObject({
      id: 't2', ownerLabel: UNASSIGNED_LABEL, blockedBy: ['t1'], ready: false,
    })
  })
})

describe('dependencyEdges', () => {
  it('出 blocker→blocked 边；悬空 id 不出边', () => {
    const edges = dependencyEdges(tasksFromTeamView(view([
      { id: 't1', subject: '甲', status: 'pending' },
      { id: 't2', subject: '乙', status: 'pending', blockedBy: ['t1', 'ghost'] },
    ])))
    expect(edges).toEqual([{ from: 't1', to: 't2' }])
  })
})

describe('toTaskStatus', () => {
  it('已知值原样、未知值落 pending（不显示英文裸值）', () => {
    expect(toTaskStatus('in_progress')).toBe('in_progress')
    expect(toTaskStatus('weird')).toBe('pending')
  })
})

/** 任务看板读模型（条目 ① S1）：列 / 卡 / 就绪 / 依赖边的 keyless 完成定义。 */
// 负例留证 2026-10-19：守卫 BUG-027（`ready` 必须与官方 `projectTaskView` 同义）。
//   实地造红→还原→绿：把 `board.ts` 的 `ready: task.ready ?? (status === 'pending' && readyOf(...))`
//   改回 `ready: task.ready ?? readyOf(...)`（去掉 pending 半句）⇒ 本文件 2 条红
//   （「真 wire 形状：非 pending 任务一律不报 ready」与「ready 字段缺失时回落值也不许比官方宽松」）；
//   还原后 17 passed。配方可逐字复现：sed 那一行 → npx vitest run tests/company/board.spec.ts。
import { describe, expect, it } from 'vitest'
import {
  BOARD_STATUS_ORDER,
  UNASSIGNED_LABEL,
  boardColumns,
  declaredDependencyLabels,
  dependencyDrift,
  dependencyEdges,
  driftLabel,
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

  it('真 wire 形状：非 pending 任务一律不报 ready（官方语义，BUG-027 判据）', () => {
    // 夹具 = 浏览器**真收到**的 wire 视图形状（`TeamTaskView`：带 ownerName、ready、writeScopes），
    // 不是手造的宽松对象。官方 `ready = status === 'pending' && taskReady(...)`（task-view.ts:56）
    // ⇒ 非 pending 恒 false。旧读模型在 `ready` 缺失时回落 `readyOf()`（只查依赖、不看 status），
    // 会把已完成的卡报成"依赖已就绪"——本条就是那个 bug 的机器判据。
    // 反证：把 board.ts 的 `status === 'pending' && readyOf(...)` 改回 `readyOf(...)` ⇒ 本条红。
    const realWireShape = [
      // 已完成的卡，依赖全完成，官方 ready === false（它就是官方给的值，不是缺失）
      { id: 't1', subject: '前置', status: 'completed', revision: 1, ready: false, ownerName: 'vp-eng', writeScopes: [] },
      { id: 't2', subject: '做完了', status: 'completed', revision: 2, blockedBy: ['t1'], ready: false, ownerName: 'coo', writeScopes: [] },
      // 进行中的卡，依赖全完成，官方同样 ready === false
      { id: 't3', subject: '在跑', status: 'in_progress', revision: 1, blockedBy: ['t1'], ready: false, ownerName: 'cfo', writeScopes: [] },
      // 待办的卡，依赖全完成 ⇒ 官方 ready === true（唯一合法为真的形态）
      { id: 't4', subject: '可开工', status: 'pending', revision: 1, blockedBy: ['t1'], ready: true, ownerName: 'vp-sales', writeScopes: [] },
    ]
    const rows = tasksFromTeamView({ members: [], tasks: realWireShape })
    for (const row of rows) {
      if (row.status === 'pending') continue
      expect(row.ready, `${row.id}（${row.status}）不该报 ready`).toBe(false)
    }
    expect(rows.find(row => row.id === 't4')?.ready).toBe(true)
    // owner 也要一个不丢（BUG-026 的判据：真 wire 形状上 ownerName 齐全 ⇒ 全部解析出显示名）
    expect(rows.map(row => row.ownerName)).toEqual(['梦之队 VP-Eng', '梦之队 COO', '梦之队 CFO', '梦之队 VP-Sales'])
  })

  it('真 wire 形状：ready 字段缺失时回落值也不许比官方宽松（非 pending 不报 ready）', () => {
    // 第二条独立判据：即便 wire 没给 `ready`（例如将来投影改版），回落也必须守住 pending 这一半。
    const rows = tasksFromTeamView(view([
      { id: 't1', subject: '前置', status: 'completed' },
      { id: 't2', subject: '已完成的卡', status: 'completed', blockedBy: ['t1'] },
      { id: 't3', subject: '进行中的卡', status: 'in_progress', blockedBy: ['t1'] },
      { id: 't4', subject: '待办可开工', status: 'pending', blockedBy: ['t1'] },
    ]))
    expect(rows.find(row => row.id === 't2')?.ready).toBe(false)
    expect(rows.find(row => row.id === 't3')?.ready).toBe(false)
    expect(rows.find(row => row.id === 't4')?.ready).toBe(true)
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
    // ⚠ `ready: false` 是 2026-10-19 订正后的**正确**值（此前这条断言写的是 `true`，那正是 BUG-027）：
    // 官方 `ready = status === 'pending' && taskReady(...)`，进行中的任务不可能是"可以开工"。
    // 旧值 `true` 来自 `readyOf([])` 对空依赖恒真 + 不看自己的 status。
    expect(doing?.cards[0]).toMatchObject({
      id: 't1', subject: '前置', ownerLabel: '梦之队 VP-Eng', revision: 2, ready: false,
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

describe('dependencyDrift（声明 vs 板面：2026-10-13 真事故的机器判据）', () => {
  /**
   * 夹具 = 真事故原文（会话 session-663ff4b6 / turn1 step9）：T3 的 subject 只写 T3，
   * 依赖写在 description 里（"依赖 T1,T2（等它们出稿后动笔…）"），板面 blockedBy 却是 `[]`
   * —— 看板当时把它报成"依赖已就绪"。反证：删掉 `dependencyDrift` 的调用（boardColumns 里
   * `drift: null`）⇒ 下面「看板卡带分叉」那条红；把 `declaredDependencyLabels` 的
   * 「不依赖」守卫去掉 ⇒ "可先做不依赖它们的部分" 那条红。
   */
  const incident = view([
    { id: 'task-1', subject: 'T1 · VP-Sales：中美 token 工厂差异外化', status: 'in_progress' },
    { id: 'task-2', subject: 'T2 · CFO：单位经济可判性', status: 'in_progress' },
    {
      id: 'task-3',
      subject: 'T3 · VP-Eng：差异的技术解释与技术实现要求',
      description: '依赖 T1,T2（等它们出稿后动笔，可先做不依赖它们的部分）。',
      status: 'in_progress',
    },
  ])

  it('声明了依赖、板面无边 ⇒ 报 missing（真事故形态）', () => {
    const rows = tasksFromTeamView(incident)
    const drifts = dependencyDrift(rows)
    expect(drifts).toHaveLength(1)
    expect(drifts[0]).toMatchObject({ taskId: 'task-3', declared: ['T1', 'T2'], missing: ['T1', 'T2'] })
    expect(driftLabel(drifts[0]!)).toBe('声明依赖未落板：T1、T2')
  })

  it('依赖已落板 ⇒ 不出分叉（T4 自我修复后的形态）', () => {
    const rows = tasksFromTeamView(view([
      { id: 'task-1', subject: 'T1 · 甲', status: 'completed' },
      { id: 'task-2', subject: 'T2 · 乙', status: 'completed' },
      {
        id: 'task-4',
        subject: 'T4 · VP-Eng：技术-事实互审',
        description: '依赖 T1,T2。',
        status: 'pending',
        blockedBy: ['task-1', 'task-2'],
      },
    ]))
    expect(dependencyDrift(rows)).toEqual([])
  })

  it('纸面号没有对应任务 ⇒ 报 unmapped（无法核对也要露出来）', () => {
    const drifts = dependencyDrift(tasksFromTeamView(view([
      { id: 'task-9', subject: 'T9 · 丙', description: '依赖 T7。', status: 'pending' },
    ])))
    expect(drifts[0]).toMatchObject({ taskId: 'task-9', missing: [], unmapped: ['T7'] })
    expect(driftLabel(drifts[0]!)).toBe('声明依赖无法核对：T7')
  })

  it('「不依赖 T1」不算声明（假阳性守卫）', () => {
    expect(declaredDependencyLabels('可先做不依赖它们的部分')).toEqual([])
    expect(declaredDependencyLabels('此项不依赖 T1，直接开工')).toEqual([])
    expect(declaredDependencyLabels('依赖 T1、T2')).toEqual(['T1', 'T2'])
    expect(declaredDependencyLabels('依赖：T1/T2/T3')).toEqual(['T1', 'T2', 'T3'])
  })

  it('看板卡带分叉（面板据此标"假就绪"）', () => {
    const columns = boardColumns(tasksFromTeamView(incident))
    const card = columns.flatMap(column => column.cards).find(item => item.id === 'task-3')
    expect(card?.drift).not.toBeNull()
    expect(card?.blockedBy).toEqual([])
    // ⚠ 2026-10-19 订正：此卡是 `in_progress`，`ready` 必须是 `false`（旧断言写 `true`，那是 BUG-027）。
    // 分叉信号本身不受影响——drift tag 与 ready 是**两个独立信号**：前者说"文本里声明了依赖、板面没落边"，
    // 后者说"这活现在能不能开工"。任务在跑 ⇒ 后者当然 false，与分叉无关。
    expect(card?.ready).toBe(false)
  })
})

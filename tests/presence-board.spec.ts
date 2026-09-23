/** 在场板读模型（R5b，Q5–Q8 定案的 keyless 完成定义——提案验收判据 1/4）。 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PRESET_DISPLAY_NAMES,
  diffActivity,
  presenceFromEvents,
  rowsFromTeamView,
  statusLabelFor,
  type TeamEventLike,
  type TeamViewLike,
} from '../packages/company-pack/src/lib/presence.ts'

/**
 * 只测纯函数（毫秒级）。真浏览器 / 真模型的端到端（槽在场、5s 转「执行中」、行点击进成员
 * 空间）是认证档：`client-load-smoke` / `replay-smoke [--ui]` / 排练场小动议（guides/60 §9.1）。
 */

const LEAD = 'session-lead-0001'
const TEAM = `session-lead-0001`

/** r2-motion 实测事件形状的最小镜像（`snapshots/r2-motion/sessions/lead.jsonl`）。 */
function memberEvent(id: string, name: string, phase: 'provisioning' | 'active', time: number): TeamEventLike {
  return {
    type: 'team/member',
    time,
    data: {
      version: 2,
      teamId: TEAM,
      member: { id, name, description: `${name} 的任务`, provider: 'spawn', context: 'fresh', phase },
    },
  }
}

function taskEvent(
  id: string,
  revision: number,
  subject: string,
  status: 'pending' | 'in_progress' | 'completed',
  ownerId: string | undefined,
  time: number,
): TeamEventLike {
  return {
    type: 'team/task',
    time,
    data: {
      version: 2,
      teamId: TEAM,
      task: { id, revision, subject, description: '任务全文', status, blockedBy: [], writeScopes: [], ...(ownerId === undefined ? {} : { ownerId }) },
    },
  }
}

function messageEvent(senderId: string, senderName: string, targetId: string, text: string, time: number): TeamEventLike {
  return {
    type: 'team/message/queued',
    time,
    data: {
      version: 2,
      teamId: TEAM,
      message: { id: `msg-${time}`, senderId, senderName, targetId, content: [{ type: 'text', text }] },
    },
  }
}

const VP_SALES = 'f753efb5-0000-0000-0000-000000000001'
const VP_ENG = '71a770f0-0000-0000-0000-000000000002'
const COO = '86257b46-0000-0000-0000-000000000003'
const CFO = '171c064b-0000-0000-0000-000000000004'

/** r2 五人动议的骨架事件流：4 分身上线 → 任务建/领/完 → 一条回报消息 → 合稿任务进行中。 */
const R2_LIKE_EVENTS: readonly TeamEventLike[] = [
  memberEvent(VP_SALES, 'vp-sales', 'provisioning', 1_000),
  memberEvent(VP_SALES, 'vp-sales', 'active', 1_050),
  memberEvent(VP_ENG, 'vp-eng', 'provisioning', 1_100),
  memberEvent(VP_ENG, 'vp-eng', 'active', 1_150),
  memberEvent(COO, 'coo', 'provisioning', 1_200),
  memberEvent(COO, 'coo', 'active', 1_250),
  memberEvent(CFO, 'cfo', 'provisioning', 1_300),
  memberEvent(CFO, 'cfo', 'active', 1_350),
  taskEvent('task-1', 1, 'VP-Sales：市场与定价结论（9 家客户 / 可复制交付包）', 'pending', undefined, 2_000),
  taskEvent('task-1', 2, 'VP-Sales：市场与定价结论（9 家客户 / 可复制交付包）', 'in_progress', VP_SALES, 2_100),
  taskEvent('task-1', 3, 'VP-Sales：市场与定价结论（9 家客户 / 可复制交付包）', 'completed', VP_SALES, 2_200),
  taskEvent('task-2', 1, 'VP-Eng：技术可行性结论（可复制交付包）', 'pending', undefined, 2_300),
  taskEvent('task-2', 2, 'VP-Eng：技术可行性结论（可复制交付包）', 'in_progress', VP_ENG, 2_400),
  taskEvent('task-2', 3, 'VP-Eng：技术可行性结论（可复制交付包）', 'completed', VP_ENG, 2_500),
  taskEvent('task-7', 1, 'VP-Eng：合稿引用校对（防数字漂移）', 'pending', undefined, 3_000),
  taskEvent('task-7', 2, 'VP-Eng：合稿引用校对（防数字漂移）', 'in_progress', VP_ENG, 3_100),
  messageEvent(VP_SALES, 'vp-sales', LEAD, '回执 · task-1：结论一句话——有条件做，市场侧放行。', 2_250),
]

describe('presenceFromEvents（回放 / 离线路径，验收判据 4：非空在场板）', () => {
  const board = presenceFromEvents(R2_LIKE_EVENTS)

  it('折出 lead + 4 分身共五行，主键 = team roster（D-a）', () => {
    expect(board.rows).toHaveLength(5)
    expect(board.rows[0]!.role).toBe('lead')
    expect(board.rows[0]!.displayName).toBe('wochen CEO')
    expect(board.rows.slice(1).map(row => row.displayName)).toEqual([
      'wochen VP-Sales', 'wochen VP-Eng', 'wochen COO', 'wochen CFO',
    ])
  })

  it('纯事件（无进程、无 sessionQuery）下成员显示「未上线」而不是行消失（D-b）', () => {
    for (const row of board.rows.slice(1)) {
      expect(row.status).toBe('inactive')
      expect(row.statusLabel).toBe('未上线')
    }
  })

  it('当前任务 = 本人 in_progress 任务的 subject（D-a 第三列）', () => {
    const byName = new Map(board.rows.map(row => [row.name, row]))
    expect(byName.get('vp-eng')!.currentTask).toBe('VP-Eng：合稿引用校对（防数字漂移）')
    expect(byName.get('vp-sales')!.currentTask).toBeNull()
    expect(byName.get('cfo')!.currentTask).toBeNull()
  })

  it('动态流含成员上线 / 任务生命周期 / 消息投递（sender → target + 首行预览）', () => {
    const texts = board.activity.map(entry => entry.text)
    expect(texts.some(text => text.includes('wochen VP-Sales') && text.includes('上线'))).toBe(true)
    expect(texts.some(text => text.includes('新任务 task-1'))).toBe(true)
    expect(texts.some(text => text.includes('认领 task-1'))).toBe(true)
    expect(texts.some(text => text.includes('完成 task-1'))).toBe(true)
    const message = texts.find(text => text.includes('→'))
    expect(message).toContain('wochen VP-Sales → wochen CEO')
    expect(message).toContain('回执 · task-1')
  })
})

describe('rowsFromTeamView（live 路径：remote.agentTeams.view 的快照 → 行）', () => {
  const view = {
    members: [
      { id: LEAD, name: 'lead', role: 'lead', status: 'running', diagnostics: [] },
      { id: VP_ENG, name: 'vp-eng', role: 'teammate', status: 'running', diagnostics: [] },
      { id: COO, name: 'coo', role: 'teammate', status: 'idle', diagnostics: [] },
    ],
    tasks: [
      { id: 'task-2', revision: 2, subject: 'VP-Eng：技术可行性结论', status: 'in_progress', blockedBy: [], ownerName: 'vp-eng', ready: true, writeScopeWarnings: [] },
      { id: 'task-3', revision: 3, subject: 'COO：交付承接结论', status: 'completed', blockedBy: [], ownerName: 'coo', ready: true, writeScopeWarnings: [] },
    ],
  }

  it('lead 行显示 CEO 显示名；状态文案按 D-c 中文映射', () => {
    const rows = rowsFromTeamView(view)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ displayName: 'wochen CEO', statusLabel: '执行中', currentTask: null })
    const eng = rows.find(row => row.name === 'vp-eng')
    expect(eng).toMatchObject({ displayName: 'wochen VP-Eng', statusLabel: '执行中' })
    expect(eng!.currentTask).toBe('VP-Eng：技术可行性结论')
    expect(rows.find(row => row.name === 'coo')).toMatchObject({ statusLabel: '待命', currentTask: null })
  })

  it('按 ownerName 关联当前任务（TeamTaskView 无 ownerId，只有 ownerName）', () => {
    const rows = rowsFromTeamView(view)
    expect(rows.every(row => row.currentTask === null || row.name === 'vp-eng')).toBe(true)
  })
})

describe('缺失 / 未知不崩（验收判据 1 的后半句）', () => {
  it('未知 status 值 → 「未知」，不抛', () => {
    expect(statusLabelFor('warping')).toBe('未知')
    const rows = rowsFromTeamView({ members: [{ id: 'x', name: 'coo', role: 'teammate', status: 'warping', diagnostics: [] }], tasks: [] })
    expect(rows[0]).toMatchObject({ status: 'unknown', statusLabel: '未知' })
  })

  it('未命中 preset 名册的成员名原样显示（任意组队名不崩）', () => {
    const rows = rowsFromTeamView({ members: [{ id: 'x', name: 'contractor-a', role: 'teammate', status: 'idle', diagnostics: [] }], tasks: [] })
    expect(rows[0]!.displayName).toBe('contractor-a')
  })

  it('空事件流 → 空板（不凭空造 lead 行）；空消息内容 → 「（空）」', () => {
    expect(presenceFromEvents([])).toEqual({ teamId: null, rows: [], activity: [] })
    const board = presenceFromEvents([messageEvent(VP_SALES, 'vp-sales', LEAD, '', 9_999)])
    expect(board.activity.at(-1)!.text).toContain('（空）')
  })

  it('未知 ownerId 的任务不抛、不串行', () => {
    const board = presenceFromEvents([
      memberEvent(VP_SALES, 'vp-sales', 'active', 1),
      taskEvent('task-9', 2, '幽灵任务', 'in_progress', 'ghost-session-id', 2),
    ])
    expect(board.rows.map(row => row.currentTask)).toEqual([null, null])
  })
})

describe('diffActivity（live 动态流 = 快照差分）', () => {
  const member = (id: string, name: string, role: 'lead' | 'teammate', status: string) => ({ id, name, role, status })
  const task = (id: string, subject: string, status: string, ownerName?: string) =>
    ({ id, subject, status, ...(ownerName === undefined ? {} : { ownerName }) })

  it('首次同步不产动态（板即状态）', () => {
    expect(diffActivity(undefined, { members: [member('l', 'lead', 'lead', 'running')], tasks: [] }, 1)).toEqual([])
  })

  it('成员出现 → 上线；状态迁移 → 转执行中 / 转待命 / 故障', () => {
    const t0 = { members: [member('s1', 'vp-eng', 'teammate', 'idle')], tasks: [] }
    const t1 = { members: [member('s1', 'vp-eng', 'teammate', 'running'), member('s2', 'coo', 'teammate', 'idle')], tasks: [] }
    const texts = diffActivity(t0, t1, 5).map(entry => entry.text)
    expect(texts).toContain('wochen VP-Eng 转执行中')
    expect(texts).toContain('wochen COO 上线')
    const t2 = { members: [member('s1', 'vp-eng', 'teammate', 'failed')], tasks: [] }
    expect(diffActivity(t1, t2, 9).map(entry => entry.text)).toEqual(['wochen VP-Eng 故障'])
  })

  it('任务：新任务 / 认领 / 完成；仅 revision 变化不产动态', () => {
    const t0: TeamViewLike = { members: [], tasks: [task('task-1', '定价结论', 'pending')] }
    const t1: TeamViewLike = { members: [], tasks: [task('task-1', '定价结论', 'in_progress', 'vp-sales')] }
    const t2: TeamViewLike = { members: [], tasks: [task('task-1', '定价结论（修订）', 'in_progress', 'vp-sales')] }
    const t3: TeamViewLike = { members: [], tasks: [task('task-1', '定价结论（修订）', 'completed', 'vp-sales')] }
    expect(diffActivity(t0, t1, 1).map(entry => entry.text)).toEqual(['wochen VP-Sales 认领 task-1'])
    expect(diffActivity(t1, t2, 2)).toEqual([])
    expect(diffActivity(t2, t3, 3).map(entry => entry.text)).toEqual(['wochen VP-Sales 完成 task-1'])
    const fresh: TeamViewLike = { members: [], tasks: [task('task-2', '承接结论', 'pending')] }
    expect(diffActivity({ members: [], tasks: [] }, fresh, 4).map(entry => entry.text)).toEqual(['新任务 task-2：承接结论'])
  })
})

describe('显示名映射与 preset.yml 同源（防漂移）', () => {
  it('PRESET_DISPLAY_NAMES 与 presets/*/preset.yml 的 name 逐字一致', () => {
    const packRoot = join(import.meta.dirname, '..', 'packages', 'company-pack')
    for (const [id, expected] of Object.entries(PRESET_DISPLAY_NAMES)) {
      const text = readFileSync(join(packRoot, 'presets', id, 'preset.yml'), 'utf8')
      const match = /^name:\s*(.+)$/m.exec(text)
      expect(match, `${id} preset.yml 缺 name`).not.toBeNull()
      expect(match![1]!.trim(), `${id} 的显示名与 PRESET_DISPLAY_NAMES 漂移`).toBe(expected)
    }
  })
})

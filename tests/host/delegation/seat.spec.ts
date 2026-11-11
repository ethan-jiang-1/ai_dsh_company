/** 运行时委派座位矩阵（BUG-076/077/078/079 的共同判据）：角色来自 membership，不被 preset 冒充。 */
// 负例留证 2026-11-11：把 `controlsChildren` 改回 `teamRole !== 'teammate'`（或去掉 childDepth 字段）⇒
// CEO teammate（false 仍对，但字段缺失）与 vp-eng teammate（应 true）用例红；还原 → 10 passed。BUG-079
import { describe, expect, it } from 'vitest'
import {
  TEAM_SURFACE_TOOLS,
  delegationSeatOf,
  teamRoleOf,
} from '../../../packages/company-pack/src/host/delegation/seat.ts'

interface FakeOptions {
  readonly preset?: string
  readonly membership?: { readonly role?: string } | Error
  readonly parentSession?: string
  readonly depth?: number
}

/**
 * 最小 Agent 夹具：agentTeams 返回 membership（Error = 抛），agentPresets 返回 preset。
 * @param options - 座位输入。
 * @returns 可传给 seat 判据的 agent。
 */
function agentOf(options: FakeOptions = {}): { ctx: never; session: { header: Record<string, string | number> } } {
  const teams = options.membership === undefined
    ? undefined
    : {
        tryMembership: () => {
          if (options.membership instanceof Error) throw options.membership
          return options.membership
        },
      }
  const presets = options.preset === undefined ? undefined : { composedPreset: () => options.preset }
  return {
    ctx: {
      get: (name: string) => name === 'agentTeams' ? teams : name === 'agentPresets' ? presets : undefined,
    } as never,
    session: {
      header: {
        ...(options.parentSession === undefined ? {} : { parentSession: options.parentSession }),
        ...(options.depth === undefined ? {} : { delegationDepth: options.depth }),
      },
    },
  }
}

describe('teamRoleOf', () => {
  it('membership 优先：lead / teammate', () => {
    expect(teamRoleOf(agentOf({ membership: { role: 'lead' } }))).toBe('lead')
    expect(teamRoleOf(agentOf({ membership: { role: 'teammate' }, parentSession: 'root' }))).toBe('teammate')
  })

  it('服务缺席/非成员时用 parentSession 兜底：无 parent = lead，有 parent = undefined', () => {
    expect(teamRoleOf(agentOf({}))).toBe('lead')
    expect(teamRoleOf(agentOf({ parentSession: 'root' }))).toBeUndefined()
  })

  it('membership 抛错不炸，落到 parentSession 兜底', () => {
    expect(teamRoleOf(agentOf({ membership: new Error('team journal pending') }))).toBe('lead')
  })
})

describe('delegationSeatOf', () => {
  it('公司角色 root：lead + spawn + collaborate + own children', () => {
    expect(delegationSeatOf(agentOf({ preset: 'ceo', membership: { role: 'lead' } }))).toEqual({
      preset: 'ceo', teamRole: 'lead', support: false, teamLead: true, teamCollaborate: true,
      depth: 0, childDepth: 1, canStartChild: true, controlsChildren: true,
    })
  })

  it('support root：即使 vendor 当 Lead，也不是 team 座位、不管 child', () => {
    expect(delegationSeatOf(agentOf({ preset: 'worker', membership: { role: 'lead' } }))).toEqual({
      preset: 'worker', teamRole: 'lead', support: true, teamLead: false, teamCollaborate: false,
      depth: 0, childDepth: 0, canStartChild: false, controlsChildren: false,
    })
  })

  it('CEO teammate：能协作，但 depth 1 下没有可用 child 通道（BUG-079）', () => {
    expect(delegationSeatOf(agentOf({ preset: 'ceo', membership: { role: 'teammate' }, parentSession: 'root', depth: 1 }))).toEqual({
      preset: 'ceo', teamRole: 'teammate', support: false, teamLead: false, teamCollaborate: true,
      depth: 1, childDepth: 1, canStartChild: false, controlsChildren: false,
    })
  })

  it('vp-eng teammate：depth 1，但 generic child 预算 3，仍有 child 控制（BUG-079）', () => {
    expect(delegationSeatOf(agentOf({ preset: 'vp-eng', membership: { role: 'teammate' }, parentSession: 'root', depth: 1 }))).toEqual({
      preset: 'vp-eng', teamRole: 'teammate', support: false, teamLead: false, teamCollaborate: true,
      depth: 1, childDepth: 3, canStartChild: true, controlsChildren: true,
    })
  })

  it('命名 child：不在团队名册，depth 1 下保留 child 控制面', () => {
    expect(delegationSeatOf(agentOf({ preset: 'vp-eng', parentSession: 'root', depth: 1 }))).toEqual({
      preset: 'vp-eng', teamRole: undefined, support: false, teamLead: false, teamCollaborate: false,
      depth: 1, childDepth: 3, canStartChild: true, controlsChildren: true,
    })
  })

  it('未知 preset：不猜 support，root 仍按 Lead 处理', () => {
    expect(delegationSeatOf(agentOf({ membership: { role: 'lead' } }))).toEqual({
      preset: undefined, teamRole: 'lead', support: false, teamLead: true, teamCollaborate: true,
      depth: 0, childDepth: 0, canStartChild: false, controlsChildren: true,
    })
  })
})

describe('TEAM_SURFACE_TOOLS', () => {
  it('覆盖 vendor 九件套（新增工具时同 diff 补这里）', () => {
    expect([...TEAM_SURFACE_TOOLS].sort()).toEqual([
      'interrupt_agent', 'list_agents', 'send_message', 'spawn_teammate',
      'team_task_create', 'team_task_get', 'team_task_list', 'team_task_update', 'wait_agent',
    ])
  })
})

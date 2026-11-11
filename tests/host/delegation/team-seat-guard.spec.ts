/** support preset 的 team 座位守卫（BUG-072/076）：九件套都在工具面，但调用全部被拒。 */
import { describe, expect, it } from 'vitest'
import {
  registerTeamSeatGuard,
  supportTeamDenial,
} from '../../../packages/company-pack/src/host/delegation/team-seat-guard.ts'
import { TEAM_SURFACE_TOOLS } from '../../../packages/company-pack/src/host/delegation/seat.ts'

type Guard = (exec: { readonly name: string }) => string | undefined

/**
 * 最小 agent/scope 夹具：scope 提供 agentPresets 与 tools.guard；
 * `agent.ctx.inject` 同步跑 callback（与 delegation-contracts spec 同形）。
 * @param preset - 这次 agent 的 preset；undefined = 没有 preset 服务。
 * @returns 已注册到假 tools 的 guard 列表（fire 之后）。
 */
function mount(preset: string | undefined): Guard[] {
  const guards: Guard[] = []
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const presets = preset === undefined ? undefined : { composedPreset: () => preset }
  const scope = {
    get: (name: string) => {
      if (name === 'agentPresets') return presets
      if (name === 'tools') {
        return {
          guard: (guard: Guard) => {
            guards.push(guard)
            return () => {}
          },
        }
      }
      return undefined
    },
    effect: (callback: () => () => void) => { callback() },
  }
  const agent = {
    ctx: {
      get: (name: string) => name === 'agentPresets' ? presets : undefined,
      inject: (_deps: readonly string[], callback: (value: unknown) => void) => { callback(scope) },
    },
  }
  registerTeamSeatGuard({
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
  } as never)
  for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
  return guards
}

describe('supportTeamDenial', () => {
  it('只对非角色 support preset 的 team 工具给理由', () => {
    expect(supportTeamDenial('worker', 'spawn_teammate')).toContain('support capability seat')
    expect(supportTeamDenial('quality-loop-verifier', 'team_task_create')).toContain('quality-loop-verifier')
    expect(supportTeamDenial('worker', 'write')).toBeUndefined()
    expect(supportTeamDenial('ceo', 'spawn_teammate')).toBeUndefined()
    expect(supportTeamDenial(undefined, 'spawn_teammate')).toBeUndefined()
  })
})

describe('registerTeamSeatGuard', () => {
  it('worker root: 一条 guard 拒整套九件套 team 工具', () => {
    const guards = mount('worker')
    expect(guards).toHaveLength(1)
    for (const tool of TEAM_SURFACE_TOOLS) {
      const denial = guards[0]?.({ name: tool })
      expect(denial, tool).toContain(`"${tool}" is not available to this seat`)
      expect(denial, tool).toContain('worker')
    }
    // 非 team 工具不在拒绝范围。
    expect(guards[0]?.({ name: 'write' })).toBeUndefined()
    expect(guards[0]?.({ name: 'bash' })).toBeUndefined()
  })

  it('ceo root: 不装 guard', () => {
    expect(mount('ceo')).toHaveLength(0)
  })

  it('没有 preset 服务: 不猜，不装 guard', () => {
    expect(mount(undefined)).toHaveLength(0)
  })
})

/** Host `companyDelegationTerminal` projection: pure fold/view. */
import { describe, expect, it } from 'vitest'
import { delegationTerminalDefinition, registerDelegationTerminal } from '../../packages/company-pack/src/host/delegation-terminal.ts'

describe('companyDelegationTerminal projection', () => {
  it('folds turn/end reason into view; ignores other events', () => {
    let state = delegationTerminalDefinition.init()
    expect(delegationTerminalDefinition.wire.view(state)).toEqual({})
    state = delegationTerminalDefinition.apply(state, { type: 'turn/start' })
    expect(delegationTerminalDefinition.wire.view(state)).toEqual({})
    state = delegationTerminalDefinition.apply(state, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
    expect(delegationTerminalDefinition.wire.view(state)).toEqual({ lastTurnEnd: 'completed' })
    state = delegationTerminalDefinition.apply(state, { type: 'turn/end', data: { reason: { kind: 'interrupted' } } })
    expect(delegationTerminalDefinition.wire.view(state)).toEqual({ lastTurnEnd: 'interrupted' })
  })

  it('registers the projection through the optional sessionProjections seam', () => {
    let registered: unknown
    const ctx = {
      inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
        callback({ sessionProjections: { register: (definition: unknown) => { registered = definition; return () => {} } } })
        return { dispose: async () => {} }
      },
    }
    registerDelegationTerminal(ctx as never)
    expect((registered as { key?: string }).key).toBe(delegationTerminalDefinition.key)
  })
})

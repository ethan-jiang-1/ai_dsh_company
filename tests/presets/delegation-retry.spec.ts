import { describe, expect, it } from 'vitest'
import { RETRY, retryDecision } from '../../tools/lib/delegation-model.mjs'
import { SUBAGENT_RETRY, subagentRetryDecision } from '../../packages/company-pack/src/lib/retry-policy.ts'

describe('subagent/workflow 重试决策：可见、有界、幂等', () => {
  it('策略自洽：retryable 与 noRetry 不相交；maxAttempts ≥ 2', () => {
    for (const [channel, policy] of Object.entries(RETRY)) {
      for (const terminal of policy.retryable) {
        expect(policy.noRetry, `${channel}: ${terminal} 同时出现在两边`).not.toContain(terminal)
      }
      expect(policy.maxAttempts).toBeGreaterThanOrEqual(2)
      expect(policy.idempotentOnly).toBe(true)
      expect(policy.visibility.length).toBeGreaterThan(0)
    }
  })

  it('subagent error：第一次可重试，第二次 exhausted；refusal/aborted/max-tokens 不自动重试', () => {
    expect(retryDecision('subagent', 'error', 1, true)).toEqual({ retry: true, reason: 'retryable error' })
    expect(retryDecision('subagent', 'error', 2, true)).toEqual({ retry: false, reason: 'exhausted' })
    for (const terminal of ['refusal', 'aborted', 'max-tokens', 'completed']) {
      expect(retryDecision('subagent', terminal, 1, true).retry, terminal).toBe(false)
    }
  })

  it('subagent durable terminal：interrupted/lost 可重试；非幂等一律不重试', () => {
    expect(retryDecision('subagent', 'interrupted', 1, true).retry).toBe(true)
    expect(retryDecision('subagent', 'lost', 1, true).retry).toBe(true)
    expect(retryDecision('subagent', 'error', 1, false)).toEqual({ retry: false, reason: 'non-idempotent' })
  })

  it('workflow：error/null/lost 可重试；completed/refusal/aborted 不重试', () => {
    for (const terminal of ['error', 'null', 'lost']) {
      expect(retryDecision('workflow', terminal, 1, true).retry, terminal).toBe(true)
    }
    for (const terminal of ['completed', 'refusal', 'aborted']) {
      expect(retryDecision('workflow', terminal, 1, true).retry, terminal).toBe(false)
    }
  })

  it('未知通道不重试；可靠替代通道声明正确', () => {
    expect(retryDecision('team', 'error', 1, true)).toEqual({ retry: false, reason: 'unknown channel team' })
    expect(RETRY.subagent.reliableAlternative).toBe('workflow')
    expect(RETRY.workflow.reliableAlternative).toBeNull()
  })

  it('运行时策略与模型同源（防漂移）', () => {
    expect(RETRY.subagent.runtimeTool).toBe('subagent_retry')
    expect(SUBAGENT_RETRY.maxAttempts).toBe(RETRY.subagent.maxAttempts)
    expect([...SUBAGENT_RETRY.retryable].sort()).toEqual([...RETRY.subagent.retryable].sort())
    expect([...SUBAGENT_RETRY.noRetry].sort()).toEqual([...RETRY.subagent.noRetry].sort())
    expect(SUBAGENT_RETRY.idempotentOnly).toBe(RETRY.subagent.idempotentOnly)
    for (const terminal of ['error', 'refusal', 'aborted', 'max-tokens', 'completed', 'interrupted', 'lost']) {
      for (const attempt of [1, 2]) {
        for (const idempotent of [true, false]) {
          expect(subagentRetryDecision(terminal, attempt, idempotent)).toEqual(retryDecision('subagent', terminal, attempt, idempotent))
        }
      }
    }
  })
})

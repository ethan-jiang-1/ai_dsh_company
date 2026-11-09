// 负例留证 2026-11-09：把 SUBAGENT_RETRY_SURFACE.presets.cmo 从 2 改回 3 ⇒ parity 与 depth 两条红
// （`cmo: expected 2 to be 3`）；还原 ⇒ 9 passed。BUG-045
// 负例留证 2026-11-09：把 CONTRACTS['policy.delegation'].status 从 delivered 改回 planned ⇒
// tests/presets/delegation-model.spec.ts 的载体状态用例红；还原 ⇒ 10 passed。BUG-049
import { describe, expect, it } from 'vitest'
import { COMPOSITIONS, PRESET_IDS, RETRY, retryDecision, retrySurface } from '../../tools/lib/delegation-model.mjs'
import {
  SUBAGENT_RETRY,
  SUBAGENT_RETRY_SURFACE,
  subagentRetryDecision,
} from '../../packages/company-pack/src/lib/retry-policy.ts'

describe('subagent_retry 注册面：模型是唯一期望源，pack 运行时表同源（BUG-049/045）', () => {
  it('注册 preset 与逐 preset 深度 = 模型的 retrySurface()（从 depthRows.subagent 派生）', () => {
    const expected = retrySurface()
    expect(SUBAGENT_RETRY_SURFACE.childPreset).toBe(expected.childPreset)
    expect(SUBAGENT_RETRY_SURFACE.presets).toEqual(expected.presets)
    expect(expected.presets).toEqual({ 'vp-eng': 3, 'vp-sales': 2, coo: 2, cfo: 2, cmo: 2 })
  })

  it('深度不另立一份预算：每个注册 preset 的预算 = 该 preset 通用 subagent 行的 maxDepth', () => {
    for (const [preset, depth] of Object.entries(SUBAGENT_RETRY_SURFACE.presets)) {
      expect(COMPOSITIONS[preset].depthRows.subagent, preset).toBe(depth)
    }
    // 注册面 = full role 且有通用 subagent 行；CEO（lead）与 worker family 一律不注册。
    for (const preset of PRESET_IDS) {
      const spec = COMPOSITIONS[preset]
      const registered = spec.archetype === 'full' && typeof spec.depthRows.subagent === 'number'
      if (!registered) expect(SUBAGENT_RETRY_SURFACE.presets, preset).not.toHaveProperty(preset)
    }
  })

  it('子代 preset 是已发布的 worker profile', () => {
    expect(SUBAGENT_RETRY_SURFACE.childPreset).toBe(RETRY.subagent.childPreset)
  })

  it('调用前拒绝词表同源，且不是 subagent 终态（不进 noRetry）', () => {
    expect(SUBAGENT_RETRY.depthDenial).toBe(RETRY.subagent.depthDenial)
    expect(RETRY.subagent.noRetry).not.toContain(RETRY.subagent.depthDenial)
  })
})

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

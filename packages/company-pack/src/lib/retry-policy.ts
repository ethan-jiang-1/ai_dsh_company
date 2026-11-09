/**
 * subagent 重试的运行时策略（pack 内；与 tools/lib/delegation-model.mjs 的 RETRY 是同一套语义）。
 *
 * 为什么 pack 里要有一份：host `subagent_retry` 工具是随包发布的运行时，不能 import 仓内
 * `tools/lib`（发布面不自包含）；`tests/presets/delegation-retry.spec.ts` 会断言两份策略
 * 的 maxAttempts/retryable/noRetry 一致，防止漂移。
 */

export interface RetryPolicy {
  readonly maxAttempts: number
  readonly retryable: readonly string[]
  readonly noRetry: readonly string[]
  readonly idempotentOnly: boolean
}

export const SUBAGENT_RETRY: RetryPolicy = {
  maxAttempts: 2,
  retryable: ['error', 'interrupted', 'lost'],
  noRetry: ['completed', 'aborted', 'refusal', 'max-tokens'],
  idempotentOnly: true,
}

/**
 * 这一次失败该不该重试；只回答“允许”，不启动任何东西。
 * @param terminal - stopReason 或 durable terminal（interrupted/lost）。
 * @param attempt - 已尝试次数（1 = 第一次失败）。
 * @param idempotent - 任务是否幂等；非幂等一律不重试。
 */
export function subagentRetryDecision(terminal: string, attempt: number, idempotent: boolean): { retry: boolean; reason: string } {
  if (!idempotent) return { retry: false, reason: 'non-idempotent' }
  if (attempt >= SUBAGENT_RETRY.maxAttempts) return { retry: false, reason: 'exhausted' }
  if (SUBAGENT_RETRY.retryable.includes(terminal)) return { retry: true, reason: `retryable ${terminal}` }
  return { retry: false, reason: `not retryable ${terminal}` }
}

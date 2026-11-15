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
  /** 调用前拒绝（调用者已在深度预算底部）的 stopReason；不是 subagent 终态，不进 noRetry。 */
  readonly depthDenial: string
}

export const SUBAGENT_RETRY: RetryPolicy = {
  maxAttempts: 2,
  retryable: ['error', 'interrupted', 'lost'],
  noRetry: ['completed', 'aborted', 'refusal', 'max-tokens'],
  idempotentOnly: true,
  depthDenial: 'depth-exceeded',
}

/** `subagent_retry` 的注册面：哪些 preset 有工具、能起多深、子代是谁。 */
export interface SubagentRetrySurface {
  /** 子代 preset（固定 worker；orchestrator/researcher 不走 retry）。 */
  readonly childPreset: string
  /** preset id → 允许的子代**绝对深度**（= 该 preset 通用 `subagent` 行的 maxDepth）。 */
  readonly presets: Readonly<Record<string, number>>
}

/**
 * 运行时注册表（**唯一**注册来源；`src/index.ts` 不再另写 preset 列表）。
 *
 * 为什么 pack 里要有一份深度数字：host 工具随包发布，不能 import 仓内
 * `tools/lib/delegation-model.mjs`；但 BUG-045/049 的教训是“两份声明必然漂移”，所以
 * `tests/presets/delegation-retry.spec.ts` 钉本表 == 模型 `retrySurface()`；模型的 `depthRows`
 * 又由 `delegation-composition.spec.ts` 与各 preset YAML 的通用 `subagent` 行钉住。改任何一个都会红。
 */
export const SUBAGENT_RETRY_SURFACE: SubagentRetrySurface = {
  childPreset: 'worker',
  presets: {
    'vp-eng': 3,
    'vp-sales': 2,
    coo: 2,
    cfo: 2,
    cmo: 2,
  },
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

/**
 * 委派通道的运行时能力表（pack 内；与 `tools/lib/delegation-model.mjs` 的 `COMPOSITIONS` 同源）。
 *
 * 为什么 pack 里要有一份：host 注入面随包发布，不能 import 仓内 `tools/lib`；而“这个 preset
 * 该看见哪些通道”必须在 `agent/created` 时同步决定。`tests/presets/delegation-capabilities.spec.ts`
 * 钉本表 == 模型 `COMPOSITIONS[*].channels` / `workflow` / `retrySurface()` / `depthRows` 最大深度。
 *
 * 不包含 team：team 的权限是**运行时座位**（任何 root 都是 Lead），不是 preset 能声明的能力；
 * 由 host 用 `agentTeams.membership(agent)?.role === 'lead'`（fallback `header.parentSession`）判。
 */

export type DelegationChannel = 'spawn' | 'fork' | 'workflow' | 'retry'

export interface DelegationCapabilities {
  readonly spawn: boolean
  readonly fork: boolean
  readonly workflow: boolean
  readonly retry: boolean
  /** spawn/fork 行允许的最大 delegationDepth；无 child 行进 0。 */
  readonly childDepth: number
}

/** preset id → 该组合声明的通道（不含 team）。 */
export const DELEGATION_CAPABILITIES: Readonly<Record<string, DelegationCapabilities>> = {
  ceo: { spawn: true, fork: false, workflow: false, retry: false, childDepth: 1 },
  'vp-eng': { spawn: true, fork: true, workflow: true, retry: true, childDepth: 3 },
  'vp-sales': { spawn: true, fork: true, workflow: false, retry: true, childDepth: 2 },
  coo: { spawn: true, fork: true, workflow: false, retry: true, childDepth: 2 },
  cfo: { spawn: true, fork: true, workflow: false, retry: true, childDepth: 2 },
  cmo: { spawn: true, fork: true, workflow: false, retry: true, childDepth: 2 },
  worker: { spawn: false, fork: false, workflow: false, retry: false, childDepth: 0 },
  'worker-researcher': { spawn: false, fork: false, workflow: false, retry: false, childDepth: 0 },
  'worker-orchestrator': { spawn: true, fork: false, workflow: false, retry: false, childDepth: 3 },
  'quality-loop-producer': { spawn: false, fork: false, workflow: false, retry: false, childDepth: 0 },
  'quality-loop-verifier': { spawn: false, fork: false, workflow: false, retry: false, childDepth: 0 },
}

/**
 * 取一个 preset 的通道能力；未知 preset 返回 undefined（host 不注入，不猜）。
 * @param preset - `composedPresetOf(agent)` 的结果。
 * @returns 能力表；未知/空返回 undefined。
 */
export function delegationCapabilitiesOf(preset: string | undefined): DelegationCapabilities | undefined {
  return preset === undefined ? undefined : DELEGATION_CAPABILITIES[preset]
}

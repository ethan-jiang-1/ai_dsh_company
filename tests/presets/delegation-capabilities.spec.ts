/**
 * 运行时能力表 ↔ 模型/深度表的 parity（Issue 2 的单源钉子）。
 *
 * 证明什么：pack 的 `DELEGATION_CAPABILITIES` 与 `tools/lib/delegation-model.mjs` 的
 *   `COMPOSITIONS[*].channels/workflow` + `retrySurface()` 逐 preset 一致。
 * 不证明：host 真的按这张表注入；那是 `tests/host/prompt/delegation-contracts.spec.ts` 与真挂载。
 */
import { describe, expect, it } from 'vitest'
import { COMPOSITIONS, PRESET_IDS, retrySurface } from '../../tools/lib/delegation-model.mjs'
import {
  DELEGATION_CAPABILITIES, delegationCapabilitiesOf,
} from '../../packages/company-pack/src/lib/delegation-capabilities.ts'

describe('delegation runtime capabilities parity', () => {
  it('每个 preset 的 spawn/fork/workflow/retry 与模型一致', () => {
    const retry = retrySurface().presets
    for (const id of PRESET_IDS) {
      const spec = COMPOSITIONS[id]
      const observed = DELEGATION_CAPABILITIES[id]
      expect(observed, `${id}: 运行时表缺 preset`).toBeDefined()
      expect(observed?.spawn, `${id}: spawn`).toBe(spec.channels.includes('spawn'))
      expect(observed?.fork, `${id}: fork`).toBe(spec.channels.includes('fork'))
      expect(observed?.workflow, `${id}: workflow`).toBe(spec.workflow)
      expect(observed?.retry, `${id}: retry`).toBe(retry[id] !== undefined)
    }
  })

  it('运行时表没有模型外的 preset；未知 preset 返回 undefined', () => {
    for (const id of Object.keys(DELEGATION_CAPABILITIES)) {
      expect(PRESET_IDS, `运行时表多出 ${id}`).toContain(id)
    }
    expect(delegationCapabilitiesOf(undefined)).toBeUndefined()
    expect(delegationCapabilitiesOf('not-a-preset')).toBeUndefined()
  })
})

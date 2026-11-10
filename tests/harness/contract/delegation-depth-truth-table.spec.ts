/**
 * 委派深度真值表（BUG-070 的合同钉子）：`maxDepth` 是 child 的**绝对 depth 上限**，
 * 不是“还能再往下几层”。钉 vendor `resolveChildDepth` 在当前 pin 上的实际语义：
 * parent depth + 1 > maxDepth 即抛 `SubagentDepthError`；depth 1 的父会话调用 maxDepth 1 的行会抛，
 * 不是“子代落 2 可行”。
 *
 * 红配方（prove-it-red）：把 `1/1` 的期望从 throw 改成 allow（或把 vendor 的
 *   `childDepth > maxDepth` 改成 `>=`）→ 本 spec 红；还原 → 绿。
 *
 * 证明不了什么：不证明模型会按 delegation.md 配行；那是 preset contract / 真装配探针的证据。
 */
import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { resolveChildDepth, SubagentDepthError } from '../../../vendor/dsh/packages/subagent/subagent/src/child-agent.ts'

/** 只造 `resolveChildDepth` 会读的两处：runtime options 与持久 header。 */
function parent(depth: number): Agent {
  return {
    options: { subagentDepth: depth },
    session: { header: { delegationDepth: depth } },
  } as unknown as Agent
}

describe('delegation depth truth table (absolute maxDepth)', () => {
  const rows = [
    [0, 1, 1, 'allow'],
    [1, 1, 2, 'throw'],
    [1, 2, 2, 'allow'],
    [2, 3, 3, 'allow'],
    [2, 2, 3, 'throw'],
  ] as const

  for (const [parentDepth, maxDepth, childDepth, verdict] of rows) {
    it(`parent ${parentDepth} / maxDepth ${maxDepth} → child ${childDepth} ${verdict}`, () => {
      const run = (): number => resolveChildDepth(parent(parentDepth), maxDepth)
      if (verdict === 'allow') expect(run()).toBe(childDepth)
      else expect(run).toThrow(SubagentDepthError)
    })
  }
})

// 状态：常驻
// 合同钉子（BUG-036 修复轮）：workflow/subagent 的结构化输出 schema 只吃子集。
//
// 钉什么：vendor `assertObjectJsonSchema`（@deepseek-ai/dsh-tools）在当前 pin 上的实际语义：
//   enum/const 必须挂在已声明单值 type 的节点上、type 不接受数组、oneOf 不能与 type 并列、
//   根必须是 object。模型面（eng-teaming skill）就是照这四条写的；引擎一旦改（例如上游
//   开始接受 enum-without-type），这里先红，提醒我们删/改 skill 与台账 [CT-IN]，而不是让
//   一句已经过期的规则继续教模型。
//
// 红配方（prove-it-red）：把第一条 fixture 改成上游修复后的形状（`status: { enum: [...] }`
//   被接受）→ 第一条与第二条的期望必须翻转；或临时把 `toThrow` 改成 `not.toThrow` 观察红。
//   还原 → 绿。
//
// 证明不了什么：不证明模型会遵守 skill；那是真模型探针的证据（R6/R15 会话）。
import { describe, expect, it } from 'vitest'
import { assertObjectJsonSchema } from '../../vendor/dsh/packages/core/tools/src/json-schema.ts'

const rooted = (properties: Record<string, unknown>) => ({ type: 'object', properties, additionalProperties: false })

describe('structured-output schema subset (engine contract at this pin)', () => {
  it('rejects enum/const without a sibling single-value type', () => {
    expect(() => assertObjectJsonSchema(rooted({ status: { enum: ['ok', 'missing', 'corrupt'] } })))
      .toThrow(/requires type or oneOf/)
  })

  it('accepts enum beside its declared type, and const beside its type', () => {
    expect(() => assertObjectJsonSchema(rooted({
      status: { type: 'string', enum: ['ok', 'missing', 'corrupt'] },
      kind: { type: 'string', const: 'module' },
    }))).not.toThrow()
  })

  it('rejects type arrays (nullable must be written as oneOf)', () => {
    expect(() => assertObjectJsonSchema(rooted({ version: { type: ['string', 'null'] } })))
      .toThrow(/single type string/)
    expect(() => assertObjectJsonSchema(rooted({
      version: { oneOf: [{ type: 'string' }, { type: 'null' }] },
    }))).not.toThrow()
  })

  it('rejects oneOf beside type and enforces an object root', () => {
    expect(() => assertObjectJsonSchema(rooted({
      v: { type: 'string', oneOf: [{ type: 'string' }, { type: 'null' }] },
    }))).toThrow(/cannot declare both type and oneOf/)
    expect(() => assertObjectJsonSchema({ type: 'array', items: { type: 'string' } }))
      .toThrow(/object-rooted/)
  })
})

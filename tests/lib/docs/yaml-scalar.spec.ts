/**
 * YAML 标量解析（`/req check` 与 bootstrap 的共用口径）。
 *
 * 判据：`productType: "business-software" # 默认` 这类合法 YAML 必须解析为 `business-software`；
 * 引号内的 `#` 不算注释。红配方 = 退回落 `\S+` 正则（引号/注释被算进 id）。
 */
import { describe, expect, it } from 'vitest'
import { yamlScalar, yamlScalarOrProblem } from '../../../packages/company-pack/src/lib/docs/yaml-scalar.ts'

describe('yamlScalar', () => {
  it('去成对引号与行尾注释', () => {
    expect(yamlScalar('"business-software" # 默认')).toBe('business-software')
    expect(yamlScalar("'hardware-software'")).toBe('hardware-software')
    expect(yamlScalar('business-software # 默认')).toBe('business-software')
    expect(yamlScalar('  business-software  ')).toBe('business-software')
    expect(yamlScalar('"a # b"')).toBe('a # b')
  })

  it('空值与模板占位原样返回（占位判定归调用方）', () => {
    expect(yamlScalar('')).toBe('')
    expect(yamlScalar('   ')).toBe('')
    expect(yamlScalar('<类型 id>')).toBe('<类型 id>')
  })
})

// 负例留证 2026-11-24：让 yamlScalarOrProblem 对未闭合/带尾巴引号报 null ⇒ 本组红。BUG-368
describe('yamlScalar 坏引号（BUG-368）', () => {
  it('未闭合 / 带非注释尾巴 → problem，宽松版按未声明返回空串', () => {
    expect(yamlScalarOrProblem("'abc")).toEqual({ value: "'abc", problem: 'unbalanced-quote' })
    expect(yamlScalarOrProblem("'a' trailing")).toEqual({ value: 'a', problem: 'trailing-after-quote' })
    expect(yamlScalarOrProblem('a "unbalanced')).toEqual({ value: 'a "unbalanced', problem: null })
    expect(yamlScalar("'abc")).toBe('')
    expect(yamlScalar("'a' trailing")).toBe('')
  })

  it('闭合后接注释仍合法；转义引号可闭合', () => {
    expect(yamlScalarOrProblem("'a' # note")).toEqual({ value: 'a', problem: null })
    expect(yamlScalarOrProblem('"a \\"quoted\\" b"')).toEqual({ value: 'a \\"quoted\\" b', problem: null })
  })
})

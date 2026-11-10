/**
 * YAML 标量解析（`/req check` 与 bootstrap 的共用口径）。
 *
 * 判据：`productType: "business-software" # 默认` 这类合法 YAML 必须解析为 `business-software`；
 * 引号内的 `#` 不算注释。红配方 = 退回落 `\S+` 正则（引号/注释被算进 id）。
 */
import { describe, expect, it } from 'vitest'
import { yamlScalar } from '../../packages/company-pack/src/lib/yaml-scalar.ts'

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

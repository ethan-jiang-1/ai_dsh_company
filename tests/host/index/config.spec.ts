// Host config 的运行时类型闸（2026-11-11 第二轮）：不导出 Config schema，但两个可调项
// 在 apply 前 fail-loud。证明：非法类型/空值被拒；合法值/缺省通过。不证明路径存在性
// （方法层可能尚未创建，存在性归运行时）。
import { describe, expect, it } from 'vitest'
import { validateHostConfig } from '../../../packages/company-pack/src/host/run-bundle/config.ts'

describe('validateHostConfig', () => {
  it('缺省/合法值通过', () => {
    expect(() => validateHostConfig()).not.toThrow()
    expect(() => validateHostConfig({ cultivationRoot: '/tmp/company/methods' })).not.toThrow()
    expect(() => validateHostConfig({ handbookSkipPresets: ['worker', 'quality-loop-verifier'] })).not.toThrow()
  })

  it('cultivationRoot 空串/非字符串 fail-loud', () => {
    expect(() => validateHostConfig({ cultivationRoot: '' })).toThrow(/cultivationRoot/)
    expect(() => validateHostConfig({ cultivationRoot: '   ' })).toThrow(/cultivationRoot/)
    expect(() => validateHostConfig({ cultivationRoot: 42 as never })).toThrow(/cultivationRoot/)
  })

  it('handbookSkipPresets 非数组/含空值 fail-loud', () => {
    expect(() => validateHostConfig({ handbookSkipPresets: 'worker' as never })).toThrow(/handbookSkipPresets/)
    expect(() => validateHostConfig({ handbookSkipPresets: ['worker', ''] })).toThrow(/handbookSkipPresets/)
    expect(() => validateHostConfig({ handbookSkipPresets: ['worker', 1 as never] })).toThrow(/handbookSkipPresets/)
  })
})

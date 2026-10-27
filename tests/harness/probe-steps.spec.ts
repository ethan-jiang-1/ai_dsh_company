import { describe, expect, it } from 'vitest'
import { parseProbeSteps, stepLabel } from '../../tools/lib/probe-steps.mjs'

describe('probe-steps：--steps 的受控动作集', () => {
  it('解析 clickText / waitText / expectText / typeText 与 timeoutMs', () => {
    const steps = parseProbeSteps(JSON.stringify([
      { clickText: '成品' },
      { waitText: '成品目录', timeoutMs: 3000 },
      { typeText: ['[data-composer-input]', '你好'] },
      { expectText: '你好' },
    ]))
    expect(steps).toHaveLength(4)
    expect(steps[0]).toEqual({ action: 'clickText', value: '成品' })
    expect(steps[1]).toEqual({ action: 'waitText', value: '成品目录', timeoutMs: 3000 })
    expect(steps[2]).toEqual({ action: 'typeText', value: ['[data-composer-input]', '你好'] })
    expect(stepLabel(steps[0])).toBe('clickText 成品')
    expect(stepLabel(steps[2])).toBe('typeText [data-composer-input]')
  })

  it('拒绝非数组、空数组与多动作键', () => {
    expect(() => parseProbeSteps('{}')).toThrow(/顶层必须是数组/)
    expect(() => parseProbeSteps('[]')).toThrow(/至少一步/)
    expect(() => parseProbeSteps(JSON.stringify([{ clickText: 'a', waitText: 'b' }]))).toThrow(/恰好一个动作键/)
  })

  it('拒绝未知动作、空文本、非法 typeText 与 timeoutMs', () => {
    expect(() => parseProbeSteps(JSON.stringify([{ click: 'a' }]))).toThrow(/未知动作/)
    expect(() => parseProbeSteps(JSON.stringify([{ clickText: '  ' }]))).toThrow(/非空字符串/)
    expect(() => parseProbeSteps(JSON.stringify([{ typeText: ['x'] }]))).toThrow(/\[选择器, 文本\]/)
    expect(() => parseProbeSteps(JSON.stringify([{ waitText: 'x', timeoutMs: 0 }]))).toThrow(/正整数/)
  })

  it('坏 JSON 给出可读错误，而不是栈', () => {
    expect(() => parseProbeSteps('{')).toThrow(/JSON 解析失败/)
  })
})

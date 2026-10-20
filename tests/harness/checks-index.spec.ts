import { describe, expect, it } from 'vitest'
import { indexTargetFor, missingIndexedScripts } from '../../tools/lib/checks-index.mjs'

describe('checks-index 纯逻辑', () => {
  it('checks/ 相对、probes/tools 用 ../ 目标', () => {
    expect(indexTargetFor('checks/smoke/a.mjs')).toBe('smoke/a.mjs')
    expect(indexTargetFor('probes/team/b.mjs')).toBe('../probes/team/b.mjs')
    expect(indexTargetFor('tools/c.mjs')).toBe('../tools/c.mjs')
  })

  it('只报告未链接的公开脚本', () => {
    const readme = '[a](smoke/a.mjs) [b](../probes/team/b.mjs)'
    expect(missingIndexedScripts([
      'checks/smoke/a.mjs',
      'probes/team/b.mjs',
      'tools/c.mjs',
    ], readme)).toEqual(['tools/c.mjs'])
  })
})

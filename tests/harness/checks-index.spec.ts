import { describe, expect, it } from 'vitest'
import { indexTargetFor, missingIndexedScripts, renderScriptInventory, scanPublicScripts } from '../../tools/lib/checks-index.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

describe('checks-index 纯逻辑', () => {
  it('checks/ 相对、probes/tools 用 ../ 目标', () => {
    expect(indexTargetFor('checks/smoke/a.mjs')).toBe('smoke/a.mjs')
    expect(indexTargetFor('probes/team/b.mjs')).toBe('../probes/team/b.mjs')
    expect(indexTargetFor('tools/c.mjs')).toBe('../tools/c.mjs')
  })

  it('生成物：按分区/域渲染链接与门禁计数（README 不再手工枚举）', () => {
    const text = renderScriptInventory([
      'checks/smoke/a.mjs',
      'checks/audit/b.mjs',
      'probes/team/c.mjs',
      'tools/d.mjs',
    ], { gateCount: 53 })
    expect(text).toContain('## 冒烟 / 真实入口（checks/smoke/，1）')
    expect(text).toContain('[a](smoke/a.mjs)')
    expect(text).toContain('## 盘面审计（checks/audit/，1）')
    expect(text).toContain('[b](audit/b.mjs)')
    expect(text).toContain('### team（1）')
    expect(text).toContain('[c](../probes/team/c.mjs)')
    expect(text).toContain('[d](../tools/d.mjs)')
    expect(text).toContain('checks/gates/，53')
  })

  it('扫描公开入口：含 smoke/audit/probes/tools 顶层，排除内部实现', () => {
    const scripts = scanPublicScripts(ROOT)
    expect(scripts).toContain('checks/smoke/client-load-smoke.mjs')
    expect(scripts).toContain('probes/browser-visual/cdp-probe.mjs')
    expect(scripts).toContain('tools/checks-index.mjs')
    expect(scripts.some(rel => rel.startsWith('tools/lib/'))).toBe(false)
    expect(scripts.some(rel => rel.startsWith('checks/gates/'))).toBe(false)
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

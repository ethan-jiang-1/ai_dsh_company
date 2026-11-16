import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { TOOL_GROUPS, indexTargetFor, renderScriptInventory, scanPublicScripts, strayToolEntries } from '../../../tools/lib/checks-index.mjs'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

// 临时根：只放一个空目录，用来制造「tools/ 不存在」这一早退分支（盘上真仓永远有 tools/）。
const emptyRoot = mkdtempSync(join(tmpdir(), 'checks-index-'))
afterAll(() => { rmSync(emptyRoot, { recursive: true, force: true }) })

describe('checks-index 纯逻辑', () => {
  it('checks/ 相对、probes/tools 用 ../ 目标', () => {
    expect(indexTargetFor('checks/lanes/a.mjs')).toBe('lanes/a.mjs')
    expect(indexTargetFor('probes/team/b.mjs')).toBe('../probes/team/b.mjs')
    expect(indexTargetFor('tools/repo/c.mjs')).toBe('../tools/repo/c.mjs')
  })

  it('生成物：按分区/域渲染链接与门禁计数（README 不再手工枚举）', () => {
    const text = renderScriptInventory([
      'checks/lanes/a.mjs',
      'checks/audit/b.mjs',
      'probes/team/c.mjs',
      'tools/repo/d.mjs',
    ], { gateCount: 53 })
    expect(text).toContain('## 冒烟 / 真实入口（checks/lanes/，1）')
    expect(text).toContain('[a](lanes/a.mjs)')
    expect(text).toContain('## 盘面审计（checks/audit/，1）')
    expect(text).toContain('[b](audit/b.mjs)')
    expect(text).toContain('### team（1）')
    expect(text).toContain('[c](../probes/team/c.mjs)')
    expect(text).toContain('### repo/（1）')
    expect(text).toContain('[d](../tools/repo/d.mjs)')
    expect(text).toContain('checks/gates/，53')
  })

  it('扫描公开入口：含 smoke/audit/probes/tools 三组，排除内部实现', () => {
    const scripts = scanPublicScripts(ROOT)
    expect(scripts).toContain('checks/lanes/client-load.entry.mjs')
    expect(scripts).toContain('probes/browser-visual/cdp-probe.mjs')
    expect(scripts).toContain('tools/repo/checks-index.mjs')
    expect(scripts.some(rel => rel.startsWith('tools/lib/'))).toBe(false)
    expect(scripts.some(rel => TOOL_GROUPS.some(group => rel.startsWith(`tools/${group}/`)))).toBe(true)
    // 工具面顶层不留散件（判据在 lib；门禁 script-index 也用同一函数）。
    expect(strayToolEntries(ROOT)).toEqual([])
    for (const group of TOOL_GROUPS) expect(readdirSync(join(ROOT, 'tools', group)).length).toBeGreaterThan(0)
    expect(scripts.some(rel => rel.startsWith('checks/gates/'))).toBe(false)
  })

  // 守：strayToolEntries 的早退分支（tools/ 目录缺失时不能抛，要如实报成散件）。
  it('tools/ 目录缺失 → 报一条「目录缺失」，不抛', () => {
    expect(strayToolEntries(emptyRoot)).toEqual(['tools（目录缺失）'])
  })

  // 守：wrap 的超宽折行分支——只在 ` · ` 处折，不切断单个 Markdown 链接。
  it('超过行宽的链接清单会折行，且不切断单个链接', () => {
    const parts = Array.from({ length: 12 }, (_, i) => `[entry-${String(i)}](../tools/repo/entry-${String(i)}.mjs)`)
    const text = renderScriptInventory(parts.map((_, i) => `tools/repo/entry-${String(i)}.mjs`), { gateCount: 0 })
    // 折行确实发生：任一长行都不该超过 wrap 的宽度（110）。
    expect(text.split('\n').every(line => line.length <= 130)).toBe(true)
    // 每个链接都完整出现（没被行宽切成两半）。
    for (const part of parts) expect(text).toContain(part)
  })

})

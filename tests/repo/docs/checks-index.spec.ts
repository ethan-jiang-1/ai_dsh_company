import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { ASSETS, PROBES, suffixOf } from '../../../tools/lib/core/asset-lanes.mjs'
import { TOOL_GROUPS, indexTargetFor, renderScriptInventory, scanPublicScripts, strayToolEntries } from '../../../tools/lib/core/checks-index.mjs'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

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
    ], { gateCount: 53, assetNames: ['a'], probeNames: ['c'] })
    expect(text).toContain('## 冒烟 / 真实入口（checks/lanes/，1 = 1 asset）')
    expect(text).toContain('[a](lanes/a.mjs)')
    expect(text).toContain('## 盘面审计（checks/audit/，1）')
    expect(text).toContain('[b](audit/b.mjs)')
    expect(text).toContain('### team（1）')
    expect(text).toContain('[c](../probes/team/c.mjs)')
    expect(text).toContain('### repo/（1）')
    expect(text).toContain('[d](../tools/repo/d.mjs)')
    expect(text).toContain('checks/gates/，53')
  })

  it('扫描公开入口：含 smoke/audit/probes 全树 + tools 三组，排除内部实现', () => {
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

  it('kind 计数：资产与 runner、probe 与 fixture、tool/runner/query 分开', () => {
    const text = renderScriptInventory([
      'checks/lanes/a.entry.mjs',
      'checks/lanes/fast-lane.mjs',
      'probes/team/p-probe.mjs',
      'probes/team/f/index.mjs',
      'tools/repo/run-check-tests.mjs',
      'tools/repo/snapshot-path.mjs',
      'tools/repo/checks-index.mjs',
    ], { gateCount: 1, assetNames: ['a'], probeNames: ['p'] })
    expect(text).toContain('checks/lanes/，2 = 1 asset + 1 runner')
    expect(text).toContain('probes/，2 = 1 probe + 1 fixture')
    expect(text).toContain('tools/，3 = 1 tool + 1 runner + 1 query')
  })

  it('真实库存与 asset-lanes 对账：资产/探针逐个在场，runner/fixture 不冒充资产', () => {
    const scripts = scanPublicScripts(ROOT)
    const laneFiles = scripts.filter(rel => rel.startsWith('checks/lanes/'))
    const probeFiles = scripts.filter(rel => rel.startsWith('probes/'))
    const toolFiles = scripts.filter(rel => rel.startsWith('tools/'))
    for (const asset of ASSETS) {
      expect(laneFiles, `${asset.name} 未出现在 lanes 库存`).toContain(`checks/lanes/${asset.name}.${suffixOf(asset.name)}.mjs`)
    }
    for (const probe of PROBES) {
      expect(probeFiles, `${probe.name} 未出现在 probes 库存`).toContain(`probes/${probe.domain}/${probe.name}.mjs`)
    }
    const text = renderScriptInventory(scripts, {
      gateCount: 0,
      assetNames: ASSETS.map(asset => asset.name),
      probeNames: PROBES.map(probe => probe.name),
    })
    expect(text).toContain(`checks/lanes/，${String(laneFiles.length)} = ${String(ASSETS.length)} assets + ${String(laneFiles.length - ASSETS.length)} runners`)
    expect(text).toContain(`probes/，${String(probeFiles.length)} = ${String(PROBES.length)} probes + 1 fixture`)
    expect(text).toContain(`tools/，${String(toolFiles.length)} = ${String(toolFiles.length - 2)} tools + 1 runner + 1 query`)
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

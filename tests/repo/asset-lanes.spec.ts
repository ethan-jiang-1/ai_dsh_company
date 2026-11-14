import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { ASSETS, FAST, KINDS, LANES, SURFACE_RULES, assetByName, selectWeeklyAssets, suffixOf } from '../../tools/lib/asset-lanes.mjs'

/**
 * 「空间完备」的机械门（DSH M1 的本仓形状）。
 *
 * 判据：`checks/lanes/*.e2e.mjs|*.entry.mjs` 与 `tools/lib/asset-lanes.mjs` 的 ASSETS **双向一致**：
 *   盘上有文件 → 必须登记；登记了 → 盘上必须有文件；手动条目必须写明理由。
 * 这个 spec 是唯一能挡住"新资产生下来就没人跑"的地方；runner 只消费注册表，不复判。
 */

function smokeNames() {
  return readdirSync(join(ROOT, 'checks/lanes'), { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(e2e|entry)\.mjs$/.test(entry.name))
    .map(entry => entry.name.replace(/\.(e2e|entry)\.mjs$/, ''))
}

describe('资产 lane 注册表（空间完备）', () => {
  it('每个冒烟都登记，且只登记一次', () => {
    const files = smokeNames().sort()
    const registered = ASSETS.map(asset => asset.name).sort()
    const unregistered = files.filter(name => !registered.includes(name))
    const ghosts = registered.filter(name => !files.includes(name))
    expect(unregistered, '这些 checks/lanes/*.e2e|entry.mjs 没进 tools/lib/asset-lanes.mjs——新资产必须选 lane（或写 manualReason）').toEqual([])
    expect(ghosts, '注册表里有名字但盘上没有文件——删资产要同 diff 退登记').toEqual([])
    expect(new Set(registered).size, '同一个资产只能登记一次').toBe(registered.length)
  })

  it('kind / lane 只用封闭词表；手动条目必须写理由', () => {
    for (const asset of ASSETS) {
      expect(KINDS, `${asset.name} 的 kind 非法`).toContain(asset.kind)
      for (const lane of asset.lanes) expect(LANES, `${asset.name} 的 lane 非法`).toContain(lane)
      if (asset.lanes.length === 0) {
        expect(asset.manualReason, `${asset.name} 没有 lane 就必须写 manualReason`).toBeTruthy()
      }
      if (asset.kind === 'classic') expect(typeof asset.ciSafe, `${asset.name} 缺 ciSafe`).toBe('boolean')
    }
  })

  it('fast lane 保持 4 条且都在注册表里（变长要走评审，不许悄悄膨胀；门禁自测走 test:checks）', () => {
    expect(FAST.length, 'fast lane 是 push 的成本预算：新增先量成本并改本断言').toBe(4)
    for (const name of FAST) expect(assetByName(name), `fast 指向未登记资产 ${name}`).toBeTruthy()
  })

  it('每个资产的文件名 = <name>.<suffix>.mjs，且后缀在注册表里', () => {
    for (const asset of ASSETS) {
      expect(['e2e', 'entry'], `${asset.name} 的 suffix 非法`).toContain(suffixOf(asset.name))
    }
  })

  it('后缀映射是封闭的：未登记名字必须报错，不猜', () => {
    expect(() => suffixOf('zz-unknown')).toThrow(/没有登记后缀/)
  })

  it('surface 规则只引用已登记资产，并且每条都写清为什么', () => {
    for (const rule of SURFACE_RULES) {
      expect(rule.globs.length, 'surface 规则要有 globs').toBeGreaterThan(0)
      expect(rule.assets.length, 'surface 规则要有 assets').toBeGreaterThan(0)
      expect(rule.why, `${rule.globs.join(',')} 缺 why`).toBeTruthy()
      for (const name of rule.assets) expect(assetByName(name), `surface 规则引用未登记资产 ${name}`).toBeTruthy()
    }
  })

  it('fast 的每条都真的在 fast lane 里（注册表与派生列表一致）', () => {
    const derived = ASSETS.filter(asset => asset.lanes.includes('fast')).map(asset => asset.name)
    expect(derived).toEqual(FAST)
  })

  it('weekly 筛选：正常命中 classic weekly 资产，支持浏览器/后缀过滤，不存在的 filter 返回空集供 runner 判非零', () => {
    const defaults = selectWeeklyAssets()
    expect(defaults.length).toBeGreaterThan(0)
    const normal = selectWeeklyAssets(ASSETS, { ci: true })
    expect(normal.length).toBeGreaterThan(0)
    const withBrowser = selectWeeklyAssets(ASSETS, { withBrowser: true, suffix: 'entry' })
    expect(withBrowser.some(asset => asset.kind === 'browser')).toBe(true)
    expect(selectWeeklyAssets(ASSETS, { filter: 'zz-none' })).toEqual([])
  })
})

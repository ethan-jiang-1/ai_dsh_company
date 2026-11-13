import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'
import { ASSETS, FAST, KINDS, LANES, SURFACE_RULES, assetByName } from '../../../tools/lib/asset-lanes.mjs'

/**
 * 「空间完备」的机械门（研究 B 件，DSH M1 的本仓形状）。
 *
 * 问题：33 个冒烟里只有 6 条进自动 lane，其余"存在但没人跑"——资产腐烂不是意外是默认。
 * 判据：`checks/smoke/*.mjs` 与 `tools/lib/asset-lanes.mjs` 的 ASSETS **双向一致**：
 *   盘上有文件 → 必须登记；登记了 → 盘上必须有文件；手动条目必须写明理由。
 * 这个 spec 是唯一能挡住"新资产生下来就没人跑"的地方；runner 只消费注册表，不复判。
 */
const RUNNERS = new Set(['fast.mjs', 'all-keyless.mjs'])

function smokeNames() {
  return readdirSync(join(ROOT, 'checks/smoke'), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.mjs') && !RUNNERS.has(entry.name))
    .map(entry => entry.name.replace(/\.mjs$/, ''))
}

describe('资产 lane 注册表（空间完备）', () => {
  it('每个冒烟都登记，且只登记一次', () => {
    const files = smokeNames().sort()
    const registered = ASSETS.map(asset => asset.name).sort()
    const unregistered = files.filter(name => !registered.includes(name))
    const ghosts = registered.filter(name => !files.includes(name))
    expect(unregistered, '这些 checks/smoke/*.mjs 没进 tools/lib/asset-lanes.mjs——新资产必须选 lane（或写 manualReason）').toEqual([])
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

  it('fast lane 保持 6 条且都在注册表里（变长要走评审，不许悄悄膨胀）', () => {
    expect(FAST.length, 'fast lane 是 push 的成本预算：新增先量成本并改本断言').toBe(6)
    for (const name of FAST) expect(assetByName(name), `fast 指向未登记资产 ${name}`).toBeTruthy()
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
})

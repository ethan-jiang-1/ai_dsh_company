/**
 * 产品类型包形状（2026-11-09，三层分离）。
 *
 * 判据：每个 `content/product-types/<id>/` 是自包含包，至少含 overview + check-rules.json；
 * check-rules 的 layers/files/defaultLayers 自洽，productType 与目录名一致。
 * 至少两家类型（换类型才有对照）。
 *
 * 红配方：删 `business-software/check-rules.json` → 文件在场红；从 files 删一个层 → 自洽红。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const CONTENT = join(ROOT, 'packages/company-pack/content')
const DIR = join(CONTENT, 'product-types')
const MANIFEST = JSON.parse(readFileSync(join(CONTENT, 'manifest.json'), 'utf8')) as { tiers: Record<string, string[]> }
const TIER_BUDGETS: Record<string, number> = { t0: 6_144, t1: 4_096, t2: 6_144, legacy: 6_144 }
const tierOf = (rel: string): string => Object.entries(MANIFEST.tiers).find(([, files]) => files.includes(rel))?.[0] ?? 't2'
const ids = existsSync(DIR)
  ? readdirSync(DIR, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  : []

describe('产品类型包：盘上至少两家', () => {
  it('至少两家，且 id 不重复', () => {
    expect(ids.length, '产品类型包少于两家，换类型无从验证').toBeGreaterThanOrEqual(2)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe.each(ids)('产品类型包：%s', (id) => {
  it('overview 与 check-rules 在场（自包含）', () => {
    const overview = join(DIR, id, 'overview.md')
    const rules = join(DIR, id, 'check-rules.json')
    expect(existsSync(overview), `${id} 缺 overview.md`).toBe(true)
    expect(existsSync(rules), `${id} 缺 check-rules.json`).toBe(true)
    const tier = tierOf(`product-types/${id}/overview.md`)
    expect(statSync(overview).size, `${id} overview 超过 ${tier} 预算 ${String(TIER_BUDGETS[tier] ?? 6_144)}B`).toBeLessThanOrEqual(TIER_BUDGETS[tier] ?? 6_144)
  })

  it('check-rules 自洽：productType 同名、层与文件一一对应、默认层是子集', () => {
    const rules = JSON.parse(readFileSync(join(DIR, id, 'check-rules.json'), 'utf8')) as {
      productType?: string
      layers?: string[]
      defaultLayers?: string[]
      files?: Record<string, string>
    }
    expect(rules.productType, `${id} 的 productType 与目录名不一致`).toBe(id)
    const layers = rules.layers ?? []
    expect(layers.length, `${id} 没声明需求层`).toBeGreaterThan(0)
    expect(new Set(layers).size, `${id} 需求层重复`).toBe(layers.length)
    const files = rules.files ?? {}
    expect(Object.keys(files).sort(), `${id} 的 files 与 layers 不是一一对应`).toEqual([...layers].sort())
    for (const layer of rules.defaultLayers ?? []) {
      expect(layers, `${id} 的默认层 ${layer} 不在 layers 里`).toContain(layer)
    }
  })
})

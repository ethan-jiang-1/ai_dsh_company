/**
 * 两个产品类型的真实编号合同必须不同（2026-11-11，BUG-063 的内容级反证）。
 *
 * 判据：business 是三层（MRD/StRS/PRD），不出现 SyRS/IRS/V&V 层表；hardware 是五层 + V&V；
 * 两个 requirements-model.md 内容/哈希不同；check-rules 的 layers 与合同一致。
 *
 * 红配方：把 business 的 requirements-model.md 复制成 hardware 版 → 本 spec 红；
 * 把 business 的 check-rules layers 加 SyRS → 本 spec 红。
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const DIR = join(ROOT, 'packages/company-pack/content/product-types')
const read = (type: string, file: string): string => readFileSync(join(DIR, type, file), 'utf8')

describe('产品类型真实合同：business 三层 vs hardware 五层', () => {
  it('business 是 MRD/StRS/PRD，不出现 SyRS/IRS/V&V 层表行', () => {
    const text = read('business-software', 'requirements-model.md')
    expect(text).toContain('三层与 owner')
    for (const layer of ['MRD', 'StRS', 'PRD']) expect(text).toContain(layer)
    expect(text).not.toMatch(/\|\s*4\s*\|\s*\*\*SyRS\*\*/)
    expect(text).not.toMatch(/\|\s*5\s*\|\s*\*\*IRS\*\*/)
    expect(text).not.toMatch(/\|\s*—\s*\|\s*\*\*V&V\*\*/)
  })

  it('hardware 是五层 + V&V', () => {
    const text = read('hardware-software', 'requirements-model.md')
    expect(text).toContain('五层与 owner')
    for (const layer of ['MRD', 'StRS', 'PRD', 'SyRS', 'IRS', 'V&V']) expect(text).toContain(layer)
  })

  it('两份合同内容/哈希不同；check-rules 层与合同一致', () => {
    const business = read('business-software', 'requirements-model.md')
    const hardware = read('hardware-software', 'requirements-model.md')
    expect(business).not.toBe(hardware)
    expect(createHash('sha256').update(business).digest('hex')).not.toBe(createHash('sha256').update(hardware).digest('hex'))

    const businessRules = JSON.parse(read('business-software', 'check-rules.json')) as { layers: string[] }
    expect(businessRules.layers).toEqual(['MRD', 'StRS', 'PRD'])
    const hardwareRules = JSON.parse(read('hardware-software', 'check-rules.json')) as { layers: string[] }
    expect(hardwareRules.layers).toEqual(['MRD', 'StRS', 'PRD', 'SyRS', 'IRS', 'V&V'])
  })
})

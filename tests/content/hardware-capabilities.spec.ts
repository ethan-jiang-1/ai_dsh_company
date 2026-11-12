/**
 * 硬软一体能力前置（2026-11-11 v2，D-01）：playbook 要求的能力必须有核对表与报缺规则。
 *
 * 判据：capabilities.md 在场，覆盖硬件/固件/电气/机械/认证/供应链/试产/现场；
 * 写清“缺席位 → 报缺，不进入报价/承诺”；overview 与 product-definition 都指向它。
 *
 * 红配方：删 capabilities.md → 本 spec 红；删“不进入报价”规则 → 本 spec 红。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const CONTENT = join(ROOT, 'packages/company-pack/content')
const CAPS = join(CONTENT, 'product-types/hardware-software/capabilities.md')

describe('硬软一体能力前置', () => {
  it('capabilities.md 在场，覆盖关键能力', () => {
    expect(existsSync(CAPS), '缺 hardware-software/capabilities.md').toBe(true)
    const text = readFileSync(CAPS, 'utf8')
    for (const capability of ['Hardware', 'Firmware', 'Electrical', 'Mechanical', 'Certification', 'Supply chain', 'Trial production', 'On-site']) {
      expect(text, `能力表缺 ${capability}`).toContain(capability)
    }
    expect(text).toMatch(/report gap/i)
    expect(text).toMatch(/do not enter quoting/i)
  })

  it('overview 与 product-definition 都指向能力前置', () => {
    const overview = readFileSync(join(CONTENT, 'product-types/hardware-software/overview.md'), 'utf8')
    expect(overview).toContain('capabilities.md')
    expect(overview).toMatch(/do not enter quoting/i)
    const skill = readFileSync(join(ROOT, 'packages/company-pack/presets/_shared/skills/product-definition/SKILL.md'), 'utf8')
    expect(skill).toContain('content/product-types/hardware-software/capabilities.md')
  })
})

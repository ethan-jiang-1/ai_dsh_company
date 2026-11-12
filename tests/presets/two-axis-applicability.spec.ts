/**
 * 产品类型 × 交付模式 2×3 适用性真值表（2026-11-11）。
 *
 * 判据：方法适用性看交付模式，不看产品类型——
 *   project-services → CFO project-economics / COO ops-feasibility / VP-Sales pricing
 *   managed-service  → CFO managed-service-economics / COO managed-service-ops / VP-Sales managed-service-pricing
 *   productized      → 无方法，三个 workflow 都 fail-closed
 * 方法正文不得再出现“business-software … fail-closed”这类产品类型条件（那会与契约矛盾）。
 *
 * 红配方：把 pricing 的 description 改回 “business-software 缺定价方法” → 本 spec 红；
 * 把 project-economics 的 `适用交付模式` 改成 managed-service → 2×3 表红。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const PRESETS = join(ROOT, 'packages/company-pack/presets')
const TYPES = ['business-software', 'hardware-software'] as const
const MODES = ['productized', 'project-services', 'managed-service'] as const
const ROLES = ['cfo', 'coo', 'vp-sales'] as const
const WORKFLOWS = { cfo: 'cfo-workflow', coo: 'ops-workflow', 'vp-sales': 'sales-workflow' } as const

const METHODS = {
  'project-services': {
    cfo: 'project-economics',
    coo: 'ops-feasibility',
    'vp-sales': 'pricing',
  },
  'managed-service': {
    cfo: 'managed-service-economics',
    coo: 'managed-service-ops',
    'vp-sales': 'managed-service-pricing',
  },
  productized: {},
} as const

function contractOf(text: string): { type: string; mode: string } | null {
  const block = text.split('\n').filter(line => line.startsWith('>')).join(' ')
  const type = /适用产品类型\s*=\s*([^；;\n]+)/.exec(block)?.[1]?.trim()
    ?? /applicable product types\s*=\s*([^;；\n]+)/i.exec(block)?.[1]?.trim()
    ?? ''
  const mode = /适用交付模式\s*=\s*([^；;\n]+)/.exec(block)?.[1]?.trim()
    ?? /applicable delivery modes\s*=\s*([^;；\n]+)/i.exec(block)?.[1]?.trim()
    ?? ''
  return type === '' || mode === '' ? null : { type, mode }
}

describe('2×3 适用性真值表：方法看交付模式，不看产品类型', () => {
  for (const type of TYPES) {
    for (const mode of MODES) {
      it(`${type} × ${mode}`, () => {
        const expected = METHODS[mode]
        for (const role of ROLES) {
          const skill = expected[role]
          if (skill === undefined) {
            // productized 没有方法；workflow 必须 fail-closed
            const workflow = readFileSync(join(PRESETS, role, 'skills', WORKFLOWS[role], 'SKILL.md'), 'utf8')
            expect(workflow, `${role} workflow 缺 productized 分派`).toContain('productized')
            expect(workflow, `${role} workflow 缺 fail-closed`).toContain('fail-closed')
            continue
          }
          const path = join(PRESETS, role, 'skills', skill, 'SKILL.md')
          expect(existsSync(path), `${type} × ${mode} 缺 ${role}/${skill}`).toBe(true)
          const text = readFileSync(path, 'utf8')
          const contract = contractOf(text)
          expect(contract, `${role}/${skill} 缺方法契约`).not.toBeNull()
          expect(contract?.type, `${role}/${skill} 不应按产品类型限制`).toBe('all')
          expect(contract?.mode, `${role}/${skill} 应适用 ${mode}`).toBe(mode)
          const badLine = text.split('\n').find(line => line.includes('business-software') && line.includes('fail-closed'))
          expect(badLine, `${role}/${skill} 正文仍按 business-software fail-closed：${badLine ?? ''}`).toBeUndefined()
          const workflow = readFileSync(join(PRESETS, role, 'skills', WORKFLOWS[role], 'SKILL.md'), 'utf8')
          expect(workflow, `${role} workflow 缺 ${mode} 分派`).toContain(mode)
        }
      })
    }
  }
})

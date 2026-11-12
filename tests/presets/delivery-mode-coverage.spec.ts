/**
 * 交付模式覆盖（2026-11-11 两轴 v1）：每个 mode 在三个经营角色各至少有一个方法，三个 workflow 都分派它。
 *
 * 判据：
 *   ① content/delivery-modes/<mode>/ 存在；productized 是默认，不建包；
 *   ② CFO/COO/VP-Sales 各至少一个 skill 的方法契约声明 `适用交付模式 = <mode>`；
 *   ③ 三个 workflow 都点名该 mode，并写 fail-closed；
 *   ④ 没有任何方法声明一个不存在的交付模式。
 *
 * 红配方：删 managed-service-ops → ②红；从 ops-workflow 删 managed-service → ③红；
 * 方法写 `适用交付模式 = nope` → ④红。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const PACK = join(ROOT, 'packages/company-pack')
const CONTENT = join(PACK, 'content')
const PRESETS = join(PACK, 'presets')
const MODES_DIR = join(CONTENT, 'delivery-modes')
const modes = readdirSync(MODES_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()
const ROLES = ['cfo', 'coo', 'vp-sales'] as const
const WORKFLOWS = { cfo: 'cfo-workflow', coo: 'ops-workflow', 'vp-sales': 'sales-workflow' } as const

function skillsOf(role: string): { name: string; text: string }[] {
  const dir = join(PRESETS, role, 'skills')
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(dir, entry.name, 'SKILL.md')))
    .map(entry => ({ name: entry.name, text: readFileSync(join(dir, entry.name, 'SKILL.md'), 'utf8') }))
}

describe('交付模式覆盖：每个 mode 都有经营侧方法 + workflow 分派', () => {
  it('至少两个可执行 mode（productized 是默认，不建包）', () => {
    expect(modes.length).toBeGreaterThanOrEqual(2)
    expect(existsSync(join(MODES_DIR, 'project-services'))).toBe(true)
    expect(existsSync(join(MODES_DIR, 'managed-service'))).toBe(true)
    expect(existsSync(join(MODES_DIR, 'productized')), 'productized 是默认，不该建包').toBe(false)
  })

  for (const mode of modes) {
    it(`${mode}：CFO/COO/VP-Sales 各至少一个方法`, () => {
      for (const role of ROLES) {
        const hit = skillsOf(role).filter(skill => new RegExp(`(?:适用交付模式|applicable delivery modes)\\s*=\\s*${mode}(?:\\s|；|;|$)`, 'i').test(skill.text))
        expect(hit.length, `${role} 缺 ${mode} 方法`).toBeGreaterThan(0)
      }
    })

    it(`${mode}：三个 workflow 都分派 + fail-closed`, () => {
      for (const role of ROLES) {
        const workflow = readFileSync(join(PRESETS, role, 'skills', WORKFLOWS[role], 'SKILL.md'), 'utf8')
        expect(workflow, `${role} workflow 缺 ${mode}`).toContain(mode)
        expect(workflow, `${role} workflow 缺 fail-closed`).toMatch(/fail-closed/)
      }
    })
  }

  it('经营角色 persona 都点名所有包模式（加载路径在开场可见）', () => {
    for (const role of ROLES) {
      const persona = readFileSync(join(PRESETS, role, 'agent.cordis.yml'), 'utf8')
      for (const mode of modes) expect(persona, `${role} persona 缺 ${mode}`).toContain(mode)
    }
  })

  it('awareness 面都点名所有包模式（meta / 手册 / product-definition / CEO）', () => {
    const surfaces = [
      ['meta 模板', join(CONTENT, 'templates/meta.md')],
      ['公司手册', join(CONTENT, 'AGENTS.md')],
      ['product-definition', join(PRESETS, '_shared/skills/product-definition/SKILL.md')],
      ['CEO 组队', join(PRESETS, 'ceo/skills/assembling-the-team/SKILL.md')],
    ] as const
    for (const [label, path] of surfaces) {
      const text = readFileSync(path, 'utf8')
      for (const mode of modes) expect(text, `${label} 缺 ${mode}`).toContain(mode)
    }
  })

  it('没有方法声明不存在的交付模式', () => {
    const declared = new Set(modes)
    for (const role of ROLES) {
      for (const skill of skillsOf(role)) {
        for (const match of skill.text.matchAll(/适用交付模式\s*=\s*([^（(；;\n]+)/g)) {
          const value = match[1].trim()
          if (value === 'all') continue
          expect(declared.has(value), `${role}/${skill.name} 声明了不存在的交付模式「${value}」`).toBe(true)
        }
      }
    }
  })
})

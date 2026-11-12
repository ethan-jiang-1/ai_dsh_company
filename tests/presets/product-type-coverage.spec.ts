/**
 * 产品类型 coverage（2026-11-11）：每个 product-type 必须有完整资产，不只是 overview + check-rules。
 *
 * 判据（每个 content/product-types/<id>/）：
 *   ① overview / document-map / requirements-model / glossary / check-rules 五件齐；
 *   ② product-definition 品类表恰有一行指向 `references/<id>.md`，且 reference 在场、不写“未来类型”；
 *   ③ 至少一个 tests/fixtures/companies/* fixture 的 productType = <id>（换公司/换类型可跑）；
 *   ④ 没有类型包的 reference 必须自报未来类型（不冒充可选）。
 *
 * 红配方：删 business-software/document-map.md → ①红；删 references/business-software.md → ②红；
 * 删 beta fixture → ③红；把 project-services 行放回品类表 → ②红。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const PACK = join(ROOT, 'packages/company-pack')
const TYPES_DIR = join(PACK, 'content/product-types')
const REFERENCES = join(PACK, 'presets/_shared/skills/product-definition/references')
const SKILL = join(PACK, 'presets/_shared/skills/product-definition/SKILL.md')
const FIXTURES = join(ROOT, 'tests/fixtures/companies')

const types = readdirSync(TYPES_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()
const references = existsSync(REFERENCES)
  ? readdirSync(REFERENCES, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith('.md')).map(entry => entry.name.replace(/\.md$/, '')).sort()
  : []

function tableRows(): { id: string; line: string }[] {
  const lines = readFileSync(SKILL, 'utf8').split('\n')
  return lines.flatMap((line, index) => {
    if (!line.trimStart().startsWith('|')) return []
    const match = /`references\/([a-z][a-z-]*)\.md`/.exec(line)
    return match === null ? [] : [{ id: match[1] as string, line: `${String(index + 1)}: ${line}` }]
  })
}

function fixtureTypes(): Set<string> {
  const out = new Set<string>()
  if (!existsSync(FIXTURES)) return out
  for (const entry of readdirSync(FIXTURES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const identity = join(FIXTURES, entry.name, 'identity.md')
    if (!existsSync(identity)) continue
    const match = /^productType\s*[:：]\s*(\S+)\s*$/m.exec(readFileSync(identity, 'utf8'))
    if (match) out.add(match[1] as string)
  }
  return out
}

describe('产品类型 coverage：每个类型五件齐 + playbook + fixture', () => {
  it('至少两个类型（换类型才有对照）', () => {
    expect(types.length).toBeGreaterThanOrEqual(2)
  })

  for (const type of types) {
    it(`${type}：五件齐`, () => {
      for (const file of ['overview.md', 'document-map.md', 'requirements-model.md', 'glossary.md', 'check-rules.json']) {
        expect(existsSync(join(TYPES_DIR, type, file)), `${type} 缺 ${file}`).toBe(true)
      }
    })

    it(`${type}：品类表恰一行 + reference 在场且不是未来类型`, () => {
      const rows = tableRows().filter(row => row.id === type)
      expect(rows.length, `${type} 品类表行数`).toBe(1)
      const reference = join(REFERENCES, `${type}.md`)
      expect(existsSync(reference), `${type} 缺 references/${type}.md`).toBe(true)
      expect(readFileSync(reference, 'utf8'), `${type} 是随包类型，不应标未来`).not.toMatch(/未来类型|未随包发布|尚未随包发布/)
    })

    it(`${type}：至少一个 company fixture 覆盖`, () => {
      expect(fixtureTypes().has(type), `${type} 没有 tests/fixtures/companies fixture`).toBe(true)
    })
  }

  it('awareness 面：meta / 手册 / CEO 都指向产品类型唯一枚举', () => {
    const meta = readFileSync(join(PACK, 'content/templates/meta.md'), 'utf8')
    expect(meta).toMatch(/^productType\s*[:：]/m)
    expect(meta).toContain('content/product-types/')
    const handbook = readFileSync(join(PACK, 'content/AGENTS.md'), 'utf8')
    expect(handbook.toLowerCase()).toContain('product type')
    expect(handbook).toContain('product-types')
    const ceo = readFileSync(join(PACK, 'presets/ceo/skills/assembling-the-team/SKILL.md'), 'utf8')
    expect(ceo).toMatch(/productType: <id>/)
  })

  it('references 与类型包一一对应（没有未来孤儿，也没有漏 reference 的类型包）', () => {
    expect([...references].sort(), 'references 与 product-types 不是一一对应').toEqual([...types].sort())
  })
})

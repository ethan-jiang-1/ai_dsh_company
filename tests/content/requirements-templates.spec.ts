/**
 * 五层模板（A2）的 keyless 判据：五个需求模板声明 `layer/definition`，allocation 是 `definition: none`
 * 的附录（无 layer、不立号），PRD 的 JSON 是唯一定义点、正文标题只是引用，PRD 样例保留 `source` + `traces`。
 *
 * 病根（2026-11-07 落地冲突 #1）：PRD 模板同时用 JSON 账本和 `### REQ-001` 当定义点——违反 R4
 * 「一个号只能有一个定义点」，Agent 会把正文小节当定义、把 JSON 当索引（或反过来）。
 *
 * 红配方：删任一模板的 `layer` 头 / 把 `definition` 改成枚举外 / 在 PRD 正文写回 `### REQ-002` /
 * 给 allocation 加一个定义形状的号 → 本 spec 转红。
 * 负例留证 2026-11-07：模板未建时本 spec 首跑 8 failed；补模板后全绿（见卡 `## 交付证据`）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateProductDocs } from '../../packages/company-pack/src/lib/prd-check.ts'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const TEMPLATES = join(ROOT, 'packages/company-pack/content/templates')
/** 领域模板（SyRS/IRS/allocation）住产品类型包；解析器按"先通用后类型包"找。 */
const TYPE_TEMPLATES = join(ROOT, 'packages/company-pack/content/product-types/hardware-software/templates')
const templatePath = (name: string): string =>
  existsSync(join(TEMPLATES, name)) ? join(TEMPLATES, name) : join(TYPE_TEMPLATES, name)
const read = (name: string): string => readFileSync(templatePath(name), 'utf8')

/** 取 YAML 头（`---` 包起来的字段行）；缺失返回 null。 */
function header(text: string): Record<string, string> | null {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text)
  if (match === null) return null
  const fields: Record<string, string> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^([a-z-]+):\s*(.*)$/.exec(line.trim())
    if (field !== null) fields[field[1] ?? ''] = (field[2] ?? '').trim()
  }
  return fields
}

const DEFINITION_FORMS = new Set(['json-ledger', 'headings', 'table-rows', 'none'])
const LAYERS: readonly [string, string][] = [
  ['mrd.md', 'MRD'],
  ['strs.md', 'StRS'],
  ['prd.md', 'PRD'],
  ['syrs.md', 'SyRS'],
  ['irs.md', 'IRS'],
]

describe('五层模板头（layer / definition）', () => {
  it('每个需求模板都有合法头：layer 对层、definition 在枚举内', () => {
    for (const [name, layer] of LAYERS) {
      expect(existsSync(templatePath(name)), `模板缺 ${name}`).toBe(true)
      const fields = header(read(name))
      expect(fields, `${name} 缺 YAML 头——机器读不到层与定义形态`).not.toBeNull()
      expect(fields?.['layer'], `${name} 的 layer 不是 ${layer}`).toBe(layer)
      expect(DEFINITION_FORMS.has(fields?.['definition'] ?? ''), `${name} 的 definition 非法`).toBe(true)
    }
  })

  it('定义形态与层匹配：MRD/PRD = json-ledger；StRS/SyRS/IRS = headings', () => {
    expect(header(read('mrd.md'))?.['definition']).toBe('json-ledger')
    expect(header(read('prd.md'))?.['definition']).toBe('json-ledger')
    for (const name of ['strs.md', 'syrs.md', 'irs.md']) {
      expect(header(read(name))?.['definition'], `${name} 应声明 headings`).toBe('headings')
    }
  })

  it('allocation 是附录：definition: none，无 layer，不立号', () => {
    expect(existsSync(templatePath('allocation.md')), '模板缺 allocation.md').toBe(true)
    const text = read('allocation.md')
    const fields = header(text)
    expect(fields?.['definition'], 'allocation 必须声明 definition: none').toBe('none')
    expect(fields?.['layer'], 'allocation 是附录，不声明层').toBeUndefined()
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '')
    expect(body, 'allocation 不得出现定义形状的号（### <ID> 标题）').not.toMatch(/^#{2,4}\s+(?:MR|REQ|IF|TC)-\d/m)
  })
})

describe('PRD 唯一定义点', () => {
  it('JSON 账本是唯一定义点；正文小节标题是引用（不带裸 ID 开头）', () => {
    const text = read('prd.md')
    const json = /```json\n([\s\S]*?)\n```/.exec(text)
    expect(json, 'PRD 模板缺 JSON 账本').not.toBeNull()
    const parsed = JSON.parse(json?.[1] ?? '') as { prd: { requirements: { id: string }[] } }
    const ids = parsed.prd.requirements.map(requirement => requirement.id)
    expect(ids.length, 'PRD 样例至少要一条 REQ').toBeGreaterThan(0)
    // 正文小节标题不得以 `<ID>` 开头（否则同一号出现两个定义点）。
    const headingDefs = [...text.matchAll(/^#{2,4}\s+((?:MR|REQ|IF|TC)-\d{3})\b/gm)].map(match => match[1])
    expect(headingDefs, `PRD 正文出现了定义形状的标题：${headingDefs.join(', ')}`).toEqual([])
    // 引用标题必须仍在（告诉模型 JSON 是定义、正文是说明）。
    expect(text).toContain(`Requirement: ${ids[0] ?? ''}`)
  })

  it('PRD 样例保留 source（MR 来源）与 traces（跨层上游）', () => {
    const text = read('prd.md')
    const json = /```json\n([\s\S]*?)\n```/.exec(text)?.[1] ?? ''
    const parsed = JSON.parse(json) as { prd: { requirements: Record<string, unknown>[] } }
    const requirement = parsed.prd.requirements[0] ?? {}
    expect(Array.isArray(requirement['source']) && (requirement['source'] as string[]).length > 0, 'PRD 样例缺 source').toBe(true)
    expect(Array.isArray(requirement['traces']), 'PRD 样例缺 traces 字段').toBe(true)
    expect(text, 'PRD 模板要写明 traces 指 StRS').toMatch(/traces[^\n]*StRS/)
  })

  it('MRD/PRD 样例仍可直接通过 validateProductDocs（模板与校验器同源）', () => {
    const result = validateProductDocs(read('mrd.md'), read('prd.md'))
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({ ok: true, mrdCount: 1, reqCount: 1, acCount: 1 })
  })
})

describe('headings 模板的追溯字段', () => {
  it('StRS/SyRS/IRS 的每个定义块都带行首 traces:（不写追溯 = 孤儿）', () => {
    for (const name of ['strs.md', 'syrs.md', 'irs.md']) {
      const text = read(name)
      const blocks = text.split(/\n(?=#{3,4}\s+(?:REQ|IF)-\d{3})/).slice(1)
      expect(blocks.length, `${name} 没有定义块`).toBeGreaterThan(0)
      for (const block of blocks) {
        const id = /^#{3,4}\s+((?:REQ|IF)-\d{3})/.exec(block)?.[1] ?? '?'
        expect(block, `${name} 的 ${id} 缺行首 traces:`).toMatch(/^- traces:\s*\[[^\]]+\]/m)
      }
    }
  })

  it('链式样例自洽：StRS→MR、PRD→StRS、SyRS→PRD、IRS→SyRS 的号都存在', () => {
    const idsOf = (name: string) => new Set([...read(name).matchAll(/\b((?:MR|REQ|IF)-\d{3})\b/g)].map(match => match[1] ?? ''))
    const mrdIds = idsOf('mrd.md')
    const strsIds = new Set([...read('strs.md').matchAll(/^#{3,4}\s+(REQ-\d{3})/gm)].map(match => match[1] ?? ''))
    const prdIds = new Set([...read('prd.md').matchAll(/"id":\s*"(REQ-\d{3})"/g)].map(match => match[1] ?? ''))
    const syrsIds = new Set([...read('syrs.md').matchAll(/^#{3,4}\s+(REQ-\d{3})/gm)].map(match => match[1] ?? ''))
    const irsIds = new Set([...read('irs.md').matchAll(/^#{3,4}\s+(IF-\d{3})/gm)].map(match => match[1] ?? ''))
    const traceTargets = (name: string) => new Set([...read(name).matchAll(/traces:\s*\[([^\]]+)\]/g)].flatMap(match => (match[1] ?? '').match(/(?:MR|REQ|IF)-\d{3}/g) ?? []))
    for (const target of traceTargets('strs.md')) expect(mrdIds.has(target), `StRS trace ${target} 不存在于 MRD 样例`).toBe(true)
    for (const target of traceTargets('prd.md')) expect(strsIds.has(target), `PRD trace ${target} 不是 StRS 定义`).toBe(true)
    for (const target of traceTargets('syrs.md')) expect(prdIds.has(target), `SyRS trace ${target} 不是 PRD 定义`).toBe(true)
    for (const target of traceTargets('irs.md')) expect(syrsIds.has(target), `IRS trace ${target} 不是 SyRS 定义`).toBe(true)
    expect(syrsIds.size + prdIds.size + irsIds.size).toBeGreaterThan(0)
  })
})

describe('门禁形态', () => {
  it('company-skeleton 把六个模板纳入随包在场检查；base-clean 纳入只读扫描', () => {
    const skeleton = readFileSync(join(ROOT, 'checks/gates/company-skeleton.mjs'), 'utf8')
    for (const name of ['mrd', 'strs', 'prd', 'syrs', 'irs', 'allocation']) {
      expect(skeleton, `company-skeleton 缺模板 ${name}.md`).toContain(`'${name}.md'`)
    }
    const baseClean = readFileSync(join(ROOT, 'checks/gates/base-clean.mjs'), 'utf8')
    for (const name of ['strs', 'syrs', 'irs', 'allocation']) {
      expect(baseClean, `base-clean 缺模板 ${name}.md`).toContain(`'${name}.md'`)
    }
  })
})

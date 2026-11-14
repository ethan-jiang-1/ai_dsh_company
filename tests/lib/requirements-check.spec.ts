/**
 * 需求编号校验器（A5）的 keyless 判据：层/定义形态解析、重复/悬空/退役/孤儿/覆盖/计数，
 * 以及 V4 负例（重复定义、悬空、退役词、孤儿）与 V11 教训（摘要表是引用、字段锚定行首）。
 *
 * 病根：编号一旦只承载身份，「每个号都要解到一行」就是承重规则——重复、悬空、退役词、孤儿
 * 必须由代码判红；定义形态（json-ledger / headings / table-rows）不按头声明解析就会把摘要表
 * 当定义（V11：同一份 IR 的摘要表与正文标题并存）。字段必须锚定行首（V11：散文里的「可追溯性」
 * 曾把 IFR-008 误判成有追溯）。
 *
 * 红配方：把任意一条断言里的 fixture 改回旧形状（重复定义/悬空/退役/孤儿/摘要表当定义）→ 转红。
 * 负例留证 2026-11-07：实现前本 spec 首跑 11 failed（模块不存在）；实现后全绿（见卡 `## 交付证据`）。
 *
 * 负例留证 2026-11-14：parseHeader 改回原始文本 → BOM 缺头用例红（BUG-160）
 * 负例留证 2026-11-14：headingDefinitions 改回 split('\n') → 围栏/注释幽灵 REQ 用例红（BUG-162）
 */
import { describe, expect, it } from 'vitest'
import {
  checkRequirements,
  numberingMarker,
  parseHeader,
  type Layer,
  type MotionDoc,
} from '../../packages/company-pack/src/lib/requirements-check.ts'
import { validateProductDocs } from '../../packages/company-pack/src/lib/prd-check.ts'

const yaml = (layer: string, definition: string, body: string): string =>
  `---\nlayer: ${layer}\ndefinition: ${definition}\n---\n\n${body}\n`

const MRD = yaml('MRD', 'json-ledger', `# MRD

\`\`\`json
{
  "mrd": {
    "version": "0.1",
    "status": "draft",
    "opportunities": [
      { "id": "MR-001", "title": "对账自动化", "recommendation": "go" }
    ]
  }
}
\`\`\`
`)

const STRS = yaml('StRS', 'headings', `# StRS

### REQ-001 对账要可追溯

- status: 草案
- owner: cmo
- verifier: 客户财务负责人
- traces: [MR-001]
`)

const PRD = yaml('PRD', 'headings', `# PRD

## Slices

| slice | Goal | Requirements (explicit ids) | Exit condition |
|---|---|---|---|
| S1 | 最小端到端 | REQ-002 | ok |

### REQ-002 导入流水

- status: draft
- source: [MR-001]
- traces: [REQ-001]
- acceptance:
  - AC-002-1
    - given: 有流水
    - when: 导入
    - then: 生成草稿
`)

/** 旧形状（json-ledger）只读兼容样例；迁移期仍须可校验。 */
const LEGACY_PRD = yaml('PRD', 'json-ledger', `# PRD

\`\`\`json
{
  "prd": {
    "version": "0.1",
    "status": "draft",
    "slices": [{ "id": "S1", "goal": "最小端到端", "requirements": ["REQ-002"] }],
    "requirements": [
      {
        "id": "REQ-002",
        "title": "导入流水",
        "type": "functional",
        "priority": "P0",
        "status": "draft",
        "source": ["MR-001"],
        "traces": ["REQ-001"],
        "slice": "S1",
        "userStory": "作为财务，我要导入流水",
        "acceptance": [{ "id": "AC-002-1", "given": "有流水", "when": "导入", "then": "生成草稿" }],
        "dependsOn": [],
        "verification": "test",
        "openQuestions": [],
        "changeLog": []
      }
    ]
  }
}
\`\`\`
`)

const SYRS = yaml('SyRS', 'headings', `### REQ-003 系统应能对账

- status: 草案
- owner: vp-eng
- traces: [REQ-002]
`)

const IRS = yaml('IRS', 'headings', `### IF-001 流水接入接口

- status: 草案
- owners: [firmware, electronics]
- traces: [REQ-003]
`)

const VV = yaml('V&V', 'table-rows', `| TC | 层级 | covers | 方法 | 判据 |
|---|---|---|---|---|
| TC-001 | L3 系统 | REQ-003, IF-001 | 测试 | 可复算 |
| TC-002 | L4 验收 | REQ-001, REQ-002 | 演示 | 客户点头 |
`)

const ALL_LAYERS: readonly Layer[] = ['MRD', 'StRS', 'PRD', 'SyRS', 'IRS', 'V&V']

const docs = (...entries: readonly (readonly [string, string])[]): MotionDoc[] =>
  entries.map(([rel, text]) => ({ rel: `drafts/${rel}`, text }))

const clean = () => docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD], ['syrs.md', SYRS], ['irs.md', IRS], ['vv-plan.md', VV])

const meta = (lines: readonly string[]) => ({ rel: 'meta.md', text: lines.join('\n') })

describe('解析层与定义形态', () => {
  it('parseHeader 取 layer/definition；无头返回 null', () => {
    expect(parseHeader(STRS)).toEqual({ layer: 'StRS', definition: 'headings' })
    expect(parseHeader('# 无头\n')).toBeNull()
  })

  it('clean 五层链 + V&V → ok，计数与索引派生', () => {
    const result = checkRequirements({ docs: clean() }, { layers: ALL_LAYERS })
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.index.counts).toEqual({ MR: 1, REQ: 3, IF: 1, TC: 2, AC: 1 })
    expect(result.index.matrix['MR-001']).toEqual(['REQ-001', 'REQ-002'])
    expect(result.index.matrix['REQ-002']).toEqual(['REQ-003', 'TC-002'])
    expect(result.index.definitions).toHaveLength(8)
  })

  it('缺 layer/definition 头、层与定义形态不匹配 → 红', () => {
    const noHead = checkRequirements({ docs: [{ rel: 'drafts/mrd.md', text: '# 裸文档\n' }] })
    expect(noHead.errors.join()).toContain('缺 layer/definition 头')
    const wrongForm = checkRequirements({ docs: docs(['strs.md', yaml('StRS', 'json-ledger', '```json\n{}\n```')]) })
    expect(wrongForm.errors.join()).toContain('definition 与层不匹配')
    const badLayer = checkRequirements({ docs: docs(['mrd.md', yaml('MRX', 'json-ledger', '```json\n{}\n```')]) })
    expect(badLayer.errors.join()).toContain('layer 非法')
  })

  it('PRD 新形状 headings 通过；旧 json-ledger 只读兼容；其他形态仍红', () => {
    const fresh = checkRequirements({ docs: docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD]) })
    expect(fresh.errors, fresh.errors.join('\n')).toEqual([])
    expect(fresh.index.counts.AC).toBe(1)
    const legacy = checkRequirements({ docs: docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', LEGACY_PRD]) })
    expect(legacy.errors, legacy.errors.join('\n')).toEqual([])
    const wrong = checkRequirements({ docs: docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', yaml('PRD', 'table-rows', '| REQ-002 | x |\n')]) })
    expect(wrong.errors.join()).toContain('definition 与层不匹配')
    expect(wrong.errors.join()).toContain('旧动议兼容 json-ledger')
  })
})

describe('V4 负例：四类判红', () => {
  it('重复定义 → 红并点名两处', () => {
    const dup = docs(['mrd.md', MRD], ['strs.md', STRS], ['strs2.md', STRS])
    const result = checkRequirements({ docs: dup })
    const line = result.errors.find(error => error.startsWith('重复定义 REQ-001'))
    expect(line, result.errors.join('\n')).toBeDefined()
    expect(line).toContain('strs.md')
    expect(line).toContain('strs2.md')
  })

  it('悬空追溯 → 红', () => {
    const dangling = docs(['mrd.md', MRD], ['strs.md', STRS.replace('[MR-001]', '[MR-999]')])
    const result = checkRequirements({ docs: dangling })
    expect(result.errors.join()).toContain('悬空 traces REQ-001 → MR-999')
  })

  it('退役词 → 红', () => {
    const retired = docs(['mrd.md', MRD], ['strs.md', STRS.replace('- owner: cmo', '- owner: cmo\n- 旧号 STR-001')])
    const result = checkRequirements({ docs: retired })
    expect(result.errors.join()).toContain('退役词 STR-001')
  })

  it('孤儿（无上游边）→ 红', () => {
    const orphan = docs(['mrd.md', MRD], ['strs.md', STRS.replace('- traces: [MR-001]\n', '')])
    const result = checkRequirements({ docs: orphan })
    expect(result.errors.join()).toContain('孤儿 REQ-001')
  })

  it('散文里的「可追溯性」不算字段（锚定行首）', () => {
    const prose = docs(['mrd.md', MRD], ['strs.md', STRS.replace('- traces: [MR-001]', '- 说明：可追溯性由评审保证')])
    const result = checkRequirements({ docs: prose })
    expect(result.errors.join()).toContain('孤儿 REQ-001')
    expect(result.index.edges.filter(edge => edge.from === 'REQ-001')).toHaveLength(0)
  })
})

describe('定义形态按头声明解析', () => {
  it('headings 文档里的摘要表是引用，不产生重复定义', () => {
    const withSummary = IRS.replace('### IF-001', '| 接口 | 说明 |\n|---|---|\n| IF-001 | 摘要引用 |\n\n### IF-001')
    const result = checkRequirements({ docs: docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD], ['syrs.md', SYRS], ['irs.md', withSummary]) })
    expect(result.errors.join()).not.toContain('重复定义 IF-001')
    expect(result.index.counts.IF).toBe(1)
  })

  it('table-rows 的 V&V 从表头取 covers 列；缺 covers = 孤儿', () => {
    const noCovers = yaml('V&V', 'table-rows', `| TC | 层级 | 结果 |\n|---|---|---|\n| TC-001 | L3 | 未跑 |\n`)
    const result = checkRequirements({ docs: docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD], ['syrs.md', SYRS], ['vv-plan.md', noCovers]) })
    expect(result.errors.join()).toContain('孤儿 TC-001')
  })
})

describe('覆盖与计数', () => {
  it('V&V 在范围内时每条 REQ/IF 必须被 TC covers，否则未覆盖红', () => {
    const partial = yaml('V&V', 'table-rows', `| TC | covers |\n|---|---|\n| TC-001 | REQ-003 |\n`)
    const result = checkRequirements({ docs: docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD], ['syrs.md', SYRS], ['irs.md', IRS], ['vv-plan.md', partial]) }, { layers: ALL_LAYERS })
    expect(result.errors.join()).toContain('未覆盖 REQ-001')
    expect(result.errors.join()).toContain('未覆盖 IF-001')
  })

  it('MR 没被 StRS 追溯 = 未覆盖', () => {
    const result = checkRequirements({ docs: docs(['mrd.md', MRD]) })
    expect(result.errors.join()).toContain('未覆盖 MR-001')
  })

  it('区间计数断言（R8）→ 红', () => {
    const range = docs(['mrd.md', MRD], ['strs.md', STRS.replace('- owner: cmo', '- owner: cmo\n- 覆盖 IF-001~IF-021 共 21 条')])
    const result = checkRequirements({ docs: range })
    expect(result.errors.join()).toContain('区间计数断言')
  })
})

describe('范围与豁免（meta 标记）', () => {
  it('无 `numbering:` 标记 → skipped（旧动议只读豁免）', () => {
    const result = checkRequirements({ meta: meta(['slug: old-motion', 'kickoff: 2026-01-01']), docs: clean() })
    expect(result.skipped).toBe(true)
    expect(result.reason).toContain('只读豁免')
    expect(result.errors).toEqual([])
  })

  it('旧中文 编号体系/需求层 不再解析（canonical = numbering/layers）', () => {
    const result = checkRequirements({ meta: meta(['slug: old-motion', '编号体系: identity', '需求层: MRD']), docs: clean() })
    expect(result.skipped).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('`numbering: identity` + `layers:` → 缺层判红', () => {
    const result = checkRequirements({
      meta: meta(['slug: new-motion', 'numbering: identity', 'layers: MRD, StRS, PRD, SyRS']),
      docs: docs(['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD]),
    })
    expect(result.errors.join()).toContain('缺层 SyRS')
  })

  it('未知编号体系值 → 红（不静默跳过）', () => {
    const result = checkRequirements({ meta: meta(['numbering: legacy']), docs: clean() })
    expect(result.errors.join()).toContain('不在词表')
  })

  it('空值 `numbering:` 也是坏声明（declared 但不合法）——present 闸门同读这一个判据', () => {
    expect(numberingMarker(undefined)).toEqual({ declared: false, value: '', valid: false })
    expect(numberingMarker('slug: demo\n')).toEqual({ declared: false, value: '', valid: false })
    expect(numberingMarker('numbering:\n')).toEqual({ declared: true, value: '', valid: false })
    expect(numberingMarker('numbering: legacy\n')).toEqual({ declared: true, value: 'legacy', valid: false })
    expect(numberingMarker('numbering: identity\n')).toEqual({ declared: true, value: 'identity', valid: true })
    const result = checkRequirements({ meta: meta(['numbering:']), docs: clean() })
    expect(result.skipped).toBe(false)
    expect(result.errors.join()).toContain('不在词表')
  })
})

describe('产品类型包覆盖（2026-11-09）', () => {
  it('defaultLayers 覆盖缺省范围：不写需求层时不再要求 StRS', () => {
    const result = checkRequirements(
      { meta: meta(['numbering: identity']), docs: docs(['mrd.md', MRD], ['prd.md', PRD]) },
      { defaultLayers: ['MRD', 'PRD'] },
    )
    expect(result.layers).toEqual(['MRD', 'PRD'])
    expect(result.errors.join(), '不得再要求 StRS').not.toContain('缺层 StRS')
  })

  it('retiredPrefixes 为空：VR-001 不再判退役词', () => {
    const prd = `${PRD}\n- 验证：VR-001\n`
    const result = checkRequirements(
      { meta: meta(['numbering: identity', 'layers: MRD, PRD']), docs: docs(['mrd.md', MRD], ['prd.md', prd]) },
      { retiredPrefixes: [] },
    )
    expect(result.errors.join(), 'VR-001 不应判退役词').not.toContain('退役词')
  })

  it('未覆盖前缀仍按默认判红（回归：空数组不是关闭整个词表）', () => {
    const prd = `${PRD}\n- 验证：VR-001\n`
    const result = checkRequirements({ meta: meta(['numbering: identity', 'layers: MRD, PRD']), docs: docs(['mrd.md', MRD], ['prd.md', prd]) })
    expect(result.errors.join()).toContain('退役词 VR-001')
  })
})

describe('文档文本形状层与 /prd check 同源（BUG-160/162）', () => {
  const check = (prdText: string) => checkRequirements(
    { meta: meta(['numbering: identity', 'layers: MRD, PRD']), docs: docs(['mrd.md', MRD], ['prd.md', prdText]) },
    { layers: ['MRD', 'PRD'] },
  )

  it('BOM 不再让合法文档缺头/缺层：结论与 LF 版一致', () => {
    const lf = check(PRD)
    const bom = check(`\uFEFF${PRD}`)
    expect(bom.errors, bom.errors.join()).toEqual(lf.errors)
    expect(lf.errors.join()).not.toContain('缺 layer/definition 头')
    expect(validateProductDocs(MRD, `\uFEFF${PRD}`).ok).toBe(validateProductDocs(MRD, PRD).ok)
  })

  it('围栏里的示例 REQ 不进索引（两个校验器都不多出 REQ-999）', () => {
    const lf = check(PRD)
    const fenced = `${PRD}\n\`\`\`markdown\n### REQ-999 示例\n- status: 草案\n\`\`\`\n`
    const fencedResult = check(fenced)
    expect(fencedResult.errors, fencedResult.errors.join()).toEqual(lf.errors)
    expect(fencedResult.errors.join()).not.toContain('REQ-999')
    expect(validateProductDocs(MRD, fenced).errors.join()).not.toContain('REQ-999')
  })

  it('HTML 注释里的示例 REQ 同样不进索引', () => {
    const lf = check(PRD)
    const commented = `${PRD}\n<!--\n### REQ-999 示例\n- status: 草案\n-->\n`
    const result = check(commented)
    expect(result.errors, result.errors.join()).toEqual(lf.errors)
    expect(result.errors.join()).not.toContain('REQ-999')
  })
})

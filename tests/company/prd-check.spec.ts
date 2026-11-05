/** MRD/PRD 结构校验（keyless 纯逻辑；`/prd check` 的头注说明边界）。 */
import { describe, expect, it } from 'vitest'
import { extractJsonBlock, validateProductDocs } from '../../packages/company-pack/src/lib/prd-check.ts'

const mrd = (overrides = {}) => JSON.stringify({
  mrd: {
    version: '0.1',
    status: 'draft',
    productType: 'project-services',
    opportunities: [{
      id: 'MR-001', title: '对账自动化', segment: '制造企业财务', buyer: 'CFO',
      pain: '人工对账', evidence: [{ kind: 'fact', source: '客户访谈 2026-10' }],
      alternatives: ['Excel'], competitors: ['大 SI'], value: '快且可维护',
      success: ['对账工时下降 50%'], confidence: 'medium', recommendation: 'go',
    }],
    openQuestions: [],
    ...overrides,
  },
}, null, 2)

const prd = (overrides = {}) => JSON.stringify({
  prd: {
    version: '0.1',
    status: 'draft',
    slices: [{ id: 'S1', goal: '最小端到端', requirements: ['REQ-001'] }],
    requirements: [{
      id: 'REQ-001', title: '导入银行流水', type: 'functional', priority: 'P0', status: 'draft',
      source: ['MR-001'], slice: 'S1', userStory: '作为财务，我要导入流水，以便自动对账',
      // oxlint-disable-next-line unicorn/no-thenable -- AC 的给定字段名（Given/When/Then），模板与 /prd check 同源
      acceptance: [{ id: 'AC-001-1', given: '有流水文件', when: '导入', then: '生成对账草稿' }],
      dependsOn: [], verification: 'test', openQuestions: [], changeLog: [],
    }],
    ...overrides,
  },
}, null, 2)

const doc = (json: string) => `# 文档\n\n\`\`\`json\n${json}\n\`\`\`\n`

describe('extractJsonBlock', () => {
  it('取第一个 json 代码块；缺失/坏 JSON → 明确错误', () => {
    expect(extractJsonBlock(doc(mrd()))).toMatchObject({ ok: true })
    expect(extractJsonBlock('# 无块')).toMatchObject({ ok: false })
    const bad = extractJsonBlock('```json\n{nope}\n```')
    expect(bad).toMatchObject({ ok: false })
    if (!bad.ok) expect(bad.error).toContain('不可解析')
  })
})

describe('validateProductDocs', () => {
  it('合法一对 → ok，计数正确', () => {
    const result = validateProductDocs(doc(mrd()), doc(prd()))
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({ ok: true, mrdCount: 1, reqCount: 1, acCount: 1 })
  })

  it('REQ 重号 / 来源不存在 / AC 缺 then / 状态离开 draft 无 changeLog → 红', () => {
    const dup = JSON.parse(prd())
    dup.prd.requirements.push({ ...dup.prd.requirements[0], title: '重复' })
    expect(validateProductDocs(doc(mrd()), doc(JSON.stringify(dup))).errors.some(error => error.includes('重号'))).toBe(true)

    const unknownSource = JSON.parse(prd())
    unknownSource.prd.requirements[0].source = ['MR-999']
    expect(validateProductDocs(doc(mrd()), doc(JSON.stringify(unknownSource))).errors.some(error => error.includes('不存在的 MR'))).toBe(true)

    const noThen = JSON.parse(prd())
    delete noThen.prd.requirements[0].acceptance[0].then
    expect(validateProductDocs(doc(mrd()), doc(JSON.stringify(noThen))).errors.some(error => error.includes('then'))).toBe(true)

    const ready = JSON.parse(prd())
    ready.prd.requirements[0].status = 'ready'
    expect(validateProductDocs(doc(mrd()), doc(JSON.stringify(ready))).errors.some(error => error.includes('changeLog'))).toBe(true)
  })

  it('依赖环 / slice 未列出 REQ → 红', () => {
    const cycle = JSON.parse(prd())
    cycle.prd.requirements.push({
      ...cycle.prd.requirements[0], id: 'REQ-002', title: '第二', dependsOn: ['REQ-001'],
      // oxlint-disable-next-line unicorn/no-thenable -- AC 的给定字段名（Given/When/Then）
      acceptance: [{ id: 'AC-002-1', given: 'g', when: 'w', then: 't' }],
    })
    cycle.prd.requirements[0].dependsOn = ['REQ-002']
    cycle.prd.slices[0].requirements.push('REQ-002')
    expect(validateProductDocs(doc(mrd()), doc(JSON.stringify(cycle))).errors.some(error => error.includes('依赖环'))).toBe(true)

    const missing = JSON.parse(prd())
    missing.prd.slices[0].requirements = ['REQ-999']
    expect(validateProductDocs(doc(mrd()), doc(JSON.stringify(missing))).errors.some(error => error.includes('REQ-999'))).toBe(true)
  })

  it('MRD 机会缺证据 → 红', () => {
    const m = JSON.parse(mrd())
    m.mrd.opportunities[0].evidence = []
    expect(validateProductDocs(doc(JSON.stringify(m)), doc(prd())).errors.some(error => error.includes('evidence'))).toBe(true)
  })
})

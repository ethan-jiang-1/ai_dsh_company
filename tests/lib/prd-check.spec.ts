/** MRD/PRD 结构校验（keyless 纯逻辑；`/prd check` 的头注说明边界）。 */
// 负例留证 2026-11-14：拆掉 normalizeDocument → CRLF/BOM 用例红（BUG-152）
// 负例留证 2026-11-14：拆掉 fence 状态 → 围栏三条用例红（BUG-153）
// 负例留证 2026-11-14：拆掉 AC/slice 的 seen 集合 → 重号两条用例红（BUG-157）
// 负例留证 2026-11-14：去掉 scanDocument 的 HTML 注释状态 → 注释用例红（BUG-162）
// 负例留证 2026-11-14：去掉 slice 的 reqOwner 映射 → 跨 slice 用例红（BUG-164）
// 负例留证 2026-11-14：还原 splitTableRow 为 split('|') → 转义竖线用例红（BUG-165）
// 负例留证 2026-11-14：去掉 changeLog 的日期/作者校验 → 假日期用例红（BUG-166）
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { extractJsonBlock, parsePrdSlices, validateProductDocs } from '../../packages/company-pack/src/lib/prd-check.ts'
import { splitTableRow } from '../../packages/company-pack/src/lib/markdown-shape.ts'

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

const requirementSection = (overrides: {
  id?: string
  title?: string
  userStory?: string | null
  acceptance?: string
  source?: string
  traces?: string
  slice?: string
  type?: string
  priority?: string
  status?: string
  verification?: string
  dependsOn?: string
  changeLog?: string
} = {}): string => {
  const {
    id = 'REQ-001', title = '导入银行流水', userStory = '作为财务，我要导入流水，以便自动对账',
    acceptance = '  - AC-001-1\n    - given: 有流水文件\n    - when: 导入\n    - then: 生成对账草稿',
    source = '[MR-001]', traces = '[REQ-001]', slice = 'S1', type = 'functional', priority = 'P0',
    status = 'draft', verification = 'test', dependsOn = '[]', changeLog = '[]',
  } = overrides
  return [
    `### ${id} ${title}`,
    '',
    ...(userStory === null ? [] : [`- userStory: ${userStory}`]),
    '- acceptance:',
    acceptance,
    `- source: ${source}`,
    `- traces: ${traces}`,
    `- slice: ${slice}`,
    `- type: ${type}`,
    `- priority: ${priority}`,
    `- status: ${status}`,
    `- verification: ${verification}`,
    `- dependsOn: ${dependsOn}`,
    '- openQuestions: []',
    `- changeLog: ${changeLog}`,
    '',
  ].join('\n')
}

const prd = ({ slices = '| S1 | 最小端到端 | REQ-001 | 导出草稿 |', sections = requirementSection(), header = '---\nlayer: PRD\ndefinition: headings\n---\n', includeSlices = true } = {}): string => `${header}
# PRD
${includeSlices ? `
## Slices

| slice | Goal | Requirements (explicit ids) | Exit condition |
|---|---|---|---|
${slices}
` : ''}
## Requirements (definition point)

${sections}`

/** 旧形状（json-ledger）只读兼容样例。 */
const legacyPrd = (overrides = {}) => JSON.stringify({
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

const legacyDoc = (json: string) => `---\nlayer: PRD\ndefinition: json-ledger\n---\n\n\`\`\`json\n${json}\n\`\`\`\n`
const mrdDoc = (json: string) => `# MRD\n\n\`\`\`json\n${json}\n\`\`\`\n`

describe('extractJsonBlock', () => {
  it('取第一个 json 代码块；缺失/坏 JSON → 明确错误', () => {
    expect(extractJsonBlock(mrdDoc(mrd()))).toMatchObject({ ok: true })
    expect(extractJsonBlock('# 无块')).toMatchObject({ ok: false })
    const bad = extractJsonBlock('```json\n{nope}\n```')
    expect(bad).toMatchObject({ ok: false })
    if (!bad.ok) expect(bad.error).toContain('不可解析')
  })
})

describe('validateProductDocs（headings PRD）', () => {
  it('合法一对 → ok，计数正确', () => {
    const result = validateProductDocs(mrdDoc(mrd()), prd())
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({ ok: true, mrdCount: 1, reqCount: 1, acCount: 1 })
  })

  it('硬件工程枚举直接可写：nonFunctional / demonstration / analysis / inspection 不判红', () => {
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ type: 'nonFunctional', verification: 'demonstration' }) })).errors).toEqual([])
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ verification: 'analysis' }) })).errors).toEqual([])
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ verification: 'inspection' }) })).errors).toEqual([])
  })

  it('REQ 定义小节：缺 userStory / 非法 type / 缺 AC 的 then / AC 号不跟父 REQ → 红', () => {
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ userStory: null }) })).errors.join())
      .toContain('userStory 缺失')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ type: 'banana' }) })).errors.join())
      .toContain('type 必须是')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ acceptance: '  - AC-001-1\n    - given: 有流水\n    - when: 导入' }) })).errors.join())
      .toContain('then 缺失')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ acceptance: '  - AC-002-1\n    - given: g\n    - when: w\n    - then: t' }) })).errors.join())
      .toContain('与父 REQ 编号不一致')
  })

  it('REQ 重号 / 状态离开 draft 无 changeLog / changeLog 条目形状坏 → 红', () => {
    const duplicate = prd({ sections: `${requirementSection()}\n${requirementSection({ title: '重复' })}` })
    expect(validateProductDocs(mrdDoc(mrd()), duplicate).errors.join()).toContain('重号')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ status: 'ready' }) })).errors.join())
      .toContain('changeLog')
    const badLog = prd({ sections: requirementSection({ changeLog: '\n  - 不是日期作者变更' }) })
    expect(validateProductDocs(mrdDoc(mrd()), badLog).errors.join()).toContain('changeLog 条目必须是')
  })

  it('changeLog 合法条目（日期 · 作者 · 变更）→ 通过', () => {
    const text = prd({ sections: requirementSection({ status: 'ready', changeLog: '\n  - 2026-11-13 · vp-eng · 修订验收口径' }) })
    expect(validateProductDocs(mrdDoc(mrd()), text).errors).toEqual([])
  })

  it('来源 MR 不存在 / slice 未列 REQ / slice 区间 / 依赖环 → 红', () => {
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ source: '[MR-999]' }) })).errors.join())
      .toContain('不存在的 MR')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ slice: 'S2' }) })).errors.join())
      .toContain('不存在的 slice')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ slices: '| S1 | 端到端 | REQ-001…REQ-003 | ok |' })).errors.join())
      .toContain('显式 REQ id')
    const cycleSections = `${requirementSection({ dependsOn: '[REQ-002]' })}\n${requirementSection({ id: 'REQ-002', title: '第二条', acceptance: '  - AC-002-1\n    - given: g\n    - when: w\n    - then: t', dependsOn: '[REQ-001]' })}`
    const cycleSlices = '| S1 | 端到端 | REQ-001, REQ-002 | ok |'
    expect(validateProductDocs(mrdDoc(mrd()), prd({ slices: cycleSlices, sections: cycleSections })).errors.join())
      .toContain('依赖环')
  })

  it('缺 Slices 表 / 缺 definition 头 / 缺定义小节 → 红', () => {
    expect(validateProductDocs(mrdDoc(mrd()), prd({ includeSlices: false })).errors.join()).toContain('## Slices')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ header: '' })).errors.join()).toContain('definition')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: '' })).errors.join()).toContain('没有 `### REQ-###` 定义小节')
  })

  it('MRD 机会缺证据 / 非法 confidence → 红', () => {
    const m = JSON.parse(mrd())
    m.mrd.opportunities[0].evidence = []
    expect(validateProductDocs(mrdDoc(JSON.stringify(m)), prd()).errors.join()).toContain('evidence')
    const c = JSON.parse(mrd())
    c.mrd.opportunities[0].confidence = 'medium-low'
    expect(validateProductDocs(mrdDoc(JSON.stringify(c)), prd()).errors.join()).toContain('confidence')
  })
})

describe('旧形状兼容（json-ledger，只读）', () => {
  it('旧 PRD 仍按旧 schema 校验通过', () => {
    const result = validateProductDocs(mrdDoc(mrd()), legacyDoc(legacyPrd()))
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({ ok: true, reqCount: 1, acCount: 1 })
  })

  it('旧 PRD 的错误照旧报（枚举/断链不因迁移静默）', () => {
    const bad = JSON.parse(legacyPrd())
    bad.prd.requirements[0].verification = 'demonstration'
    expect(validateProductDocs(mrdDoc(mrd()), legacyDoc(JSON.stringify(bad))).errors.join()).toContain('verification 必须是 test|demo|review')
    const dangling = JSON.parse(legacyPrd())
    dangling.prd.requirements[0].source = ['MR-999']
    expect(validateProductDocs(mrdDoc(mrd()), legacyDoc(JSON.stringify(dangling))).errors.join()).toContain('不存在的 MR')
  })
})

describe('随包模板与校验器同源', () => {
  it('content/templates/{mrd,prd}.md 的示例可直接通过 validateProductDocs', () => {
    const template = (name: string) => readFileSync(join(ROOT, 'packages/company-pack/content/templates', name), 'utf8')
    const result = validateProductDocs(template('mrd.md'), template('prd.md'))
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({ ok: true, mrdCount: 1, reqCount: 1, acCount: 1 })
  })

  it('PRD 模板不再带 JSON 账本；定义点是小节标题', () => {
    const text = readFileSync(join(ROOT, 'packages/company-pack/content/templates/prd.md'), 'utf8')
    expect(text).not.toContain('```json')
    expect(text).toContain('definition: headings')
    expect(text).toMatch(/^### REQ-\d{3} /m)
  })
})

describe('来源 MR 的判词边界', () => {
  it('no-go 不得进 PRD；defer 不得进 P0；defer 进 P2 可过', () => {
    const base = JSON.parse(mrd()).mrd.opportunities[0]
    const noGo = mrd({ opportunities: [{ ...base, recommendation: 'no-go' }] })
    expect(validateProductDocs(mrdDoc(noGo), prd()).errors.join()).toContain('no-go')
    const defer = mrd({ opportunities: [{ ...base, recommendation: 'defer' }] })
    expect(validateProductDocs(mrdDoc(defer), prd()).errors.join()).toContain('defer')
    expect(validateProductDocs(mrdDoc(defer), prd({ sections: requirementSection({ priority: 'P2' }) })).errors).toEqual([])
  })
})

describe('数组字段不得内联成标量', () => {
  it('source 空 / dependsOn 指向不存在 → 红', () => {
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ source: '[]' }) })).errors.join())
      .toContain('source 不能为空')
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ dependsOn: 'REQ-999' }) })).errors.join())
      .toContain('不存在的 REQ')
  })
})

describe('平台文本形状（BUG-152：BOM / CRLF）', () => {
  it('LF / CRLF / BOM+CRLF 三种编码 → 同判 ok、同计数，错误文本不指向内容缺失', () => {
    const base = validateProductDocs(mrdDoc(mrd()), prd())
    expect(base).toMatchObject({ ok: true, reqCount: 1, acCount: 1 })
    for (const text of [prd().replace(/\n/g, '\r\n'), `\uFEFF${prd()}`, `\uFEFF${prd().replace(/\n/g, '\r\n')}`]) {
      const result = validateProductDocs(mrdDoc(mrd()), text)
      expect(result.errors, result.errors.join()).toEqual([])
      expect(result).toMatchObject({ ok: true, reqCount: 1, acCount: 1 })
    }
  })
})

describe('围栏代码块不是定义（BUG-153）', () => {
  const fenced = (fence: string, body: string) => `${fence}markdown\n${body}\n${fence}`

  it('围栏里的 ### REQ-999 不被当成需求定义', () => {
    const sections = `${requirementSection()}\n${fenced('```', '### REQ-999 示例\n- userStory: 示例')}\n`
    const result = validateProductDocs(mrdDoc(mrd()), prd({ sections }))
    expect(result.errors, result.errors.join()).toEqual([])
    expect(result).toMatchObject({ ok: true, reqCount: 1 })
  })

  it('围栏里的 ## Slices 表不顶掉真实表（``` 与 ~~~ 两族都认）', () => {
    const table = '| S9 | 示例 | REQ-999 | ok |\n## Slices\n### REQ-999 示例'
    for (const fence of ['```', '~~~']) {
      const slices = `| S1 | 最小端到端 | REQ-001 | 导出草稿 |\n\n${fenced(fence, table)}`
      const result = validateProductDocs(mrdDoc(mrd()), prd({ slices }))
      expect(result.errors, `${fence}：${result.errors.join()}`).toEqual([])
      expect(result).toMatchObject({ ok: true, reqCount: 1 })
    }
  })

  it('围栏外仍正常解析（示例与真实定义并存）', () => {
    const sections = `${requirementSection()}\n${fenced('```', '### REQ-999 示例')}\n${requirementSection({ id: 'REQ-002', title: '第二条', acceptance: '  - AC-002-1\n    - given: g\n    - when: w\n    - then: t' })}\n`
    const result = validateProductDocs(mrdDoc(mrd()), prd({ slices: '| S1 | 最小端到端 | REQ-001, REQ-002 | 导出草稿 |', sections }))
    expect(result.errors, result.errors.join()).toEqual([])
    expect(result).toMatchObject({ ok: true, reqCount: 2 })
  })
})

describe('身份唯一性（BUG-157）', () => {
  it('同一 REQ 下 AC 重号 → 红；合法多 AC → 绿', () => {
    const dup = '  - AC-001-1\n    - given: g\n    - when: w\n    - then: t\n  - AC-001-1\n    - given: g2\n    - when: w2\n    - then: t2'
    expect(validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ acceptance: dup }) })).errors.join())
      .toContain('AC-001-1 重号')
    const legal = '  - AC-001-1\n    - given: g\n    - when: w\n    - then: t\n  - AC-001-2\n    - given: g2\n    - when: w2\n    - then: t2'
    const result = validateProductDocs(mrdDoc(mrd()), prd({ sections: requirementSection({ acceptance: legal }) }))
    expect(result.errors, result.errors.join()).toEqual([])
    expect(result).toMatchObject({ ok: true, acCount: 2 })
  })

  it('slice id 重号 → 红（一个 REQ 不能同时属于两个同名 slice）', () => {
    const slices = '| S1 | 最小端到端 | REQ-001 | ok |\n| S1 | 重复 | REQ-001 | ok |'
    expect(validateProductDocs(mrdDoc(mrd()), prd({ slices })).errors.join()).toContain('slice S1 重号')
  })
})

describe('HTML 注释不是定义（BUG-162）', () => {
  it('多行注释里的 REQ/Slices 不算定义；注释外正常解析', () => {
    const comment = '<!--\n## Slices\n| S9 | 示例 | REQ-999 | ok |\n### REQ-999 示例\n- userStory: 示例\n-->\n'
    const result = validateProductDocs(mrdDoc(mrd()), prd({ sections: `${requirementSection()}\n${comment}` }))
    expect(result.errors, result.errors.join()).toEqual([])
    expect(result).toMatchObject({ ok: true, reqCount: 1 })
  })

  it('行内注释片段从行文本移除，同行剩余内容仍解析', () => {
    const sections = requirementSection().replace(
      '- userStory: 作为财务，我要导入流水，以便自动对账',
      '- userStory: 作为财务，我要导入流水 <!-- 旧版示例 -->，以便自动对账',
    )
    const result = validateProductDocs(mrdDoc(mrd()), prd({ sections }))
    expect(result.errors, result.errors.join()).toEqual([])
  })
})

describe('一个 REQ 只能属于一个 slice（BUG-164）', () => {
  it('同一 REQ 列进两个 slice → 红并点名两处', () => {
    const slices = '| S1 | 最小端到端 | REQ-001 | ok |\n| S2 | 另一个 | REQ-001 | ok |'
    const result = validateProductDocs(mrdDoc(mrd()), prd({ slices }))
    expect(result.errors.join()).toContain('REQ-001 同时列在 slice S1 与 S2')
  })

  it('同一 slice 行里重复列同一 REQ → 红', () => {
    const result = validateProductDocs(mrdDoc(mrd()), prd({ slices: '| S1 | 最小端到端 | REQ-001, REQ-001 | ok |' }))
    expect(result.errors.join()).toContain('重复列出 REQ-001')
  })

  it('单归属（合法形状）→ 绿', () => {
    const result = validateProductDocs(mrdDoc(mrd()), prd())
    expect(result.errors, result.errors.join()).toEqual([])
  })
})

describe('Slices 表按未转义竖线切列（BUG-165）', () => {
  it('Goal 里的 \\| 不拆列；cell 保留字面竖线', () => {
    const text = prd({ slices: '| S1 | A \\| B | REQ-001 | ok |' })
    const errors: string[] = []
    expect(parsePrdSlices(text, errors)).toEqual([{ id: 'S1', goal: 'A | B', requirements: ['REQ-001'] }])
    expect(errors).toEqual([])
    expect(validateProductDocs(mrdDoc(mrd()), text).errors).toEqual([])
  })
})

describe('changeLog 日期/作者形状（BUG-166）', () => {
  const withLog = (log: string) => prd({ sections: requirementSection({ status: 'ready', changeLog: `\n  - ${log}` }) })

  it('真实日历日期 + 非空作者/变更 → 绿', () => {
    expect(validateProductDocs(mrdDoc(mrd()), withLog('2026-11-14 · alice · 修订验收口径')).errors).toEqual([])
  })

  it('假日期 / 非闰年 2 月 29 / 空作者 → 红', () => {
    expect(validateProductDocs(mrdDoc(mrd()), withLog('2026-13-99 · nobody · bad')).errors.join()).toContain('真实日历日期')
    expect(validateProductDocs(mrdDoc(mrd()), withLog('2026-02-29 · nobody · bad')).errors.join()).toContain('真实日历日期')
    expect(validateProductDocs(mrdDoc(mrd()), withLog('2026-11-14 · · bad')).errors.join()).toContain('作者不能为空')
  })
})

describe('行内代码与注释容器（BUG-168/169）', () => {
  it('行内代码里的注释记号不起注释作用', () => {
    const sections = requirementSection().replace(
      '- userStory: 作为财务，我要导入流水，以便自动对账',
      '- userStory: 支持 `<!--` 注释语法，以便自动对账',
    )
    const result = validateProductDocs(mrdDoc(mrd()), prd({ sections }))
    expect(result.errors, result.errors.join()).toEqual([])
  })

  it('未闭合 HTML 注释 → 报根因，不报「没有需求」', () => {
    const sections = `${requirementSection()}\n<!-- 未闭合\n`
    const result = validateProductDocs(mrdDoc(mrd()), prd({ sections }))
    expect(result.errors.join()).toContain('HTML 注释未闭合')
    expect(result.errors.join()).not.toContain('没有 `### REQ-###` 定义小节')
  })
})

describe('双反斜杠的表格转义（BUG-172）', () => {
  it('`\\\\` 是字面反斜杠，后面的竖线仍分列；`\\|` 仍是字面竖线', () => {
    expect(splitTableRow('| S1 | C:\\\\ | REQ-001 | ok |')).toEqual(['S1', 'C:\\', 'REQ-001', 'ok'])
    expect(splitTableRow('| S1 | A \\| B | REQ-001 | ok |')).toEqual(['S1', 'A | B', 'REQ-001', 'ok'])
  })
})

describe('注释里的 legacy JSON（BUG-173）', () => {
  it('HTML 注释里的 json 账本不生效（不再被当成定义）', () => {
    const commented = `---\nlayer: PRD\ndefinition: json-ledger\n---\n\n<!--\n\`\`\`json\n${legacyPrd()}\n\`\`\`\n-->\n`
    const result = validateProductDocs(mrdDoc(mrd()), commented)
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('缺 ```json 需求块')
  })
})

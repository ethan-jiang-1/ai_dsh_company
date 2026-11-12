/**
 * 编号合同（A1）的 keyless 判据：合同文本在场、R1–R10 齐、退役词只在退役节、
 * 五层/定义形态/范围豁免/并发有条款；meta 模板带 `编号体系` 标记且 validateMeta 容得下额外字段。
 *
 * 病根（2026-11-07 研究失败 #2）：pack 的 preset 说 `IF/VP`、workspace 的 kb 种子说
 * `STR/SYR/IFR`——第二套词表同时活着，Agent 换个 workspace 就换一套语法。本 spec 把「唯一词表」
 * 钉在合同上：正文规则不得出现退役号形，退役词只许住在退役节。
 *
 * 红配方：删掉合同任一 R 行 / 把 `STR-###` 写回正文 → 本 spec 转红。
 * 负例留证 2026-11-07：合同文件不存在时本 spec 首跑 4 failed（合同缺失 / R1 / 退役节 / 层表），
 * 补文件后全绿（见卡 `## 交付证据`）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateMeta } from '../../tools/lib/deliverables.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const CONTENT = join(ROOT, 'packages/company-pack/content')
const CONTRACT = join(CONTENT, 'product-types/hardware-software/requirements-model.md')
const read = (path: string): string => readFileSync(path, 'utf8')

/** 退役号形（不是角色名）：`VP-Eng` 不匹配，`VP-001` / `VP-###` 匹配。 */
const RETIRED = /\b(?:STR|SYR|IFR|VR|VP|V)-(?:#|\d)/

describe('编号合同：requirements-model.md', () => {
  it('合同在场，R1–R10 全部有条目', () => {
    expect(existsSync(CONTRACT), 'content/product-types/hardware-software/requirements-model.md 缺失——编号合同没有唯一家').toBe(true)
    const text = read(CONTRACT)
    for (let n = 1; n <= 10; n += 1) {
      expect(text, `合同缺规则 R${String(n)}`).toContain(`| R${String(n)} |`)
    }
  })

  it('退役词只住退役节：正文规则不出现旧号形', () => {
    const text = read(CONTRACT)
    const start = text.indexOf('## 退役词')
    expect(start, '合同缺「## 退役词」节——退役词没有可判定的落点').toBeGreaterThan(-1)
    const nextHeading = text.indexOf('\n## ', start + 1)
    const retiredSection = nextHeading === -1 ? text.slice(start) : text.slice(start, nextHeading)
    const outside = text.slice(0, start) + (nextHeading === -1 ? '' : text.slice(nextHeading))

    expect(RETIRED.test(retiredSection), '退役节必须点名被退役的旧号形').toBe(true)
    expect(RETIRED.test(outside), '正文规则出现了退役号形——唯一词表破了').toBe(false)
  })

  it('五层表、四种定义形态、范围豁免与并发口径都有条款', () => {
    const text = read(CONTRACT)
    for (const layer of ['MRD', 'StRS', 'PRD', 'SyRS', 'IRS']) {
      expect(text, `五层缺 ${layer}`).toContain(layer)
    }
    for (const form of ['json-ledger', 'headings', 'table-rows', 'none']) {
      expect(text, `定义形态缺 ${form}`).toContain(form)
    }
    expect(text, '缺 `编号体系` 范围标记').toContain('编号体系:')
    expect(text, '缺旧动议豁免的 skipped 口径').toContain('skipped')
    expect(text, '缺并发取号口径（max+1）').toMatch(/max\s*\+\s*1/)
    expect(text, '缺行首字段解析口径（traces 不能子串匹配）').toMatch(/traces:/)
  })
})

describe('编号范围标记：meta 模板', () => {
  it('meta 模板带 `编号体系:` / `productType:` / `deliveryMode:` / `需求层:` 标记', () => {
    const meta = read(join(CONTENT, 'templates/meta.md'))
    expect(meta, 'meta 模板缺 `编号体系:` 标记——新动议进不了编号检查').toMatch(/^编号体系:/m)
    expect(meta, 'meta 模板缺 `productType:` 标记——动议级类型没有声明面').toMatch(/^productType:/m)
    expect(meta, 'meta 模板缺 `deliveryMode:` 标记——交付模式没有声明面').toMatch(/^deliveryMode:/m)
    expect(meta, 'meta 模板仍用旧中文产品类型字段').not.toMatch(/^产品类型\s*[:：]/m)
    expect(meta, 'meta 模板仍用旧中文交付模式字段').not.toMatch(/^交付模式\s*[:：]/m)
    expect(meta, 'meta 模板缺 `需求层:` 标记——缺层判红没有声明面').toMatch(/^需求层:/m)
  })

  it('validateMeta 接受额外字段（标记不破既有户口形状）', () => {
    const sample = [
      'slug: numbering-demo',
      'kickoff: 2026-11-07',
      'type: decision',
      'result: in-progress',
      '编号体系: identity',
      '需求层: MRD, StRS, PRD, SyRS, IRS',
      '',
    ].join('\n')
    const result = validateMeta(sample)
    expect(result.problems, `validateMeta 拒绝带标记的 meta：${result.problems.join('；')}`).toEqual([])
    expect(result.fields.get('编号体系')).toBe('identity')
    expect(result.fields.get('需求层')).toBe('MRD, StRS, PRD, SyRS, IRS')
  })
})

describe('门禁形态', () => {
  it('company-skeleton 把 process-docs 纳入随包在场检查', () => {
    const gate = read(join(ROOT, 'checks/gates/company-skeleton.mjs'))
    expect(gate, 'company-skeleton 的 required 缺编号合同').toContain('product-types/hardware-software/requirements-model.md')
  })

  it('base-clean 把 process-docs 纳入只读内容扫描', () => {
    const gate = read(join(ROOT, 'checks/gates/base-clean.mjs'))
    expect(gate, 'base-clean 的 TEXT_FILES 缺编号合同').toContain('product-types/hardware-software/requirements-model.md')
  })
})

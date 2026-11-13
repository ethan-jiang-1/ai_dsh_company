/**
 * 两轴 scenario matrix（2026-11-11）：产品类型 × 交付模式 的 `/req check` 回执与错误面。
 *
 * 覆盖：business/hardware × 缺省/productized/project-services/managed-service；
 * 边界：占位符、YAML 引号、行内注释、未知 mode、把 mode 误写成产品类型。
 *
 * 红配方：去掉 req-command 的 mode note → 回执断言红；去掉未知 mode 校验 → 未知 mode 用例红；
 * 把 project-services 加进 product-types → 该 scenario 的“误写成类型”用例语义翻转。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerReqCommand } from '../../../packages/company-pack/src/host/commands/req-command.ts'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const CONTENT_DIR = join(ROOT, 'packages/company-pack/content')
const MRD = `---\nlayer: MRD\ndefinition: json-ledger\n---\n\n\`\`\`json\n{"mrd":{"version":"0.1","status":"draft","opportunities":[{"id":"MR-001","title":"机会","recommendation":"go"}]}}\n\`\`\`\n`
const STRS = `---\nlayer: StRS\ndefinition: headings\n---\n\n### REQ-001 涉众诉求\n\n- status: 草案\n- traces: [MR-001]\n`
const PRD = `---
layer: PRD
definition: headings
---

## Slices

| slice | Goal | Requirements (explicit ids) | Exit condition |
|---|---|---|---|
| S1 | 闭环 | REQ-002 | ok |

### REQ-002 需求

- userStory: 作为用户我要它
- acceptance:
  - AC-002-1
    - given: g
    - when: w
    - then: t
- source: [MR-001]
- traces: [REQ-001]
- slice: S1
- type: functional
- priority: P0
- status: draft
- verification: test
- dependsOn: []
- openQuestions: []
- changeLog: []
`

type Definition = { handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string, readonly text: string }> }

function mount(workspace: string): Definition {
  let definition: Definition | undefined
  const ctx = { commands: { register: (def: Definition) => { definition = def } } }
  registerReqCommand(ctx as never, { dataBlocked: false, workspace, contentDir: CONTENT_DIR })
  return definition as Definition
}

function fixture(type: string, mode?: string): { workspace: string; cleanup: () => void } {
  const workspace = mkdtempSync(join(tmpdir(), 'delivery-scenario-'))
  const root = join(workspace, '.dsh-company/deliverables/2026-11-11-demo')
  const drafts = join(root, 'drafts')
  mkdirSync(drafts, { recursive: true })
  const meta = ['slug: demo', 'kickoff: 2026-11-11', 'numbering: identity', `productType: ${type}`]
  if (mode !== undefined) meta.push(`deliveryMode: ${mode}`)
  writeFileSync(join(root, 'meta.md'), `${meta.join('\n')}\n`)
  for (const [name, body] of [['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD]] as const) writeFileSync(join(drafts, name), body)
  return { workspace, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

function writeDraft(workspace: string, name: string, body = '# 占位\n'): void {
  writeFileSync(join(workspace, '.dsh-company/deliverables/2026-11-11-demo/drafts', name), body)
}

const cases = [
  { type: 'business-software', mode: undefined, expect: 'productized（默认）' },
  { type: 'business-software', mode: 'productized', expect: 'productized' },
  { type: 'business-software', mode: 'project-services', expect: 'project-services' },
  { type: 'business-software', mode: 'managed-service', expect: 'managed-service' },
  { type: 'hardware-software', mode: undefined, expect: 'productized（默认）' },
  { type: 'hardware-software', mode: 'productized', expect: 'productized' },
  { type: 'hardware-software', mode: 'project-services', expect: 'project-services' },
  { type: 'hardware-software', mode: 'managed-service', expect: 'managed-service' },
] as const

describe.each(cases)('两轴 scenario：$type × $mode', ({ type, mode, expect: expected }) => {
  it('回执点名产品类型与交付模式', async () => {
    const { workspace, cleanup } = fixture(type, mode)
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain(`动议类型 = ${type}`)
      expect(result.text).toContain(`交付模式 = ${expected}`)
      if (mode === 'project-services') {
        expect(result.text).toContain(`content/delivery-modes/${mode}/`)
        expect(result.text).toContain('交付提醒：缺 sow.md / uat.md')
      } else if (mode === 'managed-service') {
        expect(result.text).toContain(`content/delivery-modes/${mode}/`)
        expect(result.text).toContain('交付提醒：缺 sla.md / runbook.md')
      } else {
        expect(result.text).not.toContain('交付提醒')
      }
    } finally { cleanup() }
  })
})

describe('两轴边界', () => {
  it('占位符交付模式 → 回落 productized（默认），不误报', async () => {
    const { workspace, cleanup } = fixture('business-software', '<productized|project-services|managed-service>')
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('交付模式 = productized（默认）')
    } finally { cleanup() }
  })

  it('YAML 引号 / 行内注释 → 仍解析为真实模式', async () => {
    for (const mode of ['"managed-service"', 'managed-service # 默认']) {
      const { workspace, cleanup } = fixture('business-software', mode)
      try {
        const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
        expect(result.kind, mode).toBe('success')
        expect(result.text, mode).toContain('交付模式 = managed-service')
      } finally { cleanup() }
    }
  })

  it('project-services 补齐 SOW/UAT → 不再提醒缺文档', async () => {
    const { workspace, cleanup } = fixture('business-software', 'project-services')
    try {
      writeDraft(workspace, 'sow.md')
      writeDraft(workspace, 'uat.md')
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).not.toContain('交付提醒：缺')
    } finally { cleanup() }
  })

  it('managed-service 补齐 SLA/Runbook → 不再提醒缺文档', async () => {
    const { workspace, cleanup } = fixture('business-software', 'managed-service')
    try {
      writeDraft(workspace, 'sla.md')
      writeDraft(workspace, 'runbook.md')
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).not.toContain('交付提醒：缺')
    } finally { cleanup() }
  })

  it('productized 出现 SOW → 提醒确认交付模式', async () => {
    const { workspace, cleanup } = fixture('business-software', 'productized')
    try {
      writeDraft(workspace, 'sow.md')
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('productized 动议出现 SOW/SLA')
    } finally { cleanup() }
  })

  it('未知交付模式 → error，列 productized + 包', async () => {
    const { workspace, cleanup } = fixture('business-software', 'nope')
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('未知交付模式「nope」')
      expect(result.text).toContain('productized')
      expect(result.text).toContain('managed-service')
    } finally { cleanup() }
  })

  it('把交付模式误写成产品类型 → 未知产品类型 error', async () => {
    const { workspace, cleanup } = fixture('project-services', 'managed-service')
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('未知产品类型「project-services」')
    } finally { cleanup() }
  })
})

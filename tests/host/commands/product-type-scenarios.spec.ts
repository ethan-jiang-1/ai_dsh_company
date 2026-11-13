/**
 * 产品类型 scenario matrix（2026-11-11）：类型 × 声明层 × 文档在场 的 `/req check` 行为。
 *
 * 覆盖：
 *   - business-software / hardware-software 默认链（到 PRD）都通过；
 *   - hardware-software 可选扩 SyRS；
 *   - business-software 声明 SyRS → fail-closed（类型包不支持该层）；
 *   - 声明了层但文档缺席 → 缺层红；
 *   - 未声明的额外文档 → 不强行纳入范围（默认链仍通过）。
 *
 * 红配方：去掉 req-command 的“声明层 ⊆ 类型包 layers”校验 → business+SyRS 用例红；
 * 去掉 checker 的缺层检查 → 缺层用例红。
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
const SYRS = `---\nlayer: SyRS\ndefinition: headings\n---\n\n### REQ-003 系统需求\n\n- kind: functional\n- status: 草案\n- traces: [REQ-002]\n`

type Definition = { handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string, readonly text: string }> }

function mount(workspace: string): Definition {
  let definition: Definition | undefined
  const ctx = { commands: { register: (def: Definition) => { definition = def } } }
  registerReqCommand(ctx as never, { dataBlocked: false, workspace, contentDir: CONTENT_DIR })
  return definition as Definition
}

function fixture(type: string, layers?: string, docs: Record<string, string> = {}): { workspace: string; cleanup: () => void } {
  const workspace = mkdtempSync(join(tmpdir(), 'product-scenario-'))
  const root = join(workspace, '.dsh-company/deliverables/2026-11-11-demo')
  const drafts = join(root, 'drafts')
  mkdirSync(drafts, { recursive: true })
  const meta = ['slug: demo', 'kickoff: 2026-11-11', 'numbering: identity', `productType: ${type}`]
  if (layers !== undefined) meta.push(`layers: ${layers}`)
  writeFileSync(join(root, 'meta.md'), `${meta.join('\n')}\n`)
  const base: Record<string, string> = { 'mrd.md': MRD, 'strs.md': STRS, 'prd.md': PRD, ...docs }
  for (const [name, body] of Object.entries(base)) writeFileSync(join(drafts, name), body)
  return { workspace, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

describe('产品类型 scenario：默认链', () => {
  for (const type of ['business-software', 'hardware-software']) {
    it(`${type} 默认到 PRD → success`, async () => {
      const { workspace, cleanup } = fixture(type)
      try {
        const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
        expect(result.kind).toBe('success')
        expect(result.text).toContain(`动议类型 = ${type}`)
        expect(result.text).toContain('层 = MRD/StRS/PRD')
      } finally { cleanup() }
    })
  }
})

describe('产品类型 scenario：可选层与边界', () => {
  it('hardware-software 扩 SyRS（文档在场）→ success', async () => {
    const { workspace, cleanup } = fixture('hardware-software', 'MRD, StRS, PRD, SyRS', { 'syrs.md': SYRS })
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('层 = MRD/StRS/PRD/SyRS')
    } finally { cleanup() }
  })

  it('hardware-software 声明 SyRS 但文档缺席 → 缺层红', async () => {
    const { workspace, cleanup } = fixture('hardware-software', 'MRD, StRS, PRD, SyRS')
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('缺层 SyRS')
    } finally { cleanup() }
  })

  it('business-software 声明 SyRS → 类型不支持，fail-closed', async () => {
    const { workspace, cleanup } = fixture('business-software', 'MRD, StRS, PRD, SyRS', { 'syrs.md': SYRS })
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('不支持需求层 SyRS')
      expect(result.text).toContain('可用层：MRD/StRS/PRD')
    } finally { cleanup() }
  })

  it('business-software 未声明 SyRS 但有 syrs.md → 默认链仍通过（不强行纳入）', async () => {
    const { workspace, cleanup } = fixture('business-software', undefined, { 'syrs.md': SYRS })
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('层 = MRD/StRS/PRD')
    } finally { cleanup() }
  })

  it('需求层含未知词 → 未知层红（checker 兜底）', async () => {
    const { workspace, cleanup } = fixture('business-software', 'MRD, StRS, PRD, NOPE')
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('未知层')
    } finally { cleanup() }
  })
})

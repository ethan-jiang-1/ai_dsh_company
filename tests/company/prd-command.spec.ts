/** `/prd check` 命令：解析 + 文件读取 + 回执（结构校验本身 = prd-check.spec）。 */
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { parsePrdCheck, registerPrdCommand } from '../../packages/company-pack/src/host/prd-command.ts'

const doc = (json: string) => `# 文档\n\n\`\`\`json\n${json}\n\`\`\`\n`
const mrdJson = JSON.stringify({
  mrd: { version: '0.1', status: 'draft', opportunities: [{
    id: 'MR-001', title: '机会', segment: '细分', pain: '痛点',
    evidence: [{ kind: 'fact', source: '访谈' }], recommendation: 'go',
  }] },
})
const prdJson = JSON.stringify({
  prd: { version: '0.1', status: 'draft', slices: [{ id: 'S1', goal: '闭环', requirements: ['REQ-001'] }],
    requirements: [{
      id: 'REQ-001', title: '需求', type: 'functional', priority: 'P0', status: 'draft',
      source: ['MR-001'], slice: 'S1', userStory: '作为用户我要它',
      // oxlint-disable-next-line unicorn/no-thenable -- AC 的给定字段名（Given/When/Then）
      acceptance: [{ id: 'AC-001-1', given: 'g', when: 'w', then: 't' }],
      dependsOn: [], verification: 'test',
    }] },
})

function mount(workspace = '/w', options = {}) {
  type Def = { handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string, readonly text: string }> }
  let definition: Def | undefined
  const ctx = { commands: { register: (def: Def) => { definition = def } } }
  registerPrdCommand(ctx as unknown as Context, { dataBlocked: false, workspace, ...options })
  return definition as Def
}

function fixture(): { workspace: string; cleanup: () => void } {
  const workspace = mkdtempSync(join(tmpdir(), 'prd-command-'))
  const dir = join(workspace, '.dsh-company/deliverables/2026-11-05-demo/drafts')
  mkdirSync(dir, { recursive: true })
  return { workspace, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

describe('parsePrdCheck', () => {
  it('check <slug>；其余 → 用法', () => {
    expect(parsePrdCheck('check 2026-11-05-demo')).toEqual({ ok: true, slug: '2026-11-05-demo' })
    expect(parsePrdCheck('check').ok).toBe(false)
    expect(parsePrdCheck('check a b').ok).toBe(false)
    expect(parsePrdCheck('nope a').ok).toBe(false)
  })
})

describe('registerPrdCommand', () => {
  it('dataBlocked → 错误，不读盘', async () => {
    const definition = mount('/w', { dataBlocked: true })
    const result = await definition.handler({ rawInput: 'check demo' })
    expect(result).toEqual({ kind: 'error', text: '公司数据已停写（无 workspace/身份/lease 问题）；先选 workspace 再校验。' })
  })

  it('缺 MRD / PRD → 点名路径', async () => {
    const { workspace, cleanup } = fixture()
    try {
      const definition = mount(workspace)
      const noMrd = await definition.handler({ rawInput: 'check 2026-11-05-demo' })
      expect(noMrd.kind).toBe('error')
      expect(noMrd.text).toContain('缺 MRD')
      const dir = join(workspace, '.dsh-company/deliverables/2026-11-05-demo/drafts')
      writeFileSync(join(dir, 'mrd.md'), doc(mrdJson))
      const noPrd = await definition.handler({ rawInput: 'check 2026-11-05-demo' })
      expect(noPrd.text).toContain('缺 PRD')
    } finally { cleanup() }
  })

  it('合法 → 成功回执带计数；非法 → 校验失败带条目', async () => {
    const { workspace, cleanup } = fixture()
    try {
      const dir = join(workspace, '.dsh-company/deliverables/2026-11-05-demo/drafts')
      writeFileSync(join(dir, 'mrd.md'), doc(mrdJson))
      writeFileSync(join(dir, 'prd.md'), doc(prdJson))
      const definition = mount(workspace)
      const ok = await definition.handler({ rawInput: 'check 2026-11-05-demo' })
      expect(ok.kind).toBe('success')
      expect(ok.text).toContain('1 个机会 / 1 条需求 / 1 条验收')

      const bad = JSON.parse(prdJson)
      bad.prd.requirements[0].source = ['MR-999']
      writeFileSync(join(dir, 'prd.md'), doc(JSON.stringify(bad)))
      const failed = await definition.handler({ rawInput: 'check 2026-11-05-demo' })
      expect(failed.kind).toBe('error')
      expect(failed.text).toContain('PRD 校验失败')
      expect(failed.text).toContain('MR-999')
    } finally { cleanup() }
  })
})

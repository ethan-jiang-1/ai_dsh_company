/**
 * `/prd check` 命令：解析 + 文件读取 + 回执（结构校验本身 = prd-check.spec）。
 *
 * 负例留证 2026-11-10：slug 校验缺席时 `check ../zz-outside` 会读到 deliverables 根外并调用
 *   validateProductDocs ⇒「越界 slug」用例红（BUG-057）；加校验后绿。
 */
// 负例留证 2026-11-10：去掉 blockedReason / 改回旧「无 workspace/身份/lease 问题」文案 ⇒「回执点名真实原因（BUG-058）」用例红；还原即绿。

// 负例留证 2026-11-10：删掉 slug 校验 ⇒「越界 slug」用例红（读根外 + 调用 checker；BUG-057）；还原即绿。
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { parsePrdCheck, registerPrdCommand } from '../../../packages/company-pack/src/host/commands/prd-command.ts'

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
  it('dataBlocked → 错误，不读盘；回执点名真实原因（BUG-058）', async () => {
    const definition = mount('/w', { dataBlocked: true, blockedReason: '未指定 workspace（测试）' })
    const result = await definition.handler({ rawInput: 'check demo' })
    expect(result.kind).toBe('error')
    expect(result.text).toContain('公司数据已停写')
    expect(result.text).toContain('原因：未指定 workspace（测试）')
    expect(result.text).not.toContain('无 workspace/身份/lease 问题')
  })

  it('越界 slug（BUG-057）→ 错误，且不读根外 drafts / 不调用 checker', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'prd-command-outside-'))
    const outside = join(workspace, '.dsh-company/zz-outside/drafts')
    mkdirSync(outside, { recursive: true })
    writeFileSync(join(outside, 'mrd.md'), doc(mrdJson))
    writeFileSync(join(outside, 'prd.md'), doc(prdJson))
    let called = false
    const definition = mount(workspace, {
      check: () => { called = true; return { ok: false, errors: ['should not run'] } },
    })
    try {
      for (const slug of ['../zz-outside', '.', '..', 'a/b']) {
        const result = await definition.handler({ rawInput: `check ${slug}` })
        expect(result.kind).toBe('error')
        expect(result.text).toContain('非法 deliverables 目录名')
      }
      expect(called).toBe(false)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
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

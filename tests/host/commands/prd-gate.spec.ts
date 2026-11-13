/**
 * 交付闸门（方案 A）：present 前跑 `/prd check` 同一判据；红 → deny，旧动议按 numbering 豁免。
 *
 * 负例留证 2026-11-13：不注册 `tools/pre-execute`（或直接 `next()`）→ 坏 PRD 的 present 放行
 * ⇒「坏 PRD 被拦」用例红；接上闸门即绿。
 */
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision } from '@deepseek-ai/dsh-tools'
import { deliverableOf, gateToolCall, registerPrdGate } from '../../../packages/company-pack/src/host/commands/prd-gate.ts'

const MRD = `---\nlayer: MRD\ndefinition: json-ledger\n---\n\n\`\`\`json\n{"mrd":{"version":"0.1","status":"draft","opportunities":[{"id":"MR-001","title":"机会","segment":"细分","pain":"痛点","evidence":[{"kind":"fact","source":"访谈"}],"recommendation":"go"}]}}\n\`\`\`\n`
const PRD = `---\nlayer: PRD\ndefinition: headings\n---\n\n# PRD\n\n## Slices\n\n| slice | Goal | Requirements (explicit ids) | Exit condition |\n|---|---|---|---|\n| S1 | 端到端 | REQ-001 | ok |\n\n## Requirements (definition point)\n\n### REQ-001 需求\n\n- userStory: 作为用户我要它\n- acceptance:\n  - AC-001-1\n    - given: g\n    - when: w\n    - then: t\n- source: [MR-001]\n- traces: [REQ-001]\n- slice: S1\n- type: functional\n- priority: P0\n- status: draft\n- verification: test\n- dependsOn: []\n- openQuestions: []\n- changeLog: []\n`

function fixture({ meta = 'slug: demo\nnumbering: identity\n', prd = PRD, mrd = MRD }: { meta?: string; prd?: string; mrd?: string } = {}) {
  const workspace = mkdtempSync(join(tmpdir(), 'prd-gate-'))
  const dir = join(workspace, '.dsh-company/deliverables/2026-11-13-demo')
  mkdirSync(join(dir, 'drafts'), { recursive: true })
  writeFileSync(join(dir, 'meta.md'), meta)
  writeFileSync(join(dir, 'drafts/mrd.md'), mrd)
  writeFileSync(join(dir, 'drafts/prd.md'), prd)
  writeFileSync(join(dir, 'final.md'), '# final\n')
  return { workspace, dir, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

const present = (workspace: string, path: string, cwd?: string) => ({
  name: 'present',
  arguments: { files: [{ path }] },
  agent: { session: { header: { cwd: cwd ?? workspace } } },
})

describe('deliverableOf', () => {
  it('解出 .dsh-company/deliverables/<slug>；相对路径按会话 cwd；非成品路径 → undefined', () => {
    expect(deliverableOf('/w/.dsh-company/deliverables/2026-01-01-a/final.md', undefined)?.slug).toBe('2026-01-01-a')
    expect(deliverableOf('.dsh-company/deliverables/2026-01-01-a/final.md', '/w')?.dir).toBe('/w/.dsh-company/deliverables/2026-01-01-a')
    expect(deliverableOf('notes/x.md', '/w')).toBeUndefined()
    expect(deliverableOf('.dsh-company/deliverables/2026-01-01-a/final.md', undefined)).toBeUndefined()
  })
})

describe('gateToolCall', () => {
  it('非 present 工具 / 非成品路径 → 放行', () => {
    const { cleanup } = fixture()
    try {
      expect(gateToolCall({ name: 'write', arguments: { files: [{ path: '.dsh-company/deliverables/2026-11-13-demo/final.md' }] }, agent: undefined }, { check: () => ({ ok: false, errors: ['x'], mrdCount: 0, reqCount: 0, acCount: 0 }), readText: () => '' })).toBeUndefined()
      expect(gateToolCall({ name: 'present', arguments: { files: [{ path: 'notes/x.md' }] }, agent: undefined }, { check: () => ({ ok: false, errors: ['x'], mrdCount: 0, reqCount: 0, acCount: 0 }), readText: () => '' })).toBeUndefined()
    } finally { cleanup() }
  })

  it('合法 PRD → 放行；坏 PRD（MR 不存在）→ deny 并给条目与修复命令', () => {
    const good = fixture()
    try {
      expect(gateToolCall(present(good.workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), {
        check: (_mrd, _prd) => ({ ok: true, errors: [], mrdCount: 1, reqCount: 1, acCount: 1 }),
        readText: () => '',
      })).toBeUndefined()
    } finally { good.cleanup() }
    const bad = fixture({ prd: PRD.replace('[MR-001]', '[MR-999]') })
    try {
      const verdict = gateToolCall(present(bad.workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), { check: (_mrd, _prd) => ({ ok: false, errors: ['REQ-001.source 指向不存在的 MR：MR-999'], mrdCount: 1, reqCount: 1, acCount: 1 }), readText: (root, path) => {
        if (path.endsWith('meta.md')) return 'slug: demo\nnumbering: identity\n'
        return path.endsWith('mrd.md') ? MRD : PRD
      } })
      expect(verdict?.kind).toBe('deny')
      if (verdict?.kind === 'deny') {
        expect(verdict.reason).toContain('交付前 PRD 校验未过')
        expect(verdict.reason).toContain('MR-999')
        expect(verdict.reason).toContain('/prd check 2026-11-13-demo')
      }
    } finally { bad.cleanup() }
  })

  it('旧动议（meta 无 numbering）/ 缺 drafts → 放行（只读豁免，不卡旧交付）', () => {
    const legacy = fixture({ meta: 'slug: demo\n' })
    try {
      expect(gateToolCall(present(legacy.workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), {
        check: () => ({ ok: false, errors: ['bad'], mrdCount: 0, reqCount: 0, acCount: 0 }),
        readText: (root, path) => path.endsWith('meta.md') ? 'slug: demo\n' : PRD,
      })).toBeUndefined()
    } finally { legacy.cleanup() }
    const missing = fixture()
    try {
      expect(gateToolCall(present(missing.workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md', '/nowhere'), {
        check: () => ({ ok: false, errors: ['bad'], mrdCount: 0, reqCount: 0, acCount: 0 }),
        readText: () => undefined,
      })).toBeUndefined()
    } finally { missing.cleanup() }
  })
})

describe('registerPrdGate', () => {
  function mount(overrides = {}) {
    type Listener = (exec: { name: string; arguments: unknown; agent?: unknown }, next: () => Promise<PreToolDecision>) => Promise<PreToolDecision>
    let listener: Listener | undefined
    const ctx = { on: (_event: string, fn: Listener) => { listener = fn } }
    registerPrdGate(ctx as unknown as Context, overrides)
    return listener as Listener
  }

  it('allow / deny 两条路；内部抛错 → 放行（闸门不卡正常交付）', async () => {
    const { workspace, cleanup } = fixture()
    try {
      let nextCalled = 0
      const allow = mount({ readText: (root: string, path: string) => {
        if (path.endsWith('meta.md')) return 'numbering: identity\n'
        return path.endsWith('mrd.md') ? MRD : PRD
      } })
      const verdict = await allow(present(workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), async () => { nextCalled += 1; return { kind: 'allow' } })
      expect(verdict.kind).toBe('allow')
      expect(nextCalled).toBe(1)

      const deny = mount({ readText: (root: string, path: string) => {
        if (path.endsWith('meta.md')) return 'numbering: identity\n'
        return path.endsWith('mrd.md') ? MRD : PRD
      }, check: () => ({ ok: false, errors: ['bad'], mrdCount: 0, reqCount: 0, acCount: 0 }) })
      const denied = await deny(present(workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), async () => { throw new Error('must not run') })
      expect(denied.kind).toBe('deny')

      const throwing = mount({ readText: () => { throw new Error('boom') } })
      const passed = await throwing(present(workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), async () => ({ kind: 'allow' }))
      expect(passed.kind).toBe('allow')
    } finally { cleanup() }
  })
})

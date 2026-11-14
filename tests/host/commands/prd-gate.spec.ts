/**
 * 交付闸门（方案 A）：present 前跑 `/prd check` 同一判据；红 → deny，旧动议按 numbering 豁免。
 *
 * 负例留证 2026-11-13：不注册 `tools/pre-execute`（或直接 `next()`）→ 坏 PRD 的 present 放行
 * ⇒「坏 PRD 被拦」用例红；接上闸门即绿。
 * 负例留证 2026-11-14（BUG-154/155/156）：把闸门改回 header.cwd / `/^numbering:\s*\S/m` /
 * `readTextInside`（undefined 折成旧动议）⇒ 本文件「cd 后」「numbering 空值」「symlink」三组各红。
 */
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision } from '@deepseek-ai/dsh-tools'
import { deliverableOf, gateToolCall, registerPrdGate } from '../../../packages/company-pack/src/host/commands/prd-gate.ts'
import { readCompanyFileAt } from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'
import type { CompanyFileRead } from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'
import { validateProductDocs } from '../../../packages/company-pack/src/lib/prd-check.ts'

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

/** 合成读取面：按文件名给 text；缺席 = missing。 */
const texts = (files: { meta?: string; mrd?: string; prd?: string }) => (_root: string, rel: string): CompanyFileRead => {
  const name = rel.slice(rel.lastIndexOf('/') + 1)
  const text = name === 'meta.md' ? files.meta : name === 'mrd.md' ? files.mrd : name === 'prd.md' ? files.prd : undefined
  return text === undefined ? { kind: 'missing' } : { kind: 'text', text }
}

const badCheck = { check: () => ({ ok: false, errors: ['bad'], mrdCount: 0, reqCount: 0, acCount: 0 }) }
const goodCheck = { check: () => ({ ok: true, errors: [], mrdCount: 1, reqCount: 1, acCount: 1 }) }

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
    expect(gateToolCall({ name: 'write', arguments: { files: [{ path: '.dsh-company/deliverables/2026-11-13-demo/final.md' }] }, agent: undefined }, { ...badCheck, readFile: texts({ meta: 'numbering: identity\n' }) })).toBeUndefined()
    expect(gateToolCall({ name: 'present', arguments: { files: [{ path: 'notes/x.md' }] }, agent: undefined }, { ...badCheck, readFile: texts({ meta: 'numbering: identity\n' }) })).toBeUndefined()
  })

  it('合法 PRD → 放行；坏 PRD（MR 不存在）→ deny 并给条目与修复命令', () => {
    expect(gateToolCall(present('/w', '.dsh-company/deliverables/2026-11-13-demo/final.md'), { ...goodCheck, readFile: texts({ meta: 'numbering: identity\n', mrd: MRD, prd: PRD }) })).toBeUndefined()
    const verdict = gateToolCall(present('/w', '.dsh-company/deliverables/2026-11-13-demo/final.md'), {
      check: () => ({ ok: false, errors: ['REQ-001.source 指向不存在的 MR：MR-999'], mrdCount: 1, reqCount: 1, acCount: 1 }),
      readFile: texts({ meta: 'numbering: identity\n', mrd: MRD, prd: PRD }),
    })
    expect(verdict?.kind).toBe('deny')
    if (verdict?.kind === 'deny') {
      expect(verdict.reason).toContain('交付前 PRD 校验未过')
      expect(verdict.reason).toContain('MR-999')
      expect(verdict.reason).toContain('/prd check 2026-11-13-demo')
    }
  })

  it('旧动议（meta 无 numbering）/ meta 缺失 / 缺 drafts → 放行（只读豁免，不卡旧交付）', () => {
    const path = '.dsh-company/deliverables/2026-11-13-demo/final.md'
    expect(gateToolCall(present('/w', path), { ...badCheck, readFile: texts({ meta: 'slug: demo\n', mrd: MRD, prd: PRD }) })).toBeUndefined()
    expect(gateToolCall(present('/w', path), { ...badCheck, readFile: texts({}) })).toBeUndefined()
    expect(gateToolCall(present('/w', path), { ...badCheck, readFile: texts({ meta: 'numbering: identity\n' }) })).toBeUndefined()
  })

  it('numbering 四形状：整行缺失=豁免，空值/非法值=deny，identity=进校验（与 /req check 同判）', () => {
    const path = '.dsh-company/deliverables/2026-11-13-demo/final.md'
    const empty = gateToolCall(present('/w', path), { ...badCheck, readFile: texts({ meta: 'slug: demo\nnumbering:\n', mrd: MRD, prd: PRD }) })
    expect(empty?.kind).toBe('deny')
    if (empty?.kind === 'deny') {
      expect(empty.reason).toContain('不在词表（只认 identity）')
      expect(empty.reason).toContain('/req check 2026-11-13-demo')
    }
    const invalid = gateToolCall(present('/w', path), { ...badCheck, readFile: texts({ meta: 'numbering: numbering-v2\n', mrd: MRD, prd: PRD }) })
    expect(invalid?.kind).toBe('deny')
    const identity = gateToolCall(present('/w', path), { ...badCheck, readFile: texts({ meta: 'numbering: identity\n', mrd: MRD, prd: PRD }) })
    expect(identity?.kind).toBe('deny')
    if (identity?.kind === 'deny') expect(identity.reason).toContain('交付前 PRD 校验未过')
  })

  it('读面形状不安全（deliverables 根 symlink / meta symlink / drafts symlink）→ deny，不当旧动议', () => {
    const path = '.dsh-company/deliverables/2026-11-13-demo/final.md'
    const real = { check: validateProductDocs, readFile: readCompanyFileAt }

    const rootLink = fixture()
    const outside = mkdtempSync(join(tmpdir(), 'prd-gate-out-'))
    try {
      mkdirSync(join(outside, '2026-11-13-demo/drafts'), { recursive: true })
      writeFileSync(join(outside, '2026-11-13-demo/meta.md'), 'numbering: identity\n')
      writeFileSync(join(outside, '2026-11-13-demo/drafts/mrd.md'), MRD)
      writeFileSync(join(outside, '2026-11-13-demo/drafts/prd.md'), PRD.replace('[MR-001]', '[MR-999]'))
      rmSync(join(rootLink.workspace, '.dsh-company/deliverables'), { recursive: true, force: true })
      symlinkSync(outside, join(rootLink.workspace, '.dsh-company/deliverables'))
      const verdict = gateToolCall(present(rootLink.workspace, path), real)
      expect(verdict?.kind).toBe('deny')
      if (verdict?.kind === 'deny') expect(verdict.reason).toContain('文件形状挡住')
    } finally {
      rootLink.cleanup()
      rmSync(outside, { recursive: true, force: true })
    }

    const metaLink = fixture({ meta: 'numbering: identity\n' })
    const outsideMeta = join(mkdtempSync(join(tmpdir(), 'prd-gate-meta-')), 'meta.md')
    try {
      writeFileSync(outsideMeta, 'numbering: identity\n')
      rmSync(join(metaLink.dir, 'meta.md'))
      symlinkSync(outsideMeta, join(metaLink.dir, 'meta.md'))
      const verdict = gateToolCall(present(metaLink.workspace, path), real)
      expect(verdict?.kind).toBe('deny')
      if (verdict?.kind === 'deny') expect(verdict.reason).toContain('meta.md')
    } finally { metaLink.cleanup() }

    const draftsLink = fixture({ prd: PRD })
    const outsidePrd = join(mkdtempSync(join(tmpdir(), 'prd-gate-prd-')), 'prd.md')
    try {
      writeFileSync(outsidePrd, PRD.replace('[MR-001]', '[MR-999]'))
      rmSync(join(draftsLink.dir, 'drafts/prd.md'))
      symlinkSync(outsidePrd, join(draftsLink.dir, 'drafts/prd.md'))
      const verdict = gateToolCall(present(draftsLink.workspace, path), real)
      expect(verdict?.kind).toBe('deny')
      if (verdict?.kind === 'deny') expect(verdict.reason).toContain('drafts/prd.md')
    } finally { draftsLink.cleanup() }
  })

  it('cwd 解析不到 + 相对成品路径 → deny（不静默跳过）', () => {
    const verdict = gateToolCall({ name: 'present', arguments: { files: [{ path: '.dsh-company/deliverables/2026-11-13-demo/final.md' }] }, agent: undefined }, { ...badCheck, readFile: () => ({ kind: 'missing' }) })
    expect(verdict?.kind).toBe('deny')
    if (verdict?.kind === 'deny') expect(verdict.reason).toContain('解析不到工作目录')
  })
})

describe('registerPrdGate', () => {
  type Listener = (exec: { name: string; arguments: unknown; agent?: unknown; signal?: AbortSignal }, next: () => Promise<PreToolDecision>) => Promise<PreToolDecision>

  function mount({ overrides = {}, cwd }: { overrides?: Parameters<typeof registerPrdGate>[1]; cwd?: string | undefined } = {}) {
    let listener: Listener | undefined
    const ensured: string[] = []
    const ctx = {
      on: (_event: string, fn: Listener) => { listener = fn },
      ...(cwd === undefined ? {} : { get: (name: string) => name === 'workingDirectory' ? { ensure: async () => { ensured.push(name); return cwd } } : undefined }),
    }
    registerPrdGate(ctx as unknown as Context, overrides)
    return { listener: listener as Listener, ensured }
  }

  it('allow / deny 两条路；内部抛错 → 放行（闸门不卡正常交付）', async () => {
    const { workspace, cleanup } = fixture()
    try {
      let nextCalled = 0
      const allow = mount({ overrides: { ...goodCheck, readFile: texts({ meta: 'numbering: identity\n', mrd: MRD, prd: PRD }) } })
      const verdict = await allow.listener(present(workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), async () => { nextCalled += 1; return { kind: 'allow' } })
      expect(verdict.kind).toBe('allow')
      expect(nextCalled).toBe(1)

      const deny = mount({ overrides: { ...badCheck, readFile: texts({ meta: 'numbering: identity\n', mrd: MRD, prd: PRD }) } })
      const denied = await deny.listener(present(workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), async () => { throw new Error('must not run') })
      expect(denied.kind).toBe('deny')

      const throwing = mount({ overrides: { readFile: () => { throw new Error('boom') } } })
      const passed = await throwing.listener(present(workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md'), async () => ({ kind: 'allow' }))
      expect(passed.kind).toBe('allow')
    } finally { cleanup() }
  })

  it('cd 后相对路径按 workingDirectory projection 解析（header.cwd 过期不再生效）', async () => {
    const old = fixture({ prd: PRD })
    const next = fixture({ prd: PRD.replace('[MR-001]', '[MR-999]') })
    try {
      const { listener, ensured } = mount({ cwd: next.workspace, overrides: { check: validateProductDocs, readFile: readCompanyFileAt } })
      const exec = { ...present(old.workspace, '.dsh-company/deliverables/2026-11-13-demo/final.md', old.workspace), signal: new AbortController().signal }
      const verdict = await listener(exec, async () => ({ kind: 'allow' }))
      expect(ensured).toHaveLength(1)
      expect(verdict.kind).toBe('deny')
      if (verdict.kind === 'deny') expect(verdict.reason).toContain('MR-999')
    } finally {
      old.cleanup()
      next.cleanup()
    }
  })
})

/**
 * `/req check <slug>` 命令（A6）：解析、dataBlocked、缺文档、skipped（旧动议豁免）、
 * 成功回执（计数 + 层 + 索引规模）、失败回执（判红条目）与注册面。
 *
 * 病根：编号校验是操作员命令（R10 强制点）——角色在会话里自查自证不算数；命令随 pack 发布，
 * 用户部署里也能跑。本 spec 钉住命令的**形状**，判据本身 = requirements-check.spec（A5）。
 *
 * 红配方：删掉命令注册 / 改坏 usage / 让 skipped 也报红 → 转红。
 * 负例留证 2026-11-07：命令未实现时本 spec 首跑 7 failed（模块不存在）；实现后全绿。
 * 负例留证 2026-11-10：slug 校验缺席时 `check ../zz-outside` 会读到 deliverables 根外并调用 checker
 *   ⇒「越界 slug」用例红（BUG-057）；加校验后绿。
 */
// 负例留证 2026-11-10：去掉 blockedReason / 改回旧「无 workspace/身份/lease 问题」文案 ⇒「回执点名真实原因（BUG-058）」用例红；还原即绿。

// 负例留证 2026-11-10：删掉 slug 校验 ⇒「越界 slug」用例红（读根外 + 调用 checker；BUG-057）；还原即绿。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { parseReqCheck, registerReqCommand } from '../../../packages/company-pack/src/host/commands/req-command.ts'

const MRD = `---\nlayer: MRD\ndefinition: json-ledger\n---\n\n\`\`\`json\n{"mrd":{"version":"0.1","status":"draft","opportunities":[{"id":"MR-001","title":"机会","recommendation":"go"}]}}\n\`\`\`\n`
const STRS = `---\nlayer: StRS\ndefinition: headings\n---\n\n### REQ-001 涉众诉求\n\n- status: 草案\n- traces: [MR-001]\n`
const PRD = `---\nlayer: PRD\ndefinition: json-ledger\n---\n\n\`\`\`json\n{"prd":{"version":"0.1","status":"draft","slices":[{"id":"S1","goal":"闭环","requirements":["REQ-002"]}],"requirements":[{"id":"REQ-002","title":"需求","type":"functional","priority":"P0","status":"draft","source":["MR-001"],"traces":["REQ-001"],"slice":"S1","userStory":"作为用户我要它","acceptance":[{"id":"AC-002-1","given":"g","when":"w","then":"t"}],"dependsOn":[],"verification":"test","openQuestions":[],"changeLog":[]}]}}\n\`\`\`\n`
const META = 'slug: demo\nkickoff: 2026-11-07\n编号体系: identity\n'
const META_LEGACY = 'slug: old-demo\nkickoff: 2026-01-01\n'

type Definition = { name: string; handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string, readonly text: string }> }

function mount(workspace = '/w', options: Record<string, unknown> = {}): Definition {
  let definition: Definition | undefined
  const ctx = { commands: { register: (def: Definition) => { definition = def } } }
  registerReqCommand(ctx as unknown as Context, { dataBlocked: false, workspace, ...options })
  return definition as Definition
}

function fixture(withDocs: readonly string[] = ['mrd.md', 'strs.md', 'prd.md'], withMeta = META): { workspace: string; dir: string; cleanup: () => void } {
  const workspace = mkdtempSync(join(tmpdir(), 'req-command-'))
  const root = join(workspace, '.dsh-company/deliverables/2026-11-07-demo')
  const dir = join(root, 'drafts')
  mkdirSync(dir, { recursive: true })
  if (withMeta !== '') writeFileSync(join(root, 'meta.md'), withMeta)
  const texts: Record<string, string> = { 'mrd.md': MRD, 'strs.md': STRS, 'prd.md': PRD }
  for (const name of withDocs) writeFileSync(join(dir, name), texts[name] ?? '')
  return { workspace, dir, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

/** 临时产品类型包：hardware-software 只到 MRD，business-software 到 PRD（便于断言 meta 优先）。 */
function typeContentDir(): string {
  const contentDir = mkdtempSync(join(tmpdir(), 'req-command-content-'))
  const write = (id: string, layers: readonly string[]): void => {
    const files: Record<string, string> = {}
    for (const layer of layers) files[layer] = layer === 'MRD' ? 'mrd.md' : layer === 'StRS' ? 'strs.md' : 'prd.md'
    mkdirSync(join(contentDir, 'product-types', id), { recursive: true })
    writeFileSync(join(contentDir, 'product-types', id, 'check-rules.json'), JSON.stringify({
      productType: id,
      layers,
      defaultLayers: layers,
      files,
      retiredPrefixes: [],
    }))
  }
  write('hardware-software', ['MRD'])
  write('business-software', ['MRD', 'StRS', 'PRD'])
  return contentDir
}

describe('parseReqCheck', () => {
  it('check <slug>；其余 → 用法', () => {
    expect(parseReqCheck('check 2026-11-07-demo')).toEqual({ ok: true, slug: '2026-11-07-demo' })
    expect(parseReqCheck('check').ok).toBe(false)
    expect(parseReqCheck('check a b').ok).toBe(false)
    expect(parseReqCheck('foo a').ok).toBe(false)
  })
})

describe('registerReqCommand', () => {
  it('注册名 = req', () => {
    expect(mount().name).toBe('req')
  })

  it('dataBlocked → 错误，不读盘；回执点名真实原因（BUG-058）', async () => {
    const definition = mount('/w', { dataBlocked: true, blockedReason: 'writer lease 被占用：另一个 writer' })
    const result = await definition.handler({ rawInput: 'check demo' })
    expect(result.kind).toBe('error')
    expect(result.text).toContain('公司数据已停写')
    expect(result.text).toContain('原因：writer lease 被占用：另一个 writer')
    expect(result.text).not.toContain('无 workspace/身份/lease 问题')
    expect(result.text).toContain('重启宿主')
  })

  it('越界 slug（BUG-057）→ 错误，且不读根外 drafts / 不调用 checker', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'req-command-outside-'))
    const outside = join(workspace, '.dsh-company/zz-outside/drafts')
    mkdirSync(outside, { recursive: true })
    writeFileSync(join(outside, 'mrd.md'), MRD)
    writeFileSync(join(outside, 'strs.md'), STRS)
    writeFileSync(join(outside, 'prd.md'), PRD)
    let called = false
    const definition = mount(workspace, {
      check: () => { called = true; return { skipped: false, ok: false, errors: ['should not run'] } },
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

  it('无需求文档 → 点名目录', async () => {
    const { workspace, cleanup } = fixture([])
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('缺需求文档')
    } finally { cleanup() }
  })

  it('通过 → 回执带计数/层/索引；判红 → 回执带条目', async () => {
    const { workspace, dir, cleanup } = fixture()
    try {
      const definition = mount(workspace)
      const ok = await definition.handler({ rawInput: 'check 2026-11-07-demo' })
      expect(ok.kind).toBe('success')
      expect(ok.text).toContain('编号校验通过（2026-11-07-demo）')
      expect(ok.text).toContain('MR 1 / REQ 2 / IF 0 / TC 0 / AC 1')
      expect(ok.text).toContain('MRD/StRS/PRD')

      writeFileSync(join(dir, 'strs.md'), STRS.replace('[MR-001]', '[MR-999]'))
      const failed = await definition.handler({ rawInput: 'check 2026-11-07-demo' })
      expect(failed.kind).toBe('error')
      expect(failed.text).toContain('编号校验失败')
      expect(failed.text).toContain('MR-999')
    } finally { cleanup() }
  })

  it('旧动议（无 编号体系 标记）→ skipped 回执，不判红', async () => {
    const { workspace, cleanup } = fixture(['mrd.md', 'strs.md', 'prd.md'], META_LEGACY)
    try {
      const result = await mount(workspace).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('只读豁免')
      expect(result.text).toContain('skipped')
    } finally { cleanup() }
  })

  it('错 slug / 不存在目录 → 错误', async () => {
    const { workspace, cleanup } = fixture()
    try {
      const result = await mount(workspace).handler({ rawInput: 'check nope' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('缺需求文档')
    } finally { cleanup() }
  })

  it('handler 对 rawInput 前导空白容错（vendor dispatch 形状）', async () => {
    const { workspace, cleanup } = fixture()
    try {
      const result = await mount(workspace).handler({ rawInput: '  check 2026-11-07-demo' })
      expect(result.kind).toBe('success')
    } finally { cleanup() }
  })

  it('产品类型包（business-software）：MRD/StRS/PRD 三层走五层 checker', async () => {
    const { workspace, cleanup } = fixture()
    const contentDir = mkdtempSync(join(tmpdir(), 'req-command-content-'))
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: business-software\n---\n')
      mkdirSync(join(contentDir, 'product-types/business-software'), { recursive: true })
      writeFileSync(join(contentDir, 'product-types/business-software/check-rules.json'), JSON.stringify({
        productType: 'business-software',
        layers: ['MRD', 'StRS', 'PRD'],
        defaultLayers: ['MRD', 'StRS', 'PRD'],
        files: { MRD: 'mrd.md', StRS: 'strs.md', PRD: 'prd.md' },
        retiredPrefixes: [],
      }))
      const result = await mount(workspace, { contentDir }).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('编号校验通过')
      expect(result.text).toContain('MRD/StRS/PRD')
    } finally {
      cleanup()
      rmSync(contentDir, { recursive: true, force: true })
    }
  })

  it('meta 的产品类型优先于 company.md', async () => {
    const { workspace, cleanup } = fixture(undefined, `${META}产品类型: business-software\n`)
    const contentDir = typeContentDir()
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: hardware-software\n---\n')
      const result = await mount(workspace, { contentDir }).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('层 = MRD/StRS/PRD')
      expect(result.text).toContain('动议类型 = business-software')
    } finally {
      cleanup()
      rmSync(contentDir, { recursive: true, force: true })
    }
  })

  it('meta 缺产品类型时回落 company.md', async () => {
    const { workspace, cleanup } = fixture()
    const contentDir = typeContentDir()
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: hardware-software\n---\n')
      const result = await mount(workspace, { contentDir }).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('层 = MRD')
      expect(result.text).not.toContain('动议类型')
    } finally {
      cleanup()
      rmSync(contentDir, { recursive: true, force: true })
    }
  })

  it('未知产品类型 → 报错并列可用类型', async () => {
    const { workspace, cleanup } = fixture(undefined, `${META}产品类型: nope\n`)
    const contentDir = typeContentDir()
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: hardware-software\n---\n')
      const result = await mount(workspace, { contentDir }).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('未知产品类型')
      expect(result.text).toContain('business-software')
    } finally {
      cleanup()
      rmSync(contentDir, { recursive: true, force: true })
    }
  })

  it('meta 的模板占位 <...> 视为未声明', async () => {
    const { workspace, cleanup } = fixture(undefined, `${META}产品类型: <hardware-software|business-software>\n`)
    const contentDir = typeContentDir()
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: hardware-software\n---\n')
      const result = await mount(workspace, { contentDir }).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('层 = MRD')
    } finally {
      cleanup()
      rmSync(contentDir, { recursive: true, force: true })
    }
  })

  it('产品类型包（custom）：不走五层编号体系，返回说明而不是判红', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'req-command-type-'))
    const contentDir = mkdtempSync(join(tmpdir(), 'req-command-content-'))
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: custom\n---\n')
      mkdirSync(join(contentDir, 'product-types/custom'), { recursive: true })
      writeFileSync(join(contentDir, 'product-types/custom/check-rules.json'), JSON.stringify({
        productType: 'custom',
        layers: ['ROADMAP', 'US', 'RELEASE'],
        defaultLayers: ['ROADMAP', 'US'],
        files: { ROADMAP: 'roadmap.md', US: 'user-story.md', RELEASE: 'release.md' },
        retiredPrefixes: [],
      }))
      const drafts = join(workspace, '.dsh-company/deliverables/2026-11-07-demo/drafts')
      mkdirSync(drafts, { recursive: true })
      writeFileSync(join(drafts, 'mrd.md'), MRD)
      const result = await mount(workspace, { contentDir }).handler({ rawInput: 'check 2026-11-07-demo' })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('不走五层编号体系')
    } finally {
      rmSync(workspace, { recursive: true, force: true })
      rmSync(contentDir, { recursive: true, force: true })
    }
  })
})

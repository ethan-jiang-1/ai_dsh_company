/**
 * `/req check <slug>` 命令（A6）：解析、dataBlocked、缺文档、skipped（旧动议豁免）、
 * 成功回执（计数 + 层 + 索引规模）、失败回执（判红条目）与注册面。
 *
 * 病根：编号校验是操作员命令（R10 强制点）——角色在会话里自查自证不算数；命令随 pack 发布，
 * 用户部署里也能跑。本 spec 钉住命令的**形状**，判据本身 = requirements-check.spec（A5）。
 *
 * 红配方：删掉命令注册 / 改坏 usage / 让 skipped 也报红 → 转红。
 * 负例留证 2026-11-07：命令未实现时本 spec 首跑 7 failed（模块不存在）；实现后全绿。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { parseReqCheck, registerReqCommand } from '../../packages/company-pack/src/host/req-command.ts'

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

  it('dataBlocked → 错误，不读盘', async () => {
    const definition = mount('/w', { dataBlocked: true })
    const result = await definition.handler({ rawInput: 'check demo' })
    expect(result.kind).toBe('error')
    expect(result.text).toContain('公司数据已停写')
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
})

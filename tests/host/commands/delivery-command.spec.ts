/**
 * `/delivery check <slug>` 命令（2026-11-11 v2）：按交付模式检查交付文档与 requiredSections。
 *
 * 判据：productized 无要求；project-services / managed-service 按真实 delivery-rules 检查；
 * 未知模式 error；缺 meta error；productized 出现 SOW/SLA warning。
 *
 * 红配方：删 delivery-command 的 requiredSections 循环 → “缺 section”用例红；
 * 把 project-services 的 rules 改成不存在的文件 → “缺 SOW”用例红。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerDeliveryCommand } from '../../../packages/company-pack/src/host/commands/delivery-command.ts'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const CONTENT_DIR = join(ROOT, 'packages/company-pack/content')
const SLUG = '2026-11-11-demo'

type Definition = { handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string, readonly text: string }> }

function mount(workspace: string): Definition {
  let definition: Definition | undefined
  const ctx = { commands: { register: (def: Definition) => { definition = def } } }
  registerDeliveryCommand(ctx as never, { dataBlocked: false, workspace, contentDir: CONTENT_DIR })
  return definition as Definition
}

function fixture(mode: string): { workspace: string; root: string; drafts: string; cleanup: () => void } {
  const workspace = mkdtempSync(join(tmpdir(), 'delivery-command-'))
  const root = join(workspace, `.dsh-company/deliverables/${SLUG}`)
  const drafts = join(root, 'drafts')
  mkdirSync(drafts, { recursive: true })
  writeFileSync(join(root, 'meta.md'), `slug: demo\nkickoff: 2026-11-11\n产品类型: business-software\n交付模式: ${mode}\n`)
  return { workspace, root, drafts, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

function copyTemplates(root: string, mode: string, skip: string[] = []): void {
  const modeDir = join(CONTENT_DIR, 'delivery-modes', mode)
  const rules = JSON.parse(readFileSync(join(modeDir, 'delivery-rules.json'), 'utf8')) as {
    documents: Record<string, { file: string; template: string }>
  }
  for (const [key, doc] of Object.entries(rules.documents)) {
    if (skip.includes(key)) continue
    writeFileSync(join(root, doc.file), readFileSync(join(modeDir, doc.template), 'utf8'))
  }
}

describe('parseDeliveryCheck', () => {
  it('check <slug>；其余 → 用法', async () => {
    const { parseDeliveryCheck } = await import('../../../packages/company-pack/src/host/commands/delivery-command.ts')
    expect(parseDeliveryCheck('check demo')).toEqual({ ok: true, slug: 'demo' })
    expect(parseDeliveryCheck('check').ok).toBe(false)
    expect(parseDeliveryCheck('check a b').ok).toBe(false)
  })
})

describe('registerDeliveryCommand', () => {
  it('productized 无交付文档 → success', async () => {
    const { workspace, cleanup } = fixture('productized')
    try {
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('productized 无交付文档要求')
    } finally { cleanup() }
  })

  it('productized 出现 SOW → 提醒确认模式', async () => {
    const { workspace, root, cleanup } = fixture('productized')
    try {
      writeFileSync(join(root, 'drafts/sow.md'), '# SOW\n')
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('确认交付模式')
    } finally { cleanup() }
  })

  it('project-services 全量模板 → success', async () => {
    const { workspace, root, cleanup } = fixture('project-services')
    try {
      copyTemplates(root, 'project-services')
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('交付模式 = project-services')
      expect(result.text).toContain('文档 5 份')
    } finally { cleanup() }
  })

  it('project-services 缺 SOW → error', async () => {
    const { workspace, root, cleanup } = fixture('project-services')
    try {
      copyTemplates(root, 'project-services', ['SOW'])
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('缺 SOW')
    } finally { cleanup() }
  })

  it('project-services SOW 缺 section → error', async () => {
    const { workspace, root, cleanup } = fixture('project-services')
    try {
      copyTemplates(root, 'project-services')
      const sow = readFileSync(join(CONTENT_DIR, 'delivery-modes/project-services/templates/sow.md'), 'utf8')
      writeFileSync(join(root, 'drafts/sow.md'), sow.replace('## 5. 变更控制', '## 变更控制（改名）'))
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('SOW 缺 section「## 5. 变更控制」')
    } finally { cleanup() }
  })

  it('managed-service 全量模板 → success', async () => {
    const { workspace, root, cleanup } = fixture('managed-service')
    try {
      copyTemplates(root, 'managed-service')
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('交付模式 = managed-service')
      expect(result.text).toContain('文档 6 份')
    } finally { cleanup() }
  })

  it('未知交付模式 → error', async () => {
    const { workspace, cleanup } = fixture('nope')
    try {
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('未知交付模式「nope」')
    } finally { cleanup() }
  })

  it('缺 meta.md → error', async () => {
    const { workspace, root, cleanup } = fixture('productized')
    try {
      rmSync(join(root, 'meta.md'))
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('缺 meta.md')
    } finally { cleanup() }
  })
})

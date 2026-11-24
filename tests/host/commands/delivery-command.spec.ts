/**
 * `/delivery check <slug>` 命令（2026-11-11 v2）：按交付模式检查交付文档与 requiredSections。
 *
 * 判据：productized 无要求；project-services / managed-service 按真实 delivery-rules 检查；
 * 未知模式 error；缺 meta error；productized 出现 SOW/SLA warning。
 *
 * 红配方：删 delivery-command 的 requiredSections 循环 → “缺 section”用例红；
 * 把 project-services 的 rules 改成不存在的文件 → “缺 SOW”用例红。
 */
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerDeliveryCommand } from '../../../packages/company-pack/src/host/commands/delivery-command.ts'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

const CONTENT_DIR = join(ROOT, 'packages/company-pack/content')
const SLUG = '2026-11-11-demo'

type Definition = { handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string, readonly text: string }> }

function mount(workspace: string, contentDir = CONTENT_DIR): Definition {
  let definition: Definition | undefined
  const ctx = { commands: { register: (def: Definition) => { definition = def } } }
  registerDeliveryCommand(ctx as never, { dataBlocked: false, workspace, contentDir })
  return definition as Definition
}

function fixture(mode: string, parent = tmpdir()): { workspace: string; root: string; drafts: string; cleanup: () => void } {
  const workspace = mkdtempSync(join(parent, 'delivery-command-'))
  const root = join(workspace, `.dsh-company/deliverables/${SLUG}`)
  const drafts = join(root, 'drafts')
  mkdirSync(drafts, { recursive: true })
  writeFileSync(join(root, 'meta.md'), `slug: demo\nkickoff: 2026-11-11\nproductType: business-software\ndeliveryMode: ${mode}\n`)
  return { workspace, root, drafts, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

function copyTemplates(root: string, mode: string, skip: string[] = [], contentDir = CONTENT_DIR): void {
  const modeDir = join(contentDir, 'delivery-modes', mode)
  const rules = JSON.parse(readFileSync(join(modeDir, 'delivery-rules.json'), 'utf8')) as {
    documents: Record<string, { file: string; template: string }>
  }
  for (const [key, doc] of Object.entries(rules.documents)) {
    if (skip.includes(key)) continue
    writeFileSync(join(root, doc.file), readFileSync(join(modeDir, doc.template), 'utf8'))
  }
}

/** 人工维护的业务承诺：独立于 delivery-rules，不随生产 documents 集合同步缩小。 */
const MANAGED_DOCUMENTS = [
  ['SLA', 'drafts/sla.md', 'templates/sla.md'],
  ['SERVICE_CATALOG', 'drafts/service-catalog.md', 'templates/service-catalog.md'],
  ['RUNBOOK', 'drafts/runbook.md', 'templates/runbook.md'],
  ['INCIDENT', 'drafts/incidents.md', 'templates/incident.md'],
  ['MONTHLY_REPORT', 'drafts/monthly-report.md', 'templates/monthly-report.md'],
  ['RENEWAL', 'drafts/renewal.md', 'templates/renewal.md'],
] as const

function assertManagedSuccess(result: Awaited<ReturnType<Definition['handler']>>): void {
  assert.equal(result.kind, 'success')
  assert.ok(result.text.includes('交付模式 = managed-service'))
  assert.ok(result.text.includes('文档 6 份'), 'managed-service business requires six documents')
}

function managedWorld(): { content: string; delivery: ReturnType<typeof fixture>; cleanup: () => void } {
  const parent = resolve(ROOT, 'runtime/tmp')
  mkdirSync(parent, { recursive: true })
  const root = mkdtempSync(join(parent, 'delivery-business-'))
  const content = join(root, 'content')
  cpSync(join(CONTENT_DIR, 'delivery-modes/managed-service'), join(content, 'delivery-modes/managed-service'), { recursive: true })
  const delivery = fixture('managed-service', root)
  return {
    content, delivery,
    cleanup() {
      assert.equal(dirname(resolve(root)), parent)
      assert.equal(realpathSync(root), resolve(root))
      assert.ok(root.startsWith(join(parent, 'delivery-business-')))
      rmSync(root, { recursive: true, force: true })
    },
  }
}

describe('managed-service 独立业务文档锚点', () => {
  it('真实六份模板字节经过 /delivery handler；标识符与文件名来自独立字面承诺', async () => {
    const world = managedWorld()
    try {
      const modeDir = join(CONTENT_DIR, 'delivery-modes/managed-service')
      const rules = JSON.parse(readFileSync(join(modeDir, 'delivery-rules.json'), 'utf8')) as {
        documents: Record<string, { file: string; template: string }>
      }
      expect(Object.entries(rules.documents).map(([id, doc]) => [id, doc.file, doc.template]).sort())
        .toEqual([...MANAGED_DOCUMENTS].sort())
      for (const [, file, template] of MANAGED_DOCUMENTS) {
        const source = readFileSync(join(modeDir, template))
        expect(source.length).toBeGreaterThan(0)
        writeFileSync(join(world.delivery.root, file), source)
        expect(readFileSync(join(world.delivery.root, file))).toEqual(source)
      }
      assertManagedSuccess(await mount(world.delivery.workspace).handler({ rawInput: `check ${SLUG}` }))
    } finally { world.cleanup() }
  })

  it.each(MANAGED_DOCUMENTS)('真实命令拒绝缺 %s（%s）', async (id, file) => {
    const world = managedWorld()
    try {
      copyTemplates(world.delivery.root, 'managed-service')
      const target = resolve(world.delivery.root, file)
      assert.equal(dirname(target), world.delivery.drafts)
      rmSync(target)
      const result = await mount(world.delivery.workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain(`缺 ${id}（${file}）`)
    } finally { world.cleanup() }
  })

  it.each(MANAGED_DOCUMENTS)('负控：规则、模板、交付文档同步删 %s，成功回执仍须被独立锚点拒绝', async (id, file, template) => {
    const world = managedWorld()
    try {
      copyTemplates(world.delivery.root, 'managed-service', [], world.content)
      const command = mount(world.delivery.workspace, world.content)
      assertManagedSuccess(await command.handler({ rawInput: `check ${SLUG}` }))
      const modeDir = join(world.content, 'delivery-modes/managed-service')
      const rulesFile = join(modeDir, 'delivery-rules.json')
      const rules = JSON.parse(readFileSync(rulesFile, 'utf8')) as {
        documents: Record<string, unknown>; requiredSections: Record<string, unknown>; requiredFields: Record<string, unknown>; v1Reminder: string[]
      }
      expect(Object.hasOwn(rules.documents, id)).toBe(true)
      delete rules.documents[id]
      delete rules.requiredSections[id]
      delete rules.requiredFields[id]
      rules.v1Reminder = rules.v1Reminder.filter(key => key !== id)
      writeFileSync(rulesFile, JSON.stringify(rules))
      const target = resolve(world.delivery.root, file)
      const templatePath = resolve(modeDir, template)
      assert.equal(dirname(target), world.delivery.drafts)
      assert.equal(dirname(templatePath), join(modeDir, 'templates'))
      rmSync(target)
      rmSync(templatePath)
      const result = await command.handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('文档 5 份')
      assert.throws(() => assertManagedSuccess(result), {
        name: 'AssertionError', message: 'managed-service business requires six documents',
      })
    } finally { world.cleanup() }
  })
})

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

  it('旧中文 `交付模式:` 不再解析（canonical = deliveryMode）', async () => {
    const { workspace, root, cleanup } = fixture('managed-service')
    try {
      writeFileSync(join(root, 'meta.md'), 'slug: demo\nkickoff: 2026-11-11\n产品类型: business-software\n交付模式: managed-service\n')
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('success')
      expect(result.text).toContain('productized')
      expect(result.text).not.toContain('managed-service')
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
      writeFileSync(join(root, 'drafts/sow.md'), sow.replace('## 5. Change control', '## Change control (renamed)'))
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('SOW 缺 section「## 5. Change control」')
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

describe('规则 id 信任边界', () => {
  it('deliveryMode 路径穿越 → 未知模式，不读 content 外自造规则', async () => {
    const content = mkdtempSync(join(tmpdir(), 'delivery-content-'))
    const { workspace, cleanup } = fixture('../evil-mode')
    try {
      mkdirSync(join(content, 'evil-mode'), { recursive: true })
      writeFileSync(join(content, 'evil-mode', 'delivery-rules.json'), JSON.stringify({ documents: {}, requiredSections: {} }))
      mkdirSync(join(content, 'delivery-modes'), { recursive: true })
      const result = await mount(workspace, content).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('未知交付模式')
      expect(result.text).not.toContain('交付检查通过')
    } finally {
      cleanup()
      rmSync(content, { recursive: true, force: true })
    }
  })

  it('规则文件是目录 → 当缺失处理，不抛 EISDIR', async () => {
    const content = mkdtempSync(join(tmpdir(), 'delivery-content-'))
    const { workspace, cleanup } = fixture('project-services')
    try {
      mkdirSync(join(content, 'delivery-modes', 'project-services', 'delivery-rules.json'), { recursive: true })
      const result = await mount(workspace, content).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('delivery-rules.json 缺失')
    } finally {
      cleanup()
      rmSync(content, { recursive: true, force: true })
    }
  })
})

// 负例留证 2026-11-24：让 delivery-command 的 deliveryMode 退回裸正则 ⇒ 本用例红（围栏示例 ghost-mode 胜出）。BUG-375
describe('deliveryMode 结构感知（BUG-375）', () => {
  it('围栏里的示例行不盖过真值', async () => {
    const { workspace, root, cleanup } = fixture('project-services')
    try {
      writeFileSync(join(root, 'meta.md'), 'slug: demo\nkickoff: 2026-11-11\nproductType: business-software\n```\ndeliveryMode: ghost-mode\n```\ndeliveryMode: project-services\n')
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.text).not.toContain('ghost-mode')
      expect(result.text).toContain('project-services')
    } finally { cleanup() }
  })
})

// 负例留证 2026-11-24：把 requiredSections 判据退回裸 `text.includes` ⇒ 本组红（围栏/注释样例即可通过）。BUG-373
describe('requiredSections 结构敏感（BUG-373）', () => {
  const needles = ['## 2. Scope', '## 4. Milestones and acceptance', '## 5. Change control']
  const bypass = (wrap: (needle: string) => string): string => ['# SOW', '', ...needles.map(wrap)].join('\n')

  for (const [name, body] of [
    ['围栏', bypass(needle => `\`\`\`markdown\n${needle}\n\`\`\``)],
    ['HTML 注释', bypass(needle => `<!-- ${needle} -->`)],
  ] as const) {
    it(`${name}里的样例不算真小节`, async () => {
      const { workspace, root, cleanup } = fixture('project-services')
      try {
        copyTemplates(root, 'project-services')
        writeFileSync(join(root, 'drafts/sow.md'), body)
        const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
        expect(result.kind).toBe('error')
        expect(result.text).toContain('SOW 缺 section')
      } finally { cleanup() }
    })
  }

  it('真标题仍通过', async () => {
    const { workspace, root, cleanup } = fixture('project-services')
    try {
      copyTemplates(root, 'project-services')
      writeFileSync(join(root, 'drafts/sow.md'), ['# SOW', '', ...needles].join('\n'))
      const result = await mount(workspace).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('success')
    } finally { cleanup() }
  })
})

// 负例留证 2026-11-24：sectionRange 只认 `##` ⇒ 三级/一级必填小节永远判缺（BUG-380）。层级透传后绿。
describe('requiredSections 的标题层级（BUG-380）', () => {
  const contentDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'delivery-levels-'))
    mkdirSync(join(dir, 'delivery-modes/custom'), { recursive: true })
    writeFileSync(join(dir, 'delivery-modes/custom/delivery-rules.json'), JSON.stringify({
      deliveryMode: 'custom',
      documents: { SOW: { file: 'drafts/sow.md' } },
      requiredSections: { SOW: ['# Top', '## Mid', '### Deep', '| # | M |'] },
    }))
    return dir
  }
  const doc = (needles: readonly string[]): string => ['# Doc', '', ...needles].join('\n')

  it('# / ## / ### / 表格行四种 needle 都按结构匹配', async () => {
    const { workspace, root, cleanup } = fixture('custom')
    const content = contentDir()
    try {
      writeFileSync(join(root, 'drafts/sow.md'), doc(['# Top', '## Mid', '### Deep', '| # | M |']))
      const result = await mount(workspace, content).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind, result.text).toBe('success')
    } finally { cleanup(); rmSync(content, { recursive: true, force: true }) }
  })

  it('只缺三级小节 ⇒ 报缺（旧实现里三级永远缺，此例在两侧都红但原因不同）', async () => {
    const { workspace, root, cleanup } = fixture('custom')
    const content = contentDir()
    try {
      writeFileSync(join(root, 'drafts/sow.md'), doc(['# Top', '## Mid', '| # | M |']))
      const result = await mount(workspace, content).handler({ rawInput: `check ${SLUG}` })
      expect(result.kind).toBe('error')
      expect(result.text).toContain('### Deep')
    } finally { cleanup(); rmSync(content, { recursive: true, force: true }) }
  })
})

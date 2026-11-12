/**
 * 交付模式包形状（2026-11-11 两轴 v1）：delivery-mode 不是 product-type。
 *
 * 判据：至少两个模式（project-services / managed-service），每个包有 overview/document-map/delivery-rules，
 * rules 自洽，模板与 owner 在场；meta 有交付模式字段；手册有指针；product-types 下不得有同名目录。
 *
 * 红配方：删 templates/sow.md → 模板不在场红；把 deliveryMode 改成 nope → 同名红；
 * 在 product-types 下建 project-services → 同名红；删一个模式目录 → 少于两家红。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const CONTENT = join(ROOT, 'packages/company-pack/content')
const MODES_DIR = join(CONTENT, 'delivery-modes')
const modes = readdirSync(MODES_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

describe('交付模式包：至少两个（换模式才有对照）', () => {
  it('project-services + managed-service 都在场', () => {
    expect(modes.length, '交付模式少于两家，加模式无从对照').toBeGreaterThanOrEqual(2)
    expect(modes).toContain('project-services')
    expect(modes).toContain('managed-service')
  })

  it('product-types 下没有同名目录（交付模式不得塞回类型轴）', () => {
    for (const mode of modes) {
      expect(existsSync(join(CONTENT, 'product-types', mode)), `${mode} 不得同时是产品类型`).toBe(false)
    }
  })
})

describe.each(modes)('交付模式包：%s', (mode) => {
  const base = join(MODES_DIR, mode)
  it('overview / document-map / delivery-rules 在场', () => {
    expect(existsSync(join(base, 'overview.md')), `${mode} 缺 overview`).toBe(true)
    expect(existsSync(join(base, 'document-map.md')), `${mode} 缺 document-map`).toBe(true)
    expect(existsSync(join(base, 'delivery-rules.json')), `${mode} 缺 delivery-rules`).toBe(true)
  })

  it('delivery-rules 自洽：mode 同名、entry 在场、每个 document 有模板与 owner', () => {
    const rules = JSON.parse(readFileSync(join(base, 'delivery-rules.json'), 'utf8')) as {
      deliveryMode?: string
      entry?: string
      documents?: Record<string, { template?: string; owner?: string; file?: string }>
      requiredSections?: Record<string, string[]>
      requiredFields?: Record<string, string[]>
      v1Reminder?: string[]
    }
    expect(rules.deliveryMode).toBe(mode)
    expect(rules.entry).toBeTruthy()
    expect(existsSync(join(base, rules.entry ?? '')), `entry 不在场：${String(rules.entry)}`).toBe(true)
    const docs = Object.entries(rules.documents ?? {})
    expect(docs.length, '交付模式至少要声明文档').toBeGreaterThan(0)
    for (const [name, doc] of docs) {
      expect(doc.owner?.trim(), `${name}.owner`).toBeTruthy()
      expect(existsSync(join(base, doc.template ?? '')), `${name}.template 不在场：${String(doc.template)}`).toBe(true)
      expect(doc.file, `${name}.file`).toMatch(/^drafts\/[a-z0-9-]+\.md$/)
    }
    const names = new Set(docs.map(([name]) => name))
    for (const key of Object.keys(rules.requiredFields ?? {})) expect(names.has(key), `requiredFields.${key}`).toBe(true)
    for (const key of rules.v1Reminder ?? []) expect(names.has(key), `v1Reminder.${key}`).toBe(true)
    for (const [name, needles] of Object.entries(rules.requiredSections ?? {})) {
      const doc = rules.documents?.[name]
      expect(doc, `requiredSections.${name} 没有对应 document`).toBeTruthy()
      const template = readFileSync(join(base, doc?.template ?? ''), 'utf8')
      for (const needle of needles) expect(template, `${name} 模板缺「${needle}」`).toContain(needle)
    }
  })
})

describe('交付模式 awareness：meta 与手册', () => {
  it('meta 模板有交付模式字段；手册有交付模式与包指针', () => {
    const meta = readFileSync(join(CONTENT, 'templates/meta.md'), 'utf8')
    expect(meta).toMatch(/^deliveryMode\s*[:：]/m)
    const handbook = readFileSync(join(CONTENT, 'AGENTS.md'), 'utf8')
    expect(handbook.toLowerCase()).toContain('delivery mode')
    expect(handbook).toContain('delivery-modes')
  })
})

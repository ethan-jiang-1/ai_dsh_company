import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

/**
 * 复核协议单家化（2026-11-09，三层分离）。
 *
 * 病根：AI 使用声明 / 复核独立性层级 / 对外件闸门曾被逐字复制到 4 份模板里——一份公司流程四个副本。
 * 判据（引用链，而不是"每份模板自带"）：
 *   ① 带复核要求的模板必须引用 `company/review-protocol.md`；
 *   ② 协议文件必须含两条声明栏位与机械重算/异人口径；
 *   ③ 声明正文在全 content 只出现一次（只有协议文件）。
 *
 * 红配方：删任一模板的引用行 → ① 红；删协议里的「复核独立性层级」→ ② 红；
 * 把声明正文复制回任一模板 → ③ 红。
 */
const CONTENT = join(ROOT, 'packages/company-pack/content')
const TEMPLATES = join(CONTENT, 'templates')
const PROTOCOL = join(CONTENT, 'company/review-protocol.md')
const reviewed = ['decision-memo.md', 'review-note.md', 'ops-review-note.md', 'weekly-report.md']

const textOf = (name: string) => readFileSync(join(TEMPLATES, name), 'utf8')

describe('复核协议（单家化：模板引用，协议持有正文）', () => {
  it('协议文件在场，且含两条声明栏位与机械重算/异人口径', () => {
    expect(existsSync(PROTOCOL), '缺 company/review-protocol.md').toBe(true)
    const protocol = readFileSync(PROTOCOL, 'utf8')
    expect(protocol, '协议缺「复核独立性层级」栏').toContain('复核独立性层级')
    expect(protocol, '协议缺「边际宽度」栏').toContain('边际宽度')
    expect(protocol, '协议必须点明机械全量重算这一层').toContain('机械全量重算')
    expect(protocol, '协议必须写明同模复核不得报成「异人」').toMatch(/不得[^\n]*异人/)
  })

  it('带复核要求的模板必须引用协议（不复制正文）', () => {
    for (const name of reviewed) {
      const text = textOf(name)
      expect(text, `${name} 未引用 review-protocol`).toContain('review-protocol.md')
      expect(text, `${name} 不得自带复核声明正文`).not.toContain('具名复核人 =（姓名')
    }
  })

  it('声明正文在全 content 只出现一次（只有协议文件）', () => {
    const files = readdirSync(TEMPLATES).filter(name => name.endsWith('.md'))
      .map(name => join(TEMPLATES, name))
    files.push(PROTOCOL)
    const hits = files.filter(file => readFileSync(file, 'utf8').includes('机械全量重算'))
    expect(hits.map(file => file.slice(CONTENT.length + 1)), '机械重算正文出现多处').toEqual(['company/review-protocol.md'])
  })

  it('meta.md 是户口件，不强制复核声明（判据不误伤它）', () => {
    expect(textOf('meta.md')).not.toContain('AI 使用声明')
  })
})

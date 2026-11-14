import { describe, expect, it } from 'vitest'
import {
  headingSections,
  normalizeMarkdown,
  noteStatusBlock,
  noteStatusLines,
  parseFrontmatter,
  parseGfmAst,
  sectionBody,
  splitGfmTableCells,
  structuralLines,
} from '../../tools/lib/repo-markdown.mjs'

describe('tools/lib/repo-markdown 单原语契约', () => {
  it('normalizeMarkdown 剥离 UTF-8 BOM 并把 CRLF 与孤立 CR 归一为 LF', () => {
    expect(normalizeMarkdown('\uFEFFa\r\nb\rc\n')).toBe('a\nb\nc\n')
    expect(normalizeMarkdown('')).toBe('')
  })

  it('parseFrontmatter 解析合法 YAML、拒绝非映射与坏 YAML、且不把双分隔线当头', () => {
    const ok = parseFrontmatter('\uFEFF---\r\nstatus: 待落地\r\nopened: 2026-11-14\r\n---\r\n# 标题\r\n')
    expect(ok).toEqual({
      present: true,
      data: { status: '待落地', opened: '2026-11-14' },
      body: '# 标题\n',
      bodyStartLine: 5,
    })

    const badYaml = parseFrontmatter('---\nstatus: [unclosed\n---\n正文\n')
    expect(badYaml.present).toBe(true)
    expect(badYaml.data).toBeNull()
    expect(badYaml.error).toContain('frontmatter YAML 不可解析')

    const arrayYaml = parseFrontmatter('---\n- item1\n- item2\n---\n正文\n')
    expect(arrayYaml.present).toBe(true)
    expect(arrayYaml.error).toBe('frontmatter 须为字段映射')

    const hrDoc = parseFrontmatter('---\n\n正文段落\n\n---\n## 真节\n')
    expect(hrDoc.present).toBe(false)
    expect(hrDoc.bodyStartLine).toBe(1)
  })

  it('parseGfmAst 与 headingSections 保持原文 1-based 行号并排除围栏/块注释内假标题', () => {
    const doc = [
      '---',
      'status: 已修',
      'opened: 2026-11-14',
      '---',
      '',
      '# 卡片标题',
      '',
      '```md',
      '## 修复证据',
      '- 改动面：`fake.ts`',
      '```',
      '',
      '<!--',
      '## 修复证据',
      '-->',
      '',
      '## 修复证据',
      '```md',
      '- 改动面：`in-fence.ts`',
      '```',
      '- 改动面：`real.ts`',
      '### 子节保留在同节内',
      '- 备注：保留',
      '## 证据',
      '- 尾部',
    ].join('\n')

    const ast = parseGfmAst(doc)
    const h1 = ast.children.find((node: { type: string; depth?: number }) => node.type === 'heading' && node.depth === 1)
    expect(h1?.position?.start?.line).toBe(6)

    const h2s = headingSections(doc, { depth: 2 })
    expect(h2s.map((sec: { rawTitle: string; startLine: number }) => [sec.rawTitle, sec.startLine])).toEqual([
      ['修复证据', 17],
      ['证据', 24],
    ])

    const structural = sectionBody(doc, '修复证据') ?? ''
    expect(structural).toContain('- 改动面：`real.ts`')
    expect(structural).toContain('### 子节保留在同节内')
    expect(structural).not.toContain('in-fence.ts')
    expect(sectionBody(doc, '修复证据', { structuralOnly: false })).toContain('in-fence.ts')
    expect(sectionBody(doc, ['修复'])).toContain('real.ts')
    expect(sectionBody(doc, (sec: { rawTitle: string }) => sec.rawTitle === '证据')).toContain('- 尾部')
    expect(sectionBody(doc, '不存在')).toBeUndefined()
  })

  it('structuralLines 擦除行内 HTML 注释但不误伤反引号里的 `<!--`', () => {
    const text = [
      '保留 `<!--` 字面与 `-->` 字面',
      '前缀 <!-- 隐藏 --> 后缀',
    ].join('\n')
    const lines = structuralLines(text)
    expect(lines[0]?.text).toBe('保留 `<!--` 字面与 `-->` 字面')
    expect(lines[1]?.text.replace(/\s+/g, ' ').trim()).toBe('前缀 后缀')
  })

  it('noteStatusLines 与 noteStatusBlock 忽略围栏内的示例 `状态：` 并拼接逻辑续行', () => {
    const note = [
      '# 标题',
      '',
      '状态：proposed（批准：2026-11-14）',
      '  续行：部分交付',
      '',
      '```md',
      '状态：implemented',
      '```',
    ].join('\n')
    const statuses = noteStatusLines(note)
    expect(statuses).toHaveLength(1)
    expect(statuses[0]?.lineNumber).toBe(3)
    expect(noteStatusBlock(note)).toBe('状态：proposed（批准：2026-11-14）\n  续行：部分交付')
    expect(noteStatusBlock('# 无状态\n')).toBe('')
  })

  it('splitGfmTableCells 正确处理转义竖线、双反斜杠与行尾转义', () => {
    expect(splitGfmTableCells('| a | b\\|c |')).toEqual(['a', 'b|c'])
    expect(splitGfmTableCells('| a | b\\\\| c |')).toEqual(['a', 'b\\', 'c'])
    expect(splitGfmTableCells('| a | b\\|')).toEqual(['a', 'b|'])
  })
})

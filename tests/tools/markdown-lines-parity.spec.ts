// 负例留证 2026-11-24：让 tools structuralLines 不识别围栏/注释 ⇒ 与 core 对拍红（样例行进字段）。BUG-381
/** tools 结构行孪生 vs core 状态机：结构行文本必须一致（空行豁免）。 */
import { describe, expect, it } from 'vitest'
import { scanDocumentDetailed } from '../../packages/company-pack/src/lib/docs/markdown-shape.ts'
import { structuralLines } from '../../tools/lib/company/markdown-lines.mjs'
import { metaFieldFromText } from '../../tools/lib/company/meta-fields.mjs'

const DOCS = [
  'slug: x\nclosed: 2026-01-01\n',
  '---\nslug: x\n---\n\nclosed: 2026-01-01\n',
  '```\nclosed: 2020-01-01\nresult: accepted\n```\nclosed:\nresult:\n',
  '<!-- closed: 2020-01-01 -->\nclosed:\n',
  '~~~text\nclosed: 2020-01-01\n~~~\nclosed: 2026-11-20\n',
]

describe('tools structuralLines 与 core 对拍（BUG-381）', () => {
  it('结构行文本一致（忽略空的注释切除行）', () => {
    for (const doc of DOCS) {
      const tools = structuralLines(doc).filter(line => line.structural).map(line => line.text).filter(text => text !== '')
      const core = scanDocumentDetailed(doc).lines.filter(line => line.structural).map(line => line.text).filter(text => text !== '')
      expect(tools, doc).toEqual(core)
    }
  })

  it('metaFieldFromText 跳过围栏样例，读正文真值', () => {
    const doc = '```\nclosed: 2020-01-01\nresult: accepted\n```\nclosed:\nresult:\nslug: foo\n'
    expect(metaFieldFromText(doc, 'closed')).toBe('')
    expect(metaFieldFromText(doc, 'result')).toBe('')
    expect(metaFieldFromText('closed: 2026-11-20\n', 'closed')).toBe('2026-11-20')
  })
})

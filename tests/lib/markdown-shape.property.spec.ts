import { describe, expect, it } from 'vitest'
import {
  normalizeDocument,
  scanDocumentDetailed,
  sectionRange,
  splitTableRow,
} from '../../packages/company-pack/src/lib/markdown-shape'

import { makeDoc } from '../support/doc-grammar'

const CASES = Number(process.env.MARKDOWN_SHAPE_CASES ?? 200)

describe(`markdown-shape 变形不变量（seeded，${String(CASES)} 例）`, () => {
  it('归一化幂等：scan(normalize(x)) 与 scan(x) 同形', () => {
    for (let seed = 0; seed < CASES; seed += 1) {
      const text = makeDoc(seed)
      const once = scanDocumentDetailed(text)
      const twice = scanDocumentDetailed(normalizeDocument(text))
      expect(twice, `seed ${String(seed)}`).toEqual(once)
      expect(normalizeDocument(normalizeDocument(text)), `seed ${String(seed)} 归一化不幂等`).toBe(normalizeDocument(text))
    }
  })

  it('围栏内的行永不 structural；围栏里的同名标题不被 sectionRange 找到', () => {
    const text = ['```md', '## 修复证据', '```', '', '## 修复证据', '- 改动面：`x`'].join('\n')
    const scan = scanDocumentDetailed(text)
    expect(scan.lines.slice(0, 3).map(line => line.structural)).toEqual([false, false, false])
    const range = sectionRange(text, '修复证据')
    expect(range).toBeDefined()
    expect(range?.start).toBe(4)
    expect(scan.lines[range?.start ?? 0]?.structural).toBe(true)
  })

  it('行首注释里的标题不算节；行内字面 <!-- 不吞后文', () => {
    const commented = ['<!--', '## 修复证据', '-->', '', '## 修复证据', '- 改动面：`x`'].join('\n')
    expect(sectionRange(commented, '修复证据')?.start).toBe(4)
    const literal = ['扫描器把 `<!--` 当普通结构。', '', '## 修复证据', '- 改动面：`x`'].join('\n')
    expect(sectionRange(literal, '修复证据')?.start).toBe(2)
  })

  it('表格切列：转义竖线不增列，行尾奇数反斜杠不吞分隔', () => {
    expect(splitTableRow('| a | b\\|c |')).toHaveLength(2)
    expect(splitTableRow('| a | b\\\\|c |')).toHaveLength(3)
    expect(splitTableRow('| a | b\\|')).toHaveLength(2)
  })
})

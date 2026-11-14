import { describe, expect, it } from 'vitest'
import {
  normalizeDocument,
  scanDocumentDetailed,
  sectionRange,
  splitTableRow,
} from '../../packages/company-pack/src/lib/markdown-shape'

/** 确定性 PRNG（不引依赖；同一 seed 同一文档）。 */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HEADINGS = ['## 修复证据', '## 验收', '## 决定', '## 其它']
const FENCES = ['```', '````', '~~~', '~~~~']

/** 生成一份带容器/代码 span/注释/标题/表格的文档。 */
function makeDoc(seed: number): string {
  const random = rng(seed)
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(random() * values.length)] as T
  const lines: string[] = []
  if (random() < 0.3) lines.push('---', 'status: 已修', '---')
  if (random() < 0.5) lines.push(`${pick(FENCES)}${pick(['js', 'markdown', ''])}`)
  lines.push(`${pick(HEADINGS)} 示例`)
  if (random() < 0.5) lines.push('```json', '{"x":1}', '```')
  if (random() < 0.5) lines.push(`${pick(FENCES)}`)
  lines.push('正文 `inline` 与 `<!--` 字面。')
  lines.push('', pick(HEADINGS), '')
  lines.push(`- 改动面：\`packages/demo/a${String(seed % 7)}.ts\``)
  lines.push(`- 红：拆守卫 → \`pnpm test\` 红`)
  lines.push('- 表格：| a | b\\|c |')
  if (random() < 0.3) lines.push('<!-- 未闭合注释')
  return lines.join(random() < 0.5 ? '\n' : '\r\n')
}

describe('markdown-shape 变形不变量（seeded，200 例）', () => {
  it('归一化幂等：scan(normalize(x)) 与 scan(x) 同形', () => {
    for (let seed = 0; seed < 200; seed += 1) {
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

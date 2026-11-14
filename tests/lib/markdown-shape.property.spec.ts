// 负例留证 2026-11-14：把 markdown-shape-core.js 长围栏闭合判据 `>= fence.length` 改为 `>= 3` ⇒ seed=3 与 BUG-176 当场红；去掉归一化/转义/行内代码/跨行闭合判据 ⇒ BUG-152 / BUG-165 / BUG-168 / BUG-172 / BUG-181 各组转红；还原即绿。
import { describe, expect, it } from 'vitest'
import {
  normalizeDocument,
  scanDocumentDetailed,
  sectionRange,
  sectionStructuralText,
  splitTableRow,
} from '../../packages/company-pack/src/lib/markdown-shape'
import { parseGfmAst } from '../../tools/lib/repo-markdown.mjs'
import { makeDocDetailed } from '../support/doc-grammar'

const CASES = Number(process.env.MARKDOWN_SHAPE_CASES ?? 500)

interface MdastNode {
  readonly type: string
  readonly depth?: number
  readonly lang?: string | null
  readonly value?: string
  readonly children?: readonly MdastNode[]
  readonly position?: {
    readonly start: { readonly line: number }
    readonly end: { readonly line: number }
  }
}

function collectAstProjection(root: MdastNode): {
  readonly headingLines: readonly number[]
  readonly topFences: readonly { readonly startLine: number; readonly lang: string; readonly content: string }[]
  readonly tableDataRows: readonly { readonly line: number; readonly cellCount: number }[]
} {
  const headingLines: number[] = []
  const topFences: { startLine: number; lang: string; content: string }[] = []
  const tableDataRows: { line: number; cellCount: number }[] = []

  for (const child of root.children ?? []) {
    const startLine = child.position?.start.line ?? 0
    const endLine = child.position?.end.line ?? 0
    if (child.type === 'heading' && startLine > 0 && startLine === endLine) {
      headingLines.push(startLine)
    } else if (child.type === 'code' && startLine > 0) {
      topFences.push({
        startLine,
        lang: child.lang ?? '',
        content: child.value ?? '',
      })
    } else if (child.type === 'table') {
      const rows = child.children ?? []
      // rows[0] = 表头行，rows[1..] = 数据行（分隔线不在 AST children 中）
      for (const row of rows.slice(1)) {
        const line = row.position?.start.line ?? 0
        if (line > 0) {
          tableDataRows.push({ line, cellCount: (row.children ?? []).length })
        }
      }
    }
  }
  return { headingLines, topFences, tableDataRows }
}

describe(`markdown-shape × mdast 独立真值差分（seeded，${String(CASES)} 例）`, () => {
  it('归一化幂等：scan(normalize(x)) 与 scan(x) 完全同形', () => {
    for (let seed = 0; seed < CASES; seed += 1) {
      const { text } = makeDocDetailed(seed)
      const once = scanDocumentDetailed(text)
      const twice = scanDocumentDetailed(normalizeDocument(text))
      expect(twice, `seed=${String(seed)}`).toEqual(once)
      expect(normalizeDocument(normalizeDocument(text)), `seed=${String(seed)} 归一化不幂等`).toBe(normalizeDocument(text))
    }
  })

  it('结构标题行、闭合顶层围栏载荷、GFM 表格列数与 mdast 参考投影一致（已声明 BUG-181 跨行反引号策略除外）', () => {
    for (let seed = 0; seed < CASES; seed += 1) {
      const generated = makeDocDetailed(seed)
      const normalizedLines = normalizeDocument(generated.text).split('\n')
      const scan = scanDocumentDetailed(generated.text)
      const ast = parseGfmAst(generated.text) as MdastNode
      const expected = collectAstProjection(ast)
      const policySpanSet = new Set(generated.multilineSpanLines)

      // 1) 已声明的 BUG-181 跨行反引号内部行在 pack 原语中必须是非结构行
      for (const lineNumber of policySpanSet) {
        expect(
          scan.lines[lineNumber - 1]?.structural,
          `seed=${String(seed)} line=${String(lineNumber)} 跨行反引号策略行未标非结构`,
        ).toBe(false)
      }

      // 2) 除已声明 BUG-181 跨行反引号行外，ATX 标题行集合与 mdast 完全一致
      const ourHeadingLines: number[] = []
      for (const [index, entry] of scan.lines.entries()) {
        const lineNumber = index + 1
        if (policySpanSet.has(lineNumber)) continue
        if (entry.structural && /^\s{0,3}#{1,6}(?:\s|$)/.test(entry.text)) {
          ourHeadingLines.push(lineNumber)
        }
      }
      const expectedHeadingsOutsideSpan = expected.headingLines.filter(line => !policySpanSet.has(line))
      expect(ourHeadingLines, `seed=${String(seed)} ATX 结构标题行与 mdast 分叉`).toEqual(expectedHeadingsOutsideSpan)

      // 3) 闭合顶层围栏块（排除尾部故意未闭合围栏）：起点行号、语言前缀、代码内容与 mdast 一致
      const expectedClosedFences = generated.hasUnclosedFence
        ? expected.topFences.slice(0, -1)
        : expected.topFences
      expect(
        scan.fences.map(fence => ({
          startLine: fence.startLine,
          lang: fence.info.split(/\s+/)[0] ?? '',
          content: fence.content,
        })),
        `seed=${String(seed)} 顶层围栏块载荷与 mdast 分叉`,
      ).toEqual(expectedClosedFences)

      // 4) 未闭合块级 HTML 注释诊断与生成器真值一致
      expect(scan.unclosedCommentLine !== undefined, `seed=${String(seed)} 未闭合注释诊断不一致`).toBe(
        generated.hasUnclosedBlockComment,
      )

      // 5) GFM 表格数据行：splitTableRow 列数与 mdast tableRow 单元格数一致（GFM 缺列补齐或超列截断以表头列数为上界）
      for (const row of expected.tableDataRows) {
        const rawLine = normalizedLines[row.line - 1] ?? ''
        expect(scan.lines[row.line - 1]?.structural, `seed=${String(seed)} line=${String(row.line)} 真表格行被误吞`).toBe(true)
        expect(splitTableRow(rawLine).length, `seed=${String(seed)} line=${String(row.line)} 表格切列与 mdast 不一致`).toBe(row.cellCount)
      }
    }
  })

  it('历史真实解析缺陷定点重放（BUG-152 / 165 / 168 / 172 / 176 / 181）', () => {
    // BUG-152：UTF-8 BOM + CRLF + 孤立 CR 归一化后节切分不漂移
    const bomCr = '\uFEFF---\r\nstatus: 已修\r\n---\r## 修复证据\r- 改动面：`a.ts`\r\n'
    expect(sectionStructuralText(bomCr, '修复证据')).toContain('- 改动面：`a.ts`')

    // BUG-165 / BUG-172：表格转义竖线、双反斜杠后真分隔竖线、行尾奇数反斜杠
    expect(splitTableRow('| S1 | A \\| B | C:\\\\ | 末列\\|')).toEqual(['S1', 'A | B', 'C:\\', '末列|'])

    // BUG-168：行内代码里的 `<!--` 不吞后文；单行注释吞同行尾部假标题
    const inlineLiteral = ['支持 `<!--` 语法。', '', '<!-- 注释 --> ## 修复证据', '', '## 修复证据', '- 改动面：`real.ts`'].join('\n')
    expect(sectionRange(inlineLiteral, '修复证据')?.start).toBe(4)

    // BUG-176：4 反引号示例围栏内嵌 3 反引号 json 块不进顶层 fences
    const nestedFence = ['````markdown', '```json', '{"fake":true}', '```', '````', '', '```json', '{"real":true}', '```'].join('\n')
    expect(scanDocumentDetailed(nestedFence).fences).toEqual([
      { info: 'markdown', content: '```json\n{"fake":true}\n```', startLine: 1 },
      { info: 'json', content: '{"real":true}', startLine: 7 },
    ])

    // BUG-181：段落内跨行反引号中的假标题与闭合行尾部都不成结构标题
    const multilineSpan = ['- userStory: `示例开始', '## 修复证据', '### REQ-999` ## 修复证据', '', '## 修复证据', '- 改动面：`ok.ts`'].join('\n')
    expect(sectionRange(multilineSpan, '修复证据')?.start).toBe(4)
  })
})

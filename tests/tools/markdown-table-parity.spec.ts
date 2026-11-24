// 负例留证 2026-11-24：把 tools 孪生改成裸 split('|') ⇒ 本对拍用例红。BUG-356
/** 表格切列的 pack/tools 双实现对拍（tools/lib 不许跨目录 import，只能孪生 + 对拍防漂）。 */
import { describe, expect, it } from 'vitest'
import { splitTableRow as splitPack } from '../../packages/company-pack/src/lib/docs/markdown-shape.ts'
import { splitTableRow as splitTools } from '../../tools/lib/company/markdown-table.mjs'

const CASES = [
  '| a | b |',
  '| a \\| b | c |',
  '| A\\\\|B | c |',
  '|  |  |',
  '| a | b \\\\',
  '| `x|y` | z |',
  'a | b',
  '| single |',
]

describe('splitTableRow 双实现对拍（BUG-356）', () => {
  it('任意行两侧切列结果一致', () => {
    for (const line of CASES) expect(splitTools(line), line).toEqual(splitPack(line))
  })
  it('转义竖线留在单元格内', () => {
    expect(splitTools('| A \\| B | c |')).toEqual(['A | B', 'c'])
  })
})

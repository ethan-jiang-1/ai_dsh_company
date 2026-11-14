/**
 * 结构视图一致性（P1，2026-11-14）：`sectionRange`（门禁读卡的行级视图）与
 * `scanDocumentDetailed`（pack 的完整形状视图）对同一批生成文档必须选中同一个标题。
 *
 * 证明不了：语义（标题内容对不对）、跨消费者业务判据；只证“两个形状视图不打架”。
 */
import { describe, expect, it } from 'vitest'
import { scanDocumentDetailed, sectionRange } from '../../../packages/company-pack/src/lib/markdown-shape'
import { makeDoc } from '../../support/doc-grammar'

const HEADINGS = ['修复证据', '验收', '决定', '其它'] as const

describe('sectionRange vs scanDocumentDetailed（200 seeded docs）', () => {
  it('sectionRange 选中的标题必须是 structural 的，且行文本命中', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const text = makeDoc(seed)
      const scan = scanDocumentDetailed(text)
      for (const heading of HEADINGS) {
        const range = sectionRange(text, heading)
        if (range === undefined) continue
        const line = scan.lines[range.start]
        expect(line?.structural, `seed ${String(seed)} / ${heading} 选中了非结构行`).toBe(true)
        expect(line?.text.trim(), `seed ${String(seed)} / ${heading} 行文本不命中`).toBe(`## ${heading}`)
      }
    }
  })
})

/**
 * 可发现性元数据（FAQ 24 §6）：locale 的 title/description 与 icon 必须真实可读、在包内、≤256 KiB。
 * 这不是 DSH 硬门（缺了只降级），但既然随包发布，就不能静默丢。
 */
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const PACK = join(ROOT, 'packages/company-pack')

describe('pack metadata（locale/icon）', () => {
  it('en/zh 都有非空 meta.title / meta.description', () => {
    for (const locale of ['en', 'zh']) {
      const meta = JSON.parse(readFileSync(join(PACK, 'locale', `${locale}.json`), 'utf8')).meta
      expect(typeof meta?.title, `${locale} meta.title`).toBe('string')
      expect(meta.title.trim(), `${locale} meta.title`).not.toBe('')
      expect(typeof meta?.description, `${locale} meta.description`).toBe('string')
      expect(meta.description.trim(), `${locale} meta.description`).not.toBe('')
    }
  })

  it('icon 是包内 SVG 且 ≤256 KiB', () => {
    const file = join(PACK, 'icon.svg')
    expect(statSync(file).size).toBeLessThanOrEqual(256 * 1024)
    expect(readFileSync(file, 'utf8').trimStart().startsWith('<svg')).toBe(true)
  })
})

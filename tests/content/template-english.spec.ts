/**
 * Content template 英文棘轮（I1，keyless）。
 *
 * 只扫 `packages/company-pack/content/templates/*.md`；PENDING 之外正文不得含中文。
 * 当前 pilot = decision-memo；其余 7 个仍待翻。
 * 不证明模型是否按模板产出；语义审/回放另做。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const ROOT = repositoryRoot
const DIR = join(ROOT, 'packages/company-pack/content/templates')
const CJK = /[\u3400-\u9fff]/u
const TRANSLATED = new Set(['decision-memo.md', 'meta.md', 'mrd.md', 'ops-review-note.md', 'prd.md', 'review-note.md', 'strs.md', 'weekly-report.md'])
const PENDING = new Set([])

describe('content template 英文棘轮（I1）', () => {
  it('模板清单与 PENDING 对齐；pilot 无中文', () => {
    const files = readdirSync(DIR).filter(name => name.endsWith('.md')).sort()
    expect(files).toEqual([...TRANSLATED, ...PENDING].sort())
    expect(readFileSync(join(DIR, 'decision-memo.md'), 'utf8')).not.toMatch(CJK)
  })

  it('PENDING 之外的模板不得含中文', () => {
    const offenders = [...TRANSLATED].filter(file => CJK.test(readFileSync(join(DIR, file), 'utf8')))
    expect(offenders, `以下模板不在 PENDING，但仍有中文：\n${offenders.join('\n')}`).toEqual([])
  })
})

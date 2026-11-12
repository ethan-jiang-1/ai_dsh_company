/** state 英文棘轮（I1）：默认状态文件英文；motion-ledger 仍含中文机器表头，暂列 PENDING（领域值切片处理）。 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/state')
const CJK = /[\u3400-\u9fff]/u
const TRANSLATED = new Set(['company.md', 'org.md', 'owners.md', 'roster.md'])
const PENDING = new Set(['motion-ledger.md'])

describe('content/state 英文棘轮', () => {
  it('文件清单与 PENDING 对齐；已翻文件无中文', () => {
    const files = readdirSync(DIR).filter(name => name.endsWith('.md')).sort()
    expect(files).toEqual([...TRANSLATED, ...PENDING].sort())
    const offenders = [...TRANSLATED].filter(name => CJK.test(readFileSync(join(DIR, name), 'utf8')))
    expect(offenders, `仍有中文：${offenders.join(', ')}`).toEqual([])
  })
})

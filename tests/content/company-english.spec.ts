/** company 配置英文棘轮（I1）：policy-lines / rates / review-protocol 必须英文单份。 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/company')
const CJK = /[\u3400-\u9fff]/u

describe('content/company 英文棘轮', () => {
  it('3 份配置均无中文', () => {
    const files = readdirSync(DIR).filter(name => name.endsWith('.md')).sort()
    expect(files).toEqual(['policy-lines.md', 'rates.md', 'review-protocol.md'])
    const offenders = files.filter(name => CJK.test(readFileSync(join(DIR, name), 'utf8')))
    expect(offenders, `仍有中文：${offenders.join(', ')}`).toEqual([])
  })
})

/** charters 英文棘轮（I1）：6 份角色章程是模型常驻合同，必须英文单份。 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/charters')
const CJK = /[\u3400-\u9fff]/u

describe('content/charters 英文棘轮', () => {
  it('6 份角色章程均无中文', () => {
    const files = readdirSync(DIR).filter(name => name.endsWith('.md')).sort()
    expect(files).toEqual(['ceo.md', 'cfo.md', 'cmo.md', 'coo.md', 'vp-eng.md', 'vp-sales.md'])
    const offenders = files.filter(name => CJK.test(readFileSync(join(DIR, name), 'utf8')))
    expect(offenders, `仍有中文：${offenders.join(', ')}`).toEqual([])
  })
})

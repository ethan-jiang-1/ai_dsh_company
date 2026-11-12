/** generic 手册英文棘轮（I1）：content/generic/*.md 是模型常驻/按需合同，必须英文单份。 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/generic')
const CJK = /[\u3400-\u9fff]/u

describe('content/generic 英文棘轮', () => {
  it('6 份 generic 合同均无中文', () => {
    const files = readdirSync(DIR).filter(name => name.endsWith('.md')).sort()
    expect(files).toEqual(['collaboration.md', 'deliverable-states.md', 'human-interface.md', 'role-boundary.md', 'routing.md', 'work-handoff.md'])
    const offenders = files.filter(name => CJK.test(readFileSync(join(DIR, name), 'utf8')))
    expect(offenders, `仍有中文：${offenders.join(', ')}`).toEqual([])
  })
})

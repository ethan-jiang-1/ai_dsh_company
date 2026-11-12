/** kb-setup 英文棘轮（I1）：装配件 README/guide/run-bundle/seed note 均须英文。 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/kb-setup')
const CJK = /[\u3400-\u9fff]/u

describe('content/kb-setup 英文棘轮', () => {
  it('4 个装配件均无中文', () => {
    for (const name of ['README.md', 'guide.md', 'run-bundle.md', 'seed.json']) {
      expect(readFileSync(join(DIR, name), 'utf8'), name).not.toMatch(CJK)
    }
  })
})

/** content 顶层入口英文棘轮（I1）：AGENTS / README / manifest 必须英文单份。 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content')
const CJK = /[\u3400-\u9fff]/u

describe('content 顶层入口英文棘轮', () => {
  it('AGENTS.md / README.md / manifest.json 均无中文', () => {
    for (const name of ['AGENTS.md', 'README.md', 'manifest.json']) {
      expect(readFileSync(join(DIR, name), 'utf8'), name).not.toMatch(CJK)
    }
  })
})

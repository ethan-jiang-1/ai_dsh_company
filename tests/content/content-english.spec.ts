/** content 全局英文棘轮（I1 收口）：所有模型可读的 md/json 不得含中文。 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content')
const CJK = /[\u3400-\u9fff]/u

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (/\.(?:md|json)$/.test(name)) out.push(path)
  }
  return out
}

describe('content 全局英文棘轮', () => {
  it('content/**/*.md|json 无中文', () => {
    const files = walk(DIR)
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.filter(path => CJK.test(readFileSync(path, 'utf8')))
    expect(offenders.map(path => path.slice(DIR.length + 1)), '仍有中文').toEqual([])
  })
})

/** 关键内容目录的**文件清单**（原 charters/company/generic 三个 spec 的唯一独有断言）。 */
const FILE_LISTS: Record<string, string[]> = {
  charters: ['ceo.md', 'cfo.md', 'cmo.md', 'coo.md', 'vp-eng.md', 'vp-sales.md'],
  company: ['policy-lines.md', 'rates.md', 'review-protocol.md'],
  generic: ['collaboration.md', 'deliverable-states.md', 'human-interface.md', 'role-boundary.md', 'routing.md', 'work-handoff.md'],
}

describe('关键内容目录的文件清单', () => {
  for (const [dir, expected] of Object.entries(FILE_LISTS)) {
    it(`${dir} 清单不漂`, () => {
      const files = readdirSync(join(DIR, dir)).filter(name => name.endsWith('.md')).sort()
      expect(files).toEqual([...expected].sort())
    })
  }
})

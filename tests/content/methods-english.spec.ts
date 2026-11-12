/** methods 英文棘轮（I1）：4 个质量环方法包 skill 必须英文单份。 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/methods')
const CJK = /[\u3400-\u9fff]/u

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (name.endsWith('.md')) out.push(path)
  }
  return out
}

describe('content/methods 英文棘轮', () => {
  it('4 个方法 skill 均无中文', () => {
    const files = walk(DIR).sort()
    expect(files).toHaveLength(4)
    const offenders = files.filter(path => CJK.test(readFileSync(path, 'utf8')))
    expect(offenders.map(path => path.slice(DIR.length + 1)), '仍有中文').toEqual([])
  })
})

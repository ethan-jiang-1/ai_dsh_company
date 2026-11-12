/** delivery-modes 英文棘轮（I1）：两个模式包的 md/json 均须英文单份。 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/delivery-modes')
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

describe('content/delivery-modes 英文棘轮', () => {
  it('project-services / managed-service 均无中文', () => {
    const offenders = walk(DIR).filter(path => CJK.test(readFileSync(path, 'utf8')))
    expect(offenders.map(path => path.slice(DIR.length + 1)), '仍有中文').toEqual([])
  })
})

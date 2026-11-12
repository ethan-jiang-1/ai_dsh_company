/**
 * I2/I3 英文基线棘轮（keyless）：存量中文冻结，新增/增加即红；翻译减少不回弹。
 *
 * 范围：
 * - I2 = packages/company-pack/src/**\/*.ts|tsx（注释/日志/诊断；方向键/中文夹具仍允许存量）
 * - I3 = docs/**\/*.md + 根 README/AGENTS（开发者文档）
 *
 * 这不是“I2/I3 已完成”：基线是显式债务；翻一部分后基线可下调（需显式改 fixture）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../../tools/lib/repository-layout.mjs'

const ROOT = repositoryRoot
const CJK = /[\u3400-\u9fff]/gu

function walk(dir: string, exts: readonly string[]): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path, exts))
    else if (exts.some(ext => name.endsWith(ext))) out.push(path)
  }
  return out
}

function countCjk(path: string): number {
  return [...readFileSync(path, 'utf8').matchAll(CJK)].length
}

function check(label: string, files: readonly string[], baselinePath: string): void {
  const baseline = JSON.parse(readFileSync(join(ROOT, baselinePath), 'utf8')) as Record<string, number>
  const offenders: string[] = []
  for (const file of files) {
    const rel = relative(ROOT, file)
    const actual = countCjk(file)
    const allowed = baseline[rel] ?? 0
    if (actual > allowed) offenders.push(`${rel}: ${String(actual)} > ${String(allowed)}`)
  }
  expect(offenders, `${label} 存量中文增加（新增中文必须英文；翻译减少请显式下调基线）\n${offenders.join('\n')}`).toEqual([])
}

describe('I2/I3 英文基线', () => {
  it('I2 source 不新增中文', () => {
    check('I2', walk(join(ROOT, 'packages/company-pack/src'), ['.ts', '.tsx']), 'tests/fixtures/i2-source-cjk-baseline.json')
  })

  it('I3 docs 不新增中文', () => {
    const docs = walk(join(ROOT, 'docs'), ['.md'])
    for (const name of ['README.md', 'AGENTS.md']) {
      const path = join(ROOT, name)
      try { statSync(path); docs.push(path) } catch { /* absent */ }
    }
    check('I3', docs, 'tests/fixtures/i3-docs-cjk-baseline.json')
  })
})

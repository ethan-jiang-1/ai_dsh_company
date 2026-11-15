/**
 * 覆盖率阈值键的命中判据（2026-11-16，BUG-184）。
 *
 * 为什么：vitest 的 `coverage.thresholds` 按**路径键**生效；键指向不存在的文件时它不报错、
 * 不警告、也不计入汇总——阈值看起来还在守，实际已不参与判定。2026-11-15 的 host 分组搬移把
 * 5 个键留在旧扁平路径（`src/host/workspace-resolution.ts` 等），`pnpm test:coverage` 全绿，
 * 但 5 条 floor 已经静默失效；升级/重构时没人会重新发现它。
 *
 * 判据（机械、窄）：`vitest.config.ts` 的每个 threshold 键
 *   ① 在盘上存在；② 落在 `coverage.include` 声明的自写源头（`packages/company-pack/src/`）下；
 *   ③ 行内同时给 statements 与 branches；④ 阈值表非空（空表 = 判据被搬空，不是通过）。
 *
 * 证明不了：阈值数值本身够不够严——那是 `pnpm coverage:ratchet` 与真实覆盖率运行的判据。
 * 本 spec 只保证「这些 floor 真的挂在文件上」。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

/** 从 `marker` 处的 `{` 开始做括号配对，返回完整块（含首尾花括号）；找不到返回空串。 */
function blockAt(text: string, marker: string): string {
  const start = text.indexOf(marker)
  if (start < 0) return ''
  let depth = 0
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1
    else if (text[index] === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  return ''
}

const config = readFileSync(join(ROOT, 'vitest.config.ts'), 'utf8')
const thresholds = blockAt(config, 'thresholds: {')
const rows = [...thresholds.matchAll(/'([^']+)':\s*\{([^}]*)\}/g)].map(([, path, body]) => ({ path: path ?? '', body: body ?? '' }))

describe('vitest 覆盖率阈值键', () => {
  it('阈值表非空（空表不是通过）', () => {
    expect(thresholds, 'vitest.config.ts 里找不到 coverage.thresholds 块').not.toBe('')
    expect(rows.length, '阈值表解析为 0 条——读格式变了就更新本 spec，不许静默放过').toBeGreaterThan(0)
  })

  it('每条阈值键都命中真实文件，且落在 coverage.include 的自写面内', () => {
    const missing = rows.filter(row => !existsSync(join(ROOT, row.path))).map(row => row.path)
    expect(missing, '这些阈值键指向不存在的文件：vitest 静默忽略死键（阈值失效）。改成现行路径').toEqual([])
    const outside = rows.filter(row => !row.path.startsWith('packages/company-pack/src/')).map(row => row.path)
    expect(outside, '阈值键必须在 coverage.include 覆盖的自写源面内（packages/company-pack/src/）').toEqual([])
  })

  it('每条阈值同时声明 statements 与 branches', () => {
    const incomplete = rows.filter(row => !/statements:\s*\d+/.test(row.body) || !/branches:\s*\d+/.test(row.body)).map(row => row.path)
    expect(incomplete, '阈值条目缺 statements 或 branches 数字').toEqual([])
  })
})

/**
 * 覆盖率阈值键的命中判据（2026-11-16，BUG-184；BUG-193 补文件类型）。
 *
 * 为什么：vitest 的 `coverage.thresholds` 按**路径键**生效；键指向不存在的文件或目录时它不报错、
 * 不警告、也不计入汇总——阈值看起来还在守，实际已不参与判定。2026-11-15 的 host 分组搬移把
 * 5 个键留在旧扁平路径；2026-11-16 第二轮又证明 `existsSync` 连目录也放过（BUG-193），
 * 判据必须落到「普通文件」这一层。
 *
 * 判据（机械、窄）：`vitest.config.ts` 的每个 threshold 键
 *   ① 在盘上是**普通文件**；② 落在 pack 源码面（`packages/company-pack/src/`）下；
 *   ③ 行内同时给 statements 与 branches；④ 阈值表非空（空表 = 判据被搬空，不是通过）。
 *
 * 证明不了：阈值数值本身够不够严——那是 `pnpm coverage:ratchet` 与真实覆盖率运行的判据。
 * 本 spec 只保证「这些 floor 真的挂在文件上」。
 */
// 负例留证 2026-11-16：把 workspace-resolution 的键改回旧扁平 `src/host/workspace-resolution.ts` → 「每条阈值键都命中真实文件（BUG-184）」红（1 MISSING）；还原 → 绿。
// 负例留证 2026-11-16：把任一阈值键改成目录 `packages/company-pack/src/host` → 「目录键不算命中（BUG-193）」红；还原 → 绿。
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

interface ThresholdRow {
  path: string
  body: string
}

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

/** 相对路径是否是仓库内的普通文件（目录不算：vitest 对目录键同样静默忽略）。 */
function isRepoFile(rel: string): boolean {
  try { return statSync(join(ROOT, rel)).isFile() } catch { return false }
}

/** 阈值行 → 三类问题（live 配置与 fixture 行共用同一判据，负例才有意义）。 */
function problemsOf(rows: ThresholdRow[]): { missing: string[]; outside: string[]; incomplete: string[] } {
  return {
    missing: rows.filter(row => !isRepoFile(row.path)).map(row => row.path),
    outside: rows.filter(row => !row.path.startsWith('packages/company-pack/src/')).map(row => row.path),
    incomplete: rows.filter(row => !/statements:\s*\d+/.test(row.body) || !/branches:\s*\d+/.test(row.body)).map(row => row.path),
  }
}

const config = readFileSync(join(ROOT, 'vitest.config.ts'), 'utf8')
const thresholds = blockAt(config, 'thresholds: {')
const rows = [...thresholds.matchAll(/'([^']+)':\s*\{([^}]*)\}/g)].map(([, path, body]) => ({ path: path ?? '', body: body ?? '' }))

describe('vitest 覆盖率阈值键', () => {
  it('阈值表非空（空表不是通过）', () => {
    expect(thresholds, 'vitest.config.ts 里找不到 coverage.thresholds 块').not.toBe('')
    expect(rows.length, '阈值表解析为 0 条——读格式变了就更新本 spec，不许静默放过').toBeGreaterThan(0)
  })

  it('每条阈值键都命中真实文件，且落在 pack 源码面内（BUG-184）', () => {
    const problems = problemsOf(rows)
    expect(problems.missing, '这些阈值键不是仓库内的普通文件：vitest 静默忽略死键（阈值失效）。改成现行文件路径').toEqual([])
    // 目前 threshold 只给 pack 源码（coverage.include 还含 tools/lib，但那里没有阈值档）；
    // 若将来给 tools/lib 加下限，同 diff 放宽本判据并写清理由。
    expect(problems.outside, '阈值键必须在 pack 源码面内（packages/company-pack/src/）').toEqual([])
  })

  it('目录键不算命中（不是普通文件 = 阈值同样失效）', () => {
    expect(problemsOf([{ path: 'packages/company-pack/src/host', body: 'statements: 90, branches: 85' }]).missing,
      '目录键在 vitest 里同样匹配不到文件；判据必须是 isFile，不是存在').toEqual(['packages/company-pack/src/host'])
  })

  it('每条阈值同时声明 statements 与 branches', () => {
    expect(problemsOf(rows).incomplete, '阈值条目缺 statements 或 branches 数字').toEqual([])
  })
})

/**
 * 类型面覆盖计数的写法判据（2026-11-16，BUG-191；二轮 BUG-196 补导航面）。
 *
 * 为什么：`docs/testing.md` 与 `docs/guides/dev-loop.md` 曾各写死一个会漂的分数
 * （227/245、226/244）。三次搬移后实测 231/249，两份 live 文档同时过期——没有任何门禁校验
 * 「x/y spec」这类数字（`doc-budget` 只查行数、`nav-count-claims` 只查页签计数）。
 * 2026-11-16 二轮又证明：只把当时实证的 4 个文件写进面，`checks/README.md` 等导航文档仍可写回
 * 旧分数（BUG-196）——判据的面必须是「导航面全集」，不是「上次出事的文件清单」。
 *
 * 判据（机械、窄）：导航面文档**不写死**类型面覆盖分数或未接计数，改为单一来源的表达——
 *   覆盖 = 三个 `tsconfig.test-*` 的 include 减 exclude（清单以配置为准）。
 * 分数与未接个数都随测试树搬移必漂；写「公式 + 未接类别」才不会专业地过期。
 *
 * 扫描面 = `docs/**` + 根 `AGENTS.md` / `README.md` / `tests/README.md` / 包 README +
 * `checks/README.md` / `run/README.md` / `runtime/README.md` + `.agents/skills/**`（模型指令）。
 * `notes/` 与归档不扫：历史收据里的旧值是当时事实，判红等于逼篡改。
 *
 * 证明不了：公式与 tsconfig 的实际 include/exclude 一致——那由 `pnpm typecheck` 与配置本身证明。
 */
// 负例留证 2026-11-16：把 docs/testing.md 的公式改回 `227/245 spec` → 「导航面没有 x/y spec 字面量（BUG-191）」红；还原 → 绿。
// 负例留证 2026-11-16（二轮）：向 checks/README.md 追加 `227/245 spec`，修复前本 spec 绿（BUG-196）；补导航面清单后红。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const CLAIM = /(?:\b\d+\s*\/\s*\d+\s*个?\s*spec\b|未接\s*\d+)/
const FILES = ['AGENTS.md', 'README.md', 'tests/README.md', 'packages/company-pack/README.md', 'checks/README.md', 'run/README.md', 'runtime/README.md']

/** 递归收集 Markdown（跳过隐藏目录；起始目录本身可以是隐藏目录）。 */
function docsUnder(rel: string): string[] {
  const dir = join(ROOT, rel)
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const child = `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...docsUnder(child))
    else if (entry.name.endsWith('.md')) out.push(child)
  }
  return out
}

/** 导航面 = docs/** + 根/包/测试/检查/运行导航文件 + 模型可读 skills。 */
function navFiles(): string[] {
  return [...docsUnder('docs'), ...FILES.filter(file => existsSync(join(ROOT, file))), ...docsUnder('.agents/skills')]
}

function findings(): string[] {
  const hits: string[] = []
  for (const file of navFiles()) {
    readFileSync(join(ROOT, file), 'utf8').split('\n').forEach((line, index) => {
      if (CLAIM.test(line)) hits.push(`${file}:${String(index + 1)} → ${line.trim()}`)
    })
  }
  return hits
}

describe('live 文档不写死类型面覆盖分数', () => {
  it('导航面没有「x/y spec」字面量（写法 = include 减 exclude 的公式 + 未接清单，BUG-191）', () => {
    expect(findings(), '分数随测试树搬移必漂；改成「覆盖 = 三个 tsconfig.test-* 的 include 减 exclude」并指向配置').toEqual([])
  })

  it('导航面覆盖 checks / run / runtime README 与 .agents/skills（2026-11-16 二轮，BUG-196）', () => {
    const files = navFiles()
    expect(files).toContain('checks/README.md')
    expect(files).toContain('run/README.md')
    expect(files).toContain('runtime/README.md')
    expect(files.some(file => file.startsWith('.agents/skills/')), 'skills 是模型指令，会教出「覆盖 x/y」的写法').toBe(true)
  })

  it('扫描面非空（判据被搬空 = 通过是假的）', () => {
    expect(docsUnder('docs').length).toBeGreaterThan(0)
  })
})

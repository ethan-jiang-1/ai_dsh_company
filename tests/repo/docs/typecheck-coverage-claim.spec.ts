/**
 * 类型面覆盖计数的写法判据（2026-11-16，BUG-191）。
 *
 * 为什么：`docs/testing.md` 与 `docs/guides/dev-loop.md` 曾各写死一个会漂的分数
 * （227/245、226/244）。三次搬移后实测 231/249，两份 live 文档同时过期——没有任何门禁校验
 * 「x/y spec」这类数字（`doc-budget` 只查行数、`nav-count-claims` 只查页签计数）。
 *
 * 判据（机械、窄）：导航面文档**不写死**类型面覆盖分数，改为单一来源的表达——
 *   覆盖 = 三个 `tsconfig.test-*` 的 include 减 exclude（清单以配置为准）。
 * 分数随测试树搬移必漂；写「公式 + 未接原因」才不会专业地过期。
 *
 * 扫描面 = `docs/**` + 根 `AGENTS.md` / `README.md` / `tests/README.md` /
 * `packages/company-pack/README.md`（导航与协议面）。`notes/` 与归档不扫：历史收据里的旧值
 * 是当时事实，判红等于逼篡改。
 *
 * 证明不了：公式与 tsconfig 的实际 include/exclude 一致——那由 `pnpm typecheck` 与配置本身证明。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const CLAIM = /\b\d+\s*\/\s*\d+\s*个?\s*spec\b/
const FILES = ['AGENTS.md', 'README.md', 'tests/README.md', 'packages/company-pack/README.md']

/** 递归收集 `docs/` 下的 Markdown（跳过隐藏目录）。 */
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

function findings(): string[] {
  const hits: string[] = []
  for (const file of [...docsUnder('docs'), ...FILES.filter(file => existsSync(join(ROOT, file)))]) {
    readFileSync(join(ROOT, file), 'utf8').split('\n').forEach((line, index) => {
      if (CLAIM.test(line)) hits.push(`${file}:${String(index + 1)} → ${line.trim()}`)
    })
  }
  return hits
}

describe('live 文档不写死类型面覆盖分数', () => {
  it('导航面没有「x/y spec」字面量（写法 = include 减 exclude 的公式 + 未接清单）', () => {
    expect(findings(), '分数随测试树搬移必漂；改成「覆盖 = 三个 tsconfig.test-* 的 include 减 exclude」并指向配置').toEqual([])
  })

  it('扫描面非空（判据被搬空 = 通过是假的）', () => {
    expect(docsUnder('docs').length).toBeGreaterThan(0)
  })
})

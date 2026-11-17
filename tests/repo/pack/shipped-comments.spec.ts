import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

// 负例留证 2026-11-17：去掉 delegation-surface 注释块的「不随包分发」限定，本 spec 红（BUG-210）；接回 → 绿。

/**
 * shipped 源码注释里的 dev-only 路径必须带限定（2026-11-17 BUG-210）。
 *
 * 为什么：`packages/company-pack/src/**` 的注释会原样进 tarball 的 `lib/index.js`，而 `tools/`、
 * `checks/`、`probes/` 不在 `files` 清单里。安装册读者按注释去找 `tools/lib/...` 只会扑空；
 * `cordis.patch.yml` 对同类台账已写「不随包分发」，源码注释却没有这条限定。判据不是禁止提
 * provenance，而是**每条 dev 路径必须在同一注释块里说明它不随包**。
 *
 * 判据（机械、窄）：pack 源码的注释块里出现 `tools/`、`checks/`、`probes/` 下的**带扩展名路径**
 * （`tools/pre-execute` 这类 DSH 任务钩子没有扩展名，不在此列），同一注释块必须有
 * 「不随包 / 仓库内 / 发布面自包含 / files 不含 tools / dev-only」之一；且该路径必须在盘上存在
 * （盲审 S2：只加限定不修路径，等于给死指针发合格证）。
 *
 * 不证明：`tests/` 路径（测试期指针，不进安装运行面）与 tarball 内字节（后者由
 * `release --prepare` 重建 + `dist-freshness` 守）。
 *
 * 负例留证 2026-11-17：去掉 delegation-surface 注释块的「不随包分发」限定，本 spec 红（BUG-210）；接回 → 绿。
 */
const QUALIFIER = /不随包|仓库内|发布面自包含|files 不含 tools|dev-only/
const DEV_PATH = /(?:tools|checks|probes)\/[A-Za-z0-9_./-]*[A-Za-z0-9_-]\.[A-Za-z0-9]+/g
const COMMENT = /^\s*(?:\/\/|\/\*|\*)/

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules') return []
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : /\.(ts|tsx|js)$/.test(entry.name) ? [path] : []
  })
}

const files = walk(join(ROOT, 'packages/company-pack/src')).sort()
const problems: string[] = []
const missing: string[] = []
let hitCount = 0
for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/')
  const lines = readFileSync(file, 'utf8').split('\n')
  let block: { text: string; line: number }[] = []
  const flush = (): void => {
    if (block.length === 0) return
    const qualified = block.some(entry => QUALIFIER.test(entry.text))
    for (const entry of block) {
      for (const match of entry.text.matchAll(DEV_PATH)) {
        hitCount += 1
        if (!qualified) problems.push(`${rel}:${String(entry.line)} → ${match[0]}（注释块没有「不随包分发 / 仓库内」限定）`)
        if (!existsSync(join(ROOT, match[0]))) missing.push(`${rel}:${String(entry.line)} → ${match[0]}`)
      }
    }
    block = []
  }
  lines.forEach((text, index) => {
    if (COMMENT.test(text)) block.push({ text, line: index + 1 })
    else flush()
  })
  flush()
}

describe('shipped 源码注释里的 dev-only 路径要带限定（BUG-210）', () => {
  it('扫描面非空，且确实命中 dev 路径（空集不是通过）', () => {
    expect(files.length, 'pack src 一个源码文件都没扫到').toBeGreaterThan(0)
    expect(hitCount, '没有命中任何 dev 路径——规则或路径提取失效').toBeGreaterThan(0)
  })

  it('所有 dev 路径都在带限定的注释块里', () => {
    expect(problems, '安装册读者会把注释里的 dev 路径当现行家；加「不随包分发 / 仓库内」或删掉路径').toEqual([])
  })

  it('dev 路径本身必须在盘上存在（限定不能给死指针发合格证）', () => {
    expect(missing, '这些注释里的 dev 路径不存在——改成现行家，别只加限定').toEqual([])
  })
})

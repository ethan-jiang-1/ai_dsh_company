/**
 * 构建产物路径字面量的命中判据（2026-11-16，BUG-185；二轮 BUG-197/198 补扫描面与源码后缀）。
 *
 * 为什么：`checks/` 的车道会按字符串拼 `packages/company-pack/lib/types/…js` 去 import 构建产物
 * （重放车道 import 读模型的 presence 导出）。这种路径不在任何静态 import / tsconfig 解析面，
 * 源码分组搬移后 TypeScript 照常构建、`pnpm test` 与 `pnpm verify` 照常全绿——只有真正跑那条
 * 车道才会炸（2026-11-15：`lib/types/lib/presence.js` 已不存在，replay 确定性 MODULE_NOT_FOUND）。
 * 2026-11-16 二轮又证明两件事：只扫 `checks/tools/probes` 的 `.mjs` 会漏掉文档与 `.ts` 里的同款
 * 字面量（BUG-197）；源码候选只认 `.ts/.tsx` 会把合法的 `.js` 源码产物判红（BUG-198）。
 *
 * 判据（机械、窄）：
 *   ① 字面量必须能对到**现行源码布局**：`lib/types/<path>.js` ↔ `src/<path>.{ts,tsx,js,mjs}`；
 *   ② 构建树 `lib/types/` 在场时，字面量必须同时是**真实产物**（陈旧字面量不能靠旧产物续命）；
 *   ③ 二者都要求「普通文件」，目录不算命中。
 *
 * 扫 live 文本面（`.md/.ts/.tsx/.mjs/.js/.sh/.yml`）：`checks/`、`tools/`、`probes/`、`docs/`、
 * `run/`、`tests/`、包 `src/presets/content`、`.agents/`，以及根/包 README。不扫 `_backlog/`、
 * `notes/`、`snapshots/`、`vendor/`：推敲卡与决策记忆会**故意引用**旧字面量做负例。
 * 不判 `lib/client.js`：那是 tsdown 打包入口，构建前本来就不在盘上。
 *
 * 证明不了：车道真的跑通——那是车道自己的判据（本卡 = `node checks/lanes/replay.e2e.mjs`）。
 */
// 负例留证 2026-11-16：把 replay.e2e.mjs 的动态 import 改回旧扁平 `lib/types/lib/presence.js` → 「每个 lib/types 字面量都对到现行源码与产物（BUG-185）」红（无现行源码对应）；还原 → 绿。
// 负例留证 2026-11-16（二轮）：向 docs/testing.md 注入一条不存在的 lib/types 字面量，修复前本 spec 绿（BUG-197）；扩面后红。
// 负例留证 2026-11-16（二轮）：向 replay.e2e.mjs 注入合法的 .../lib/types/lib/docs/markdown-shape-core.js，修复前本 spec 红（BUG-198）；补 `.js` 源码候选后绿。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

const LITERAL = /packages\/company-pack\/lib\/types\/[A-Za-z0-9_./-]+\.js/g
const BUILT_ROOT = join(ROOT, 'packages/company-pack/lib/types')
/** live 文本面（根 README 由 SCAN_FILES 补）。 */
const SCAN_ROOTS = ['checks', 'tools', 'probes', 'docs', 'run', 'tests', 'packages/company-pack/src', 'packages/company-pack/presets', 'packages/company-pack/content', '.agents']
const SCAN_SUFFIXES = ['.mjs', '.js', '.ts', '.tsx', '.md', '.sh', '.yml']
const SCAN_FILES = ['AGENTS.md', 'README.md', 'packages/company-pack/README.md']
/** `lib/types/<p>.js` 对应的源码后缀候选（tsc 会把同布局的 .js 源码原样输出）。 */
const SOURCE_SUFFIXES = ['.ts', '.tsx', '.js', '.mjs']

/** 相对路径是否是仓库内的普通文件（目录不算命中）。 */
function isRepoFile(rel: string): boolean {
  try { return statSync(join(ROOT, rel)).isFile() } catch { return false }
}

/** 递归收集面内满足后缀的文件（跳过隐藏目录与 node_modules；起始目录本身可以是隐藏目录）。 */
function filesUnder(rel: string, suffixes: readonly string[]): string[] {
  const dir = join(ROOT, rel)
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const child = `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...filesUnder(child, suffixes))
    else if (suffixes.some(suffix => entry.name.endsWith(suffix))) out.push(child)
  }
  return out
}

/** 扫描面 = SCAN_ROOTS 下的 live 文本 + 根/包 README。 */
function scannedFiles(): string[] {
  return [...SCAN_ROOTS.flatMap(root => filesUnder(root, SCAN_SUFFIXES)), ...SCAN_FILES.filter(file => isRepoFile(file))]
}

/** `lib/types/a/b.js` → 现行源码候选 `src/a/b.{ts,tsx,js,mjs}`。 */
function sourceCandidates(literal: string): string[] {
  const rest = literal.replace('packages/company-pack/lib/types/', '').replace(/\.js$/, '')
  return SOURCE_SUFFIXES.map(suffix => `packages/company-pack/src/${rest}${suffix}`)
}

function findings(): string[] {
  const problems: string[] = []
  for (const file of scannedFiles()) {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n')
    lines.forEach((line, index) => {
      for (const match of line.matchAll(LITERAL)) {
        const literal = match[0]
        const where = `${file}:${String(index + 1)}`
        if (!sourceCandidates(literal).some(candidate => isRepoFile(candidate))) {
          problems.push(`${where} → ${literal}（没有现行源码对应：${sourceCandidates(literal).join(' 或 ')}）`)
          continue
        }
        if (existsSync(BUILT_ROOT) && !isRepoFile(literal)) {
          problems.push(`${where} → ${literal}（构建树在场但产物不存在：陈旧字面量）`)
        }
      }
    })
  }
  return problems
}

describe('构建产物路径字面量（live 文本面）', () => {
  it('每个 packages/company-pack/lib/types/*.js 字面量都对到现行源码与产物（BUG-185）', () => {
    expect(findings(), '改源码分组后必须同 diff 改这些字面量（或在车道里用稳定入口）').toEqual([])
  })

  it('扫描面覆盖 docs 与 `.ts` 文本（2026-11-16 二轮，BUG-197）', () => {
    const files = scannedFiles()
    expect(files).toContain('docs/testing.md')
    expect(files.some(file => file.endsWith('.ts')), 'tests/ 与 src 的 .ts 注释同样是活指针载体').toBe(true)
  })

  it('源码候选包含 `.js`（合法 `.js` 产物不被假红，2026-11-16 二轮，BUG-198）', () => {
    expect(sourceCandidates('packages/company-pack/lib/types/lib/docs/markdown-shape-core.js'))
      .toContain('packages/company-pack/src/lib/docs/markdown-shape-core.js')
  })

  it('扫描面非空（判据没有对象 = 通过是假的）', () => {
    const files = scannedFiles()
    expect(files.length).toBeGreaterThan(0)
    expect(files.some(file => /\.e2e\.mjs$|\.entry\.mjs$/.test(file)), 'checks 车道应当在这个面内').toBe(true)
  })
})

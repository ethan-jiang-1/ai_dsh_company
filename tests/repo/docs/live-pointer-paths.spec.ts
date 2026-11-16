/**
 * live 指针路径的命中判据（2026-11-16，BUG-187..190；二轮 BUG-194/195 补载体）。
 *
 * 为什么：测试树与源码树的搬移/退役只改得动静态 import；写在**注释与决策记忆正文**里的
 * `tests/*.spec.ts` 路径不在 tsconfig / import 解析面，也不在 `bare-path`（只扫 Markdown
 * 反引号）、`command-refs`（只扫 activeDocs）、`md-links`（只扫 Markdown 链接）的射程。
 * 2026-11-15 的实测：3 条模块头注、2 条 implemented Note、1 条 audit 注释，共 6 处指向不存在的
 * spec——agent 照着注释跑 `pnpm test <path>` 只会得到「No test files found」。
 *
 * 判据（机械、窄）：每个 live 载体面里的 `tests/` 下 `*.spec.ts` 字面量必须在盘上是普通文件。
 *   ① `packages/company-pack/src/**` 源码（`.ts/.tsx/.js/.mjs`；2026-11-16 二轮补 `.js`——
 *      `markdown-shape-core.js` 是产品源码，注释同样是活指针）；
 *   ② `notes/implemented/**`（BUG-188/189）：决策记忆是**活文档**，事实落点必须现行；
 *      普通文本与反引号命令都扫（BUG-189 正是纯文本）；
 *   ③ `checks/audit/**` 的注释（BUG-190）；
 *   ④ `packages/company-pack/presets/**` 与 `.agents/skills/**`（二轮补：随包分发、模型可读的
 *      SKILL/persona 是活指令，里面的「去跑哪个 spec」同样是活指针）。
 *
 * 不扫：`notes/archived/`、`_backlog/_archive/`（冻结层，记录当时事实）、`snapshots/`（归档
 * 证据载荷）、fixture / 负例（`zz-` / `nonexistent` 等故意写坏的名字）。
 *
 * 证明不了：路径指向的 spec 语义上仍是那条判据（搬移可能把断言带偏）——那要靠各 spec 自己的
 * 断言与真入口；本 spec 只保证「指针不断」。
 */
// 负例留证 2026-11-16：把 ledger.ts 头注改回旧扁平 tests/lib/ledger.spec.ts → 「源码注释里的 spec 路径（BUG-187）」红；还原 → 绿。
// 负例留证 2026-11-16：把 ui-trajectory Note 的命令改回 tests/host/ui-surface.spec.ts → 「ui-trajectory Note 的验证命令（BUG-188）」与决策记忆用例红；还原 → 绿。
// 负例留证 2026-11-16：把 i18n Note 的落点改回 generic-english.spec.ts → 「i18n Note 的落点（BUG-189）」与决策记忆用例红；还原 → 绿。
// 负例留证 2026-11-16：把 audit 注释改回 tests/tools/candidate-scan-labels.spec.ts → 「审计脚本注释里的 spec 路径（BUG-190）」红；还原 → 绿。
// 负例留证 2026-11-16（二轮）：向 `src/lib/docs/markdown-shape-core.js` 注入 tests/lib/ledger-legacy.spec.ts，修复前本 spec 绿（BUG-194）；补 `.js` 后缀后红。
// 负例留证 2026-11-16（二轮）：向 preset SKILL 与 `.agents` SKILL 各注入旧 spec，修复前本 spec 绿（BUG-195）；补两个面后红。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

const TEST_PATH = /tests\/[A-Za-z0-9_./-]+\.spec\.ts/g
/** 故意写坏的负例/夹具名（`zz-` / `nonexistent`）不判：它们是负例留证，不是活指针。 */
const IGNORED = /(?:^|\/)(?:zz-|nonexistent)/

/** 源码面后缀：`.js` 是包内手写运行时源码（markdown-shape-core），不是构建产物。 */
const SOURCE_SUFFIXES = ['.ts', '.tsx', '.js', '.mjs']

/** live 载体面（每个元素 = 一个「agent 会照着读」的目录 + 可读文本后缀）。 */
const FACES = [
  { dir: 'packages/company-pack/src', suffixes: SOURCE_SUFFIXES },
  { dir: 'notes/implemented', suffixes: ['.md'] },
  { dir: 'checks/audit', suffixes: ['.mjs'] },
  { dir: 'packages/company-pack/presets', suffixes: ['.md', '.yml', '.yaml'] },
  { dir: '.agents/skills', suffixes: ['.md'] },
]

/** 相对路径是否是仓库内的普通文件（目录不算：`tests/x.spec.ts/` 不是可跑的 spec）。 */
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

/** 面内所有指向不存在 spec 的字面量；每次命中带 `文件:行 → 字面量`。 */
function stalePointers(rel: string, suffixes: readonly string[]): string[] {
  const stale: string[] = []
  for (const file of filesUnder(rel, suffixes)) {
    readFileSync(join(ROOT, file), 'utf8').split('\n').forEach((line, index) => {
      for (const match of line.matchAll(TEST_PATH)) {
        if (IGNORED.test(match[0])) continue
        if (!isRepoFile(match[0])) stale.push(`${file}:${String(index + 1)} → ${match[0]}`)
      }
    })
  }
  return stale
}

describe('live 指针：tests/*.spec.ts 字面量必须现行', () => {
  it('源码注释（src/**）里的 spec 路径（BUG-187）', () => {
    expect(stalePointers('packages/company-pack/src', SOURCE_SUFFIXES), '源码注释是 agent 找证据的活指针；搬移同 diff 改新').toEqual([])
  })

  it('决策记忆（notes/implemented/**）里的 spec 路径', () => {
    expect(stalePointers('notes/implemented', ['.md']), 'implemented Note 是活文档：命令与普通文本里的落点都要现行（N5）').toEqual([])
  })

  it('ui-trajectory Note 的验证命令指到现行 spec（BUG-188）', () => {
    const note = readFileSync(join(ROOT, 'notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md'), 'utf8')
    expect(note).toContain('tests/ui/ui-surface.spec.ts')
    expect(note).not.toContain('tests/host/ui-surface.spec.ts')
    expect(isRepoFile('tests/ui/ui-surface.spec.ts')).toBe(true)
  })

  it('i18n Note 的 generic-english 落点指到现行 spec（BUG-189）', () => {
    const note = readFileSync(join(ROOT, 'notes/implemented/2026-11-12-i18n-expression-role-pilot.md'), 'utf8')
    expect(note).toContain('tests/content/content-english.spec.ts')
    expect(note).not.toContain('tests/content/generic-english.spec.ts')
    expect(isRepoFile('tests/content/content-english.spec.ts')).toBe(true)
  })

  it('审计脚本注释（checks/audit/**）里的 spec 路径（BUG-190）', () => {
    expect(stalePointers('checks/audit', ['.mjs']), '审计脚本注释里的测试路径要能直接跑（2026-11-15 candidate-scan 实例）').toEqual([])
  })

  it('源码面扫到 `.js` 源码（2026-11-16 二轮；markdown-shape-core 是产品源码，BUG-194）', () => {
    expect(filesUnder('packages/company-pack/src', SOURCE_SUFFIXES)).toContain('packages/company-pack/src/lib/docs/markdown-shape-core.js')
  })

  it('随包 presets 与 `.agents/skills` 在扫描面内（2026-11-16 二轮，BUG-195）', () => {
    const dirs = FACES.map(face => face.dir)
    expect(dirs).toContain('packages/company-pack/presets')
    expect(dirs).toContain('.agents/skills')
    expect(filesUnder('packages/company-pack/presets', ['.md', '.yml', '.yaml']).some(file => file.endsWith('SKILL.md'))).toBe(true)
    expect(filesUnder('.agents/skills', ['.md']).some(file => file.endsWith('SKILL.md'))).toBe(true)
  })

  it('每个 live 载体面都没有陈旧 spec 指针', () => {
    expect(FACES.flatMap(face => stalePointers(face.dir, face.suffixes)), '所有 live 载体面一起判：任一面的旧指针都红').toEqual([])
  })
})

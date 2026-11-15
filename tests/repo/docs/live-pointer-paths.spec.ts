/**
 * live 指针路径的命中判据（2026-11-16，BUG-187..190）。
 *
 * 为什么：测试树与源码树的搬移/退役只改得动静态 import；写在**注释与决策记忆正文**里的
 * `tests/*.spec.ts` 路径不在 tsconfig / import 解析面，也不在 `bare-path`（只扫 Markdown
 * 反引号）、`command-refs`（只扫 activeDocs）、`md-links`（只扫 Markdown 链接）的射程。
 * 2026-11-15 的实测：3 条模块头注、2 条 implemented Note、1 条 audit 注释，共 6 处指向不存在的
 * spec——agent 照着注释跑 `pnpm test <path>` 只会得到「No test files found」。
 *
 * 判据（机械、窄）：三个 live 载体里的 `tests/` 下 `*.spec.ts` 字面量必须在盘上存在。
 *   ① `packages/company-pack/src/**` 的 TS 注释（BUG-187；含 2026-11-15 预检标为「同类但非
 *      本批」的两处 cultivation 指针——同类必须同一批扫干净，否则守卫一上线就是红）；
 *   ② `notes/implemented/**`（BUG-188/189）：决策记忆是**活文档**，事实落点必须现行；
 *      普通文本与反引号命令都扫（BUG-189 正是纯文本）；
 *   ③ `checks/audit/**` 的注释（BUG-190）。
 *
 * 不扫：`notes/archived/`、`_backlog/_archive/`（冻结层，记录当时事实）、`snapshots/`（归档
 * 证据载荷）、fixture / 负例（`zz-` / `nonexistent` 等故意写坏的名字）。
 *
 * 证明不了：路径指向的 spec 语义上仍是那条判据（搬移可能把断言带偏）——那要靠各 spec 自己的
 * 断言与真入口；本 spec 只保证「指针不断」。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const TEST_PATH = /tests\/[A-Za-z0-9_./-]+\.spec\.ts/g

/** 递归收集面内满足后缀的文件（跳过隐藏目录与 node_modules）。 */
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
        if (!existsSync(join(ROOT, match[0]))) stale.push(`${file}:${String(index + 1)} → ${match[0]}`)
      }
    })
  }
  return stale
}

describe('live 指针：tests/*.spec.ts 字面量必须现行', () => {
  it('源码注释（src/**）里的 spec 路径', () => {
    expect(stalePointers('packages/company-pack/src', ['.ts', '.tsx']), '源码注释是 agent 找证据的活指针；搬移同 diff 改新').toEqual([])
  })

  it('决策记忆（notes/implemented/**）里的 spec 路径', () => {
    expect(stalePointers('notes/implemented', ['.md']), 'implemented Note 是活文档：命令与普通文本里的落点都要现行（N5）').toEqual([])
  })

  it('审计脚本注释（checks/audit/**）里的 spec 路径', () => {
    expect(stalePointers('checks/audit', ['.mjs']), '审计脚本注释里的测试路径要能直接跑（2026-11-15 candidate-scan 实例）').toEqual([])
  })

  it('三个扫描面都非空（判据被搬空 = 通过是假的）', () => {
    expect(filesUnder('packages/company-pack/src', ['.ts', '.tsx']).length).toBeGreaterThan(0)
    expect(filesUnder('notes/implemented', ['.md']).length).toBeGreaterThan(0)
    expect(filesUnder('checks/audit', ['.mjs']).length).toBeGreaterThan(0)
  })
})

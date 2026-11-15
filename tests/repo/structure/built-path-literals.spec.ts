/**
 * 构建产物路径字面量的命中判据（2026-11-16，BUG-185）。
 *
 * 为什么：`checks/` 的车道会按字符串拼 `packages/company-pack/lib/types/…js` 去 import 构建产物
 * （重放车道 import 读模型的 presence 导出）。这种路径不在任何静态 import / tsconfig 解析面，
 * 源码分组搬移后 TypeScript 照常构建、`pnpm test` 与 `pnpm verify` 照常全绿——只有真正跑那条
 * 车道才会炸（2026-11-15：`lib/types/lib/presence.js` 已不存在，replay 确定性 MODULE_NOT_FOUND）。
 *
 * 判据（机械、窄）：
 *   ① 字面量必须能对到**现行源码布局**：`lib/types/<path>.js` ↔ `src/<path>.ts`（或 `.tsx`）；
 *   ② 构建树 `lib/types/` 在场时，字面量必须同时是**真实产物**（陈旧字面量不能靠旧产物续命）。
 *
 * 扫 `checks/`、`tools/`、`probes/` 的 `.mjs` 原文（含注释里的用法示例——它们同样是 agent 会
 * 照着跑的字面量）。不判 `lib/client.js`：那是 tsdown 打包入口，构建前本来就不在盘上。
 *
 * 证明不了：车道真的跑通——那是车道自己的判据（本卡 = `node checks/lanes/replay.e2e.mjs`）。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const AREAS = ['checks', 'tools', 'probes']
const LITERAL = /packages\/company-pack\/lib\/types\/[A-Za-z0-9_./-]+\.js/g
const BUILT_ROOT = join(ROOT, 'packages/company-pack/lib/types')

/** 递归收集面内的 `.mjs` 文件（跳过隐藏目录与 node_modules）。 */
function scriptsOf(rel: string): string[] {
  const dir = join(ROOT, rel)
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const child = `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...scriptsOf(child))
    else if (entry.name.endsWith('.mjs')) out.push(child)
  }
  return out
}

/** `lib/types/a/b.js` → 现行源码候选 `src/a/b.ts` / `src/a/b.tsx`。 */
function sourceCandidates(literal: string): string[] {
  const rest = literal.replace('packages/company-pack/lib/types/', '').replace(/\.js$/, '')
  return [`packages/company-pack/src/${rest}.ts`, `packages/company-pack/src/${rest}.tsx`]
}

function findings(): string[] {
  const problems: string[] = []
  for (const file of AREAS.flatMap(scriptsOf)) {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n')
    lines.forEach((line, index) => {
      for (const match of line.matchAll(LITERAL)) {
        const literal = match[0]
        const where = `${file}:${String(index + 1)}`
        if (!sourceCandidates(literal).some(candidate => existsSync(join(ROOT, candidate)))) {
          problems.push(`${where} → ${literal}（没有现行源码对应：${sourceCandidates(literal).join(' 或 ')}）`)
          continue
        }
        if (existsSync(BUILT_ROOT) && !existsSync(join(ROOT, literal))) {
          problems.push(`${where} → ${literal}（构建树在场但产物不存在：陈旧字面量）`)
        }
      }
    })
  }
  return problems
}

describe('构建产物路径字面量（checks/tools/probes）', () => {
  it('每个 packages/company-pack/lib/types/*.js 字面量都对到现行源码与产物', () => {
    expect(findings(), '改源码分组后必须同 diff 改这些字面量（或在车道里用稳定入口）').toEqual([])
  })

  it('扫描面非空（判据没有对象 = 通过是假的）', () => {
    const scripts = AREAS.flatMap(scriptsOf)
    expect(scripts.length).toBeGreaterThan(0)
    expect(scripts.some(file => /\.e2e\.mjs$|\.entry\.mjs$/.test(file)), 'checks 车道应当在这个面内').toBe(true)
  })
})

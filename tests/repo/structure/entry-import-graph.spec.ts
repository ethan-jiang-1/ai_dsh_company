import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { localImportPath, parseKeylessImports } from '../../support/keyless-imports.mjs'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

// 负例留证 2026-11-17：向 probes 注入不存在的 import，本 spec 红（BUG-206）；删除 → 绿。

/**
 * 入口 import 图可解析（2026-11-17 BUG-206）。
 *
 * 为什么：`SURFACE_RULES` 对 `probes/**` / `tools/**` 写 `coveredBy`，旧实现只是**声明**某条
 * 无条件步骤「覆盖」这些面；pre-push 照此打印「证据 = verify」，而 verify 根本不加载探针。
 * 实测把一条不存在的 import 注入 `probes/analyze/explore-evidence-probe.mjs`，pre-push 与 verify
 * 全绿，只有真跑探针才 `ERR_MODULE_NOT_FOUND`。
 *
 * 判据（机械、窄）：`tools/**`、`checks/**`、`probes/**` 的每个 `.mjs` 都解析本地静态 import /
 * 字面量动态 import / re-export，目标必须是盘上的普通文件；扫描面与边数非空。
 *
 * 不证明：运行时行为（导出形状、装配、真实进程）；非字面量动态路径（`unresolvedImports` 归
 * `face-boundaries.spec.ts` 的五个面）。它证明的是「入口图可解析」——比「登记了 verify」强一层，
 * 但不是「跑通了」。
 *
 * 负例留证 2026-11-17：向 probes 注入不存在的 import，本 spec 红（BUG-206）；删除 → 绿。
 */
const ROOTS = ['tools', 'checks', 'probes']

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === '.git') return []
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.mjs') ? [path] : []
  })
}

const files = ROOTS.flatMap(root => walk(join(ROOT, root))).sort()
const missing: string[] = []
const syntaxErrors: string[] = []
let edges = 0
for (const file of files) {
  const parsed = parseKeylessImports(readFileSync(file, 'utf8'), file)
  for (const error of parsed.syntaxErrors) syntaxErrors.push(`${relative(ROOT, file)} → ${error}`)
  for (const { specifier } of parsed.imports) {
    const target = localImportPath(file, specifier)
    if (target === undefined) continue
    edges += 1
    try {
      if (!statSync(target).isFile()) missing.push(`${relative(ROOT, file)} → ${specifier}`)
    } catch {
      missing.push(`${relative(ROOT, file)} → ${specifier}`)
    }
  }
}

describe('入口 import 图可解析（coveredBy 的执行证据，不是声明）（BUG-206）', () => {
  it('扫描面非空，且确实读到本地 import 边', () => {
    expect(files.length, '三个入口面一个 .mjs 都没扫到——空集不是通过').toBeGreaterThan(0)
    expect(edges, '没有解析到任何本地 import 边——规则或解析器失效').toBeGreaterThan(0)
  })

  it('每个本地 import 目标都是普通文件', () => {
    expect(missing, '入口 import 指向不存在的本地目标——pre-push 的 coveredBy 不能只说「verify」').toEqual([])
  })

  it('入口文件没有语法错误（坏文件不是可解析图）', () => {
    expect(syntaxErrors).toEqual([])
  })
})

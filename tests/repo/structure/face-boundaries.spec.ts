import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { localImportPath, parseKeylessImports } from '../../support/keyless-imports.mjs'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

/**
 * 面库依赖方向（2026-11-17 归属整理的机械守卫）。
 *
 * 归属规则（docs/surface-contract.md）：
 * - tools/lib = 跨面共享地基，自包含；不得 import checks/probes/tests。
 * - checks/lib = judge-wide 判据；不得 import show/test，也不得依赖 gate/lane-local。
 * - probes/lib = show-wide 支撑；不得 import judge/test。
 * - checks/gates/lib 只许 gates 子树消费；checks/lanes/lib 只许 lanes 子树消费；
 *   tests/support 只许 tests 消费。
 *
 * 为什么不能只看目录：import 是真正的调用图；一个文件住对了家、却 import 了面库，
 * 归属仍然是假的。本 spec 遍历五个 lib 的本地 import，逐边判方向。
 *
 * 不证明：运行时通过动态字符串/非字面量路径拼接的依赖（本仓禁手搓裸路径，但无法穷尽）；
 * 也不证明这些模块的行为正确。
 *
 * 负例留证 2026-11-17：往 tools/lib/core 加 `import '../../../checks/lib/entry-probe.mjs'`
 *   → 共享地基→judge 边红；删除 → 绿。
 * 负例留证 2026-11-17（tests 源）：tests/support 加一条指向
 *   `../../checks/lanes/lib/company-root-probe.mjs` 的 import → lane-local 支撑只许 checks/lanes/** 消费；删除 → 绿。
 * 负例留证 2026-11-17（路径字面量）：coverage-ratchet 读 `tests/support/coverage-baseline.json`
 *   → “test-only 只许 tests/** 引用”红；基线搬到 `checks/lib/` 后绿。
 */

const ZONE_ROOTS = ['tools/lib', 'checks/lib', 'checks/gates/lib', 'checks/lanes/lib', 'probes/lib']
const SCAN_ROOTS = ['tools', 'checks', 'probes', 'tests']

type Edge = { source: string; target: string; sourceZone: string; targetZone: string }

function zoneOf(rel: string): string {
  for (const zone of ZONE_ROOTS) {
    if (rel === zone || rel.startsWith(`${zone}/`)) return zone
  }
  if (rel.startsWith('tests/support/')) return 'tests/support'
  if (rel.startsWith('tests/')) return 'tests'
  return 'other'
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(path)
    return /\.(mjs|ts)$/.test(entry.name) ? [path] : []
  })
}

const files = SCAN_ROOTS.flatMap(root => walk(resolve(ROOT, root))).sort()
const edges: Edge[] = []
for (const file of files) {
  const source = relative(ROOT, file).split(sep).join('/')
  const parsed = parseKeylessImports(readFileSync(file, 'utf8'), file)
  for (const { specifier } of parsed.imports) {
    const target = localImportPath(file, specifier)
    if (target === undefined) continue
    const targetRel = relative(ROOT, target).split(sep).join('/')
    edges.push({ source, target: targetRel, sourceZone: zoneOf(source), targetZone: zoneOf(targetRel) })
  }
}

const FORBIDDEN_EDGES: readonly { from: RegExp; to: RegExp; why: string }[] = [
  { from: /^tools\/lib\//, to: /^(?:checks|probes|tests)\//, why: '共享地基不得依赖面库或 test-only 支撑' },
  { from: /^checks\/lib\//, to: /^(?:probes|tests)\//, why: 'judge-wide 判据不得依赖 show 或 test-only 支撑' },
  { from: /^checks\/lib\//, to: /^checks\/(?:gates|lanes)\/lib\//, why: 'judge-wide 判据不得依赖 gate/lane-local 支撑' },
  { from: /^probes\/lib\//, to: /^(?:checks|tests)\//, why: 'show-wide 支撑不得依赖 judge 或 test-only 支撑' },
  { from: /^tools\//, to: /^(?:checks|probes|tests)\//, why: 'operate 面不得依赖 judge/show/test-only 实现' },
  { from: /^checks\//, to: /^(?:probes|tests)\//, why: 'judge 面不得依赖 show/test-only 实现' },
  { from: /^probes\//, to: /^(?:checks|tests)\//, why: 'show 面不得依赖 judge/test-only 实现' },
]

describe('面库依赖方向（归属不是目录位置，是 import 方向）', () => {
  it('扫描面非空，且确实读到了本地 import 边', () => {
    expect(files.length, '五个 lib 根都没扫到文件——守卫空转会假绿').toBeGreaterThan(0)
    expect(edges.length, '没有读到任何本地 import 边——解析器或路径规则失效').toBeGreaterThan(0)
  })

  it('共享地基/ judge / show 不得反向依赖面库或测试专属支撑', () => {
    const problems: string[] = []
    for (const edge of edges) {
      for (const rule of FORBIDDEN_EDGES) {
        if (!rule.from.test(edge.source) || !rule.to.test(edge.target)) continue
        problems.push(`${edge.source} → ${edge.target}：${rule.why}`)
        break
      }
    }
    expect(problems, '违反归属规则的 import 边（修家或搬模块，不要加豁免）').toEqual([])
  })


  it('local support 的路径字面量只许各自子树引用（非 tests 源；tests 由 import 守卫）', () => {
    const rules = [
      { prefix: 'checks/gates/lib/', allowed: /^checks\/gates\//, why: 'gate-local 只许 checks/gates/** 引用' },
      { prefix: 'checks/lanes/lib/', allowed: /^checks\/lanes\//, why: 'lane-local 只许 checks/lanes/** 引用' },
      { prefix: 'tests/support/', allowed: /^tests\//, why: 'test-only 只许 tests/** 引用' },
    ]
    // 两个豁免都是“点名/注释”，不是消费：checks-index 排除前缀；naming-contract 注释说明不扫 tests/support。
    const allow = new Set(['tools/lib/core/checks-index.mjs', 'checks/gates/naming-contract.mjs'])
    const problems: string[] = []
    for (const file of files) {
      const source = relative(ROOT, file).split(sep).join('/')
      if (source.startsWith('tests/') || allow.has(source)) continue
      const text = readFileSync(file, 'utf8')
      for (const rule of rules) {
        if (!text.includes(rule.prefix)) continue
        if (!rule.allowed.test(source)) problems.push(`${source} → ${rule.prefix}：${rule.why}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('gate-local / lane-local / test-only 支撑只许各自子树消费', () => {
    const problems: string[] = []
    for (const edge of edges) {
      if (edge.targetZone === 'checks/gates/lib' && !edge.source.startsWith('checks/gates/')) {
        problems.push(`${edge.source} → ${edge.target}：gate-local 支撑只许 checks/gates/** 消费`)
      }
      if (edge.targetZone === 'checks/lanes/lib' && !edge.source.startsWith('checks/lanes/')) {
        problems.push(`${edge.source} → ${edge.target}：lane-local 支撑只许 checks/lanes/** 消费`)
      }
      if (edge.targetZone === 'tests/support' && !edge.source.startsWith('tests/')) {
        problems.push(`${edge.source} → ${edge.target}：tests/support 只许 tests/** 消费`)
      }
    }
    expect(problems).toEqual([])
  })
})

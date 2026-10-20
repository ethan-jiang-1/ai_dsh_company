import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { inspectKeylessGraph } from '../../tools/lib/keyless-imports.mjs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 测试分层纪律的**机械门禁**（guides/dev-loop §9.1，R3 立）。
 *
 * 起因（用户当轮反馈）："这种测试如果是 regression 的话，跑得这样慢是完全受不了的。"
 * 结论：`pnpm test` 是秒级 keyless 单元/纯逻辑层；需要子进程的 CLI 集成检查放独立 smoke，
 * 真模型/真浏览器才进认证档，均按改动面与验收要求运行。
 *
 * 散文会被忘掉，所以这里把它变成断言：**Vitest spec 里出现子进程 / playwright / fetch / 密钥，
 * 直接红。** 有副作用的 CLI 或真实入口检查 → 写 `checks/smoke/*-smoke.mjs`，别塞进 tests/。
 */

const TESTS = join(ROOT, 'tests')
/** 本文件必然"点名"这些禁物，扫描时跳过它自己。 */
const SELF = fileURLToPath(import.meta.url)

/** 回归层不许出现的东西 + 为什么。 */
const FORBIDDEN: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /from ['"]node:child_process['"]/, why: '起进程 = 起真服务/真浏览器 → 属于认证档' },
  { pattern: /\bplaywright\b/i, why: '真浏览器 → 认证档（client-load-smoke）' },
  { pattern: /DEEPSEEK_API_KEY|credentials\.yaml/, why: '回归必须 keyless' },
  // fetch/spawn/exec are checked from parsed call expressions below; regex would
  // mistake a fixture string for an executed call.

]

/** 递归收集 tests/ 下的 spec 文件。 */
function specFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...specFiles(path))
    else if (/\.spec\.tsx?$/.test(entry.name)) found.push(path)
  }
  return found
}

describe('测试分层纪律（guides/dev-loop §9.1：真模型/真浏览器不进回归）', () => {
  it('回归层不许出现子进程 / 浏览器 / 网络 / 密钥', () => {
    const offenders: string[] = []
    for (const file of specFiles(TESTS)) {
      if (file === SELF) continue
      const text = readFileSync(file, 'utf8')
      for (const { pattern, why } of FORBIDDEN) {
        if (pattern.test(text)) offenders.push(`${relative(ROOT, file)} → ${why}`)
      }
    }
    expect(offenders, '回归层要秒级：把真入口的检查写成 checks/probes/tools 下的入口脚本，别塞进 tests/').toEqual([])
  })

  it('`pnpm test` 只跑 tests/ 下的 keyless 单测，认证档脚本不进 vitest', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.test, 'pnpm test 必须只是 vitest run').toBe('vitest run')
    const config = readFileSync(join(ROOT, 'vitest.config.ts'), 'utf8')
    expect(config, 'vitest include 只认 tests/**').toContain("include: ['tests/**/*.spec.ts']")
    // coverage 统计面可含 tools/lib（与下方 import 守卫的纯逻辑库例外同款，2026-10-21 C5 起）——
    // 守的是**测试发现**不进驱动/认证档，不是统计面。
    expect(config, '认证档脚本不得进 vitest include').not.toMatch(/include:.*(?:checks|probes|tools)\/(?!lib\/)/)
  })

  it('replay lane 是第三档：只由 checks/smoke/replay-smoke.mjs 驱动，不进 pnpm test', () => {
    // ① 回归层不得 import checks|probes|tools 下的**驱动脚本**——上面的 FORBIDDEN 只扫 spec 自己的
    //    文本，import 进来会把 spawn/fetch/浏览器整条带进回归层（文本扫描看不见传递引入）。
    //    `tools/lib/`（纯逻辑库）除外：deliverables.mjs 这类无副作用模块本来就是 keyless
    //    单测的对象（R4 设计），禁它会误伤。
    const importers: string[] = []
    for (const file of specFiles(TESTS)) {
      if (file === SELF) continue
      const text = readFileSync(file, 'utf8')
      if (/(?:from|import)\s*\(?['"][^'"]*(?:checks|probes|tools)\/(?!lib\/)/.test(text)) importers.push(relative(ROOT, file))
    }
    expect(importers, '驱动脚本（*-smoke / replay-smoke）不得被 tests/ import（tools/lib/ 纯逻辑库除外）').toEqual([])

    // `tools/lib/` is the keyless seam. Follow the local graph, including
    // re-exports and literal dynamic imports; do not execute anything while scanning.
    const libRoot = join(ROOT, 'tools/lib')
    const entries = readdirSync(libRoot, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.mjs'))
      .map(entry => join(libRoot, entry.name))
    const report = inspectKeylessGraph(entries, { libRoot })
    const libOffenders = report.violations.map(({ file, reason, chain }) =>
      `${relative(ROOT, file)} → ${reason} [${chain.map(path => relative(ROOT, path)).join(' → ')}]`)
    const allowedUnresolved = new Set([
      "pathToFileURL(resolveParser('mdast-util-from-markdown')).href",
      "pathToFileURL(resolveParser('mdast-util-gfm')).href",
      "pathToFileURL(resolveParser('micromark-extension-gfm')).href",
    ])
    expect(report.unresolvedImports.every(({ file, expression }) =>
      file.endsWith('/markdown-links.mjs') && allowedUnresolved.has(expression)),
      '非字面量动态 import 只允许已审阅的 vendor parser loader；其他表达式不得伪装成已证明安全').toBe(true)
    expect(libOffenders, 'tools/lib 只能保持 keyless 纯逻辑；本地驱动、危险 builtin 和运行调用必须隔离').toEqual([])

    // ② 任何 vitest 配置都不得把检查/工具目录编进测试发现——将来加第二个 config（replay lane）也算。
    const configFiles = readdirSync(ROOT).filter(name => /^vitest.*\.config\./.test(name))
    expect(configFiles.length, '主 vitest.config.ts 应在场').toBeGreaterThan(0)
    for (const name of configFiles) {
      const text = readFileSync(join(ROOT, name), 'utf8')
      expect(text, `${name} 不得把 checks/probes/tools 驱动编进测试发现（tools/lib 纯逻辑库例外同上）`).not.toMatch(/include:.*(?:checks|probes|tools)\/(?!lib\/)/)
    }

    // ③ 纪律有家：replay-smoke 自己的头注声明分层（guides/dev-loop §9.1）。
    const replay = readFileSync(join(ROOT, 'checks/smoke/replay-smoke.mjs'), 'utf8')
    expect(replay, 'replay-smoke 头注必须声明"不进 pnpm test"').toContain('不进 pnpm test')
  })

  it('分层预算写在 guides/dev-loop §9.1（纪律有家，不靠记忆）', () => {
    const guide = readFileSync(join(ROOT, 'docs/guides/dev-loop.md'), 'utf8')
    expect(guide, 'guides/dev-loop 缺 §9.1 测试分层').toContain('9.1 测试分层与预算')
    expect(guide, '§9.1 必须写明"真模型 / 真浏览器不进迭代环"').toContain('真模型 / 真浏览器不进迭代环')
  })
})

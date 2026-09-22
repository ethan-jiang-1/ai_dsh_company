import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 测试分层纪律的**机械门禁**（guides/60 §9.1，R3 立）。
 *
 * 起因（用户当轮反馈）："这种测试如果是 regression 的话，跑得这样慢是完全受不了的。"
 * 结论：按"要不要模型"分层——回归层（`pnpm test`）必须**秒级、无 key、无浏览器**；
 * 真模型/真浏览器一律进认证档（`scripts/*-smoke.mjs`），每轮跑一次。
 *
 * 散文会被忘掉，所以这里把它变成断言：**回归层里出现子进程 / playwright / fetch / 密钥，
 * 直接红。** 想测真入口 → 写认证档脚本，别塞进 tests/。
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const TESTS = join(ROOT, 'tests')
/** 本文件必然"点名"这些禁物，扫描时跳过它自己。 */
const SELF = 'layering.spec.ts'

/** 回归层不许出现的东西 + 为什么。 */
const FORBIDDEN: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /from ['"]node:child_process['"]/, why: '起进程 = 起真服务/真浏览器 → 属于认证档' },
  { pattern: /\bplaywright\b/i, why: '真浏览器 → 认证档（client-load-smoke）' },
  { pattern: /\bfetch\s*\(/, why: '网络/RPC → 认证档（真 web）' },
  { pattern: /DEEPSEEK_API_KEY|credentials\.yaml/, why: '回归必须 keyless' },
  { pattern: /\bspawn\s*\(/, why: '起进程 → 认证档' },
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

describe('测试分层纪律（guides/60 §9.1：真模型/真浏览器不进回归）', () => {
  it('回归层不许出现子进程 / 浏览器 / 网络 / 密钥', () => {
    const offenders: string[] = []
    for (const file of specFiles(TESTS)) {
      if (file.endsWith(SELF)) continue
      const text = readFileSync(file, 'utf8')
      for (const { pattern, why } of FORBIDDEN) {
        if (pattern.test(text)) offenders.push(`${relative(ROOT, file)} → ${why}`)
      }
    }
    expect(offenders, '回归层要秒级：把真入口的检查写成 scripts/*-smoke.mjs，别塞进 tests/').toEqual([])
  })

  it('`pnpm test` 只跑 tests/ 下的 keyless 单测，认证档脚本不进 vitest', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.test, 'pnpm test 必须只是 vitest run').toBe('vitest run')
    const config = readFileSync(join(ROOT, 'vitest.config.ts'), 'utf8')
    expect(config, 'vitest include 只认 tests/**').toContain("include: ['tests/**/*.spec.ts']")
    expect(config, '认证档脚本（scripts/）不得进 vitest include').not.toMatch(/include:.*scripts\//)
  })

  it('分层预算写在 guides/60 §9.1（纪律有家，不靠记忆）', () => {
    const guide = readFileSync(join(ROOT, 'docs/guides/60-dev-loop.md'), 'utf8')
    expect(guide, 'guides/60 缺 §9.1 测试分层').toContain('9.1 测试分层与预算')
    expect(guide, '§9.1 必须写明"真模型 / 真浏览器不进迭代环"').toContain('真模型 / 真浏览器不进迭代环')
  })
})

/**
 * skip 预算守卫（R5-16；2026-11-03 A- 批次）。
 *
 * 病类：`describe.skipIf` / `it.skip` 静默增长，跳过 = 假绿。规则（docs/testing.md §3.6）：
 * 自跳过不是成本信号；新增 skip 须配「预期 N 个真跑」守卫，全跳 = 假绿。
 * 本档是**声明守卫**：允许的 skip 文件必须登记在这里并写明预期；新 skip 未登记即红。
 * 它不证明被跳过用例真跑过——那由 dev home 的 `pnpm test`（0 skipped）与各 spec 头注负责。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

/** 唯一允许的 skip：dev-only live 台账；预期 dev home 真跑 3 例，fresh clone 0 例。 */
const ALLOWED = new Map([
  ['tests/company/ledger.spec.ts', 'dev-only live 台账：预期 3 例（dev home）/ 0 例（fresh clone）'],
])
const TOKENS = [/\b(?:describe|it|test)\.(?:skipIf|skip)\(/]

function specFiles(): string[] {
  const out: string[] = []
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else if (entry.name.endsWith('.spec.ts') && child !== 'tests/harness/skip-budget.spec.ts') out.push(child)
    }
  }
  walk('tests')
  return out
}

describe('skip 预算（新增 skip 必须登记预期 N）', () => {
  it('只有登记过的 spec 允许 skip，且登记文件写明预期', () => {
    const offenders = specFiles().filter(rel => {
      const text = readFileSync(join(ROOT, rel), 'utf8')
      return TOKENS.some(token => token.test(text))
    })
    expect(offenders).toEqual([...ALLOWED.keys()])
    for (const [rel, expectation] of ALLOWED) {
      const text = readFileSync(join(ROOT, rel), 'utf8')
      expect(text, `${rel} 缺“skip 预期”注释`).toContain('skip 预期')
      expect(text).toContain('预期')
      expect(expectation.length).toBeGreaterThan(0)
    }
  })
})

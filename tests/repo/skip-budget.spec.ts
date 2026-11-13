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
  ['tests/lib/ledger.spec.ts', 'dev-only live 台账：预期 3 例（dev home）/ 0 例（fresh clone）'],
])
const TOKENS = [/\b(?:describe|it|test)\.(?:skipIf|skip)\(/]

function specFiles(): string[] {
  const out: string[] = []
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else if (entry.name.endsWith('.spec.ts') && child !== 'tests/repo/skip-budget.spec.ts') out.push(child)
    }
  }
  walk('tests')
  return out
}

/** `describe.skipIf(...)` 回调体（从 `=> {` 到匹配的 `}`）；找不到返回空串。 */
function skippedBlock(text: string): string {
  const at = text.search(/describe\.skipIf\(/)
  if (at < 0) return ''
  const arrow = text.indexOf('=>', at)
  if (arrow < 0) return ''
  const open = text.indexOf('{', arrow)
  if (open < 0) return ''
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(open + 1, i)
    }
  }
  return ''
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
      expect(text, `${rel} 的 skip 预期注释缺“预期 N 例”`).toMatch(/skip 预期：[^\n]*?\d+\s*例/)
      expect(expectation.length).toBeGreaterThan(0)
    }
  })

  it('登记的 skip 块里 it 数必须等于注释的预期 N（防静默加例）', () => {
    for (const rel of ALLOWED.keys()) {
      const text = readFileSync(join(ROOT, rel), 'utf8')
      const count = (skippedBlock(text).match(/\bit\(/g) ?? []).length
      const expected = /skip 预期：[^\n]*?(\d+)\s*例/.exec(text)?.[1]
      expect(expected, `${rel} 缺“预期 N 例”`).toBeDefined()
      expect(count, `${rel} 的 skip 块有 ${String(count)} 个 it，注释预期 ${String(expected)} 例`).toBe(Number(expected))
    }
  })
})

/**
 * v6 dry-run（2026-11-14）：v5 Note 的未覆盖轴里，能在本机 keyless 证的两个形状先证掉。
 *
 * - Windows `..\`：字符串路径语义（真 Windows runner 仍缺，trigger 在 _backlog/triggers.md）。
 * - 围栏块嵌套：外层 4 反引号 + 内层 3 反引号，真账本在顶层。
 * 其余 3 条：闭合行残余 = prd-check 的策略夹具；notes 根 symlink = notes-tree.test；
 * 命令执行 = verify 不可证，归 test/pre-push（docs/testing.md 边界）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readCompanyFileAt } from '../../packages/company-pack/src/host/run-bundle/company-root.ts'
import { extractJsonBlock } from '../../packages/company-pack/src/lib/prd-check.ts'

describe('v6 dry-run：已分类轴的本地证据', () => {
  it('Windows `..\\` 越界 → unsafe（不是 missing）', () => {
    const ws = mkdtempSync(join(tmpdir(), 'v6-path-'))
    try {
      mkdirSync(join(ws, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(ws, 'outside-secret.md'), 'secret\n')
      const home = join(ws, '.dsh-company')
      expect(readCompanyFileAt(home, '..\\outside\\secret.md').kind).toBe('unsafe')
    } finally { rmSync(ws, { recursive: true, force: true }) }
  })

  it('围栏块嵌套：只取顶层 json，不取示例里的内层块', () => {
    const body = ['````markdown', '```json', '{"example":true}', '```', '````', '', '```json', '{"real":true}', '```'].join('\n')
    const result = extractJsonBlock(body)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ real: true })
  })
})

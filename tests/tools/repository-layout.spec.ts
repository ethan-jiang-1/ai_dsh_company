import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findRepositoryRoot } from '../../tools/lib/core/repository-layout.mjs'

/**
 * 仓库根解析必须与文件深度无关：lib 分组/搬家后，任何 lib 模块都能解析到同一个根。
 * 负控 = 没有 workspace 标记时**报错**，不静默退回一个错误深度（错根会让所有路径判据静默错）。
 */
describe('仓库根解析（深度无关）', () => {
  it('从任意深度向上找到 workspace 根', () => {
    const dir = mkdtempSync(join(tmpdir(), 'repo-root-'))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages: []\n')
    const deep = join(dir, 'a', 'b', 'c')
    mkdirSync(deep, { recursive: true })
    expect(findRepositoryRoot(deep)).toBe(dir)
    expect(findRepositoryRoot(dir)).toBe(dir)
  })

  it('找不到即报错，不静默退回错误深度', () => {
    const dir = mkdtempSync(join(tmpdir(), 'repo-root-none-'))
    expect(() => findRepositoryRoot(dir)).toThrow(/仓库根解析失败/)
  })
})

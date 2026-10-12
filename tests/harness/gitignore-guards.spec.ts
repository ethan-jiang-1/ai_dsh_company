import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

// 负例留证 2026-10-12：BUG-013 —— 修复前 runtime/e2e/assembly-e2e-driver.mjs 被 git 跟踪且 :11
// 硬编码观察窗 token（卡复现节收据：git ls-files 非空）。本守卫的红法 = 删 .gitignore 的
// runtime/e2e/ 规则（下方用例即红）；「零 tracked」不变量由规则 + git 机制执法（普通 add 被规则
// 拦截，仅 add -f 可复发）——tracked 面的进程级核查属 smoke lane（testing.md 分层），不进 keyless。
describe('gitignore-guards（BUG-013）', () => {
  it('.gitignore 显式忽略 runtime/e2e/（runtime/ 为逐条点名式，无 blanket 规则）', () => {
    const gitignore = readFileSync(join(repositoryRoot, '.gitignore'), 'utf8')
    expect(gitignore).toMatch(/^runtime\/e2e\/$/m)
  })
})

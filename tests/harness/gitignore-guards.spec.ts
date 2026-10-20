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
  // 负例留证 2026-10-20：BUG-029 —— 临时删 `.gitignore` 的 runtime/web-logs/ 规则 → 本 spec 红；
  // 还原即绿（实跑见 notes/implemented/2026-10-20-tracked-token-guard.md）。
  it('.gitignore 显式忽略 runtime/web-logs/（BUG-029：启动横幅含 token）', () => {
    const gitignore = readFileSync(join(repositoryRoot, '.gitignore'), 'utf8')
    expect(gitignore).toMatch(/^runtime\/web-logs\/$/m)
  })
  // 2026-10-13 瘦身轮：公司盘过程物料（drafts 含 sources）不进 git；成品（final/meta）照旧入库。
  // 进程级核查（index 里零 drafts）在 verify 的 drafts-untracked 门禁——本 spec 只钉规则在场。
  it('.gitignore 点名忽略公司盘 drafts/（交付物过程物料），且不 blanket 整个 deliverables', () => {
    const gitignore = readFileSync(join(repositoryRoot, '.gitignore'), 'utf8')
    expect(gitignore).toMatch(/^company-workspace\/deliverables\/\*\/drafts\/$/m)
    expect(gitignore).toMatch(/^company-workspace\/deliverables-archive\/\*\/drafts\/$/m)
    expect(gitignore, 'blanket 掉整个 deliverables 会把成品也挡在门外').not.toMatch(/^company-workspace\/deliverables\/?$/m)
  })
})

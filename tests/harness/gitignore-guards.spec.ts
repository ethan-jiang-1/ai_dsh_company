import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

// 2026-10-25：runtime/ 从「逐条点名」改为「默认拒绝 + 显式白名单」。
// 本 spec 只守 `.gitignore` 的**文本形状**（keyless 纯读，不起子进程——testing.md 分层）；
// 真实匹配行为（ops 默认 ignored / 白名单 not-ignored）由 checks/gates/gitignore-shape.mjs
// 用 `git check-ignore` 在 verify 里守，避免把子进程塞进 `pnpm test`。
// 负例留证 2026-10-12：BUG-013 —— runtime/e2e/assembly-e2e-driver.mjs 曾 tracked 且硬编码 token；
// 负例留证 2026-10-20：BUG-029 —— runtime/web-logs/*.log 曾 tracked 且首行带 token。
// 这两类路径现在由 `runtime/*` 默认拒绝兜住（行为断言在 gitignore-shape 门禁）。
const gitignore = readFileSync(join(repositoryRoot, '.gitignore'), 'utf8')

describe('gitignore-guards（runtime 默认拒绝 + 白名单形状）', () => {
  it('.gitignore 整树拒绝 runtime/*，并显式放行 5 件 tracked 白名单', () => {
    expect(gitignore).toMatch(/^runtime\/\*$/m)
    expect(gitignore).toMatch(/^!runtime\/README\.md$/m)
    expect(gitignore).toMatch(/^!runtime\/probe-\*\.mjs$/m)
    expect(gitignore).toMatch(/^!runtime\/harness-home\/$/m)
    expect(gitignore).toMatch(/^runtime\/harness-home\/\*$/m)
    expect(gitignore).toMatch(/^!runtime\/harness-home\/README\.md$/m)
  })

  // 2026-10-24 RFC run-bundle-install-unit：公司盘整树是 **dev run bundle 的 workspace**，不进 git
  // （成品/台账/journal/交付物/过程物料都只住 bundle）。索引级反例 = run-bundle-clean 门禁。
  it('.gitignore 整树忽略 dev bundle 的 company-workspace/（fresh clone 不带部署历史）', () => {
    expect(gitignore).toMatch(/^company-workspace\/$/m)
    expect(gitignore, '不允许给 bundle 的 workspace 开负例外').not.toMatch(/^!company-workspace\//m)
  })

  it('_dist/ 只放行安装手册，tgz 仍走 ignore', () => {
    expect(gitignore).toMatch(/^_dist\/\*$/m)
    expect(gitignore).toMatch(/^!_dist\/安装手册\.md$/m)
  })
})

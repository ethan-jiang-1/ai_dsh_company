// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── run bundle 零 tracked（run-bundle-clean，2026-10-24 立，RFC run-bundle-install-unit）─────
// 为什么：`company-workspace/` 是**本部署 run bundle 的 workspace**（会话 cwd + 成品/台账/journal/
// 培养记录/交付物），不是产品源码；`runtime/harness-home/` 是同一个 bundle 的 DSH home
// （sessions/profiles/凭据/storages）。用户令：run bundle 不进 git，否则“每次安装清爽”不成立。
// 规则写在 .gitignore（整树），但 `git add -f` 能绕过 ⇒ 这里做**索引级**核查：
// index 里出现任何 bundle 路径即红，并点名具体文件。README 例外 = runtime/harness-home/README.md
// （fresh clone 也要有的 owner 说明，历史上就 tracked）。
// 负例留证（实跑，红→还原→绿）：`git add -f company-workspace/AGENTS.md`
// ⇒ `FAIL run-bundle-clean: index 里有 1 件 bundle 数据…`；`git rm --cached -- <路径>` ⇒ 绿。
export function run({ root, ok, fail }) {
  const tracked = execFileSync('git', ['-C', root, 'ls-files', '--', 'company-workspace', 'runtime/harness-home'], { encoding: 'utf8' })
    .split('\n').filter(Boolean)
  const offenders = tracked.filter(path => path !== 'runtime/harness-home/README.md')
  const gitignore = readFileSync(join(root, '.gitignore'), 'utf8')
  const rule = /^company-workspace\/$/m.test(gitignore)
  const problems = []
  if (!rule) problems.push('.gitignore 缺 `company-workspace/` 整树规则——git add 会重新把部署数据带进来')
  if (offenders.length > 0) {
    problems.push(`index 里有 ${String(offenders.length)} 件 bundle 数据（run bundle 不进 git）：`
      + offenders.slice(0, 5).join(', ') + (offenders.length > 5 ? ' …' : ''))
  }
  problems.length === 0
    ? ok('run-bundle-clean 公司盘与 dev home 零 tracked（bundle 只住 git 外）')
    : fail('run-bundle-clean', problems.join('；'))
}

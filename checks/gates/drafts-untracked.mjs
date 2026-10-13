// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

// ── 2c-quater. 公司盘过程物料不进 git（drafts-untracked，2026-10-13 瘦身轮）──────────
// 为什么：`drafts/**`（含 `sources/` 的 PDF/HTML/raw 原始取证）是**过程物料**（实测 531 件 / ≈70MB
// tracked），入库价值由 `final.md`/`meta.md` 与 `snapshots/archive` 承担。规则写在 .gitignore，
// 但 `git add -f` 能绕过（gitignore-guards spec 已登记这个盲点）⇒ 这里做**进程级**核查：
// index 里出现任何 drafts 路径即红，并点名具体文件。
// 负例留证（实跑，红→还原→绿）：`git add -f company-workspace/deliverables/<slug>/drafts/<文件>`
// ⇒ `FAIL drafts-untracked: index 里有 1 件 drafts…`（实测：`git restore --staged` 对 ignored 的新增项**不解除**
// 暂存，要用 `git rm --cached -- <路径>`）⇒ 绿。
export function run({ root, ok, fail }) {
  const draftsTracked = execFileSync('git', ['-C', root, 'ls-files', '--', 'company-workspace'], { encoding: 'utf8' })
    .split('\n').filter(Boolean).filter(path => path.includes('/drafts/'))
  draftsTracked.length === 0
    ? ok('drafts-untracked 公司盘过程物料零 tracked（drafts/sources 不进 git）')
    : fail('drafts-untracked', `index 里有 ${draftsTracked.length} 件 drafts（过程物料；git add -f 可绕过 .gitignore）：`
      + draftsTracked.slice(0, 5).join(', ') + (draftsTracked.length > 5 ? ' …' : ''))
}

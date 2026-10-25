// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增/修改 ignore 规则、`git add -f` 之后。
// 为什么：`.gitignore` 只拦普通 `git add`；`git add -f` 能把任何 ignored 文件塞进索引，而仓库其余
// 门禁只看索引里「有什么」，不看「它本来该不该在这里」。2026-10-25 立：runtime/ 默认拒绝后，
// 这一类绕过必须在索引层被点名。
// 负例留证 2026-10-25：`git add -f runtime/ops/shots/window-boot.png`
//   → `FAIL no-tracked-ignored: index 里有 1 件命中 ignore 规则（git add -f 绕过）：
//      runtime/ops/shots/window-boot.png`；`git rm --cached -- <路径>` → 绿。
import { execFileSync } from 'node:child_process'

export function run({ root, ok, fail }) {
  let output
  try {
    output = execFileSync('git', ['ls-files', '-ci', '--exclude-standard', '-z'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (error) {
    fail('no-tracked-ignored', `git ls-files -ci 失败，无法判定索引面：${String(error?.message ?? error)}`)
    return
  }
  const offenders = output.split('\0').filter(Boolean)
  if (offenders.length === 0) {
    ok('no-tracked-ignored（索引零命中；没有 `git add -f` 绕过的 ignored 文件）')
    return
  }
  const sample = offenders.slice(0, 10).join('；')
  fail(
    'no-tracked-ignored',
    `index 里有 ${String(offenders.length)} 件命中 ignore 规则（git add -f 绕过）：${sample}`
      + (offenders.length > 10 ? '；…' : ''),
  )
}

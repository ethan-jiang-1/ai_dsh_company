// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增图片、数据库、导出包或任何二进制资产后。
// 为什么：运行残留不只靠目录名混进来——截图、sqlite、tgz 也可能被当成「资产」提交。仓库已有
// snapshots-budget 管冻结证据，但管不到 tracked 面任意位置的大件；2026-10-25 立本门禁做兜底，
// 上限 2MB（当前最大 tracked 文件是 ~941KB 的 pnpm-lock.yaml，留出正常增长头寸）。
// 负例留证 2026-10-25：`dd if=/dev/zero of=notes/zz-size-test.bin bs=1m count=3`
//   + `git add notes/zz-size-test.bin` → `FAIL tracked-file-size: 1 件超过 2MB：notes/zz-size-test.bin (3.0MB)`；
//   `git rm --cached` + `rm` → 绿。
import { execFileSync } from 'node:child_process'
import { lstatSync } from 'node:fs'
import { join } from 'node:path'

const MAX_BYTES = 2 * 1024 * 1024

export function run({ root, ok, fail }) {
  let output
  try {
    output = execFileSync('git', ['ls-files', '-z'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (error) {
    fail('tracked-file-size', `git ls-files 失败，无法判定 tracked 面：${String(error?.message ?? error)}`)
    return
  }
  const files = output.split('\0').filter(Boolean)
  const sizes = []
  for (const rel of files) {
    try {
      const stat = lstatSync(join(root, rel))
      if (stat.isFile()) sizes.push({ rel, size: stat.size })
    } catch {
      // 盘上缺失（或仅存在于索引）不在这里判红：bare-path 管引用，索引一致性归 git 自身。
    }
  }
  const offenders = sizes.filter(item => item.size > MAX_BYTES).sort((a, b) => b.size - a.size)
  const max = sizes.reduce((top, item) => (item.size > top.size ? item : top), { rel: '（无）', size: 0 })
  if (offenders.length === 0) {
    ok(`tracked-file-size ×${String(sizes.length)}（最大 ${max.rel} ${(max.size / 1024 / 1024).toFixed(2)}MB / 上限 2.00MB）`)
    return
  }
  const sample = offenders.slice(0, 5)
    .map(item => `${item.rel} (${(item.size / 1024 / 1024).toFixed(1)}MB)`)
    .join('；')
  fail(
    'tracked-file-size',
    `${String(offenders.length)} 件超过 2MB：${sample}` + (offenders.length > 5 ? '；…' : ''),
  )
}

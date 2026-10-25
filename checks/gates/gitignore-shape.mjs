// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；改动 .gitignore 的 runtime/_dist 规则或白名单后。
// 为什么：`no-tracked-ignored` 只看索引，证明不了「新目录默认被忽略」这条合同。本门禁同时断言
// `.gitignore` 的默认拒绝/白名单形状，并用 `git check-ignore --no-index` 验证真实匹配结果：
// 新残留目录（ops）默认 ignored，白名单 5 件 not-ignored，harness-home 只放行 README。
// 负例留证 2026-10-25：删掉 `.gitignore` 的 `runtime/*` 行
//   → `FAIL gitignore-shape: runtime/ops/shots/window-boot.png 应 ignored 实为 not-ignored；…`；
//   还原 → 绿。删 `!runtime/probe-*.mjs` → probe-drill.mjs 应 not-ignored 实为 ignored，同样红。
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REQUIRED_RULES = [
  /^runtime\/\*$/m,
  /^!runtime\/README\.md$/m,
  /^!runtime\/probe-\*\.mjs$/m,
  /^!runtime\/harness-home\/$/m,
  /^runtime\/harness-home\/\*$/m,
  /^!runtime\/harness-home\/README\.md$/m,
]

const EXPECTED = [
  ['runtime/ops/shots/window-boot.png', true],
  ['runtime/e2e/assembly-e2e-driver.mjs', true],
  ['runtime/web-logs/web-20261019-105001.log', true],
  ['runtime/harness-home/.credentials.yaml', true],
  ['runtime/harness-home/sessions/session.jsonl', true],
  ['runtime/README.md', false],
  ['runtime/probe-drill.mjs', false],
  ['runtime/harness-home/README.md', false],
  ['_dist/dsh-company-pack-0.3.1.tgz', true],
  ['_dist/安装手册.md', false],
]

function statusFor(root, path) {
  return spawnSync('git', ['check-ignore', '-q', '--no-index', path], { cwd: root }).status
}

export function run({ root, ok, fail }) {
  const file = join(root, '.gitignore')
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    fail('gitignore-shape', `.gitignore 不在盘上或不可读：${String(error?.message ?? error)}`)
    return
  }

  const problems = []
  for (const rule of REQUIRED_RULES) {
    if (!rule.test(text)) problems.push(`缺规则 ${String(rule)}`)
  }
  let checked = 0
  for (const [path, shouldIgnore] of EXPECTED) {
    const status = statusFor(root, path)
    if (status !== 0 && status !== 1) {
      problems.push(`${path} check-ignore 状态 ${String(status)}（0=ignored / 1=not-ignored 之外）`)
      continue
    }
    const actual = status === 0
    checked++
    if (actual !== shouldIgnore) {
      problems.push(`${path} 应 ${shouldIgnore ? 'ignored' : 'not-ignored'} 实为 ${actual ? 'ignored' : 'not-ignored'}`)
    }
  }

  problems.length === 0
    ? ok(`gitignore-shape（runtime 默认拒绝 + 5 件白名单；check-ignore ×${String(checked)}）`)
    : fail('gitignore-shape', problems.join('；'))
}

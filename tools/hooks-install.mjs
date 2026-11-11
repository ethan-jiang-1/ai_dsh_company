#!/usr/bin/env node
// 状态：常驻
// 何时跑：`pnpm install` 后自动（prepare）；也可手动 `node tools/hooks-install.mjs`。改动 hook 接线逻辑后同跑。
//
// 为什么：core.hooksPath 是本地 git config，不随 clone 走；只在 `source run/env.sh` 里接线，
// 会让“忘了 source”的 agent 在 push 时静默跳过 verify/test。prepare 把接线前移到 install，
// run/env.sh 复用同一实现（一处事实一个家），不再各写一份 git config。
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { repositoryRoot } from './lib/repository-layout.mjs'

const hooks = join(repositoryRoot, '.githooks')
const prePush = join(hooks, 'pre-push')

if (!existsSync(prePush)) {
  console.log(`hooks: 缺 ${prePush}，跳过接线（非源码 checkout？）`)
  process.exit(0)
}

const git = (...argv) => spawnSync('git', ['-C', repositoryRoot, ...argv], { encoding: 'utf8' })
const gitDir = git('rev-parse', '--git-dir')
if (gitDir.status !== 0) {
  console.log('hooks: 非 git 工作树，跳过接线')
  process.exit(0)
}

const current = git('config', '--get', 'core.hooksPath')
if (current.status === 0 && current.stdout.trim() === hooks) {
  console.log('hooks: pre-push 已接线（.githooks）')
  process.exit(0)
}

const set = git('config', 'core.hooksPath', hooks)
if (set.status !== 0) {
  console.error(`hooks: 接线失败（core.hooksPath → ${hooks}）：${set.stderr.trim() || `exit ${String(set.status)}`}`)
  process.exit(1)
}
console.log(`hooks: pre-push 已接线（${hooks}）`)

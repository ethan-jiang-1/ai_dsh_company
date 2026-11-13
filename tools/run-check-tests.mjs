#!/usr/bin/env node
// 状态：常驻
// 何时跑：门禁判据改动后（`pnpm test:checks`，pre-push 也跑）；秒级、keyless。
//
// 为什么：门禁自身的负例测试不属于任何测试 lane（DSH 用 .github/**/*.test.mjs + node --test 同一形状）。
// 本 runner 按文件名发现 tests/checks/*.test.mjs，逐个起独立进程跑；跳过清单本轮不适用（文件即清单，删文件=删测试要同 diff）。
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'tests/checks')
const files = readdirSync(dir).filter(name => name.endsWith('.test.mjs')).sort()
if (files.length === 0) {
  console.error('test:checks: tests/checks 下没有 *.test.mjs——门禁自测不许静默消失')
  process.exit(1)
}
const failures = []
for (const name of files) {
  const result = spawnSync(process.execPath, [join(dir, name)], { stdio: 'inherit', timeout: 120_000 })
  console.log(`test:checks ${result.status === 0 ? 'PASS' : 'FAIL'} ${name}`)
  if (result.status !== 0) failures.push(name)
}
console.log(`test:checks: ${String(files.length - failures.length)} PASS / ${String(failures.length)} FAIL`)
if (failures.length > 0) process.exitCode = 1

#!/usr/bin/env node
// 状态：常驻
// 何时跑：门禁判据改动后（`pnpm test:checks`，pre-push 也跑）；秒级、keyless。
//
// 为什么：门禁自身的负例测试不属于任何测试 lane（DSH 用 .github/**/*.test.mjs + node --test 同一形状）。
// 本 runner 按文件名发现 tests/checks/*.test.mjs，有限并发（默认 3）跑独立进程并按序汇总输出（BUG-406）；
// 跳过清单本轮不适用（文件即清单，删文件=删测试要同 diff）。
import { readdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const dir = join(root, 'tests/checks')
const files = readdirSync(dir).filter(name => name.endsWith('.test.mjs')).sort()
if (files.length === 0) {
  console.error('test:checks: tests/checks 下没有 *.test.mjs——门禁自测不许静默消失')
  process.exit(1)
}

const CONCURRENCY = Math.min(3, files.length)
const TIMEOUT_MS = 120_000

function runOne(name) {
  return new Promise(resolveOne => {
    const t0 = Date.now()
    const child = spawn(process.execPath, [join(dir, name)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, TIMEOUT_MS)
    child.stdout.on('data', chunk => { out += String(chunk) })
    child.stderr.on('data', chunk => { err += String(chunk) })
    child.on('close', code => {
      clearTimeout(timer)
      const status = timedOut ? 1 : (code ?? 1)
      resolveOne({ name, status, out, err, elapsed: ((Date.now() - t0) / 1000).toFixed(2), timedOut })
    })
    child.on('error', error => {
      clearTimeout(timer)
      resolveOne({ name, status: 1, out, err: `${err}\n${String(error)}`, elapsed: ((Date.now() - t0) / 1000).toFixed(2), timedOut: false })
    })
  })
}

const results = new Array(files.length)
let next = 0
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < files.length) {
    const idx = next++
    results[idx] = await runOne(files[idx])
  }
}))

const failures = []
for (const result of results) {
  if (result.status !== 0) {
    if (result.out) process.stdout.write(result.out)
    if (result.err) process.stderr.write(result.err)
    if (result.timedOut) console.error(`test:checks TIMEOUT ${result.name} (>${String(TIMEOUT_MS)}ms)`)
    failures.push(result.name)
  }
  console.log(`test:checks ${result.status === 0 ? 'PASS' : 'FAIL'} ${result.name} (${result.elapsed}s)`)
}
console.log(`test:checks: ${String(files.length - failures.length)} PASS / ${String(failures.length)} FAIL`)
if (failures.length > 0) process.exitCode = 1

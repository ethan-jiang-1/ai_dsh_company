#!/usr/bin/env node
// 状态：常驻
// 何时跑：新增/归档缺陷卡、加/删 BUG 守卫后跑 --write；不一致由 tests/repo/bug-coverage.spec.ts 在 pnpm test 里报红。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { coverageReport, renderCoverage } from './lib/bug-coverage.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'tests/BUG-COVERAGE.generated.md')
const text = renderCoverage(coverageReport(root))

if (process.argv.includes('--write')) {
  writeFileSync(target, text)
  console.log(`bug-coverage: 已写 ${String(text.split('\n').length - 1)} 行 → tests/BUG-COVERAGE.generated.md`)
} else {
  const current = readFileSync(target, 'utf8')
  if (current === text) console.log('bug-coverage: 与盘上一致')
  else { console.error('bug-coverage: 已漂——运行 node tools/bug-coverage.mjs --write'); process.exitCode = 1 }
}

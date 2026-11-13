#!/usr/bin/env node
// 状态：常驻
// 何时跑：加/减测试资产、改 lane 或失败类后跑 `--write`；不一致由 tests/repo/test-census.spec.ts 在 pnpm test 里报红。
//
// 为什么：盘子在文档里手抄必漂。census 是生成物——数据来自 tools/lib/asset-lanes.mjs 的登记
// 与盘上目录计数；谁改资产不重生成，spec 就红。它不评价资产，只让「有什么、在哪条 lane、
// 抓哪类失败、多少未分类」可见（研究 A 件）。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { ASSETS, PROBES, FAILURE_CLASSES, failureClassOf } from './lib/asset-lanes.mjs'
import { buildCensus, countProjectSurface, renderCensus } from './lib/test-census.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'tests/CENSUS.generated.md')
const { gateCount, specCount } = countProjectSurface(root)
const text = renderCensus(buildCensus({ smokes: ASSETS, probes: PROBES, gateCount, specCount, failureClassOf }))

if (process.argv.includes('--write')) {
  writeFileSync(target, text)
  console.log(`test-census: 已写 ${String(text.split('\n').length - 1)} 行 → tests/CENSUS.generated.md（失败类词表 ${String(FAILURE_CLASSES.length)} 项）`)
} else {
  const current = readFileSync(target, 'utf8')
  if (current === text) {
    console.log('test-census: 与盘上一致')
  } else {
    console.error('test-census: tests/CENSUS.generated.md 已漂——运行 node tools/test-census.mjs --write')
    process.exitCode = 1
  }
}

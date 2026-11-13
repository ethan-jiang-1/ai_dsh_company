#!/usr/bin/env node
// 状态：常驻
// 何时跑：pre-push 自动（`pnpm smoke:fast`）；也手动跑。6 条稳定 keyless，~2.4s；不进 pnpm test。
//
// 为什么：便宜 smoke 不在 pnpm test / verify / pre-push 里，坏了没人知道——2026-11-13 实测
// two-axis-gates 与 replay 两条红、candidate-scan-eval 一条惰性。本 lane 只收「稳定 + ≤10s +
// keyless」的资产；replay（3.9s 且易因技能目录漂移）先留在自己的触发线上。它不是行为门，
// 只证明「这些资产还活着」；某条与本次 push 无关地 flake 时，把它移出 lane，不要放宽 lane。
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { FAST, assetByName, suffixOf } from '../../tools/lib/asset-lanes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
// 成员唯一家 = tools/lib/asset-lanes.mjs（本文件只读；`asset-lanes.spec` 盯住两边一致）。
const CASES = FAST.map(name => {
  const asset = assetByName(name)
  if (!asset) throw new Error(`smoke:fast 引用了未登记资产 ${name}`)
  return { name, nodeArgs: asset.nodeArgs }
})

const failed = []
const started = Date.now()
for (const entry of CASES) {
  const t0 = Date.now()
  const result = spawnSync(process.execPath, [...entry.nodeArgs, join(here, `${entry.name}.${suffixOf(entry.name)}.mjs`)], { stdio: 'inherit' })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
  const ok = result.status === 0
  console.log(`smoke:fast ${ok ? 'PASS' : 'FAIL'} ${entry.name} (${elapsed}s)`)
  if (!ok) failed.push(entry.name)
}
const total = ((Date.now() - started) / 1000).toFixed(2)
if (failed.length === 0) {
  console.log(`smoke:fast: ALL PASS（${String(CASES.length)} 条，${total}s）`)
} else {
  console.error(`smoke:fast: ${String(failed.length)} FAILURE(S)（${failed.join(', ')}）`)
}
process.exitCode = failed.length === 0 ? 0 : 1

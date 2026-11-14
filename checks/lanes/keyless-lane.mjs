#!/usr/bin/env node
// 状态：常驻
// 何时跑：每周 CI（`node checks/lanes/keyless-lane.mjs --ci`）与本地全量 sweep（`pnpm smoke:all`）；不进 pre-push。
//
// 为什么：冒烟只有 FAST 的 4 条在每次 push 跑，其余若只靠头注「何时跑」的散文契约，坏了没人知道。
// 本 runner 把「健康检查」从散文变成每周一次的实跑：
//   - 成员从 `tools/lib/asset-lanes.mjs` 读，**skip 清单每次都打印**（资产可以手动，但不许静默消失）；
//   - 选中的资产文件缺失 = 红（注册表与盘面不一致）；
//   - 过滤条件选出 0 个资产（如 `--filter zz-none`）= 红（拒绝 0 命中假绿）。
//
// 它不是行为门：真模型/真浏览器档不进 `--ci`（成本与凭据边界），只证明「这些资产还活着」。
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { ASSETS, selectWeeklyAssets, suffixOf } from '../../tools/lib/asset-lanes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const has = flag => argv.includes(flag)
const valueOf = flag => {
  const index = argv.indexOf(flag)
  return index >= 0 ? argv[index + 1] : undefined
}

const ci = has('--ci')
const withBrowser = has('--browser')
const listOnly = has('--list')
const filter = valueOf('--filter')
const suffix = valueOf('--suffix')
const timeoutMs = Number(valueOf('--timeout') ?? 300_000)

const selected = selectWeeklyAssets(ASSETS, { ci, withBrowser, filter, suffix })

if (listOnly) {
  for (const asset of selected) console.log(`${asset.kind}\t${asset.name}\t${asset.why ?? ''}`)
  process.exit(0)
}

const selectedNames = new Set(selected.map(asset => asset.name))
const skipped = ASSETS.filter(asset => !selectedNames.has(asset.name)).map(asset => {
  if (asset.kind === 'model') return `${asset.name} — 真模型档（需 DEEPSEEK_API_KEY）`
  if (asset.kind === 'tool') return `${asset.name} — 工具（${asset.manualReason ?? '非自跑检查'}）`
  if (asset.kind === 'browser' && !withBrowser) return `${asset.name} — 真浏览器档（--browser 才跑）`
  if (asset.lanes.length === 0) return `${asset.name} — 手动（${asset.manualReason ?? '未写理由'}）`
  if (ci && !asset.ciSafe) return `${asset.name} — ciSafe:false`
  return `${asset.name} — 未选中（filter=${String(filter)}）`
})

const label = `lane=weekly${ci ? '(ci)' : ''}${withBrowser ? '+browser' : ''}`
console.log(`smoke:all ${label} ×${String(selected.length)}（注册表 = tools/lib/asset-lanes.mjs）`)

if (selected.length === 0) {
  for (const line of skipped) console.log(`smoke:all SKIP ${line}`)
  console.error(`smoke:all: 0 个资产命中过滤条件（filter=${String(filter ?? '')} suffix=${String(suffix ?? '')}）——拒绝 0 命中假绿`)
  process.exit(1)
}

const failures = []
const started = Date.now()
for (const asset of selected) {
  const file = join(here, `${asset.name}.${suffixOf(asset.name)}.mjs`)
  if (!existsSync(file)) {
    failures.push(`${asset.name}（注册表有、盘上没有）`)
    console.log(`FAIL ${asset.name} — 文件不存在：${file}`)
    continue
  }
  const t0 = Date.now()
  const result = spawnSync(process.execPath, [...asset.nodeArgs, file], { stdio: 'inherit', timeout: timeoutMs })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
  const ok = result.status === 0
  console.log(`smoke:all ${ok ? 'PASS' : 'FAIL'} ${asset.name} (${elapsed}s)`)
  if (!ok) failures.push(`${asset.name}（exit=${String(result.status)}${result.signal ? ` signal=${result.signal}` : ''}）`)
}

// skip 永远打印：资产可以手动，但不许静默消失（研究 M6「跳过可见」的本仓形状）。
for (const line of skipped) console.log(`smoke:all SKIP ${line}`)
const total = ((Date.now() - started) / 1000).toFixed(2)
console.log(`smoke:all: ${String(selected.length - failures.length)} PASS / ${String(failures.length)} FAIL / ${String(skipped.length)} SKIP（${total}s）`)
if (failures.length > 0) {
  console.error(`smoke:all: ${String(failures.length)} FAILURE(S)（${failures.join('、')}）`)
  process.exitCode = 1
}

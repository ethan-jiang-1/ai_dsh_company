#!/usr/bin/env node
// 状态：常驻
// 何时跑：pre-push 自动（`.githooks/pre-push` 传 `--stdin <file>`）；也可手动 `node checks/pre-push-surfaces.mjs --dry-run`。
//
// 为什么：真入口证据（client 装配 / preset 挂载 / 回放 / 进程级写面）不在任何 required lane 里，
// 只能靠人记得跑（2026-11-13 研究：33 个冒烟只有 6 条在 push 时自动跑；发布验收曾静默红）。
// 本脚本把「改到哪个面就必须跑哪条真入口检查」变成 push 前的机械动作：规则住
// `tools/lib/asset-lanes.mjs` 的 SURFACE_RULES（一处事实一个家），这里只做取范围 + 匹配 + 跑。
//
// 取范围不猜 base：pre-push hook 自带 `<local ref> <local sha> <remote ref> <remote sha>` 四元组，
// 用它算 `<remote sha>..<local sha>`；remote sha 全零（新分支）退化为该提交自身的 diff-tree。
// 没有 stdin（手动直跑）才退化为 HEAD~1，并明确打印"退化"，不静默。
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { assetByName, selectSurfaces, suffixOf } from '../tools/lib/asset-lanes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const argv = process.argv.slice(2)
const has = flag => argv.includes(flag)
const valueOf = flag => {
  const index = argv.indexOf(flag)
  return index >= 0 ? argv[index + 1] : undefined
}
const dryRun = has('--dry-run')

const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} 失败：${(result.stderr || '').trim()}`)
  return result.stdout
}
const isZero = sha => /^0+$/.test(sha)

/** 从 hook stdin 或退化路径取本次 push 的变更文件。 */
function changedPaths() {
  const stdinPath = valueOf('--stdin')
  const refs = stdinPath && existsSync(stdinPath)
    ? readFileSync(stdinPath, 'utf8').split('\n').map(line => line.trim()).filter(Boolean)
    : []

  if (refs.length === 0) {
    console.log('pre-push surfaces: 未收到 hook 范围（手动直跑？）——退化为 HEAD~1 的变更')
    return git(['diff', '--name-only', 'HEAD~1', 'HEAD']).split('\n').filter(Boolean)
  }

  const paths = new Set()
  for (const line of refs) {
    const [, localSha, , remoteSha] = line.split(/\s+/)
    if (!localSha) continue
    const diff = remoteSha && !isZero(remoteSha)
      ? git(['diff', '--name-only', remoteSha, localSha])
      : git(['diff-tree', '--no-commit-id', '--name-only', '-r', localSha])
    for (const path of diff.split('\n')) if (path) paths.add(path)
  }
  return [...paths]
}

const { assets, matches } = selectSurfaces(changedPaths())
if (assets.length === 0) {
  console.log('pre-push surfaces: 本次未触发面级检查（规则表 = tools/lib/asset-lanes.mjs SURFACE_RULES）')
  process.exit(0)
}

const matchesByAsset = new Map()
for (const match of matches) {
  if (!matchesByAsset.has(match.asset)) matchesByAsset.set(match.asset, [])
  matchesByAsset.get(match.asset).push(match)
}
for (const name of assets) {
  const list = matchesByAsset.get(name) ?? []
  const first = list[0]
  if (!first) continue
  const extra = list.length > 1 ? `（另有 ${String(list.length - 1)} 处命中）` : ''
  const rule = first.why ? `；${first.why}` : ''
  console.log(`pre-push surfaces: 因为改了 ${first.path}${extra}（命中 ${first.glob}${rule}）→ ${name}`)
}
if (dryRun) {
  console.log(`pre-push surfaces: --dry-run，应跑 ${assets.join('、')}`)
  process.exit(0)
}

const failures = []
const started = Date.now()
for (const name of assets) {
  const asset = assetByName(name)
  if (!asset) {
    failures.push(`${name}（规则引用了未登记资产）`)
    console.log(`pre-push surfaces FAIL ${name} — 规则引用了未登记资产`)
    continue
  }
  const file = join(here, 'lanes', `${name}.${suffixOf(name)}.mjs`)
  if (!existsSync(file)) {
    failures.push(`${name}（盘上没有）`)
    console.log(`pre-push surfaces FAIL ${name} — 文件不存在：${file}`)
    continue
  }
  const t0 = Date.now()
  const result = spawnSync(process.execPath, [...asset.nodeArgs, file], { stdio: 'inherit', timeout: 300_000 })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
  console.log(`pre-push surfaces ${result.status === 0 ? 'PASS' : 'FAIL'} ${name} (${elapsed}s)`)
  if (result.status !== 0) failures.push(`${name}（exit=${String(result.status)}）`)
}

const total = ((Date.now() - started) / 1000).toFixed(2)
if (failures.length > 0) {
  console.error(`pre-push surfaces: ${String(failures.length)} FAILURE(S)（${failures.join('、')}，${total}s）`)
  console.error('  这些检查是改动面的完成定义，不是可选建议；`git push --no-verify` 逃生后要在收尾 Note 写原因。')
  process.exitCode = 1
} else {
  console.log(`pre-push surfaces: ALL PASS（${String(assets.length)} 条，${total}s）`)
}

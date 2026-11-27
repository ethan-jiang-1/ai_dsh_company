#!/usr/bin/env node
// 状态：常驻
// 何时跑：
//   - pre-push 自动：`.githooks/pre-push` 传 `--stdin <file> --exec-plan`（100% 免浏览器/免 DSH_HOME，
//     遇红即停跑受影响的快门禁 + 单次去重 Vitest；命中真入口面时只打印非阻塞提醒，不拖慢 push）；
//   - 收口验收手动：`source run/env.sh && pnpm smoke:surface`（即 `--lanes-only`，支持 `--all` 或 `--paths`），
//     只跑命中改动面的真入口车道（client-load / preset / replay）；发版前由 `pnpm release --verify` 强制执行。
//   - 预检试跑：`node checks/pre-push-surfaces.mjs --dry-run --paths <p1,p2>`。
//
// 为什么（BUG-186/199/406/407）：
// - 规则唯一家 = `tools/lib/core/asset-lanes.mjs`（SURFACE_RULES / planPrePush / planVitestRun）；
// - 未登记改动面（既无 asset 也无 coveredBy）在所有模式下均 fail-closed 退出非零（BUG-199）；
// - 2026-11-27（BUG-407）：将需要起真 DSH 服务器/真 Chromium 的 surface lane（client-load/preset/replay）
//   从 `git push` 阻塞热路径解耦至开发收口 `pnpm smoke:surface` 与发版门 `pnpm release --verify`（每周 CI 另覆盖 replay 与 coverage:ratchet），
//   并将 `--exec-plan` 重构为「快门禁遇红即停 + 单次去重 Vitest（超阈值回退单次全测）」。
// `--root <dir>` 只用于自测（`tests/checks/pre-push-surfaces.test.mjs` 在临时仓库里跑真脚本）。
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, posix, relative, resolve, sep } from 'node:path'
import {
  SURFACE_LANE_ASSETS,
  assetByName,
  planPrePush,
  planVitestRun,
  selectSurfaces,
  suffixOf,
} from '../tools/lib/core/asset-lanes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const has = flag => argv.includes(flag)
const valueOf = flag => {
  const index = argv.indexOf(flag)
  return index >= 0 ? argv[index + 1] : undefined
}
const rootFlag = valueOf('--root')
const root = rootFlag === undefined ? resolve(here, '..') : resolve(process.cwd(), rootFlag)
const dryRun = has('--dry-run')
const execPlan = has('--exec-plan')
const lanesOnly = has('--lanes-only')
const allLanes = has('--all')

const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} 失败：${(result.stderr || '').trim()}`)
  return result.stdout
}
const isZero = sha => /^0+$/.test(sha)

/**
 * `--paths` 手工入口的路径归一（BUG-201）：反斜杠 → `/`，`./` 前缀与 `a//b` / `a/./b` 消解。
 * 为什么：维护者从 shell 补全或 `git status` 复制来的路径常带 `./`；锚定 glob 不命中会假阴性。
 * 不支持：绝对路径、目录路径、含逗号的文件名（逗号是 `--paths` 分隔符）——它们会落「未分类」
 * 并按 BUG-199 的 fail-closed 阻断，不会静默通过。
 */
const normalizePath = path => {
  const unix = path.trim().replace(/\\/g, '/')
  return unix === '' ? '' : posix.normalize(unix).replace(/^\.\//, '')
}

/**
 * `git ... -z` 的 NUL 分隔输出 → 路径数组（BUG-199 二轮）。
 * 为什么必须 `-z`：git 默认对非 ASCII 路径做 C-quote（`"_dist/\345…md"`），引号字符串不命中
 * 任何锚定 glob，会让合法的非 ASCII tracked 路径在 fail-closed 下被误判「未分类」。
 */
const splitZ = text => text.split('\0').filter(Boolean)

/**
 * 单个提交引入的文件。
 *
 * merge 提交要按「合并结果相对第一父提交」取：`git diff-tree` 对 merge 默认没有输出（除非 -m/-c），
 * 只跑 diff-tree 会把冲突解决/合并编辑里引入的 surface 改动漏掉（BUG-161）。
 */
function commitPaths(sha) {
  const parents = git(['rev-list', '--parents', '-n', '1', sha]).trim().split(/\s+/).slice(1)
  const first = parents[0]
  if (parents.length > 1 && first !== undefined) {
    return splitZ(git(['diff', '-z', '--name-only', first, sha]))
  }
  return splitZ(git(['diff-tree', '-z', '--root', '--no-commit-id', '--name-only', '-r', sha]))
}

/** 一条 ref 四元组 → 该 ref 本次 push 带出的变更文件。 */
function pathsOfRef(localRef, localSha, remoteSha) {
  if (isZero(localSha)) {
    console.log(`pre-push surfaces: 跳过 ${localRef || '被删除的 ref'}（ref 被删除，没有变更面）`)
    return []
  }
  if (remoteSha && !isZero(remoteSha)) {
    return splitZ(git(['diff', '-z', '--name-only', remoteSha, localSha]))
  }
  // 新分支/远端还没有这个 sha：整条出站提交集，而不是只看 tip。
  const commits = git(['rev-list', localSha, '--not', '--remotes']).split('\n').filter(Boolean)
  const targets = commits.length > 0 ? commits : [localSha]
  if (commits.length === 0) {
    console.log(`pre-push surfaces: ${localRef || localSha} 的提交都已在远端 ref 上——按 tip 自身取变更面`)
  }
  const paths = []
  for (const sha of targets) paths.push(...commitPaths(sha))
  return paths
}

/** 从 hook stdin 或退化路径取本次 push 的变更文件。 */
function changedPaths() {
  const stdinPath = valueOf('--stdin')
  const refs = stdinPath && existsSync(stdinPath)
    ? readFileSync(stdinPath, 'utf8').split('\n').map(line => line.trim()).filter(Boolean)
    : []

  if (refs.length === 0) {
    console.log('pre-push surfaces: 未收到 hook 范围（手动直跑？）——退化为 HEAD~1 的变更')
    return splitZ(git(['diff', '-z', '--name-only', 'HEAD~1', 'HEAD']))
  }

  const paths = new Set()
  for (const line of refs) {
    const [localRef, localSha, , remoteSha] = line.split(/\s+/)
    if (!localSha) continue
    for (const path of pathsOfRef(localRef, localSha, remoteSha)) paths.add(path)
  }
  return [...paths]
}

/** `--lanes-only` 未给 `--stdin`/`--paths` 时取本机待验收改动（工作树 + 未推送提交；空则退化为 HEAD 自身提交，兼容单 commit / shallow 仓）。 */
function localSurfacePaths() {
  const collected = new Set()
  for (const args of [
    ['diff', '-z', '--name-only', 'HEAD'],
    ['ls-files', '-z', '--others', '--exclude-standard'],
  ]) {
    const res = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
    if (res.status === 0) for (const p of splitZ(res.stdout)) collected.add(p)
  }
  const upstream = spawnSync('git', ['rev-parse', '--verify', '@{u}'], { cwd: root, encoding: 'utf8' })
  if (upstream.status === 0) {
    const out = spawnSync('git', ['diff', '-z', '--name-only', '@{u}..HEAD'], { cwd: root, encoding: 'utf8' })
    if (out.status === 0) for (const p of splitZ(out.stdout)) collected.add(p)
  } else {
    // 无 upstream（如本地新建未 push -u 的分支或 detached HEAD）：收集全部尚未推送到远端的本地提交，避免漏掉父提交面。
    const unpushed = spawnSync('git', ['rev-list', 'HEAD', '--not', '--remotes'], { cwd: root, encoding: 'utf8' })
    if (unpushed.status === 0) {
      for (const sha of unpushed.stdout.split('\n').filter(Boolean)) {
        for (const p of commitPaths(sha)) collected.add(p)
      }
    }
  }
  if (collected.size > 0) return [...collected]
  console.log('smoke:surface: 工作树干净且无未推送提交——退化为 HEAD 自身提交')
  return commitPaths('HEAD')
}

const targetPaths = allLanes
  ? []
  : valueOf('--paths') !== undefined
    ? (valueOf('--paths') ?? '').split(',').map(normalizePath).filter(Boolean)
    : (lanesOnly && valueOf('--stdin') === undefined ? localSurfacePaths() : changedPaths())
const { assets: matchedAssets, matches, covered, unseen } = selectSurfaces(targetPaths)
const assets = allLanes ? [...SURFACE_LANE_ASSETS] : matchedAssets
const plan = execPlan ? planPrePush(targetPaths) : null

const coveredByRule = new Map()
for (const entry of covered) {
  const key = `${entry.glob}\u0000${entry.coveredBy.join('+')}`
  if (!coveredByRule.has(key)) coveredByRule.set(key, { ...entry, count: 0 })
  coveredByRule.get(key).count += 1
}
for (const entry of coveredByRule.values()) {
  const extra = entry.count > 1 ? `（另有 ${String(entry.count - 1)} 个同面文件）` : ''
  const rule = entry.why ? `；${entry.why}` : ''
  console.log(`pre-push surfaces: 改了 ${entry.path}${extra}（命中 ${entry.glob}${rule}）→ 无额外 lane；证据 = ${entry.coveredBy.join(' + ')}`)
}
if (unseen.length > 0) {
  console.log(`pre-push surfaces: 未分类改动面（既没有 surface 规则，也没有 coveredBy 申报）——登记 SURFACE_RULES（asset 或 coveredBy）后才许通过：${unseen.join('、')}`)
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

if (plan !== null) {
  if (plan.docsOnly && assets.length === 0 && unseen.length === 0) {
    console.log('pre-push plan: docs-only 快速路径（仅无条件 verify；跳过 typecheck / lint / dup / vitest）')
  } else {
    const summary = [
      `steps=[${plan.steps.join(', ') || 'none'}]`,
      `related=${String(plan.relatedFiles.length)}`,
      `targeted=${String(plan.targetedSpecs.length)}`,
      `assets=[${assets.join(', ') || 'none'}]`,
    ].join(' ')
    console.log(`pre-push plan: ${summary}`)
  }
}

if (!execPlan && assets.length === 0) {
  console.log(covered.length > 0
    ? 'pre-push surfaces: 本次没有额外真入口（命中面由既定步骤覆盖，见上）'
    : 'pre-push surfaces: 本次未触发面级检查（规则表 = tools/lib/core/asset-lanes.mjs SURFACE_RULES）')
  process.exit(unseen.length > 0 ? 1 : 0)
}

/** 将目录型 targetedSpecs（如 `tests/presets`、`tests/repo`）递归展开为具体 `.spec.ts` 相对路径。 */
function expandSpecTargets(targets) {
  const files = []
  const walk = (absDir) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(absDir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        files.push(relative(root, full).split(sep).join('/'))
      }
    }
  }
  for (const rel of targets) {
    const abs = join(root, rel)
    if (!existsSync(abs)) continue
    if (statSync(abs).isDirectory()) walk(abs)
    else files.push(rel)
  }
  return [...new Set(files)]
}

function resolveVitestTargets(plan) {
  const existingRelated = plan.relatedFiles.filter(rel => existsSync(join(root, rel)))
  const deletedRelated = plan.relatedFiles.filter(rel => !existsSync(join(root, rel)))
  const existingTargeted = new Set(plan.targetedSpecs.filter(rel => existsSync(join(root, rel))))
  // 盲审 B2：删除源码/lib 文件时不能因 existsSync 过滤而静默跳过全部 Vitest。
  if (deletedRelated.length > 0) {
    existingTargeted.add('tests/repo/structure/entry-import-graph.spec.ts')
    if (deletedRelated.some(rel => rel.startsWith('packages/company-pack/src/'))) {
      existingTargeted.add('tests/repo/pack/pack-exports.spec.ts')
    }
  }
  const existingTargetedList = [...existingTargeted]
  const expandedTargeted = expandSpecTargets(existingTargetedList)
  if (plan.steps.includes('test:spec') && existingRelated.length === 0 && expandedTargeted.length === 0) {
    const fallback = 'tests/repo/structure/entry-import-graph.spec.ts'
    if (existsSync(join(root, fallback))) expandedTargeted.push(fallback)
    if (!existingTargeted.has(fallback)) existingTargetedList.push(fallback)
  }
  const vitestPlan = planVitestRun({ existingRelated, expandedTargeted })
  return { existingRelated, deletedRelated, existingTargeted: existingTargetedList, expandedTargeted, vitestPlan }
}

if (dryRun) {
  if (assets.length > 0) {
    console.log(execPlan
      ? `pre-push surfaces: --dry-run，命中真入口面（移出 push 阻塞链，收口用 pnpm smoke:surface）：${assets.join('、')}`
      : `pre-push surfaces: --dry-run，应跑 ${assets.join('、')}`)
  }
  if (plan !== null) {
    const resolved = resolveVitestTargets(plan)
    if (resolved.existingTargeted.length > 0) console.log(`pre-push plan: --dry-run targetedSpecs = ${resolved.existingTargeted.join('、')}`)
    if (resolved.existingRelated.length > 0) console.log(`pre-push plan: --dry-run relatedFiles = ${resolved.existingRelated.join('、')}`)
    if (resolved.deletedRelated.length > 0) console.log(`pre-push plan: --dry-run deletedFallback = ${resolved.deletedRelated.join('、')}`)
    if (resolved.vitestPlan.mode !== 'none') console.log(`pre-push plan: --dry-run vitest = ${resolved.vitestPlan.mode} (${String(resolved.vitestPlan.args.length)} args)`)
  }
  process.exit(unseen.length > 0 ? 1 : 0)
}

const failures = []
const started = Date.now()

function runStepSync(label, command, cmdArgs, timeout = 300_000) {
  const t0 = Date.now()
  const result = spawnSync(command, cmdArgs, { cwd: root, stdio: 'inherit', timeout })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
  const ok = result.status === 0
  console.log(`pre-push ${ok ? 'PASS' : 'FAIL'} ${label} (${elapsed}s)`)
  if (!ok) failures.push(`${label}（exit=${String(result.status)}）`)
  return ok
}

if (plan !== null) {
  // Wave 1：轻量检查各自内部已多线程（oxlint 10 线程 / test:checks 3 并发 / tsc 增量），实测串行 ~15s、并发反而 CPU/IO 争抢膨胀至 36s，故保持干净串行 + 遇红即停。
  const wave1Commands = {
    typecheck: { label: 'typecheck', command: 'pnpm', args: ['-s', 'typecheck'] },
    lint: { label: 'lint', command: 'pnpm', args: ['-s', 'lint'] },
    dup: { label: 'dup', command: 'pnpm', args: ['-s', 'dup'] },
    'smoke:fast': { label: 'smoke:fast', command: 'pnpm', args: ['-s', 'smoke:fast'] },
    'test:checks': { label: 'test:checks', command: 'pnpm', args: ['-s', 'test:checks'] },
  }
  for (const step of plan.steps) {
    if (step === 'test:spec') continue
    const spec = wave1Commands[step]
    if (!spec) continue
    if (!runStepSync(spec.label, spec.command, spec.args)) break
  }

  // Wave 2（BUG-407）：最多一次 Vitest 调用（合并去重或超阈值回退单次全测，彻底消灭双次冷启倒挂）。
  if (failures.length === 0 && plan.steps.includes('test:spec')) {
    const { vitestPlan } = resolveVitestTargets(plan)
    if (vitestPlan.mode !== 'none') {
      const label = vitestPlan.mode === 'full'
        ? 'vitest full (fallback)'
        : `vitest ${vitestPlan.mode} (${String(vitestPlan.args.filter(a => !a.startsWith('-') && a !== 'run' && a !== 'related').length)} targets)`
      runStepSync(label, 'pnpm', ['-s', 'exec', 'vitest', ...vitestPlan.args])
    }
  }

  // BUG-407（方案 1）：真浏览器/真服务器 surface lane（client-load / preset / replay）移出 push 热路径；
  // 改由开发收口 `source run/env.sh && pnpm smoke:surface` 与发版门 `pnpm release --verify` 强制兜底（每周 CI 另覆盖 replay 与 coverage:ratchet）。
  if (assets.length > 0) {
    console.log(`pre-push surfaces: 提示——本次改动命中真入口面（${assets.join('、')}），已移出 push 阻塞热路径；收口请跑 \`source run/env.sh && pnpm smoke:surface\`（发版前由 \`pnpm release --verify\` 强制执行）`)
  }
}

const shouldRunLanes = !execPlan && (lanesOnly || assets.length > 0)
if (shouldRunLanes && failures.length === 0) {
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
    const result = spawnSync(process.execPath, [...asset.nodeArgs, file], { cwd: root, stdio: 'inherit', timeout: 300_000 })
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
    console.log(`pre-push surfaces ${result.status === 0 ? 'PASS' : 'FAIL'} ${name} (${elapsed}s)`)
    if (result.status !== 0) failures.push(`${name}（exit=${String(result.status)}）`)
  }
}

const total = ((Date.now() - started) / 1000).toFixed(2)
if (failures.length > 0 || unseen.length > 0) {
  const reasons = [...failures, ...(unseen.length > 0 ? [`未分类改动面 ${String(unseen.length)} 条（登记 SURFACE_RULES 或 coveredBy）`] : [])]
  console.error(`pre-push surfaces: ${String(reasons.length)} FAILURE(S)（${reasons.join('、')}，${total}s）`)
  console.error('  这些检查是改动面的完成定义，不是可选建议；`git push --no-verify` 逃生后要在收尾 Note 说明原因。')
  process.exitCode = 1
} else {
  const countText = plan !== null
    ? `${String(plan.steps.length)} scoped${assets.length > 0 ? `（${String(assets.length)} surface 提醒）` : ''}`
    : `${String(assets.length)} 条`
  console.log(`pre-push surfaces: ALL PASS（${countText}，${total}s）`)
}

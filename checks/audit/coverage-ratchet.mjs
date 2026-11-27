#!/usr/bin/env node
// 状态：常驻
// 何时跑：发布前 `pnpm release --verify`、每周 CI（`fresh-clone.yml`）与阶段收口手动 `pnpm coverage:ratchet`；
//   不塞进 `.githooks/pre-push` 热路径（BUG-406：避免每次 push 重复全量 V8 插桩拖垮本机 CPU）。
//   支持 `--maxWorkers <n>`（默认上限 clamp(cpus/2, 2..4)，也可经 `VITEST_MAX_WORKERS` 覆盖）、
//   同 `HEAD` 干净树自动复用上次 `coverage-summary.json`（`--force` 强制重跑；`--from-existing` 显式复用）。
//
// 为什么：覆盖率此前是「10 个手选模块的百分比阈值 + 手动跑」——低于阈值不挡提交，
// 188 个插桩文件里 3 个 0%、30 个 <80%。本脚本把上限变成**棘轮**：全量覆盖率
// 与 `checks/lib/coverage-baseline.json` 比：只升不降；新文件有下限；已知空洞必须显式豁免
// （reason + removeWhen）；豁免一旦过期（文件没了或已到 50%）就红，逼人删掉。
// 改名/删除：`--rename old=new` 把旧地板迁到新键；`--drop old` 显式确认删除。两者都不给而基线键
// 消失 = 红（BUG-203：一次 git mv 不许把 100/100 重置成新文件下限）。
// 判据纯逻辑 = checks/lib/coverage-baseline.mjs（有 spec），本文件只做跑/读/写。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import {
  canReuseCoverageCache,
  compareCoverage,
  indexCoverage,
  nextBaseline,
  resolveCoverageWorkers,
} from '../lib/coverage-baseline.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const argv = process.argv.slice(2)
const has = flag => argv.includes(flag)
const valueOf = flag => {
  const eqPrefix = `${flag}=`
  const eqArg = argv.find(arg => arg.startsWith(eqPrefix))
  if (eqArg !== undefined) return eqArg.slice(eqPrefix.length)
  const index = argv.indexOf(flag)
  return index >= 0 ? argv[index + 1] : undefined
}
/** 可重复旗标（--rename old=new / --drop path）；值不允许以 -- 开头（防吞下一个旗标）。 */
const valuesOf = flag => argv.reduce((out, arg, index) => {
  const value = argv[index + 1]
  if (arg === flag && value !== undefined && !value.startsWith('--')) out.push(value)
  return out
}, [])
const renames = []
for (const spec of valuesOf('--rename')) {
  const eq = spec.indexOf('=')
  if (eq <= 0 || eq === spec.length - 1) {
    console.error(`coverage-ratchet: --rename 要 old=new 形式，收到「${spec}」`)
    process.exit(2)
  }
  renames.push({ from: spec.slice(0, eq), to: spec.slice(eq + 1) })
}
const drops = valuesOf('--drop')

const baselinePath = join(root, 'checks/lib/coverage-baseline.json')
const reportsDir = join(root, 'runtime/coverage-ratchet')
const defaultSummary = join(reportsDir, 'coverage-summary.json')
const cacheMetaPath = join(reportsDir, 'cache-meta.json')
const summaryPath = valueOf('--summary') ?? defaultSummary

function readGitState() {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
  if (head.status !== 0) return { headSha: '', dirty: true }
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })
  return {
    headSha: head.stdout.trim(),
    dirty: status.status !== 0 || status.stdout.trim() !== '',
  }
}

function readCacheMeta() {
  if (!existsSync(cacheMetaPath)) return null
  try {
    return JSON.parse(readFileSync(cacheMetaPath, 'utf8'))
  } catch {
    return null
  }
}

function sha256File(path) {
  if (!existsSync(path)) return ''
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

const maxWorkers = resolveCoverageWorkers(cpus().length, valueOf('--maxWorkers') ?? process.env.VITEST_MAX_WORKERS)
const forceRun = has('--force')

if (!has('--summary') && !has('--from-existing')) {
  const gitState = readGitState()
  const summaryExists = existsSync(summaryPath)
  const reuse = canReuseCoverageCache({
    meta: readCacheMeta(),
    headSha: gitState.headSha,
    dirty: gitState.dirty,
    summaryExists,
    summarySha256: summaryExists ? sha256File(summaryPath) : '',
    force: forceRun,
  })
  if (reuse) {
    console.log(`coverage-ratchet: 复用同 HEAD 覆盖率缓存（${gitState.headSha.slice(0, 8)}；传 --force 强制重跑）`)
  } else {
    // 开跑前先作废旧缓存元数据（盲审 B1）：防止脏树或失败运行覆写 coverage-summary.json 后，
    // 清理工作树回来误命中旧 cache-meta.json 导致假绿。
    rmSync(cacheMetaPath, { force: true })
    console.log(`coverage-ratchet: 运行全量覆盖率（maxWorkers=${String(maxWorkers)}）`)
    const result = spawnSync(
      'pnpm',
      [
        '-s', 'exec', 'vitest', 'run',
        `--maxWorkers=${String(maxWorkers)}`,
        '--coverage',
        '--coverage.reporter=json-summary',
        `--coverage.reportsDirectory=${reportsDir}`,
      ],
      { cwd: root, stdio: 'inherit' },
    )
    if (result.status !== 0) {
      console.error('coverage-ratchet: 覆盖率运行本身失败（测试红/构建问题）——先修测试，棘轮不判。')
      process.exit(1)
    }
    const postGitState = readGitState()
    // 仅当运行前后全程干净且 HEAD 未漂移时，才把本次摘要 sha256 盖章写入干净缓存元数据。
    if (!gitState.dirty && !postGitState.dirty && gitState.headSha !== '' && gitState.headSha === postGitState.headSha && existsSync(summaryPath)) {
      mkdirSync(reportsDir, { recursive: true })
      writeFileSync(cacheMetaPath, `${JSON.stringify({
        headSha: postGitState.headSha,
        dirty: false,
        summarySha256: sha256File(summaryPath),
        maxWorkers,
        generatedAt: new Date().toISOString(),
      }, null, 2)}\n`)
    }
  }
}

if (!existsSync(summaryPath)) {
  console.error(`coverage-ratchet: 找不到覆盖率摘要 ${summaryPath}——先跑一次带 json-summary 的覆盖率。`)
  process.exit(1)
}

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
const current = indexCoverage(summary, root)
const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : { files: {}, exemptions: [] }
const bootstrap = has('--bootstrap')
const { violations, notes } = bootstrap ? { violations: [], notes: [] } : compareCoverage(current, baseline, { renames, drops })

const fileCount = Object.keys(current).length
for (const violation of violations) console.log(`coverage-ratchet FAIL [${violation.kind}] ${violation.path} — ${violation.detail}`)
for (const note of notes.slice(0, 5)) console.log(`coverage-ratchet note ${note}`)

if (bootstrap) console.log('coverage-ratchet: --bootstrap（首轮建基线；新文件下限从下一次起生效）')
if (violations.length === 0) {
  console.log(`coverage-ratchet: PASS（${String(fileCount)} 文件；基线 ${baseline.generatedAt ?? '未生成'}；豁免 ${String((baseline.exemptions ?? []).length)} 条）`)
} else {
  console.error(`coverage-ratchet: ${String(violations.length)} FAILURE(S)（基线与判据 = checks/lib/coverage-baseline.mjs；修好或显式豁免后才许 --update；改名给 --rename old=new，确认删除给 --drop path）`)
  process.exitCode = 1
}

if (has('--update')) {
  if (violations.length > 0) {
    console.error('coverage-ratchet: 有红项时拒绝重写基线（棘轮只升不降）。')
    process.exit(1)
  }
  const next = nextBaseline(current, baseline, undefined, { renames, drops })
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`coverage-ratchet: baseline 已更新（${String(Object.keys(next.files).length)} 文件；豁免 ${String(next.exemptions.length)} 条）→ checks/lib/coverage-baseline.json`)
}

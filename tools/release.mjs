#!/usr/bin/env node
// 状态：常驻
// release.mjs — 发布预检 / 版本 bump / 构建导出 / 全套验收 / manifest（FAQ 24 §7 的仓库内化）。
//
// 设计边界（不替代 runbook）：
// - 不 commit、不 push、不 npm publish；只把“可交付字节”和“跑过什么”记进 `_dist/release-manifest.json`。
// - `--check` 需要 `_dist` 已存在（先 `--prepare`）；源码面版本/CHANGELOG 门禁另有 `release-ready`。
// - `--prepare`/`--verify` 会改 tracked 的 `_dist/安装手册.md`，所以默认允许工作树有发布产物改动；
//   `--bump` 要求工作树干净（避免把无关改动卷进版本提交）。
//
// 用法：
//   pnpm release --bump patch|minor|major
//   pnpm release --prepare [--allow-dirty]
//   pnpm release --verify [--allow-dirty] [--with-key]
//   pnpm release --check [--allow-dirty]
//   pnpm release --all [--allow-dirty] [--with-key]
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { sourceFingerprint } from './lib/pack-source.mjs'
import { expectedTag } from '../checks/gates/lib/pin.mjs'

const PACK = join(ROOT, 'packages/company-pack')
const DIST = join(ROOT, '_dist')
const MANIFEST = join(DIST, 'release-manifest.json')
const VENDOR = join(ROOT, 'vendor/dsh')
const VENDOR_CLI = join(VENDOR, 'apps/cli/lib/bin.js')
const args = process.argv.slice(2)
const has = flag => args.includes(flag)
const valueOf = flag => {
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}
const allowDirty = has('--allow-dirty')
const withKey = has('--with-key')
const allowStaleManifest = has('--allow-stale-manifest')
const allowPrePublishIndex = has('--allow-pre-publish-index')

if (has('--help') || has('-h')) {
  console.log(`用法：
  pnpm release --bump patch|minor|major
  pnpm release --prepare [--force]
  pnpm release --verify [--with-key] [--allow-stale-manifest]
  pnpm release --check [--allow-dirty] [--allow-pre-publish-index]
  pnpm release --stamp
  pnpm release --all [--with-key]`)
  process.exit(0)
}

function fail(message) {
  console.error(`release: ${message}`)
  process.exit(1)
}

function capture(command, argv, options = {}) {
  const result = spawnSync(command, argv, { cwd: ROOT, encoding: 'utf8', ...options })
  if (result.status !== 0) throw new Error(`${command} ${argv.join(' ')} 失败：${result.stderr?.trim() || result.stdout?.trim() || ''}`)
  return result.stdout ?? ''
}

function run(command, argv, options = {}) {
  console.log(`$ ${command} ${argv.join(' ')}`)
  const result = spawnSync(command, argv, { cwd: ROOT, stdio: 'inherit', ...options })
  if (result.status !== 0) throw new Error(`${command} ${argv.join(' ')} 退出 ${String(result.status)}`)
}

function pack() {
  return JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

// vendor 是 release-smoke 的运行时前置，但它的构建物是 gitignored（不在 clean clone 里）。
// 只记录 pack 源指纹无法回答“这次 7 项 pass 用的是哪次 vendor build”——把 HEAD、CLI 哈希和
// mtime 写进 manifest；--check 对不上即红。mtime 不是源码指纹，但能让“重建过/没重建”可见。
function vendorInfo() {
  const head = capture('git', ['-C', VENDOR, 'rev-parse', 'HEAD']).trim()
  const dirty = capture('git', ['-C', VENDOR, 'status', '--porcelain']).trim() !== ''
  if (!existsSync(VENDOR_CLI)) {
    fail('缺 vendor CLI（vendor/dsh/apps/cli/lib/bin.js）；先跑 `pnpm setup`，否则 release-smoke 用的是旧/无产物')
  }
  return {
    head,
    dirty,
    cli: {
      file: 'apps/cli/lib/bin.js',
      sha256: sha256(VENDOR_CLI),
      mtime: statSync(VENDOR_CLI).mtime.toISOString(),
    },
  }
}

function assertVendor(manifest) {
  const current = vendorInfo()
  const recorded = manifest.vendor
  if (recorded?.head === undefined || recorded?.cli?.sha256 === undefined) {
    fail('manifest 缺 vendor build 指纹（vendor.head / vendor.cli.sha256）；重跑 --prepare 再 --verify')
  }
  if (recorded.head !== current.head) {
    fail(`manifest vendor HEAD ${recorded.head} ≠ 当前 ${current.head}；vendor 变了，重跑 --prepare/--verify`)
  }
  if (recorded.dirty !== current.dirty) {
    fail(`manifest vendor dirty=${String(recorded.dirty)} ≠ 当前 dirty=${String(current.dirty)}；先还原 vendor 工作树`)
  }
  if (recorded.cli.sha256 !== current.cli.sha256) {
    fail(`manifest vendor CLI sha ${recorded.cli.sha256} ≠ 当前 ${current.cli.sha256}；重建过 vendor，重跑 --prepare/--verify`)
  }
  return current
}

// 发布物的源指纹：tarball 里的包内容（构建产物 lib/ 除外，由 --prepare 的 build 负责）。
// 实现与 dev 启动器的构建缓存共用单一 owner = tools/lib/pack-source.mjs。

function readManifest() {
  if (!existsSync(MANIFEST)) fail('缺 release-manifest.json；先 --prepare/--verify')
  return JSON.parse(readFileSync(MANIFEST, 'utf8'))
}

function entryCount(path) {
  const result = spawnSync('tar', ['-tzf', path], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`tar -tzf ${path} 失败`)
  return (result.stdout ?? '').split('\n').filter(Boolean).length
}

function sourceCheck(allowDirtyTree = allowDirty) {
  const errors = []
  const manifest = pack()
  const version = manifest.version
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) errors.push(`package.json version 非法：${JSON.stringify(version)}`)
  const changelogPath = join(ROOT, 'CHANGELOG.md')
  if (!existsSync(changelogPath)) errors.push('缺 CHANGELOG.md')
  else {
    const text = readFileSync(changelogPath, 'utf8')
    const headings = [...text.matchAll(/^##\s+(\d+\.\d+\.\d+)\s+—\s+(\d{4}-\d{2}-\d{2})\s*$/gm)]
    const top = headings[0]
    if (top?.[1] !== version) errors.push(`CHANGELOG.md 顶部是 ${top?.[1] ?? '无'}，package 是 ${version}`)
    else {
      const next = headings[1]
      const body = text.slice((top.index ?? 0) + top[0].length, next?.index ?? text.length)
      if (!body.split('\n').some(line => /^\s*-\s+\S+/.test(line) && !/\b(TODO|TBD)\b/i.test(line))) {
        errors.push(`CHANGELOG.md 的 ${version} 条目没有实际变化（TODO/空不算）`)
      }
    }
  }
  if (manifest?.dsh?.compatibility !== undefined) errors.push('package.json 仍携带 dsh.compatibility（应在 checks/gates/lib/compat-tags.json）')
  for (const rel of ['locale/en.json', 'locale/zh.json', 'icon.svg']) {
    if (!existsSync(join(PACK, rel))) errors.push(`package 缺 ${rel}`)
  }
  const compat = JSON.parse(readFileSync(join(ROOT, 'checks/gates/lib/compat-tags.json'), 'utf8'))
  if (!Array.isArray(compat?.dshReleases) || !compat.dshReleases.includes(expectedTag)) {
    errors.push(`compat-tags 缺当前 pin ${expectedTag}`)
  }
  const dirty = capture('git', ['status', '--porcelain']).trim()
  if (dirty !== '' && !allowDirtyTree) errors.push(`工作树不干净（${dirty.split('\n').length} 项）；先 commit，或显式 --allow-dirty`)
  if (errors.length > 0) fail(errors.join('\n  '))
  console.log(`release: 源码面通过（${version}；pin ${expectedTag}；dirty=${String(dirty !== '')}）`)
}

function artifactCheck() {
  const version = pack().version
  const tgz = join(DIST, `dsh-company-pack-${version}.tgz`)
  const sidecar = `${tgz}.sha256`
  const manual = join(DIST, '安装手册.md')
  const errors = []
  if (!existsSync(tgz)) errors.push(`缺 ${tgz}；先 --prepare`)
  if (!existsSync(sidecar)) errors.push(`缺 ${sidecar}`)
  if (!existsSync(manual)) errors.push(`缺 ${manual}`)
  if (errors.length > 0) fail(errors.join('\n  '))
  const actual = sha256(tgz)
  const expected = readFileSync(sidecar, 'utf8').trim().split(/\s+/)[0]
  if (actual !== expected) errors.push(`tgz sha256 ${actual} ≠ sidecar ${expected}`)
  const text = readFileSync(manual, 'utf8')
  const manualVersion = /\|\s*版本\s*\|\s*([^|]+?)\s*\|/.exec(text)?.[1]?.trim()
  if (manualVersion !== version) errors.push(`手册版本 ${String(manualVersion)} ≠ package ${version}`)
  const manualSha = /\|\s*校验（sha256）\s*\|\s*`([0-9a-f]{64})`/.exec(text)?.[1]
  if (manualSha !== actual) errors.push(`手册 sha256 ${String(manualSha)} ≠ tgz ${actual}`)
  if (errors.length > 0) fail(errors.join('\n  '))
  return { file: `dsh-company-pack-${version}.tgz`, sha256: actual, entries: entryCount(tgz), manual: '安装手册.md', manualSha256: sha256(manual) }
}

function bump(kind) {
  if (!['patch', 'minor', 'major'].includes(kind ?? '')) fail('--bump 需要 patch|minor|major')
  const dirty = capture('git', ['status', '--porcelain']).trim()
  if (dirty !== '') fail('--bump 要求工作树干净（先提交当前改动）')
  const manifest = pack()
  const [major, minor, patch] = manifest.version.split('.').map(Number)
  const next = kind === 'major' ? `${major + 1}.0.0` : kind === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`
  manifest.version = next
  writeFileSync(join(PACK, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  // 发布日期按部署时区（Asia/Shanghai）落，避免 UTC 跨日把 10-26 写成 10-25。
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const changelogPath = join(ROOT, 'CHANGELOG.md')
  const changelog = readFileSync(changelogPath, 'utf8')
  if (!new RegExp(`^##\\s+${next.replaceAll('.', '\\.')}\\s+—`, 'm').test(changelog)) {
    const entry = `## ${next} — ${today}\n\n### Changed\n\n- TODO: 填写本版用户可见变化（删除本行前不要 prepare）\n\n`
    const index = changelog.search(/^##\s/m)
    writeFileSync(changelogPath, index === -1 ? `${changelog.trimEnd()}\n\n${entry}` : `${changelog.slice(0, index)}${entry}${changelog.slice(index)}`)
  }
  // 版本唯一家 = package.json + CHANGELOG；release.md 不再复制版本号。
  // 仓库根 market-index.json 是发布/托管物，版本必须与 package 同一步更新。
  run(process.execPath, ['tools/market-index.mjs', '--prepare'])
  console.log(`release: ${manifest.version} 就位；填 CHANGELOG.md 的 ${next} 条目后跑 --prepare`)
}

function build() {
  run(process.execPath, ['./node_modules/typescript/bin/tsc', '-b', 'packages/company-pack'])
  run(join(ROOT, 'node_modules/.bin/tsdown'), [], { cwd: PACK })
  run(process.execPath, ['tools/export-dist.mjs'])
}

function writeManifest(checks) {
  const version = pack().version
  const artifact = artifactCheck()
  const manifest = {
    schema: 1,
    version,
    gitSha: capture('git', ['rev-parse', 'HEAD']).trim(),
    generatedAt: new Date().toISOString(),
    dirty: capture('git', ['status', '--porcelain']).trim() !== '',
    sourceFingerprint: sourceFingerprint(PACK),
    vendor: vendorInfo(),
    artifact,
    checks,
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`release: manifest → ${MANIFEST}`)
  return manifest
}

function prepare() {
  sourceCheck(true)
  const version = pack().version
  const existing = join(DIST, `dsh-company-pack-${version}.tgz`)
  if (existsSync(existing) && !has('--force')) {
    fail(`已存在 ${version} 的 tgz；发布物已落盘。改内容先 bump；确要重打加 --force`)
  }
  build()
  run(process.execPath, ['tools/market-index.mjs', '--prepare'])
  artifactCheck()
  writeManifest({ verify: 'not-run', test: 'not-run' })
  console.log('release: prepare 完成；下一步 --verify')
}

function verify() {
  sourceCheck(true)
  const artifact = artifactCheck()
  const prepared = readManifest()
  if (prepared.version !== pack().version) fail(`manifest 版本 ${prepared.version} ≠ package ${pack().version}；先 --prepare`)
  if (prepared.sourceFingerprint !== sourceFingerprint(PACK)) fail('pack 源码面已变但 _dist 没重打；先重跑 --prepare')
  if (!allowStaleManifest && prepared.gitSha !== capture('git', ['rev-parse', 'HEAD']).trim()) fail('manifest 不是当前 HEAD 的 --prepare 产物；先重跑 --prepare（仅 test/docs 改动可显式 --allow-stale-manifest）')
  const commands = [
    ['verify', ['pnpm', ['verify'], false]],
    ['test', ['pnpm', ['test'], false]],
    ['release-smoke', [process.execPath, ['checks/smoke/release-smoke.mjs', '--tarball',
      join(DIST, artifact.file), '--expect-sha', artifact.sha256], true]],
    ['company-entry-smoke', [process.execPath, ['checks/smoke/company-entry-smoke.mjs'], true]],
    ['client-load-smoke', [process.execPath, ['checks/smoke/client-load-smoke.mjs'], true]],
    ['preset-smoke', [process.execPath, ['checks/smoke/preset-smoke.mjs'], true]],
    ['present-catalog-smoke', [process.execPath, ['checks/smoke/present-catalog-smoke.mjs'], false]],
  ]
  const checks = {}
  for (const [name, [command, argv, needsEnv]] of commands) {
    console.log(`\n── ${name} ──`)
    try {
      if (needsEnv) run('bash', ['-c', 'source run/env.sh && exec "$@"', '--', command, ...argv])
      else run(command, argv)
      checks[name] = 'pass'
    } catch (error) {
      checks[name] = 'fail'
      writeManifest(checks)
      fail(`${name} 失败：${error.message}`)
    }
  }
  writeManifest(checks)
  console.log('release: verify 全绿；提交后跑 --check')
}

function stamp() {
  sourceCheck()
  const artifact = artifactCheck()
  const manifest = readManifest()
  assertVendor(manifest)
  if (manifest.version !== pack().version) fail(`manifest 版本 ${manifest.version} ≠ package ${pack().version}`)
  if (manifest.sourceFingerprint !== sourceFingerprint(PACK)) fail('pack 源码面已变但 _dist 没重打；先重跑 --prepare')
  if (manifest.artifact?.sha256 !== artifact.sha256) fail('manifest sha256 与当前 tgz 不一致')
  const checks = manifest.checks ?? {}
  const notPass = Object.entries(checks).filter(([, status]) => status !== 'pass')
  if (checks.verify !== 'pass' || checks.test !== 'pass' || notPass.length > 0) fail('manifest 还没有全项 pass；先 --verify')
  manifest.gitSha = capture('git', ['rev-parse', 'HEAD']).trim()
  manifest.dirty = false
  manifest.generatedAt = new Date().toISOString()
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`release: stamp ${manifest.version} @ ${manifest.gitSha.slice(0, 8)}（不改产物，只把 manifest 钉到当前 HEAD）`)
}

function check(allowDirtyTree = allowDirty) {
  sourceCheck(allowDirtyTree)
  const artifact = artifactCheck()
  const manifest = readManifest()
  assertVendor(manifest)
  if (manifest.version !== pack().version) fail(`manifest 版本 ${manifest.version} ≠ package ${pack().version}`)
  if (manifest.sourceFingerprint !== sourceFingerprint(PACK)) fail('pack 源码面已变但 _dist 没重打；先重跑 --prepare')
  if (manifest.gitSha !== capture('git', ['rev-parse', 'HEAD']).trim()) fail('manifest gitSha 不是当前 HEAD（发布后被改过？只提交 docs/receipt 时用 --stamp；重建产物才用 --prepare/--verify）')
  if (manifest.artifact?.sha256 !== artifact.sha256) fail('manifest sha256 与当前 tgz 不一致')
  if (manifest.dirty !== false) fail('manifest 记录的是脏树（发布字节不对应一个干净 commit；重跑 --verify）')
  const checks = manifest.checks ?? {}
  const notPass = Object.entries(checks).filter(([, status]) => status !== 'pass')
  if (checks.verify !== 'pass' || checks.test !== 'pass') fail('manifest 未记录 verify/test 通过（--prepare 后必须 --verify）')
  if (notPass.length > 0) fail(`manifest 有未通过的检查：${notPass.map(([name, status]) => `${name}=${String(status)}`).join(', ')}`)
  if (!allowPrePublishIndex
    && existsSync(join(ROOT, 'market-index.staged.json'))
    && existsSync(join(ROOT, 'market-index.json'))) {
    fail('market-index.staged.json 在场且根 index 可托管：默认拒绝 READY；发布后删 staged，或显式 --allow-pre-publish-index 确认不会托管')
  }
  console.log('release: SCOPE READY = 当前工作树（暖 lib/_dist）；干净 clone 的验收边界 = fresh-clone CI 的 install + bundle:init + verify')
  console.log(`release: READY ${manifest.version} @ ${manifest.gitSha.slice(0, 8)}（tgz ${artifact.entries} 条目；${String(Object.keys(checks).length)} 项检查 pass）`)
  if (existsSync(join(ROOT, 'market-index.staged.json'))) {
    console.log('release: WARN market-index.staged.json 在场：根 index 是发布前预览，不可托管；发布后删除 staged 并跑 pnpm market:hosted')
  }
}

const mode = has('--all') ? 'all' : has('--prepare') ? 'prepare' : has('--verify') ? 'verify' : has('--stamp') ? 'stamp' : has('--bump') ? 'bump' : 'check'
try {
  if (mode === 'bump') bump(valueOf('--bump'))
  else if (mode === 'prepare') prepare()
  else if (mode === 'verify') verify()
  else if (mode === 'stamp') stamp()
  else if (mode === 'all') { prepare(); verify(); console.log('release: --all 完成；commit 后跑 --check') }
  else check()
} catch (error) {
  fail(error.message)
}

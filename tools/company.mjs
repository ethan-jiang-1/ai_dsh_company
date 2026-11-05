#!/usr/bin/env node
// 状态：常驻（repo dev-only）
// 何时跑：维护者要在 dev workspace 起一个 `company` profile 看交付形态时。
// 用法：pnpm company [--link] [--port <n>] [--no-open] [--home <DSH_HOME>] [--workspace <dir>]
//
// 这**不是**启动入口，也不进 tarball：启动入口是 `dsh --profile company`。
// **默认走用户侧同形安装**：tsc + tsdown → npm pack → `dsh plugin --profile company add file:<tgz>`
// → exec dsh。`--link` = 旧的符号链接快速通道（改 presets/** 即刻生效，不验打包面）。
// 差异表与允许差异 = docs/guides/dev-product-parity.md；本文件只做：定位、pack/add、exec。
// 不建 profile 之外的写操作（缺 profile 时才用 web 模板初始化）、不写 profile patch、不问 workspace。
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { devTarballName, migrationNotice, planDevStart, resolveDevMode, shouldReuseBuild } from './lib/dev-install.mjs'
import { devBuildFingerprint } from './lib/pack-source.mjs'
import { redactTokenUrls } from './lib/session-diagnose.mjs'

const here = fileURLToPath(import.meta.url)
const root = resolve(dirname(here), '..')
const args = process.argv.slice(2)
const valueOf = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`用法：pnpm company [--link] [--rebuild] [--port <n>] [--no-open] [--home <DSH_HOME>] [--workspace <dir>]

dev-only：默认 tsc + tsdown + npm pack → \`dsh plugin --profile company add file:<tgz>\` → exec dsh。
--link = 符号链接快速通道（改 presets/** 即刻生效；不验打包面）。
--rebuild = 忽略构建缓存，强制重新构建打包（默认：源/vendor pin/lockfile 未变时复用上次 tarball）。
应用内安装/启动见 README 与 _dist 手册；本脚本不写 profile patch、不问 workspace。`)
  process.exit(0)
}
const mode = resolveDevMode(args)
const home = resolve(valueOf('--home') ?? process.env.DSH_HOME ?? join(root, 'runtime/harness-home'))
const workspace = resolve(valueOf('--workspace') ?? join(root, 'company-workspace'))
if (!existsSync(workspace)) {
  console.error(`company(dev): workspace 不存在：${workspace}；先 pnpm bundle:init`)
  process.exit(2)
}
const cli = join(root, 'vendor/dsh/apps/cli/lib/bin.js')
if (!existsSync(cli)) {
  console.error('company(dev): vendor CLI 未构建；先按 docs/guides/bootstrap 构建 vendor')
  process.exit(2)
}
const packDir = join(root, 'packages/company-pack')
const manifest = JSON.parse(readFileSync(join(packDir, 'package.json'), 'utf8'))
const profileDir = join(home, 'profiles', 'company')
const profileManifest = join(profileDir, 'package.json')
const profileExists = existsSync(profileManifest)
const currentDependency = profileExists
  ? JSON.parse(readFileSync(profileManifest, 'utf8'))?.dependencies?.[manifest.name]
  : undefined
const stateDir = join(home, 'tmp/dev-pack')
const passthrough = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--home' || args[i] === '--workspace') { i += 1; continue }
  if (args[i] === '--link' || args[i] === '--rebuild') continue
  passthrough.push(args[i])
}
const env = { ...process.env, DSH_HOME: home, DSH_COMPANY_HOME: workspace }
const run = (argv, options = {}) => {
  const result = spawnSync(argv[0], argv.slice(1), { cwd: root, env, stdio: 'inherit', ...options })
  if (result.status !== 0) {
    console.error(`company(dev): 步骤失败（exit ${String(result.status)}）：${argv.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

// 缺 profile 才初始化（web 模板）；已有 profile 一律不动它的依赖/patch。
if (!profileExists) {
  console.log('company(dev): 缺 company profile；用 web 模板初始化（仅首次）')
  run([process.execPath, cli, '--profile', 'company', '--from-default-profile', 'web', '--dump-default-config'],
    { cwd: home, stdio: 'ignore' })
}

const forceRebuild = args.includes('--rebuild')
const buildStampPath = join(stateDir, 'build-stamp.json')
const libIndex = join(packDir, 'lib/index.js')
const libClient = join(packDir, 'lib/client.js')
const readBuildStamp = () => {
  try { return JSON.parse(readFileSync(buildStampPath, 'utf8')) } catch { return undefined }
}
const vendorSha = (() => {
  const result = spawnSync('git', ['-C', join(root, 'vendor/dsh'), 'rev-parse', 'HEAD'], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : undefined
})()
const buildFingerprint = devBuildFingerprint(packDir, { vendorSha, lockfilePath: join(root, 'pnpm-lock.yaml') })

let tarballPath
if (mode === 'tarball') {
  mkdirSync(stateDir, { recursive: true })
  const stamp = readBuildStamp()
  const tarballPresent = typeof stamp?.tarball === 'string' && existsSync(stamp.tarball)
  let tarballShaMatches = false
  if (tarballPresent && typeof stamp.tarballSha === 'string') {
    tarballShaMatches = createHash('sha256').update(readFileSync(stamp.tarball)).digest('hex') === stamp.tarballSha
  }
  const reuse = vendorSha !== undefined && shouldReuseBuild({
    stamp, fingerprint: buildFingerprint, version: manifest.version,
    tarballPresent, tarballShaMatches,
    libPresent: existsSync(libIndex) && existsSync(libClient),
    force: forceRebuild,
  })
  if (reuse) {
    tarballPath = stamp.tarball
    console.log(`company(dev): 源未变，跳过构建打包（复用 ${tarballPath}）`)
  } else {
    if (forceRebuild) console.log('company(dev): --rebuild：强制重新构建打包')
    console.log('company(dev): 构建 + 打包（用户侧同形安装）')
    run([process.execPath, './node_modules/typescript/bin/tsc', '-b', 'packages/company-pack'])
    run([join(root, 'node_modules/.bin/tsdown')], { cwd: packDir })
    const packed = spawnSync('npm', ['pack', '--pack-destination', stateDir, '--json'], {
      cwd: packDir, env: { ...env, npm_config_cache: join(home, 'cache/npm') }, encoding: 'utf8',
    })
    if (packed.status !== 0) {
      console.error(`company(dev): npm pack 失败：${(packed.stderr ?? '').slice(-800)}`)
      process.exit(1)
    }
    const packedName = JSON.parse(packed.stdout)[0].filename
    const packedPath = join(stateDir, packedName)
    const sha256 = createHash('sha256').update(readFileSync(packedPath)).digest('hex')
    tarballPath = join(stateDir, devTarballName({ name: manifest.name, version: manifest.version, sha256 }))
    if (packedPath !== tarballPath) renameSync(packedPath, tarballPath)
    writeFileSync(buildStampPath, `${JSON.stringify({
      schema: 1,
      version: manifest.version,
      fingerprint: buildFingerprint,
      tarball: tarballPath,
      tarballSha: sha256,
      vendorSha,
      builtAt: new Date().toISOString(),
    }, null, 2)}\n`)
  }
}

const plan = planDevStart({
  mode, version: manifest.version, profileExists: true, currentDependency, tarballPath, sourceDir: packDir,
})
const notice = migrationNotice({ mode, currentDependency })
if (notice !== undefined) console.log(`company(dev): ${notice}`)
const installStep = plan.steps.find(step => step.kind === 'install')
if (installStep !== undefined) {
  console.log(`company(dev): ${installStep.spec.startsWith('link:') ? 'link' : 'tarball'} 安装 → profile company`)
  run([process.execPath, cli, 'plugin', '--profile', 'company', 'add', installStep.spec])
} else {
  console.log(`company(dev): 安装副本已是最新（${plan.spec}）`)
}
// 清理必须在 add 之后：pnpm 换依赖时要读旧 tarball（profile package.json 的旧 spec），
// 先删旧文件会让 `plugin add` 以 ENOENT 失败（2026-11-02 实测：旧 abef80f4、新 5fe5f189）。
if (mode === 'tarball') {
  for (const name of readdirSync(stateDir)) {
    if (name.endsWith('.tgz') && join(stateDir, name) !== tarballPath) rmSync(join(stateDir, name), { force: true })
  }
}

// 启动输出同时落盘：起窗崩溃时不再只剩终端（2026-11-03 R5-33）。
// 日志写 redact 后的文本（token URL 会被替换）；终端仍显示原文。
const logDir = join(root, 'runtime/web-logs')
mkdirSync(logDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const logPath = join(logDir, `company-${stamp}.log`)
const logStream = createWriteStream(logPath, { flags: 'a' })
console.log(`company(dev): 启动日志 → ${logPath}（含运行输出，token 已脱敏；勿提交）`)
const child = spawn(process.execPath, [cli, '--profile', 'company', '--', ...passthrough], {
  cwd: workspace, env, stdio: ['inherit', 'pipe', 'pipe'],
})
const tee = (stream, target, sink) => {
  stream.on('data', chunk => {
    target.write(chunk)
    sink.write(redactTokenUrls(chunk.toString()))
  })
}
tee(child.stdout, process.stdout, logStream)
tee(child.stderr, process.stderr, logStream)
child.on('error', error => {
  console.error(`company(dev): 子进程启动失败：${error.message}`)
  logStream.end()
  process.exit(1)
})
child.on('close', code => {
  logStream.end()
  process.exit(code ?? 1)
})

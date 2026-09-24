#!/usr/bin/env node
// 认证档（不进 pnpm test）：company-pack 构建 → npm pack → 干净 profile 真安装 → built CLI boot/RPC。
// vendor 产物是前置条件，不由此脚本重建；存在/运行通过不代表新鲜。构建配方见 guides/dev-loop §7。
// 用法：source dev/env.sh && node scripts/release-smoke.mjs [--keep]
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireDevHome } from './lib/runtime-home.mjs'
import { plainNodeEnv, releaseProcesses } from './lib/release-process.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const KEEP = process.argv.includes('--keep')
const PACK_DIR = join(ROOT, 'packages/company-pack')
const PROFILE = 'release-check'
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
const BOOT_TIMEOUT_MS = 120_000
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

let processes
let profileDir
let lockDir
let ownsProfile = false
let ownsLock = false
try {
  const home = requireDevHome('release-smoke')
  const cliDir = join(ROOT, 'vendor/dsh/apps/cli')
  const cliManifest = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf8'))
  const bin = cliManifest.bin?.dsh
  if (typeof bin !== 'string' || !bin.startsWith('lib/') || !bin.endsWith('.js')) {
    throw new Error('vendor CLI bin.dsh 必须指向 built lib/*.js；拒绝源码回退')
  }
  const cli = resolve(cliDir, bin)
  const rel = relative(cliDir, cli)
  if (isAbsolute(rel) || rel.startsWith('..')) throw new Error('vendor CLI bin.dsh 越出 CLI 目录')
  for (const artifact of [cli, join(ROOT, 'vendor/dsh/apps/web/dist/index.html')]) {
    if (!existsSync(artifact) || !statSync(artifact).isFile()) {
      throw new Error(`缺少 built artifact：${artifact}；按 docs/guides/dev-loop.md §7 构建；不会回退 tsx/src`)
    }
  }
  console.log(`built CLI：${cli}（plain Node；vendor 产物新鲜度未证明，本脚本只重建 company-pack）`)
  const env = plainNodeEnv({ ...process.env, DSH_HOME: home,
    npm_config_cache: join(home, 'tmp/npm-cache'), npm_config_store_dir: join(ROOT, '.pnpm-store'),
    npm_config_verify_deps_before_run: 'false',
  })
  processes = releaseProcesses({ cwd: ROOT, env })
  const run = (cmd, args, opts) => processes.run(cmd, args, opts)
  // Do not race another release check's reserved profile or tarball.
  mkdirSync(join(home, 'tmp'), { recursive: true })
  lockDir = join(home, 'tmp/release-smoke.lock')
  mkdirSync(lockDir)
  ownsLock = true
  profileDir = join(home, 'profiles', PROFILE)

  console.log('① 构建 company-pack 发布面（tsc + tsdown）')
  await run(process.execPath, ['./node_modules/typescript/bin/tsc', '-p', 'packages/company-pack/tsconfig.json'])
  const tsdownRun = join(dirname(createRequire(join(ROOT, 'package.json')).resolve('tsdown/package.json')), 'dist/run.mjs')
  await run(process.execPath, [tsdownRun], { cwd: PACK_DIR })

  console.log('② npm pack')
  const packTmp = join(home, 'tmp/release-pack')
  rmSync(packTmp, { recursive: true, force: true })
  mkdirSync(packTmp, { recursive: true })
  const packed = await run('npm', ['pack', '--pack-destination', packTmp], { cwd: PACK_DIR })
  const tarball = join(packTmp, packed.trim().split('\n').filter(Boolean).at(-1) ?? '')
  if (!statSync(tarball).isFile()) throw new Error(`npm pack 没产出 tarball（${tarball}）`)
  console.log(`  tarball：${tarball.split('/').pop()}（${Math.round(statSync(tarball).size / 1024)} KB）`)

  console.log(`③ 预置干净 profile（${PROFILE}）`)
  rmSync(profileDir, { recursive: true, force: true })
  mkdirSync(profileDir, { recursive: true })
  ownsProfile = true
  // Custom names default to dsh-base only. Match the vendor web template explicitly.
  writeFileSync(join(profileDir, 'package.json'), `${JSON.stringify({
    name: `dsh-profile-${PROFILE}`, private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'startup' } },
  }, null, 2)}\n`)
  writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
  writeFileSync(join(profileDir, '.npmrc'), `store-dir=${join(ROOT, '.pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`)

  console.log('④ built dsh plugin add file:<tarball>')
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${tarball}`], { timeoutMs: 180_000 })
  const installedProfile = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  const bundles = installedProfile?.dsh?.profile?.bundles ?? []
  check('plugin add 后 bundles 含 dsh-company-pack', bundles.includes('dsh-company-pack'), `bundles = ${bundles.join(', ')}`)
  const installedPack = join(profileDir, 'node_modules/dsh-company-pack')
  check('真实安装副本在场（node_modules/dsh-company-pack）', existsSync(join(installedPack, 'package.json')))
  check('安装副本带 presets/', existsSync(join(installedPack, 'presets/ceo')))
  check('安装副本带 client 产物', existsSync(join(installedPack, 'lib/client.js')))
  const installedManifest = JSON.parse(readFileSync(join(installedPack, 'package.json'), 'utf8'))
  check('安装副本 peers 进 tarball', Object.keys(installedManifest.peerDependencies ?? {}).length >= 15 && installedManifest.dependencies === undefined)
  check('安装副本带兼容矩阵', Array.isArray(installedManifest?.dsh?.compatibility?.dshReleases))

  console.log('⑤ boot web（built CLI，临时随机端口；不替换现有 GUI）')
  const child = processes.start(process.execPath, [cli, '--profile', PROFILE, '--', '--port', '0', '--no-open'], { timeoutMs: 180_000 })
  const banner = await child.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, BOOT_TIMEOUT_MS)
  const base = `http://127.0.0.1:${banner[1]}`
  console.log(`  临时实例 pid/pgid=${child.child.pid} port=${banner[1]}`)
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(15_000) })
    if (!response.ok && !(options.redirect === 'manual' && response.status >= 300 && response.status < 400)) {
      throw new Error(`${path}: HTTP ${response.status}`)
    }
    return response
  }
  const cookie = (await request(`/?token=${banner[2]}`, { redirect: 'manual' })).headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const response = await request(`/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `release-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
    return body.result.value
  }
  const roster = await rpc('agentPresets/list', {})
  for (const role of ROLES) {
    const row = (roster.presets ?? []).find(p => p.id === role)
    check(`roster 含 ${role}（零 broken）`, row !== undefined && row.broken === undefined,
      row === undefined ? '不在 roster' : (row.broken === undefined ? '' : String(row.broken).slice(0, 120)))
  }
  const rehearsal = join(ROOT, 'dev/rehearsal-workspace')
  mkdirSync(rehearsal, { recursive: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'ceo' } })
  check('session/create 挂上 ceo', created?.agentPreset === 'ceo' || created?.preset === 'ceo', JSON.stringify(created).slice(0, 120))
  const html = await (await request('/', { headers: { cookie } })).text()
  check('浏览器模块表含 dsh-company-pack/client.js', html.includes('dsh-company-pack/client.js') || html.includes('"dsh-company-pack"'))
} catch (error) {
  failures.push(error.message)
  console.error(`release-smoke: ${error.message}`)
} finally {
  let stopped = true
  try { await processes?.close() } catch (error) {
    stopped = false
    failures.push(error.message)
    console.error(error)
  }
  if (ownsProfile && stopped) {
    if (!KEEP) rmSync(profileDir, { recursive: true, force: true })
    console.log(KEEP ? `  --keep：profile 保留 ${profileDir}` : '  干净 profile 已回收')
  }
  if (ownsLock && stopped) rmSync(lockDir, { recursive: true, force: true })
}
console.log(failures.length === 0
  ? '\nrelease-smoke: ALL PASS（plain Node built CLI → npm pack → 干净 profile 真安装 → RPC）'
  : `\nrelease-smoke: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1

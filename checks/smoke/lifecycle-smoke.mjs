#!/usr/bin/env node
// 状态：常驻
// 认证档（不进 pnpm test）：真 tarball 的升级 / 卸载 / 迁移证据。
// 何时跑：分发契约、bundle 基部升级、手册第四/五/六节改动后；或发布前（无 key，分钟级）。
// 用法：source run/env.sh && node checks/smoke/lifecycle-smoke.mjs [--keep]
//
// 证明边界：v1 真装 → 改基部 + 加扩张数据 → v2 真装 → 启动；再卸载、搬 home 后重装。
// 不证明：registry 升级、降级、并发升级、跨 OS；这些不在本轮范围。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { plainNodeEnv, releaseProcesses } from '../../tools/drivers/release-process.mjs'

const KEEP = process.argv.includes('--keep')
const PACK_DIR = join(ROOT, 'packages/company-pack')
const PROFILE = 'lifecycle-check'
const CURRENT_VERSION = JSON.parse(readFileSync(join(PACK_DIR, 'package.json'), 'utf8')).version
const V2_VERSION = (() => {
  const parts = CURRENT_VERSION.split('.')
  const patch = Number(parts[2])
  if (parts.length !== 3 || !Number.isSafeInteger(patch)) throw new Error(`无法从 ${CURRENT_VERSION} 生成 v2 版本`)
  return `${parts[0]}.${parts[1]}.${String(patch + 1)}`
})()
const BOOT_TIMEOUT_MS = 120_000
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const hashFile = path => createHash('sha256').update(readFileSync(path)).digest('hex')
/** 轮询等待，替代固定 sleep；超时即失败。 */
const waitFor = async (predicate, label, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise(resolve => { setTimeout(resolve, 50) })
  }
  throw new Error(`${label} timeout（${String(timeoutMs)}ms）`)
}
const fingerprint = (dir) => {
  const rows = []
  const walk = (rel) => {
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) { rows.push(`${child}/`); walk(child) }
      else rows.push(`${child}:${hashFile(join(dir, child))}`)
    }
  }
  walk('')
  return JSON.stringify(rows)
}
const copyPack = (source, target) => {
  cpSync(source, target, {
    recursive: true,
    filter: (path) => !path.split(sep).includes('node_modules') && !path.split(sep).includes('.git'),
  })
}

let processes
let home
let movedHome
let ownsProfile = false
try {
  const devHome = requireDevHome('lifecycle-smoke')
  home = join(devHome, 'tmp/lifecycle-smoke-home')
  movedHome = join(devHome, 'tmp/lifecycle-smoke-home-moved')
  rmSync(home, { recursive: true, force: true })
  rmSync(movedHome, { recursive: true, force: true })
  mkdirSync(home, { recursive: true })

  const cliDir = join(ROOT, 'vendor/dsh/apps/cli')
  const cliManifest = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf8'))
  const bin = cliManifest.bin?.dsh
  if (typeof bin !== 'string' || !bin.startsWith('lib/') || !bin.endsWith('.js')) {
    throw new Error('vendor CLI bin.dsh 必须指向 built lib/*.js；拒绝源码回退（先按 bootstrap 构建）')
  }
  const cli = resolve(cliDir, bin)
  const rel = relative(cliDir, cli)
  if (isAbsolute(rel) || rel.startsWith('..')) throw new Error('vendor CLI bin.dsh 越出 CLI 目录')
  for (const artifact of [cli, join(ROOT, 'vendor/dsh/apps/web/dist/index.html')]) {
    if (!existsSync(artifact)) throw new Error(`缺少 built artifact：${artifact}；按 docs/guides/bootstrap.md 构建`)
  }
  if (!existsSync(join(PACK_DIR, 'lib/index.js'))) throw new Error('pack lib/index.js 缺失；先按 bootstrap 构建 pack')

  const companyHome = join(home, 'tmp/lifecycle-company-workspace')
  const env = plainNodeEnv({
    ...process.env,
    DSH_HOME: home,
    DSH_COMPANY_HOME: companyHome,
    DSH_COMPANY_BOOTSTRAP: 'if-missing',
    npm_config_cache: join(home, 'tmp/npm-cache'),
    npm_config_store_dir: join(ROOT, '.pnpm-store'),
    npm_config_verify_deps_before_run: 'false',
  })
  processes = releaseProcesses({ cwd: ROOT, env })
  const run = (cmd, args, opts) => processes.run(cmd, args, opts)
  const boot = async () => {
    const child = processes.start(process.execPath, [cli, '--profile', PROFILE, '--', '--port', '0', '--no-open'], { timeoutMs: 180_000 })
    await child.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, BOOT_TIMEOUT_MS)
    await waitFor(() => existsSync(join(home, 'bundle.json'))
      && existsSync(join(companyHome, 'kb/deliverables-index.json')), '首启落盘')
    const output = child.output
    await child.stop()
    return output
  }

  console.log('① v1 tarball（当前 pack）')
  const v1Dir = join(home, 'tmp/packs/v1')
  mkdirSync(v1Dir, { recursive: true })
  const v1Name = (await run('npm', ['pack', '--pack-destination', v1Dir], { cwd: PACK_DIR })).trim().split('\n').filter(Boolean).at(-1)
  const v1 = join(v1Dir, v1Name ?? '')
  if (!existsSync(v1)) throw new Error(`npm pack v1 没产出 tarball（${v1}）`)

  console.log('①b 兼容拒绝（临时 bad tarball，真装）')
  const badPack = join(home, 'tmp/packs/pack-bad')
  copyPack(PACK_DIR, badPack)
  const badManifest = JSON.parse(readFileSync(join(badPack, 'package.json'), 'utf8'))
  badManifest.engines.dsh = '>=99.0.0'
  writeFileSync(join(badPack, 'package.json'), `${JSON.stringify(badManifest, null, 2)}\n`)
  const badDir = join(home, 'tmp/packs/bad')
  mkdirSync(badDir, { recursive: true })
  const badName = (await run('npm', ['pack', '--pack-destination', badDir], { cwd: badPack })).trim().split('\n').filter(Boolean).at(-1)
  const bad = join(badDir, badName ?? '')
  if (!existsSync(bad)) throw new Error(`npm pack bad 没产出 tarball（${bad}）`)
  const compatProfile = join(home, 'profiles/compat-check')
  mkdirSync(compatProfile, { recursive: true })
  writeFileSync(join(compatProfile, 'package.json'), `${JSON.stringify({
    name: 'dsh-profile-compat-check', private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'startup' } },
  }, null, 2)}\n`)
  writeFileSync(join(compatProfile, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
  writeFileSync(join(compatProfile, '.npmrc'), `store-dir=${join(ROOT, '.pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`)
  let refusal = ''
  try {
    await run(process.execPath, [cli, 'plugin', '--profile', 'compat-check', 'add', `file:${bad}`], { timeoutMs: 180_000 })
  } catch (error) {
    refusal = String(error?.message ?? error)
  }
  check('不兼容 DSH 真拒绝', /incompatible-version|incompatible/i.test(refusal), refusal.split('\n').slice(0, 3).join(' | '))
  const compatAfter = JSON.parse(readFileSync(join(compatProfile, 'package.json'), 'utf8'))
  check('拒绝后 profile 未装该包', !(compatAfter?.dsh?.profile?.bundles ?? []).includes('dsh-company-pack'))

  console.log(`② 干净 profile（${PROFILE}）+ v1 真装`)
  const profileDir = join(home, 'profiles', PROFILE)
  rmSync(profileDir, { recursive: true, force: true })
  mkdirSync(profileDir, { recursive: true })
  ownsProfile = true
  writeFileSync(join(profileDir, 'package.json'), `${JSON.stringify({
    name: `dsh-profile-${PROFILE}`, private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'startup' } },
  }, null, 2)}\n`)
  writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
  writeFileSync(join(profileDir, '.npmrc'), `store-dir=${join(ROOT, '.pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`)
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${v1}`], { timeoutMs: 180_000 })
  await boot()
  check('v1 首启落公司盘', existsSync(join(companyHome, 'AGENTS.md')) && existsSync(join(companyHome, 'kb/org.md')),
    companyHome)

  // 升级只允许动公司盘基部；home 里的 sessions/storages sentinel 必须逐字节不动。
  mkdirSync(join(home, 'sessions'), { recursive: true })
  mkdirSync(join(home, 'storages'), { recursive: true })
  const homeSentinels = {
    sessions: join(home, 'sessions/.lifecycle-sentinel'),
    storages: join(home, 'storages/.lifecycle-sentinel'),
  }
  writeFileSync(homeSentinels.sessions, 'sessions sentinel\n')
  writeFileSync(homeSentinels.storages, 'storages sentinel\n')
  const homeSentinelHashes = { sessions: hashFile(homeSentinels.sessions), storages: hashFile(homeSentinels.storages) }

  console.log('③ 改基部 + 加扩张数据')
  appendFileSync(join(companyHome, 'AGENTS.md'), '\n<!-- lifecycle-keep -->\n')
  appendFileSync(join(companyHome, 'kb/org.md'), '\n<!-- lifecycle-org-keep -->\n')
  appendFileSync(join(companyHome, 'kb/ceo/CHARTER.md'), '\n<!-- lifecycle-charter-keep -->\n')
  mkdirSync(join(companyHome, 'kb/ceo/journal'), { recursive: true })
  const journal = join(companyHome, 'kb/ceo/journal/2026-10-25-lifecycle.md')
  writeFileSync(journal, '# lifecycle smoke\n')
  const deliverable = join(companyHome, 'deliverables/2026-10-25-lifecycle')
  mkdirSync(deliverable, { recursive: true })
  const final = join(deliverable, 'final.md')
  const meta = join(deliverable, 'meta.md')
  writeFileSync(final, '# lifecycle final\n')
  writeFileSync(meta, 'slug: lifecycle\nkickoff: 2026-10-25\n类型: 决策\n结果: 已完成\n一句话结论: lifecycle smoke\n')
  const expansion = { journal: hashFile(journal), final: hashFile(final), meta: hashFile(meta) }

  console.log(`④ v2 tarball（${V2_VERSION}，改一个未改过的基部文件）`)
  const v2Pack = join(home, 'tmp/packs/pack-v2')
  copyPack(PACK_DIR, v2Pack)
  const v2Manifest = JSON.parse(readFileSync(join(v2Pack, 'package.json'), 'utf8'))
  v2Manifest.version = V2_VERSION
  writeFileSync(join(v2Pack, 'package.json'), `${JSON.stringify(v2Manifest, null, 2)}\n`)
  appendFileSync(join(v2Pack, 'workspace/templates/weekly-report.md'), '\n<!-- lifecycle-v2 -->\n')
  const v2Dir = join(home, 'tmp/packs/v2')
  mkdirSync(v2Dir, { recursive: true })
  const v2Name = (await run('npm', ['pack', '--pack-destination', v2Dir], { cwd: v2Pack })).trim().split('\n').filter(Boolean).at(-1)
  const v2 = join(v2Dir, v2Name ?? '')
  if (!existsSync(v2)) throw new Error(`npm pack v2 没产出 tarball（${v2}）`)

  console.log('⑤ v2 真装（remove + add，手册第四节的替换路径）')
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'remove', 'dsh-company-pack'], { timeoutMs: 180_000 })
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${v2}`], { timeoutMs: 180_000 })
  // 单字节篡改：tarball 被改后安装必须拒绝（不是“装完才坏”）。
  const tampered = join(home, 'tmp/packs/v2-tampered.tgz')
  const tamperedBytes = readFileSync(v2)
  tamperedBytes[tamperedBytes.length - 1] ^= 0xff
  writeFileSync(tampered, tamperedBytes)
  let tamperRefused = false
  try { await run(process.execPath, [cli, 'plugin', '--profile', 'tamper-check', 'add', `file:${tampered}`], { timeoutMs: 180_000 }) } catch { tamperRefused = true }
  check('单字节篡改 tarball 拒绝安装', tamperRefused)
  await boot()
  const upgradeLogPath = join(home, 'logs/company-pack-upgrade.log')
  const upgradeLog = existsSync(upgradeLogPath) ? readFileSync(upgradeLogPath, 'utf8') : ''
  check('升级日志点名保留清单', /基部升级/.test(upgradeLog) && /保留用户改过/.test(upgradeLog)
    && upgradeLog.includes('AGENTS.md') && upgradeLog.includes('kb/ceo/CHARTER.md'),
    upgradeLog.split('\n').filter(Boolean).at(-1)?.slice(0, 200) ?? '无基部升级日志')
  const agents = readFileSync(join(companyHome, 'AGENTS.md'), 'utf8')
  const org = readFileSync(join(companyHome, 'kb/org.md'), 'utf8')
  const charter = readFileSync(join(companyHome, 'kb/ceo/CHARTER.md'), 'utf8')
  const weekly = readFileSync(join(companyHome, 'templates/weekly-report.md'), 'utf8')
  check('改过的 AGENTS.md 保留', agents.includes('lifecycle-keep'))
  check('改过的 kb/org.md 保留', org.includes('lifecycle-org-keep'))
  check('改过的 CHARTER 历史保留（基部不覆盖部署历史）', charter.includes('lifecycle-charter-keep'))
  check('未改过的模板随 v2 替换', weekly.includes('lifecycle-v2'))
  check('home sessions/storages sentinel 逐字节不变', hashFile(homeSentinels.sessions) === homeSentinelHashes.sessions
    && hashFile(homeSentinels.storages) === homeSentinelHashes.storages)
  check('扩张面逐字节不变', hashFile(journal) === expansion.journal
    && hashFile(final) === expansion.final && hashFile(meta) === expansion.meta)
  const manifestPath = join(home, 'bundle.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  check('bundle.json 版本前移', manifest.pack?.version === V2_VERSION && manifest.skeleton?.version === V2_VERSION,
    JSON.stringify({ pack: manifest.pack?.version, skeleton: manifest.skeleton?.version }))
  const beforeSecond = fingerprint(companyHome)
  const manifestBefore = readFileSync(manifestPath, 'utf8')
  await boot()
  check('升级后二启零变更', fingerprint(companyHome) === beforeSecond)
  check('升级后二启 bundle.json 字节不变', readFileSync(manifestPath, 'utf8') === manifestBefore)

  console.log('⑥ 卸载：数据不动、profile 摘层')
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'remove', 'dsh-company-pack'], { timeoutMs: 180_000 })
  const afterRemove = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  const bundles = afterRemove?.dsh?.profile?.bundles ?? []
  check('卸载后 profile 无该 bundle', !bundles.includes('dsh-company-pack'), `bundles = ${bundles.join(', ')}`)
  check('卸载后公司盘与 bundle.json 仍在', existsSync(join(companyHome, 'AGENTS.md')) && existsSync(manifestPath))
  check('卸载后扩张面仍在', existsSync(journal) && existsSync(final) && existsSync(meta))

  console.log('⑦ 迁移：搬 home 后重装 + 启动')
  await processes.close()
  const movedV2 = join(movedHome, relative(home, v2))
  renameSync(home, movedHome)
  const movedCompanyHome = join(movedHome, 'tmp/lifecycle-company-workspace')
  const movedEnv = plainNodeEnv({
    ...process.env,
    DSH_HOME: movedHome,
    DSH_COMPANY_HOME: movedCompanyHome,
    DSH_COMPANY_BOOTSTRAP: 'if-missing',
    npm_config_cache: join(movedHome, 'tmp/npm-cache'),
    npm_config_store_dir: join(ROOT, '.pnpm-store'),
    npm_config_verify_deps_before_run: 'false',
  })
  const movedProcesses = releaseProcesses({ cwd: ROOT, env: movedEnv })
  const movedRun = (cmd, args, opts) => movedProcesses.run(cmd, args, opts)
  try {
    await movedRun(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${movedV2}`], { timeoutMs: 180_000 })
    const movedChild = movedProcesses.start(process.execPath, [cli, '--profile', PROFILE, '--', '--port', '0', '--no-open'], { timeoutMs: 180_000 })
    await movedChild.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, BOOT_TIMEOUT_MS)
    await waitFor(() => existsSync(join(movedHome, 'bundle.json'))
      && existsSync(join(movedCompanyHome, 'kb/deliverables-index.json')), '迁移后落盘')
    await movedChild.stop()
    const movedManifest = JSON.parse(readFileSync(join(movedHome, 'bundle.json'), 'utf8'))
    check('迁移后 boot 成功且 workspace 记录仍可解析', movedManifest.workspace === 'tmp/lifecycle-company-workspace',
      movedManifest.workspace)
    check('迁移后公司盘与扩张面仍在', existsSync(join(movedCompanyHome, 'AGENTS.md'))
      && readFileSync(join(movedCompanyHome, 'AGENTS.md'), 'utf8').includes('lifecycle-keep')
      && existsSync(join(movedCompanyHome, 'deliverables/2026-10-25-lifecycle/final.md')))
  } finally {
    await movedProcesses.close()
  }
} catch (error) {
  failures.push(error.message)
  console.error(`lifecycle-smoke: ${error.message}`)
} finally {
  try { await processes?.close() } catch (error) { failures.push(String(error?.message ?? error)) }
  if (!KEEP) {
    if (home !== undefined) rmSync(home, { recursive: true, force: true })
    if (movedHome !== undefined) rmSync(movedHome, { recursive: true, force: true })
  }
  if (ownsProfile) console.log(KEEP ? '  --keep：home 保留' : '  生命周期临时 home 已回收')
}
console.log(failures.length === 0
  ? '\nlifecycle-smoke: ALL PASS（v1 真装 → 改基部 → v2 真装 → 启动 → 卸载 → 迁移）'
  : `\nlifecycle-smoke: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1

#!/usr/bin/env node
// 状态：常驻
// 认证档（不进 pnpm test）：company-pack 构建 → npm pack → 干净 profile 真安装 → built CLI boot/RPC。
// 认证档自 2026-10-13 起同时认「出厂骨架随包 + 首启自举（落盘 / 二次启动零变更）」。
// 何时跑：pack 依赖、安装形状、built 启动器改动时；或它属于关键验收时（无 key，分钟级）
// vendor 产物是前置条件，不由此脚本重建；存在/运行通过不代表新鲜。构建配方见 guides/bootstrap。
// 用法：source run/env.sh && node checks/smoke/release-smoke.mjs [--keep]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { plainNodeEnv, releaseProcesses } from '../../tools/drivers/release-process.mjs'
import { COMPANY_ROLE_IDS, COMPANY_SUPPORT_PRESET_IDS } from '../../tools/lib/company-roles.mjs'

const KEEP = process.argv.includes('--keep')
const PACK_DIR = join(ROOT, 'packages/company-pack')
const PROFILE = 'release-check'
const ROLES = [...COMPANY_ROLE_IDS, ...COMPANY_SUPPORT_PRESET_IDS]
const BOOT_TIMEOUT_MS = 120_000
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const waitFor = async (predicate, label, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise(resolve => { setTimeout(resolve, 50) })
  }
  throw new Error(`${label} timeout（${String(timeoutMs)}ms）`)
}

let processes
let profileDir
let lockDir
let ownsProfile = false
let ownsLock = false
try {
  // 干净 home 必须在**自己的子目录**：bundle.json 写在 DSH_HOME 根，直接拿 dev home 会把
  // release-check 的临时 workspace 记成 dev bundle 的身份（2026-10-24 实测踩到）。
  const devHome = requireDevHome('release-smoke')
  const home = join(devHome, 'tmp/release-smoke-home')
  rmSync(home, { recursive: true, force: true })
  mkdirSync(home, { recursive: true })
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
      throw new Error(`缺少 built artifact：${artifact}；按 docs/guides/bootstrap.md 构建；不会回退 tsx/src`)
    }
  }
  console.log(`built CLI：${cli}（plain Node；vendor 产物新鲜度未证明，本脚本只重建 company-pack）`)
  // 首启自举的验收落点（2026-10-13）：**隔离目录** + 显式打开开关（本仓 run/env.sh 为自管盘设
  // DSH_COMPANY_BOOTSTRAP=off，那条会随环境继承进来——模拟安装必须自己把它翻回来）。
  const companyHome = join(home, 'tmp/release-company-workspace')
  rmSync(companyHome, { recursive: true, force: true })
  const env = plainNodeEnv({ ...process.env, DSH_HOME: home,
    DSH_COMPANY_HOME: companyHome,
    DSH_COMPANY_BOOTSTRAP: 'if-missing',
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
  // 为什么必须 clean + `-b`（2026-09-26 实证，反证在案）：
  // `tsc -p packages/company-pack/tsconfig.json` 在 **solution root** 上是**静默 no-op**——
  // 该 tsconfig 是 `files: []` + 两条 references，非 build 模式不展开 references ⇒ 零输入；
  // 而 TS 的 TS18002（"没有输入文件"）报错条件要求 references 为空，非空即**抑制报错** ⇒ 退出 0、零 emit。
  // 两条分支实测：① 干净态 ⇒ lib/ 根本没被创建、tsdown 的 entry（lib/types/index.js）无来源；
  // ② 陈旧态 ⇒ 上一次 `tsc -b` 的产物原样留着被 tsdown 打包 ⇒ **发布冒烟验的是旧包（假绿）**。
  // 所以这里既改 `-b`（真构建），又先删 lib/（杜绝陈旧产物——release 面要的是"来自当前源码的新鲜构建"，
  // 同文件对 vendor 的既有警告是同一个道理）。
  rmSync(join(PACK_DIR, 'lib'), { recursive: true, force: true })
  await run(process.execPath, ['./node_modules/typescript/bin/tsc', '-b', 'packages/company-pack'])
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
  // 0.2.1：实验性 schedule bundle 退役（宿主 schedule/ui-schedule 由 web-app 挂，
  // time-context/tool-schedule 归 preset 行所有权）⇒ 安装形状回到 base + web-app 两件。
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
  // 出厂骨架（2026-10-13）：少了它，第三方装完插件就是"没有手册与章程"的裸奔（见该 Note）
  check('安装副本带出厂骨架 workspace/（手册 + 章程 + 模板 + 起动件）',
    ['workspace/AGENTS.md', 'workspace/templates/meta.md', 'workspace/kb/org.md', 'workspace/kb/owners.md',
      'workspace/kb/motion-ledger.md', 'workspace/kb/ceo/CHARTER.md', 'workspace/deliverables'].every(rel =>
      existsSync(join(installedPack, rel))),
    `根目录 = ${readdirSync(installedPack).sort().join(', ')}`)
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
  const rehearsal = join(ROOT, REHEARSAL_REL)
  mkdirSync(rehearsal, { recursive: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'ceo' } })
  check('session/create 挂上 ceo', created?.agentPreset === 'ceo' || created?.preset === 'ceo', JSON.stringify(created).slice(0, 120))
  const createdResearch = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'researcher' } })
  check('session/create 挂上 researcher', createdResearch?.agentPreset === 'researcher' || createdResearch?.preset === 'researcher', JSON.stringify(createdResearch).slice(0, 120))
  const html = await (await request('/', { headers: { cookie } })).text()
  check('浏览器模块表含 dsh-company-pack/client.js', html.includes('dsh-company-pack/client.js') || html.includes('"dsh-company-pack"'))

  // ── ⑥ 首启自举（2026-10-13）：干净 home 的第一次启动就把公司盘落到位；再启动一次零变更 ──
  console.log('⑥ 首启自举（干净落点 → boot 落盘 → 二次 boot 零变更）')
  const fingerprint = (dir) => {
    if (!existsSync(dir)) return null
    const rows = []
    const walk = (rel) => {
      for (const entry of readdirSync(join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const child = rel === '' ? entry.name : `${rel}/${entry.name}`
        if (entry.isDirectory()) { rows.push(`${child}/`); walk(child) }
        else rows.push(`${child}:${createHash('sha256').update(readFileSync(join(dir, child))).digest('hex')}`)
      }
    }
    walk('')
    return rows
  }
  await waitFor(() => existsSync(join(home, 'bundle.json')) && existsSync(join(companyHome, 'kb/deliverables-index.json')), '首启落盘')
  const first = fingerprint(companyHome)
  const has = (rows, rel) => rows !== null && rows.some(row => row.startsWith(`${rel}:`))
  check('首启把出厂公司盘落到 DSH_COMPANY_HOME（含手册/章程/起动件）',
    ['AGENTS.md', 'kb/org.md', 'kb/owners.md', 'kb/motion-ledger.md', 'kb/ceo/CHARTER.md', 'templates/meta.md']
      .every(rel => has(first, rel)),
    first === null ? `落点不存在：${companyHome}` : `共 ${String(first.length)} 件`)

  // 成品目录（2026-10-25，RFC installed-shape-self-sufficient）：新装也要有可读空目录，
  // 页签显示“还没有成品”，而不是“维护者运行 node tools/...”。
  const catalogFile = join(companyHome, 'kb/deliverables-index.json')
  const catalog = existsSync(catalogFile) ? JSON.parse(readFileSync(catalogFile, 'utf8')) : null
  check('首启生成成品目录（空目录，不依赖仓库工具）',
    catalog?.schema === 1 && catalog?.counts?.total === 0 && typeof catalog?.generatedAt === 'string',
    catalog === null ? `catalog 不存在：${catalogFile}` : JSON.stringify(catalog.counts))

  // run bundle 身份（2026-10-24）：首启写 `<DSH_HOME>/bundle.json`；workspace 记相对根、骨架指纹在场。
  const manifestPath = join(home, 'bundle.json')
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null
  check('首启写 bundle.json（run bundle 身份）',
    manifest?.v === 1 && typeof manifest.id === 'string' && typeof manifest.createdAt === 'string'
      && manifest.workspace === 'tmp/release-company-workspace'
      && typeof manifest.skeleton?.version === 'string'
      && Object.keys(manifest.skeleton?.files ?? {}).length >= 10,
    manifest === null ? 'bundle.json 不存在' : JSON.stringify({ id: manifest.id, workspace: manifest.workspace, files: Object.keys(manifest.skeleton?.files ?? {}).length }))
  // 干净底座：新安装不许带任何扩张数据（journal / 交付物 / 培养记录）。
  const historyRows = (first ?? []).filter(row => /^kb\/[^/]+\/journal\/.+/.test(row)
    || /^deliverables\/.+\/(final|meta)\.md/.test(row) || /^cultivation\/records\/.+/.test(row))
  check('干净底座（无 journal / 交付物 / 培养记录）', historyRows.length === 0, `扩张数据 ${String(historyRows.length)} 件：${historyRows.slice(0, 3).join(', ')}`)
  // 2026-10-25：CHARTER 历史条目也必须为零——第一版漏的正是这一层（305 行）。
  const charterHistory = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales'].flatMap(role => {
    const path = join(companyHome, 'kb', role, 'CHARTER.md')
    if (!existsSync(path)) return [`缺少 kb/${role}/CHARTER.md`]
    return readFileSync(path, 'utf8').split('\n').filter(line => /^- 20\d\d-\d\d-\d\d · /.test(line))
      .map(line => `kb/${role}/CHARTER.md: ${line.slice(0, 40)}`)
  })
  check('干净底座（CHARTER 无部署历史）', charterHistory.length === 0,
    charterHistory.length === 0 ? '0 条历史' : `${String(charterHistory.length)} 条：${charterHistory.slice(0, 2).join('；')}`)

  const beforeSecond = fingerprint(companyHome)
  const manifestBefore = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : null
  await processes.close()
  const second = processes.start(process.execPath, [cli, '--profile', PROFILE, '--', '--port', '0', '--no-open'], { timeoutMs: 180_000 })
  await second.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, BOOT_TIMEOUT_MS)
  const afterSecond = fingerprint(companyHome)
  check('第二次启动零变更（建立好了就不用再建立了）',
    JSON.stringify(beforeSecond) === JSON.stringify(afterSecond),
    `before=${String(beforeSecond?.length ?? -1)} after=${String(afterSecond?.length ?? -1)}`)
  check('第二次启动 bundle.json 字节不变（只创建、不覆盖）',
    manifestBefore !== null && readFileSync(manifestPath, 'utf8') === manifestBefore,
    manifestBefore === null ? 'bundle.json 不存在' : '字节一致')
} catch (error) {
  failures.push(error.message)
  console.error(`release-smoke: ${error.message}`)
} finally {
  let stopped = true
  try { await processes?.close() } catch (error) {
    // 沙箱/权限面可能让 `kill(-pgid, 0)` 返回 EPERM：无法确认子组退出时**保留 runtime 文件**，
    // 但不把它记成产品失败（产品检查已各自给出答案）；非 EPERM 的清理错误照旧判红。
    const message = String(error?.message ?? error)
    if (/EPERM/.test(message) && /process group/.test(message)) {
      stopped = false
      console.warn(`  WARN release child cleanup 无法确认（${message.slice(0, 200)}）；runtime 文件保留，不判产品失败`)
    } else {
      stopped = false
      failures.push(message)
      console.error(error)
    }
  }
  if (ownsProfile && stopped) {
    if (!KEEP) rmSync(profileDir, { recursive: true, force: true })
    console.log(KEEP ? `  --keep：profile 保留 ${profileDir}` : '  干净 profile 已回收')
  }
  if (ownsLock && stopped) rmSync(lockDir, { recursive: true, force: true })
}
console.log(failures.length === 0
  ? '\nrelease-smoke: ALL PASS（plain Node built CLI → npm pack → 干净 profile 真安装 → RPC → 首启自举落盘/幂等）'
  : `\nrelease-smoke: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1

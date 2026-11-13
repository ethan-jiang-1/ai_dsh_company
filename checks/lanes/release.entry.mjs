#!/usr/bin/env node
// 状态：常驻
// 认证档（不进 pnpm test）：发布 tarball → 官方 profile 初始化 → 真安装 → built CLI boot/RPC。
// `--tarball`/`--expect-sha`：装 `_dist` 的同一份发布字节（release --verify 走这条）；省略才现场 build+pack。
// 同时认「出厂骨架随包 + 首启自举（落盘 / 二次启动零变更）」。
// 何时跑：pack 依赖、安装形状、built 启动器改动时；或它属于关键验收时（无 key，分钟级）
// vendor 产物是前置条件，不由此脚本重建；存在/运行通过不代表新鲜。构建配方见 guides/bootstrap。
// 用法：source run/env.sh && node checks/lanes/release.entry.mjs [--keep] [--tarball <path>] [--expect-sha <sha256>]
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
const valueOf = flag => {
  const index = process.argv.indexOf(flag)
  return index < 0 ? undefined : process.argv[index + 1]
}
const PROVIDED_TARBALL = valueOf('--tarball') === undefined ? undefined : resolve(ROOT, valueOf('--tarball'))
const EXPECTED_SHA = valueOf('--expect-sha')
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
  // 干净 home 必须在**自己的子目录**；交付形态下身份跟 workspace 走，不再写 home 根。
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
  console.log(`built CLI：${cli}（plain Node；vendor 产物新鲜度未证明；本轮${PROVIDED_TARBALL === undefined ? '现场重建 company-pack' : '安装 _dist 发布字节'}）`)
  // 公司状态的验收落点：隔离 workspace；只由 host 写 `.dsh-company/`。
  const companyHome = join(home, 'tmp/release-company-workspace')
  rmSync(companyHome, { recursive: true, force: true })
  mkdirSync(companyHome, { recursive: true })
  const env = plainNodeEnv({ ...process.env, DSH_HOME: home,
    DSH_COMPANY_HOME: companyHome,
    // vendor 通道安装侧有 browser 两包；显式开，避免 auto 探测从 profile 看而误关。
    DSH_COMPANY_BROWSER: 'on',
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

  let tarball
  if (PROVIDED_TARBALL !== undefined) {
    tarball = PROVIDED_TARBALL
    if (!existsSync(tarball) || !statSync(tarball).isFile()) throw new Error(`--tarball 不存在或不是文件：${tarball}`)
    const actual = createHash('sha256').update(readFileSync(tarball)).digest('hex')
    if (EXPECTED_SHA !== undefined && actual !== EXPECTED_SHA) {
      throw new Error(`--tarball sha256 ${actual} ≠ --expect-sha ${EXPECTED_SHA}；拒绝安装与 manifest 不一致的字节`)
    }
    check('--tarball 与 manifest sha256 一致', EXPECTED_SHA === undefined || actual === EXPECTED_SHA, actual)
    console.log(`① 使用发布字节（不重打）：${tarball.split('/').pop()}（${Math.round(statSync(tarball).size / 1024)} KB）`)
  } else {
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
    tarball = join(packTmp, packed.trim().split('\n').filter(Boolean).at(-1) ?? '')
    if (!statSync(tarball).isFile()) throw new Error(`npm pack 没产出 tarball（${tarball}）`)
    console.log(`  tarball：${tarball.split('/').pop()}（${Math.round(statSync(tarball).size / 1024)} KB）`)
  }

  console.log(`③ 官方初始化干净 profile（${PROFILE}）`)
  rmSync(profileDir, { recursive: true, force: true })
  ownsProfile = true
  // FAQ 20：自定义 profile 首次用 shipped web template；不手写 package.json / bundle list。
  await run(process.execPath, [cli, '--profile', PROFILE, '--from-default-profile', 'web', '--dump-default-config'],
    { cwd: home, timeoutMs: 120_000 })
  writeFileSync(join(profileDir, '.npmrc'), `store-dir=${join(ROOT, '.pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`)
  const initialized = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  check('官方 init 的 dependencies 是对象', typeof initialized.dependencies === 'object' && initialized.dependencies !== null)
  check('官方 init 不写 patchReload', !Object.hasOwn(initialized.dsh?.profile ?? {}, 'patchReload'))

  console.log('④ built dsh plugin add file:<tarball>')
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${tarball}`], { timeoutMs: 180_000 })
  console.log('④b 同版本重复安装（幂等）')
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${tarball}`], { timeoutMs: 180_000 })
  const reinstalled = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  const reinstalledBundles = (reinstalled?.dsh?.profile?.bundles ?? []).filter(id => id === 'dsh-company-pack')
  check('重复 plugin add 不产生重复 bundle', reinstalledBundles.length === 1, `company-pack ×${String(reinstalledBundles.length)}`)

  const installedProfile = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  const bundles = installedProfile?.dsh?.profile?.bundles ?? []
  check('plugin add 后 bundles 含 dsh-company-pack', bundles.includes('dsh-company-pack'), `bundles = ${bundles.join(', ')}`)
  const installedPack = join(profileDir, 'node_modules/dsh-company-pack')
  check('真实安装副本在场（node_modules/dsh-company-pack）', existsSync(join(installedPack, 'package.json')))
  check('安装副本带 presets/', existsSync(join(installedPack, 'presets/ceo')))
  check('安装副本带 client 产物', existsSync(join(installedPack, 'lib/client.js')))
  check('安装副本无 bin/启动器', !existsSync(join(installedPack, 'bin')))
  check('安装副本带 locale/icon（可发现性元数据）', ['locale/en.json', 'locale/zh.json', 'icon.svg'].every(rel => existsSync(join(installedPack, rel))))
  // 只读内容（2026-11-01 v3）：少了它，第三方装完插件就是"没有手册/模板/默认章程"的裸奔。
  // 清单驱动（2026-11-09 三层）：安装副本必须带 manifest 里声明的全部内容，外加默认章程样本。
  // 不再手抄文件清单——加/改名只改 manifest，smoke 自动跟随。
  const contentManifest = JSON.parse(readFileSync(join(installedPack, 'content/manifest.json'), 'utf8'))
  const manifestFiles = Object.values(contentManifest.tiers ?? {}).flat().map(rel => `content/${rel}`)
  check('安装副本带 content/（按 manifest 清单）',
    manifestFiles.every(rel => existsSync(join(installedPack, rel)))
      && existsSync(join(installedPack, 'content/templates/meta.md'))
      && existsSync(join(installedPack, 'content/charters/ceo.md')),
    `根目录 = ${readdirSync(installedPack).sort().join(', ')}`)
  const installedManifest = JSON.parse(readFileSync(join(installedPack, 'package.json'), 'utf8'))
  // 2026-11-10：stale `_dist` 的安装副本自身自洽（10 条 patch/9 个 preset），boot 又因
  // 安装锚遮蔽跑源码 roster——只查 `presets/ceo` + RPC 会假绿。安装副本必须与源码声明对齐。
  const sourceManifest = JSON.parse(readFileSync(join(PACK_DIR, 'package.json'), 'utf8'))
  const sourcePatch = sourceManifest?.dsh?.bundle?.patch ?? []
  const installedPatch = installedManifest?.dsh?.bundle?.patch ?? []
  check('安装副本 patch 清单 == 源码', JSON.stringify(sourcePatch) === JSON.stringify(installedPatch),
    `源码 ${String(sourcePatch.length)} 条 / 安装 ${String(installedPatch.length)} 条`)
  const missingPatches = sourcePatch.filter(rel => !existsSync(join(installedPack, rel)))
  check('安装副本含全部源码声明的 patch', missingPatches.length === 0, missingPatches.join(', '))
  check('安装副本 peers 进 tarball', Object.keys(installedManifest.peerDependencies ?? {}).length >= 15 && installedManifest.dependencies === undefined)
  check('安装副本带 engines.dsh 运行时窗口', typeof installedManifest?.engines?.dsh === 'string')
  check('安装副本不再携带 dsh.compatibility（FAQ 24 §9.2）', installedManifest?.dsh?.compatibility === undefined)

  // ④c 应用内安装路径（2026-11-01 生命周期卡 P0）：Plugins 页 / plugin_manager 走的是
  // pluginManager.installBundle，而不是 CLI 的 dsh plugin。它会在**运行中的组合**上 live 应用
  // patch；改值替换被 session-controller 依赖的服务行会报
  // `file-upload: Agent resolver is already registered`，application=failed。
  // 这条断言就是默认路径的看门狗：CLI 绿不能替代它。
  console.log('④c 应用内安装（shipped web profile，pluginManager/installBundle；Plugins 页同款）')
  const inAppProfile = 'web'
  const inAppDir = join(home, 'profiles', inAppProfile)
  rmSync(inAppDir, { recursive: true, force: true })
  const inApp = processes.start(process.execPath, [cli, '--profile', inAppProfile, '--', '--port', '0', '--no-open'], { timeoutMs: 180_000 })
  try {
    const inAppBanner = await inApp.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, BOOT_TIMEOUT_MS)
    writeFileSync(join(inAppDir, '.npmrc'), `store-dir=${join(ROOT, '.pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`)
    const inAppInit = JSON.parse(readFileSync(join(inAppDir, 'package.json'), 'utf8'))
    check('shipped web profile 自动初始化（base+web-app）', ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
      .every(bundle => (inAppInit?.dsh?.profile?.bundles ?? []).includes(bundle)))
    check('shipped web profile 不写 patchReload', !Object.hasOwn(inAppInit?.dsh?.profile ?? {}, 'patchReload'))
    const inAppBase = `http://127.0.0.1:${inAppBanner[1]}`
    const inAppCookie = (await fetch(`${inAppBase}/?token=${inAppBanner[2]}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) }))
      .headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ')
    let inAppRpcId = 0
    const inAppRpc = async (method, args, timeoutMs = 15_000) => {
      const response = await fetch(`${inAppBase}/api/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json', cookie: inAppCookie },
        body: JSON.stringify({ type: 'client-request', rpcId: `release-in-app-${++inAppRpcId}`, method, payload: { args } }),
        // live install 会真装包/重写 profile；15s 在负载下会假红（2026-11-03 实测 abort）。inspect 仍 15s。
        signal: AbortSignal.timeout(timeoutMs),
      })
      const body = await response.json()
      if (body?.result?.ok !== true) throw new Error(`${method}: ${JSON.stringify(body?.result?.error ?? body).slice(0, 400)}`)
      return body.result.value
    }
    const inspected = await inAppRpc('pluginManager/inspect', { spec: `file:${tarball}`, options: {} })
    check('应用内 inspect 接受 tarball', inspected?.status === 'accepted', JSON.stringify(inspected).slice(0, 120))
    const installed = await inAppRpc('pluginManager/installBundle', { spec: `file:${tarball}`, options: { requestId: 'release-in-app' } }, 60_000)
    check('应用内安装 application=applied（默认路径）', installed?.application === 'applied',
      JSON.stringify(installed?.error ?? installed?.application).slice(0, 240))
    const inAppManifest = JSON.parse(readFileSync(join(inAppDir, 'package.json'), 'utf8'))
    check('应用内安装进 dsh.profile.bundles',
      (inAppManifest?.dsh?.profile?.bundles ?? []).includes('dsh-company-pack'))
  } finally {
    await inApp.stop()
  }

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
  const createdResearch = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'worker-researcher' } })
  check('session/create 挂上 worker-researcher', createdResearch?.agentPreset === 'worker-researcher' || createdResearch?.preset === 'worker-researcher', JSON.stringify(createdResearch).slice(0, 120))
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
  const domainLedger = join(home, 'storages/company_run_bundle_ledger.json')
  await waitFor(() => existsSync(join(companyHome, '.dsh-company/bundle.json')) && existsSync(join(companyHome, '.dsh-company/kb/deliverables-index.json'))
      && existsSync(domainLedger), '首启落盘')
  const first = fingerprint(companyHome)
  // T5（FAQ 24 §8.1）：包目录只读——运行/升级不应在安装副本里新增 data/cache/日志。
  const packBefore = fingerprint(installedPack)
  const has = (rows, rel) => rows !== null && rows.some(row => row.startsWith(`${rel}:`))
  check('首启把公司状态落到 .dsh-company/（含状态/章程；不含根手册/模板）',
    ['.dsh-company/kb/company.md', '.dsh-company/kb/org.md', '.dsh-company/kb/owners.md', '.dsh-company/kb/motion-ledger.md', '.dsh-company/kb/ceo/CHARTER.md', '.dsh-company/kb/cmo/CHARTER.md']
      .every(rel => has(first, rel)),
    first === null ? `落点不存在：${companyHome}` : `共 ${String(first.length)} 件`)

  // 成品目录（2026-10-25，RFC installed-shape-self-sufficient）：新装也要有可读空目录，
  // 页签显示“还没有成品”，而不是“维护者运行 node tools/...”。
  const catalogFile = join(companyHome, '.dsh-company/kb/deliverables-index.json')
  const catalog = existsSync(catalogFile) ? JSON.parse(readFileSync(catalogFile, 'utf8')) : null
  check('首启生成成品目录（空目录，不依赖仓库工具）',
    catalog?.schema === 1 && catalog?.counts?.total === 0 && typeof catalog?.generatedAt === 'string',
    catalog === null ? `catalog 不存在：${catalogFile}` : JSON.stringify(catalog.counts))

  // 公司状态 身份（2026-11-01 v3）：首启写 `<workspace>/.dsh-company/bundle.json`（v3）；home 根不写。
  const manifestPath = join(companyHome, '.dsh-company/bundle.json')
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null
  check('首启写 workspace bundle.json（v3 身份）',
    manifest?.v === 3 && typeof manifest.id === 'string' && typeof manifest.createdAt === 'string'
      && manifest.pack?.name === 'dsh-company-pack' && manifest.runBundle?.schema === 1,
    manifest === null ? 'bundle.json 不存在' : JSON.stringify({ id: manifest.id, pack: manifest.pack }))
  check('home 根不再写 bundle.json', !existsSync(join(home, 'bundle.json')))
  const workspaceStoragePath = join(home, 'storages/workspace.json')
  const workspaceStorage = existsSync(workspaceStoragePath) ? JSON.parse(readFileSync(workspaceStoragePath, 'utf8')) : null
  const registeredPaths = Object.values(workspaceStorage?.tables?.workspaces ?? {}).map(row => row.path)
  check('boot 时把 workspace 登记进 DSH Workspace', registeredPaths.some(path => String(path).includes('release-company-workspace')),
    workspaceStorage === null ? 'storages/workspace.json 不存在' : registeredPaths.join(', '))
  // 干净底座：新安装不许带任何扩张数据（journal / 交付物 / 培养记录）。
  const historyRows = (first ?? []).filter(row => /^\.dsh-company\/kb\/[^/]+\/journal\/.+/.test(row)
    || /^\.dsh-company\/deliverables\/.+\/(final|meta)\.md/.test(row) || /^\.dsh-company\/cultivation\/records\/.+/.test(row))
  check('干净底座（无 journal / 交付物 / 培养记录）', historyRows.length === 0, `扩张数据 ${String(historyRows.length)} 件：${historyRows.slice(0, 3).join(', ')}`)
  // 2026-10-25：CHARTER 历史条目也必须为零——第一版漏的正是这一层（305 行）。
  const charterHistory = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales', 'cmo'].flatMap(role => {
    const path = join(companyHome, '.dsh-company/kb', role, 'CHARTER.md')
    if (!existsSync(path)) return [`缺少 .dsh-company/kb/${role}/CHARTER.md`]
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
  check('安装副本零写入（包目录不是数据目录）',
    JSON.stringify(packBefore) === JSON.stringify(fingerprint(installedPack)),
    `pack files=${String(packBefore?.length ?? -1)}`)
  check('第二次启动 bundle.json 字节不变（只创建、不覆盖）',
    manifestBefore !== null && readFileSync(manifestPath, 'utf8') === manifestBefore,
    manifestBefore === null ? 'bundle.json 不存在' : '字节一致')

  // 升级形状（2026-11-05）：既有盘缺新角色章程 ⇒ 下次启动补种，不是只在干净首启。
  rmSync(join(companyHome, '.dsh-company/kb/cmo/CHARTER.md'))
  await processes.close()
  const upgraded = processes.start(process.execPath, [cli, '--profile', PROFILE, '--', '--port', '0', '--no-open'], { timeoutMs: 180_000 })
  await upgraded.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, BOOT_TIMEOUT_MS)
  await waitFor(() => existsSync(join(companyHome, '.dsh-company/kb/cmo/CHARTER.md')), '升级启动补种 CMO 章程')
  check('既有盘升级：缺的 CMO 章程在下次启动补种', existsSync(join(companyHome, '.dsh-company/kb/cmo/CHARTER.md')))
  await processes.close()

  console.log('⑦ 卸载与重装（remove 只摘插件、数据全部留下）')
  const beforeRemoveManifest = readFileSync(manifestPath, 'utf8')
  await processes.close()
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'remove', 'dsh-company-pack'], { timeoutMs: 180_000 })
  const bundlesAfterRemove = (() => {
    try {
      return JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))?.dsh?.profile?.bundles ?? []
    } catch { return [] }
  })()
  check('plugin remove 后 bundles 不再含 dsh-company-pack', !bundlesAfterRemove.includes('dsh-company-pack'), `bundles = ${bundlesAfterRemove.join(', ')}`)
  check('安装副本已移除（node_modules/dsh-company-pack 不在）', !existsSync(join(installedPack, 'package.json')))
  check('公司状态保留（bundle.json 字节不变 + kb/company.md 在场）',
    existsSync(manifestPath) && readFileSync(manifestPath, 'utf8') === beforeRemoveManifest
      && existsSync(join(companyHome, '.dsh-company/kb/company.md')))
  await run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${tarball}`], { timeoutMs: 180_000 })
  const bundlesAfterReadd = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))?.dsh?.profile?.bundles ?? []
  check('重装后 bundles 含 dsh-company-pack', bundlesAfterReadd.includes('dsh-company-pack'), `bundles = ${bundlesAfterReadd.join(', ')}`)
  check('重装后公司状态未变（不覆盖用户数据）', readFileSync(manifestPath, 'utf8') === beforeRemoveManifest)
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

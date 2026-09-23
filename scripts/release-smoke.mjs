#!/usr/bin/env node
// 发布冒烟（R5a P4，认证档）：**真实安装形状**的端到端检查——
//   构建（tsc + tsdown）→ `npm pack` → 干净 profile 预置 → `dsh plugin add file:<tgz>` →
//   boot web → roster 五角色零 broken + session/create 挂载 + client 模块闭包 lint。
// 为什么必须是它（guides/60 §5 + FAQ 13 openclaw 教训）："源码 checkout 测试会掩盖依赖错误"——
//   dev profile 的 link: 安装**不算数**（符号链接直指源码，永不走 files/exports/peers 的
//   发布面）；只有 tarball 装进干净 profile 才是用户拿到的形状。
// 干净 profile 怎么来：dev harness home 下专用 profile 名 `release-check`，脚本**先删后建**
//   （预置 package.json/pnpm-workspace.yaml/.npmrc——initPhase 对已存在文件零改动，
//   预置发生在 plugin add 之前）。.npmrc 把 pnpm store/cache 钉在 repo 内（纪律 §11：
//   工具态先重定向进 gitignored 区再首次使用）；npm pack 的 cache 同理（npm_config_cache）。
// 分层（guides/60 §9.1）：认证档（起进程、要构建产物），不进 pnpm test；每轮一次。
// 用法：source dev/env.sh && node scripts/release-smoke.mjs [--keep]
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const KEEP = process.argv.includes('--keep')
const PACK_DIR = join(ROOT, 'packages/company-pack')
const PROFILE = 'release-check'
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
const BOOT_TIMEOUT_MS = 120_000

const home = process.env.DSH_HOME
if (home === undefined || home === '') {
  console.error('release-smoke: 需要 DSH_HOME（先 `source dev/env.sh`；双 home 纪律：别碰日用 ~/.dsh）')
  process.exit(2)
}
// ⚠ fail-loud：DSH_HOME 指向日用 home 时拒绝（deliverables-check 同款判据：DSH 的 coding
// 会话里 DSH_HOME 继承且带值 = 日用 home，"不设就报错"挡不住，guides/60 §6.5）。
if (resolve(home) === resolve(join(homedir(), '.dsh'))) {
  console.error(`release-smoke: DSH_HOME 指向日用 home（${join(homedir(), '.dsh')}）——拒绝执行。先 \`source dev/env.sh\`。`)
  process.exit(2)
}
const profileDir = join(home, 'profiles', PROFILE)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const run = (cmd, args, opts = {}) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8', cwd: ROOT, ...opts })
  if (result.status !== 0) {
    console.error(`── ${cmd} ${args.join(' ')} 失败（code ${String(result.status)}）──`)
    console.error(String(result.stdout ?? '').slice(-1500)); console.error(String(result.stderr ?? '').slice(-1500))
    process.exit(1)
  }
  return String(result.stdout ?? '')
}
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

// ── ① 构建：发布面从当前源码长出来（不是拿陈旧 lib/ 凑数）──
console.log('① 构建发布面（tsc + tsdown）')
run(process.execPath, ['./node_modules/typescript/bin/tsc', '-p', 'packages/company-pack/tsconfig.json'])
// tsdown 的 .bin 是 shell shim（不能直接喂 node）；真入口 = 从仓库根解析 tsdown 包的 dist/run.mjs。
const tsdownRun = join(dirname(createRequire(join(ROOT, 'package.json')).resolve('tsdown/package.json')), 'dist/run.mjs')
run(process.execPath, [tsdownRun], { cwd: PACK_DIR })

// ── ② npm pack：tarball 落临时目录；npm cache 重定向进 repo gitignored 区（§11）──
console.log('② npm pack')
const packTmp = join(ROOT, 'dev/harness-home/tmp/release-pack')
rmSync(packTmp, { recursive: true, force: true })
mkdirSync(packTmp, { recursive: true })
const packEnv = { ...process.env, npm_config_cache: join(ROOT, 'dev/harness-home/tmp/npm-cache') }
const tarball = join(packTmp, run('npm', ['pack', '--pack-destination', packTmp], { cwd: PACK_DIR, env: packEnv }).trim().split('\n').filter(Boolean).at(-1))
if (!existsSync(tarball)) { console.error(`release-smoke: npm pack 没产出 tarball（${tarball}）`); process.exit(1) }
const packManifest = JSON.parse(readFileSync(join(PACK_DIR, 'package.json'), 'utf8'))
console.log(`  tarball：${tarball.split('/').pop()}（${String(Math.round(Number(run('ls', ['-l', tarball]).split(/\s+/)[4] ?? 0) / 1024))} KB）`)

// ── ③ 干净 profile 预置（先删后建；initProfile 对已存在文件零改动 ⇒ 预置即生效）──
console.log(`③ 预置干净 profile（${PROFILE}）`)
rmSync(profileDir, { recursive: true, force: true })
mkdirSync(profileDir, { recursive: true })
// bundles 预置 web 模板形状（PROFILE_TEMPLATES.web = [dsh-base, dsh-web-app]）——自定义
// profile 名走 DEFAULT_PROFILE_BUNDLES（只有 dsh-base），起不了 web，所以必须自己写。
// patchReload: startup（冒烟 boot 一次即杀，不要 live watcher）。
writeFileSync(join(profileDir, 'package.json'), `${JSON.stringify({
  name: `dsh-profile-${PROFILE}`,
  private: true,
  dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'startup' } },
}, null, 2)}\n`, 'utf8')
// pnpm 设置镜像 vendor PROFILE_PNPM_WORKSPACE（app-boot/src/profile.ts）：hoisted 给
// out-of-tree 插件平铺 node_modules；autoInstallPeers: false = 插件 peers 不装，行解析
// 走安装锚兜底（这正是 peers 声明语义的实测前提）。
writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), `packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n`, 'utf8')
// §11：pnpm store/cache 先重定向进 repo gitignored 区再首次使用（~/Library 不许碰）。
writeFileSync(join(profileDir, '.npmrc'), `store-dir=${join(ROOT, '.pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`, 'utf8')

// ── ④ plugin add（真实安装形状：file: tarball → pnpm → reconcile bundles）──
console.log('④ dsh plugin add file:<tarball>')
// ⚠ `--profile` 挂在 plugin 子命令上（args.ts:192 requiredOption + rejectParentOptions——
//   给父级会红 "required option '--profile <name>' not specified"，实证一次）。
run('pnpm', ['dsh', 'plugin', '--profile', PROFILE, 'add', `file:${tarball}`])
const installedProfile = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
const bundles = installedProfile?.dsh?.profile?.bundles ?? []
check('plugin add 后 bundles 含 dsh-company-pack', bundles.includes('dsh-company-pack'), `bundles = ${bundles.join(', ')}`)
const installedPack = join(profileDir, 'node_modules/dsh-company-pack')
check('真实安装副本在场（node_modules/dsh-company-pack）', existsSync(join(installedPack, 'package.json')))
check('安装副本带 presets/（files 面真实）', existsSync(join(installedPack, 'presets', 'ceo')))
check('安装副本带 client 产物（lib/client.js）', existsSync(join(installedPack, 'lib', 'client.js')))
const installedManifest = JSON.parse(readFileSync(join(installedPack, 'package.json'), 'utf8'))
check('安装副本 peers 进 tarball（不精确钉死）', Object.keys(installedManifest.peerDependencies ?? {}).length >= 15 && (installedManifest.dependencies ?? undefined) === undefined, `${String(Object.keys(installedManifest.peerDependencies ?? {}).length)} 个 peer`)
check('安装副本带兼容矩阵', Array.isArray(installedManifest?.dsh?.compatibility?.dshReleases))

// ── ⑤ boot + RPC 冒烟（preset-smoke 断言形状，跑在发布组合上）──
console.log('⑤ boot web（发布组合冒烟）')
// ⚠ web 是子命令别名（拒父级 --profile，args.ts rejectParentOptions）；自定义 profile 走
//   默认命令 `dsh --profile X -- <app 参数>`——app 由组合里的 bundle 决定（实测打印 web banner）。
const child = spawn('pnpm', ['dsh', '--profile', PROFILE, '--', '--port', '0', '--no-open'], {
  cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
try {
  const banner = await new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk)
      const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (m !== null) resolveBanner({ port: Number(m[1]), token: m[2] })
    }
    child.stdout.on('data', onData); child.stderr.on('data', onData)
    child.on('exit', (code) => rejectBanner(new Error(`web 提前退出 code ${String(code)}\n${output.slice(-800)}`)))
    setTimeout(() => rejectBanner(new Error(`boot 超时\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS)
  })
  const base = `http://127.0.0.1:${String(banner.port)}`
  const cookie = (await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual' })).headers.getSetCookie()?.map(c => c.split(';')[0]).join('; ') ?? ''
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const response = await fetch(`${base}/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `release-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
    return body.result.value
  }
  // roster：五角色全在、零 broken
  const roster = await rpc('agentPresets/list', {})
  const presets = roster.presets ?? []
  for (const role of ROLES) {
    const row = presets.find(p => p.id === role)
    check(`roster 含 ${role}（零 broken）`, row !== undefined && row.broken === undefined,
      row === undefined ? '不在 roster' : (row.broken === undefined ? '' : String(row.broken).slice(0, 120)))
  }
  // 真入口：ceo 挂载（行 config 校验发生在挂载时——preset-smoke 的教训）
  const rehearsal = join(ROOT, 'dev/rehearsal-workspace')
  mkdirSync(rehearsal, { recursive: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'ceo' } })
  check('session/create 挂上 ceo', created?.agentPreset === 'ceo' || created?.preset === 'ceo', JSON.stringify(created).slice(0, 120))
  // client 模块闭包（lint 级）：本包 client 行进了浏览器模块表
  const html = await (await fetch(`${base}/`, { headers: { cookie } })).text()
  check('浏览器模块表含 dsh-company-pack/client.js', html.includes('dsh-company-pack/client.js') || html.includes('"dsh-company-pack"'))
} catch (error) {
  failures.push(`异常: ${error.message}`)
  console.log(`  FAIL 异常: ${error.message.split('\n')[0]}`)
} finally {
  child.kill('SIGTERM')
  await sleep(300)
  if (!KEEP) {
    rmSync(profileDir, { recursive: true, force: true })
    console.log('  （干净 profile 已回收；--keep 可保留排障）')
  } else console.log(`  （--keep：profile 保留 ${profileDir}）`)
}

console.log(failures.length === 0
  ? `\nrelease-smoke: ALL PASS（npm pack → 干净 profile → plugin add → 冒烟，真实安装形状 ✓）`
  : `\nrelease-smoke: ${String(failures.length)} FAILURE(S)\n  ${failures.join('\n  ')}`)
process.exit(failures.length === 0 ? 0 : 1)

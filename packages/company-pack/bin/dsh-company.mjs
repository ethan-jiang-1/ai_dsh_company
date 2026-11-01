#!/usr/bin/env node
/**
 * dsh-company：插件即产品的启动器（2026-11-01）。
 *
 * 形状：先解析/询问 workspace → 建/验 `company` profile → 装/修 pack → 写 seed consent →
 * 设 DSH_HOME/DSH_COMPANY_HOME → spawn `dsh --profile company`。
 *
 * 安全边界：
 * - 只在 profile 缺失时 `--from-default-profile web`；已有 profile 只验证，不 reset。
 * - 不猜 workspace；无 TTY 且无值 → 非零退出 + 两条命令。
 * - 不静默建目录；`--yes` 才建。
 * - seed 只写 consent，实际 seed 由 host 的 planBootstrap 做（唯一权威）。
 * - `--reset` 只删带 `.company-home` 标记的 home，不删 workspace。
 *
 * repo 形态：`pnpm company`（tools/company.mjs 转发）；安装形态：profile 的
 * `node_modules/.bin/dsh-company`（dsh plugin add 自动链出，2026-11-01 实测）。
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(import.meta.url)
const PACK_DIR = resolve(dirname(HERE), '..')
const REPO_ROOT = resolve(PACK_DIR, '../..')
const REPO_CLI = join(REPO_ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const IS_REPO = existsSync(REPO_CLI) && existsSync(join(REPO_ROOT, 'pnpm-workspace.yaml'))
const MARKER = '.company-home'
const PROFILE_DEFAULT = 'company'

const pack = JSON.parse(readFileSync(join(PACK_DIR, 'package.json'), 'utf8'))
const PACK_VERSION = typeof pack.version === 'string' ? pack.version : '0.0.0'

function fail(message) {
  process.stderr.write(`dsh-company: ${message}\n`)
  process.exit(2)
}

function info(message) {
  process.stdout.write(`dsh-company: ${message}\n`)
}

function usage() {
  console.log(`用法：dsh-company [选项]

  --workspace <dir>   公司 workspace（也可 DSH_COMPANY_HOME；缺省时按最近/询问）
  --home <dir>        产品 DSH_HOME（默认安装形态从 profile 推断；repo 形态 runtime/harness-home）
  --profile <name>    profile 名（默认 company）
  --port <n>          web 端口（默认 0 = 系统分配）
  --no-open           不自动打开浏览器
  --yes               非交互：建缺失 workspace / 确认 seed
  --print             只打印解析结果，不建、不启动
  --reset             删除带 .company-home 标记的 home（不删 workspace）
  --doctor            只读检查 home/profile/workspace/consent/manifest/身份备份
  --help              本帮助

退出码：2 = 用法/前置/拒绝；其他 = 子进程退出码。`)
}

function parseArgs(argv) {
  const out = { profile: PROFILE_DEFAULT, port: '0', noOpen: false, yes: false, reset: false, print: false, help: false, doctor: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') out.help = true
    else if (arg === '--yes' || arg === '-y') out.yes = true
    else if (arg === '--no-open') out.noOpen = true
    else if (arg === '--reset') out.reset = true
    else if (arg === '--print') out.print = true
    else if (arg === '--doctor' || arg === 'doctor') out.doctor = true
    else if (arg === '--home' || arg === '--workspace' || arg === '--profile' || arg === '--port') {
      const value = argv[i + 1]
      if (value === undefined || value.startsWith('--')) fail(`${arg} 需要一个值`)
      out[arg.slice(2)] = value
      i += 1
    } else if (arg.startsWith('--home=')) out.home = arg.slice('--home='.length)
    else if (arg.startsWith('--workspace=')) out.workspace = arg.slice('--workspace='.length)
    else if (arg.startsWith('--profile=')) out.profile = arg.slice('--profile='.length)
    else if (arg.startsWith('--port=')) out.port = arg.slice('--port='.length)
    else fail(`未知参数：${arg}（--help 看用法）`)
  }
  return out
}

function expandHome(path) {
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

function canonical(path) {
  const abs = resolve(expandHome(path))
  try { return realpathSync(abs) } catch { return abs }
}

async function prompt(question) {
  if (!process.stdin.isTTY) return undefined
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try { return await rl.question(question) } finally { rl.close() }
}

function packSpec() {
  return IS_REPO ? `link:${PACK_DIR}` : `file:${PACK_DIR}`
}

function dshCommand() {
  if (process.env.DSH_BIN !== undefined && process.env.DSH_BIN.trim() !== '') {
    return { command: process.env.DSH_BIN, prefix: [] }
  }
  if (IS_REPO) return { command: process.execPath, prefix: [REPO_CLI] }
  return { command: 'dsh', prefix: [] }
}

function runDsh(home, args, options = {}) {
  const { command, prefix } = dshCommand()
  return spawnSync(command, [...prefix, ...args], {
    env: { ...process.env, DSH_HOME: home },
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    timeout: options.timeout ?? 180_000,
  })
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return undefined }
}

function inferInstalled() {
  const match = /[/\\]profiles[/\\]([^/\\]+)[/\\]node_modules[/\\]dsh-company-pack[/\\]bin[/\\]dsh-company\.mjs$/.exec(HERE)
  if (match === null) return undefined
  const profileDir = resolve(dirname(HERE), '../../..')
  return { home: resolve(profileDir, '../..'), profile: match[1] }
}

function resolveHome(args, workspace) {
  if (args.home !== undefined) return canonical(args.home)
  const installed = inferInstalled()
  if (installed !== undefined) return installed.home
  if (process.env.DSH_HOME !== undefined && process.env.DSH_HOME.trim() !== '') return canonical(process.env.DSH_HOME)
  if (IS_REPO) return join(REPO_ROOT, 'runtime/harness-home')
  const slug = workspace === undefined ? 'company' : (basename(workspace).replace(/[^a-zA-Z0-9._-]+/g, '-') || 'company')
  return join(homedir(), '.dsh-company', slug)
}

function resolveWorkspace(args, home) {
  const explicit = args.workspace ?? process.env.DSH_COMPANY_HOME
  if (explicit !== undefined && explicit.trim() !== '') return canonical(explicit)
  const settings = readJson(join(home, 'company/settings.json'))
  if (settings !== undefined && typeof settings.workspace === 'string' && settings.workspace.trim() !== '') {
    return canonical(settings.workspace)
  }
  return undefined
}

function verifyProfile(home, profile) {
  const dir = join(home, 'profiles', profile)
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) return { dir, state: 'missing' }
  const pkg = readJson(manifest)
  const bundles = pkg?.dsh?.profile?.bundles
  if (!Array.isArray(bundles) || !bundles.includes('@deepseek-ai/dsh-base') || !bundles.includes('@deepseek-ai/dsh-web-app')) {
    fail(`已有 profile ${profile} 缺 dsh-base/dsh-web-app；不要在这个 profile 上 --from-default-profile。`
      + '换一个空 home，或先备份后重建 profile。')
  }
  return { dir, state: 'ready', bundles }
}

function ensureRegistrarPatch(profileDir) {
  // 登记 row 放 profile patch，而不是 pack bundle：pack bundle 会被 Client 组合测试加载，
  // 把 host-only 的 registrar 放进去会让 client tier 等一个不存在的 workspaceRegistry。
  const patchPath = join(profileDir, 'cordis.patch.yml')
  let text = ''
  try { text = readFileSync(patchPath, 'utf8') } catch { /* 缺失时按空处理 */ }
  if (text.includes('company-workspace-register')) return
  const meaningful = text.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'))
    .join('\n')
    .trim()
  if (meaningful === '' || meaningful === '[]') {
    writeFileSync(patchPath, `# dsh-company product profile patch (created by dsh-company)\n`
      + `# boot 时把 DSH_COMPANY_HOME 登记进 Workspace，让 Web 首屏自动选中目标盘。\n`
      + `- insert:\n`
      + `    - id: company-workspace-register\n`
      + `      name: 'dsh-company-pack/register-workspace'\n`)
    return
  }
  info('profile 已有自定义 cordis.patch.yml；未自动追加 workspace registrar（如首屏未自动选中，请手工加 company-workspace-register 行）')
}

function ensureProfile(home, profile) {
  mkdirSync(home, { recursive: true })
  if (!existsSync(join(home, MARKER))) {
    writeFileSync(join(home, MARKER), `${JSON.stringify({ v: 1, repo: IS_REPO ? REPO_ROOT : null, createdAt: new Date().toISOString() }, null, 2)}\n`)
  }
  let current = verifyProfile(home, profile)
  if (current.state === 'missing') {
    info(`建立 profile ${profile}（从 web template）`)
    const result = runDsh(home, ['--profile', profile, '--from-default-profile', 'web', '--dump-default-config'], { capture: true })
    if (result.status !== 0) {
      fail(`profile 建立失败（exit ${String(result.status)}）：${((result.stdout ?? '') + (result.stderr ?? '')).trim().slice(-800)}`)
    }
    current = verifyProfile(home, profile)
    if (current.state !== 'ready') fail(`profile 建立后校验失败：${current.dir}`)
  }
  const pkgPath = join(current.dir, 'package.json')
  const pkg = readJson(pkgPath) ?? {}
  const bundles = Array.isArray(pkg?.dsh?.profile?.bundles) ? pkg.dsh.profile.bundles : []
  if (!bundles.includes('dsh-company-pack')) {
    info(`安装 pack 到 profile ${profile}`)
    const result = runDsh(home, ['plugin', '--profile', profile, 'add', packSpec()], { capture: true })
    if (result.status !== 0) {
      fail(`pack 安装失败（exit ${String(result.status)}）：${((result.stdout ?? '') + (result.stderr ?? '')).trim().slice(-800)}`)
    }
  }
  ensureRegistrarPatch(current.dir)
  return current.dir
}

function skeletonSummary(packDir, workspace) {
  const skeleton = join(packDir, 'workspace')
  if (!existsSync(skeleton)) return { creates: 0, skips: 0, handbookTarget: 'AGENTS.md' }
  let creates = 0
  let skips = 0
  const handbookTarget = existsSync(join(workspace, 'AGENTS.md')) ? 'COMPANY.md' : 'AGENTS.md'
  const walk = (rel) => {
    for (const entry of readdirSync(join(skeleton, rel), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) { walk(child); continue }
      const target = child === 'AGENTS.md' ? handbookTarget : child
      if (existsSync(join(workspace, target))) skips += 1
      else creates += 1
    }
  }
  walk('')
  return { creates, skips, handbookTarget }
}

function writeConsent(workspace) {
  mkdirSync(join(workspace, '.dsh-company'), { recursive: true })
  const consent = { v: 1, packVersion: PACK_VERSION, workspace, consentedAt: new Date().toISOString() }
  writeFileSync(join(workspace, '.dsh-company/.seed-consent'), `${JSON.stringify(consent, null, 2)}\n`)
}

function launch(args, home, workspace, profileDir) {
  mkdirSync(join(home, 'company'), { recursive: true })
  writeFileSync(join(home, 'company/settings.json'), `${JSON.stringify({ v: 1, workspace, updatedAt: new Date().toISOString() }, null, 2)}\n`)
  const { command, prefix } = dshCommand()
  const env = { ...process.env, DSH_HOME: home, DSH_COMPANY_HOME: workspace, DSH_COMPANY_BOOTSTRAP: 'if-missing' }
  delete env.DSH_COMPANY_REBIND
  const child = spawn(command, [...prefix, '--profile', args.profile, '--', '--port', String(args.port), ...(args.noOpen ? ['--no-open'] : [])], {
    cwd: workspace,
    env,
    stdio: 'inherit',
  })
  info(`启动 profile=${args.profile} home=${home} workspace=${workspace}`)
  info(`profile dir = ${profileDir}`)
  child.on('exit', (code, signal) => {
    if (signal !== null) process.kill(process.pid, signal)
    else process.exitCode = code ?? 1
  })
}

async function run(args, home, workspace) {
  let target = workspace
  if (target === undefined) {
    if (!process.stdin.isTTY) {
      fail('未指定 workspace（无 TTY 可问）。用 --workspace <dir> 或先设 DSH_COMPANY_HOME。')
    }
    const answer = await prompt('Workspace path: ')
    if (typeof answer !== 'string' || answer.trim() === '') fail('未提供 workspace')
    target = canonical(answer.trim())
  }
  const canonicalHome = canonical(home)
  const requestedWorkspace = canonical(target)
  if (canonicalHome === requestedWorkspace) fail('home 与 workspace 不能是同一目录')
  // 一安装一 workspace：先判旧绑定，再决定是否创建新目录（拒绝时不留空盘）。
  const previous = readJson(join(canonicalHome, 'company/settings.json'))
  if (previous !== undefined && typeof previous.workspace === 'string' && previous.workspace.trim() !== '') {
    const previousWorkspace = canonical(previous.workspace)
    if (previousWorkspace !== requestedWorkspace && existsSync(join(previousWorkspace, '.dsh-company/bundle.json'))) {
      fail(`同一 home 已绑定 workspace：${previousWorkspace}\n`
        + `  换项目请用新的 --home（v1 一安装一 workspace；不静默把第二份盘塞进同一 home）。\n`
        + `  仍要切换：先备份并移走旧盘，或显式换新 home。`)
    }
  }
  if (!existsSync(target)) {
    if (args.yes) {
      mkdirSync(target, { recursive: true })
      info(`已创建 workspace ${target}`)
    } else {
      const answer = await prompt(`workspace 不存在：${target}\n创建？[y/N] `)
      if (!/^y(es)?$/i.test(String(answer ?? '').trim())) fail('未创建 workspace')
      mkdirSync(target, { recursive: true })
    }
  }
  if (!statSync(target).isDirectory()) fail(`workspace 不是目录：${target}`)
  const canonicalWorkspace = canonical(target)

  const profileDir = ensureProfile(canonicalHome, args.profile)
  const marker = existsSync(join(canonicalWorkspace, 'AGENTS.md'))
    || existsSync(join(canonicalWorkspace, 'COMPANY.md'))
    || existsSync(join(canonicalWorkspace, 'kb/company.md'))
  if (!marker) {
    const summary = skeletonSummary(PACK_DIR, canonicalWorkspace)
    info(`workspace 尚未初始化：将创建 ${summary.creates} 件、跳过 ${summary.skips} 件；手册目标 ${summary.handbookTarget}`)
    let confirmed = args.yes
    if (!confirmed) {
      const answer = await prompt('确认 seed？[y/N] ')
      confirmed = /^y(es)?$/i.test(String(answer ?? '').trim())
    }
    if (!confirmed) fail('未确认 seed')
    writeConsent(canonicalWorkspace)
  }
  launch(args, canonicalHome, canonicalWorkspace, profileDir)
}

function doctor(args) {
  const home = resolveHome(args, args.workspace)
  const workspace = resolveWorkspace(args, home)
  const checks = []
  const ok = (label, pass, detail = '') => checks.push({ label, pass, detail })
  ok('home 存在', existsSync(home), home)
  ok('.company-home 标记', existsSync(join(home, MARKER)), join(home, MARKER))
  const profileDir = join(home, 'profiles', args.profile)
  const pkg = readJson(join(profileDir, 'package.json'))
  const bundles = pkg?.dsh?.profile?.bundles
  ok('profile package.json', pkg !== undefined, join(profileDir, 'package.json'))
  ok('profile 含 base/web-app', Array.isArray(bundles)
    && bundles.includes('@deepseek-ai/dsh-base') && bundles.includes('@deepseek-ai/dsh-web-app'))
  ok('profile 含 dsh-company-pack', Array.isArray(bundles) && bundles.includes('dsh-company-pack'))
  ok('pack 入口文件', existsSync(join(profileDir, 'node_modules/dsh-company-pack/lib/index.js')))
  ok('workspace 已指定', workspace !== undefined, workspace ?? '未指定')
  if (workspace !== undefined) {
    ok('workspace 存在', existsSync(workspace), workspace)
    ok('workspace 是目录', (() => { try { return statSync(workspace).isDirectory() } catch { return false } })(), workspace)
    const consentPath = join(workspace, '.dsh-company/.seed-consent')
    const marker = existsSync(join(workspace, 'AGENTS.md')) || existsSync(join(workspace, 'COMPANY.md'))
      || existsSync(join(workspace, 'kb/company.md'))
    ok('seed 已同意或已有公司标记', existsSync(consentPath) || marker, existsSync(consentPath) ? consentPath : '缺 consent/标记')
    const manifestPath = join(workspace, '.dsh-company/bundle.json')
    const manifest = readJson(manifestPath)
    ok('bundle.json v2', manifest !== undefined && manifest.v === 2 && typeof manifest.id === 'string', manifestPath)
    if (manifest?.id !== undefined) {
      ok('home 身份备份', existsSync(join(home, 'company/identity', `${manifest.id}.json`)),
        join(home, 'company/identity', `${manifest.id}.json`))
    }
    const settings = readJson(join(home, 'company/settings.json'))
    ok('settings 指向当前 workspace', settings?.workspace === workspace || settings?.workspace === canonical(workspace),
      JSON.stringify(settings ?? null).slice(0, 160))
  }
  const lock = readJson(join(home, 'company-pack.lock'))
  if (lock !== undefined && typeof lock.pid === 'number') {
    let alive = true
    try { process.kill(lock.pid, 0) } catch { alive = false }
    ok('writer lease 未被僵尸占用', !alive, `pid ${String(lock.pid)} ${alive ? '仍存活' : '已退出/stale'}`)
  }
  let failed = 0
  for (const item of checks) {
    if (!item.pass) failed += 1
    console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.label}${item.detail === undefined || item.detail === '' ? '' : `（${item.detail}）`}`)
  }
  console.log(failed === 0 ? 'dsh-company doctor: ALL PASS' : `dsh-company doctor: ${failed} FAILURE(S)`)
  return failed === 0 ? 0 : 1
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) { usage(); return }
  if (!/^[0-9]+$/.test(String(args.port))) fail(`--port 无效：${args.port}`)
  if (args.reset) {
    const home = resolveHome(args, args.workspace)
    if (!existsSync(join(home, MARKER))) fail(`拒绝 --reset：${home} 没有 ${MARKER} 标记（不是本工具建的 home）`)
    rmSync(home, { recursive: true, force: true })
    info(`已删除 ${home}（workspace 未动）`)
    return
  }
  let workspace = resolveWorkspace(args, resolveHome(args, args.workspace))
  const home = resolveHome(args, workspace)
  if (args.doctor) {
    process.exitCode = doctor(args)
    return
  }
  if (args.print) {
    console.log(JSON.stringify({ home, profile: args.profile, workspace: workspace ?? null, pack: PACK_DIR, repo: IS_REPO }, null, 2))
    return
  }
  await run(args, home, workspace)
}

main().catch(error => fail(String(error?.stack ?? error)))

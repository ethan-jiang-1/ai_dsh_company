#!/usr/bin/env node
// 状态：常驻
// 何时跑：需要在隔离环境里从本仓库目录起一个公司实例时（不装进日用 profile；不改日用 home）。
// 用法：pnpm standalone [--home <dir>] [--workspace <dir>] [--port 0] [--no-open] [--reset] [--no-build] [--provision-only]
//
// 形状（RFC standalone-deployment）：仓库 + pinned vendor + 隔离 home + 自建 web profile + copy 骨架。
// 不是“把整个目录复制成二进制分发包”：构建产物仍按 checkout 产生；换机器按 bootstrap 重建。
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { plainNodeEnv } from './drivers/release-process.mjs'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? fallback : argv[index + 1]
}
const has = (name) => argv.includes(`--${name}`)
const fail = (message) => {
  console.error(`standalone: ${message}`)
  process.exit(2)
}

if (has('help') || has('h')) {
  console.log(`用法：pnpm standalone [选项]

  --home <dir>        隔离 DSH_HOME（默认 runtime/standalone/home）
  --workspace <dir>   公司盘（默认 <home>/company-workspace）
  --port <n>          web 端口（默认 0 = 系统分配）
  --no-open           不自动打开浏览器（默认打开；无头环境用这个）
  --provision-only    只建 home/profile（不启动、不落骨架）
  --no-build          跳过 pack 构建（假定 lib 已新鲜）
  --reset             删除带 .standalone-home 标记的隔离 home（不碰外部 workspace）
  --help              本帮助`)
  process.exit(0)
}
if (process.platform === 'win32') fail('本轮只支持 POSIX；Windows 不在支持面内（见 docs/guides/bootstrap.md）')

const home = resolve(arg('home', join(ROOT, 'runtime/standalone/home')))
const workspace = resolve(arg('workspace', join(home, 'company-workspace')))
const port = Number(arg('port', '0'))
if (!Number.isInteger(port) || port < 0 || port > 65535) fail(`--port 无效：${arg('port', '0')}`)

const marker = join(home, '.standalone-home')
if (has('reset')) {
  if (!existsSync(marker)) fail(`拒绝 --reset：${home} 没有 .standalone-home 标记（不是本工具建的 home）`)
  rmSync(home, { recursive: true, force: true })
  console.log(`standalone: 已删除 ${home}`)
  if (existsSync(workspace) && relative(home, workspace).startsWith('..')) {
    console.log(`standalone: 外部 workspace 保留：${workspace}（要删请手工确认）`)
  }
  process.exit(0)
}

// 防接管：已有 home 但没有本工具的标记 ⇒ 非空就拒绝。没有标记就无法证明是本工具建的，
// 后续 `--reset` 会整棵删除；宁可让用户换空目录，也不赌。
if (existsSync(home) && !existsSync(marker)) {
  const entries = readdirSync(home)
  if (entries.length > 0) {
    fail(`拒绝接管 ${home}：目录非空且没有 .standalone-home 标记；换一个空 --home，或先手工确认`)
  }
}

const nodeVersion = process.versions.node.split('.').map(Number)
const nodeOk = nodeVersion[0] > 22
  || (nodeVersion[0] === 22 && (nodeVersion[1] > 19 || (nodeVersion[1] === 19 && nodeVersion[2] >= 0)))
if (!nodeOk) fail(`Node ${process.versions.node} 低于 22.19；升级 Node 后重试`)
const pnpmVersion = spawnSync('pnpm', ['--version'], { encoding: 'utf8' })
if (pnpmVersion.status !== 0) fail('pnpm 不在 PATH（profile 的 plugin add 需要 pnpm）；先 corepack enable pnpm')

const cliDir = join(ROOT, 'vendor/dsh/apps/cli')
const cliManifest = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf8'))
const bin = cliManifest.bin?.dsh
if (typeof bin !== 'string' || !bin.startsWith('lib/') || !bin.endsWith('.js')) {
  fail('vendor CLI bin.dsh 不是 built lib/*.js；按 docs/guides/bootstrap.md 构建 vendor')
}
const cli = resolve(cliDir, bin)
for (const artifact of [cli, join(ROOT, 'vendor/dsh/apps/web/dist/index.html')]) {
  if (!existsSync(artifact)) fail(`缺少 vendor 产物：${artifact}；按 docs/guides/bootstrap.md 构建`)
}

/** 扫 vendor 的 dsh.client 包，找出没产 lib/client.js 的（首启会报 client bundles not found）。 */
function missingClientBundles() {
  const roots = []
  const walk = (dir, depth) => {
    if (depth > 3 || !existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || ['node_modules', 'lib', 'tests', 'src'].includes(entry.name)) continue
      const path = join(dir, entry.name)
      const manifest = join(path, 'package.json')
      if (existsSync(manifest)) {
        try {
          const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
          if (pkg?.dsh?.client !== undefined) roots.push([path, pkg.name])
        } catch { /* ignore */ }
      }
      walk(path, depth + 1)
    }
  }
  walk(join(ROOT, 'vendor/dsh/packages'), 0)
  return roots.filter(([path]) => !existsSync(join(path, 'lib/client.js'))).map(([, name]) => name)
}
const missingClients = missingClientBundles()
if (missingClients.length > 0) {
  fail(`vendor client bundle 缺失 ${String(missingClients.length)} 个（如 ${missingClients.slice(0, 3).join(', ')}）；`
    + '先在 vendor/dsh 跑 `../../node_modules/.bin/tsdown --env.DSH_BUILD_FACE client`（见 docs/guides/bootstrap.md）')
}

const tsdown = (() => {
  try {
    const require = createRequire(join(ROOT, 'package.json'))
    return join(require.resolve('tsdown/package.json'), '..', 'dist/run.mjs')
  } catch {
    return null
  }
})()

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', ...options })
  if (result.status !== 0) {
    fail(`${label} 失败（exit ${String(result.status)}）\n${(result.stdout ?? '') + (result.stderr ?? '')}`.trim())
  }
  return result
}

if (!has('no-build')) {
  console.log('standalone: 构建 pack（tsc -b + tsdown）…')
  run('pack typecheck', process.execPath, ['./node_modules/typescript/bin/tsc', '-b', 'packages/company-pack'])
  if (tsdown === null) fail('tsdown 不可解析；先 pnpm install')
  run('pack bundle', process.execPath, [tsdown], { cwd: join(ROOT, 'packages/company-pack') })
}
for (const artifact of [join(ROOT, 'packages/company-pack/lib/index.js'), join(ROOT, 'packages/company-pack/lib/client.js')]) {
  if (!existsSync(artifact)) fail(`pack 产物缺失：${artifact}；去掉 --no-build 重试`)
}

mkdirSync(home, { recursive: true })
// 标记先于 provision：首跑失败也留下“这是本工具建的 home”的证据，--reset 才能清理；
// 反过来说，标记只在本工具创建/接管的空目录上写，不会给别人的 DSH home 打标。
if (!existsSync(marker)) {
  writeFileSync(marker, `${JSON.stringify({ v: 1, repo: ROOT, createdAt: new Date().toISOString() })}\n`)
}
const profileDir = join(home, 'profiles/web')
mkdirSync(profileDir, { recursive: true })
const profileManifest = join(profileDir, 'package.json')
if (!existsSync(profileManifest)) {
  writeFileSync(profileManifest, `${JSON.stringify({
    name: 'dsh-profile-web', private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'startup' } },
  }, null, 2)}\n`)
}
if (!existsSync(join(profileDir, 'pnpm-workspace.yaml'))) {
  writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
}
if (!existsSync(join(profileDir, '.npmrc'))) {
  writeFileSync(join(profileDir, '.npmrc'), `store-dir=${join(home, 'pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`)
}

const env = plainNodeEnv({
  ...process.env,
  DSH_HOME: home,
  DSH_COMPANY_HOME: workspace,
  DSH_COMPANY_BOOTSTRAP: 'if-missing',
  npm_config_cache: join(home, 'cache/npm'),
  npm_config_store_dir: join(home, 'pnpm-store'),
  npm_config_verify_deps_before_run: 'false',
})
const packDir = join(ROOT, 'packages/company-pack')
const dependency = JSON.parse(readFileSync(profileManifest, 'utf8'))?.dependencies?.['dsh-company-pack']
const resolvedDependency = typeof dependency === 'string' && dependency.startsWith('link:')
  ? resolve(profileDir, dependency.slice('link:'.length))
  : null
if (resolvedDependency !== packDir) {
  console.log(`standalone: 把 profile 的 pack 依赖指回 ${relative(ROOT, packDir) || '.'}`)
  spawnSync(process.execPath, [cli, 'plugin', '--profile', 'web', 'remove', 'dsh-company-pack'], { cwd: ROOT, env, encoding: 'utf8' })
  run('plugin add link', process.execPath, [cli, 'plugin', '--profile', 'web', 'add', `link:${packDir}`], { env })
}
if (!env.DEEPSEEK_API_KEY && !existsSync(join(home, '.credentials.yaml'))) {
  console.warn('standalone: 未发现 DEEPSEEK_API_KEY / <home>/.credentials.yaml；角色会话需要时再配（boot 本身不需要 key）')
}

if (has('provision-only')) {
  console.log(`standalone: 已就绪\n  home      ${home}\n  workspace ${workspace}\n  profile   web\n  boot      pnpm standalone --home ${home} --workspace ${workspace}`)
  process.exit(0)
}

console.log(`standalone: 启动 web\n  home      ${home}\n  workspace ${workspace}\n  profile   web\n  命令      node ${relative(ROOT, cli)} --profile web -- --port ${String(port)}${has('no-open') ? ' --no-open' : ''}`)
const child = spawn(process.execPath, [cli, '--profile', 'web', '--', '--port', String(port), ...(has('no-open') ? ['--no-open'] : [])], {
  cwd: ROOT,
  env,
  stdio: 'inherit',
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})

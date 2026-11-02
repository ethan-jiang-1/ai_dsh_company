#!/usr/bin/env node
// 状态：常驻
// 何时跑：安装/启动/workspace 解析/公司状态布局改动后；发布前
// 成本：~1-2 分钟 keyless（临时 home + 真 tarball 安装 + 两次 boot；不调模型）
// 用法：node checks/smoke/company-entry-smoke.mjs [--keep]
//
// 证明形状（v3 起；版本随 package.json）：
// - 干净 home：CLI 建 company profile → `dsh plugin --profile company add <tarball>` → roster 含 pack；
// - 从 workspace cwd 直接 `dsh --profile company`（无 launcher/profile patch）→ banner；
// - `<workspace>/.dsh-company/bundle.json` v3；kb/ 状态在场；根目录无 AGENTS.md/templates/kb；
// - 无 `.seed-consent`；stderr 无 `did not activate`/`skipping profile bundle`；
// - 同一 home 顺序第二个 workspace 可启动（不再拒绝第二盘），各写自己的 `.dsh-company/`。
// 不证明：浏览器首屏/CEO 会话（client-load 另测）、真模型、Desktop 壳、跨 OS。

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const KEEP = process.argv.includes('--keep')
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK_VERSION = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')).version
const TARBALL = join(ROOT, '_dist', `dsh-company-pack-${PACK_VERSION}.tgz`)
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

if (!existsSync(CLI)) {
  console.error(`company-entry-smoke: vendor CLI 未构建：${CLI}（先按 docs/guides/bootstrap 构建）`)
  process.exit(2)
}
if (!existsSync(TARBALL)) {
  console.error(`company-entry-smoke: 缺 ${TARBALL}；先跑 node tools/export-dist.mjs（${PACK_VERSION}）`)
  process.exit(2)
}

const root = realpathSync(mkdtempSync(join(tmpdir(), 'company-entry-smoke-')))
const home = join(root, 'home')
const workspace = join(root, 'workspace-a')
const second = join(root, 'workspace-b')
const userHome = join(root, 'user')
const baseEnv = { ...process.env, HOME: userHome, DSH_HOME: home, DSH_COMPANY_BROWSER: 'off', DSH_COMPANY_HOME: '' }
let child

function runDsh(args, cwd = ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, env: baseEnv, encoding: 'utf8', timeout: 180_000,
  })
}

async function boot(workspaceDir) {
  const processChild = spawn(process.execPath, [CLI, '--profile', 'company', '--', '--port', '0', '--no-open'], {
    cwd: workspaceDir,
    env: { ...baseEnv, DSH_COMPANY_HOME: workspaceDir },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  processChild.stdout.on('data', chunk => { output += chunk })
  processChild.stderr.on('data', chunk => { output += chunk })
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline && !/dsh web:/.test(output) && processChild.exitCode === null) await sleep(200)
  return { child: processChild, output: () => output }
}

async function stop(handle) {
  if (handle === undefined) return
  try { process.kill(-handle.child.pid, 'SIGTERM') } catch { /* gone */ }
  await sleep(1200)
  try { process.kill(-handle.child.pid, 'SIGKILL') } catch { /* gone */ }
  await sleep(300)
}

try {
  mkdirSync(userHome, { recursive: true })
  mkdirSync(workspace, { recursive: true })
  mkdirSync(second, { recursive: true })

  console.log('① profile + 真 tarball 安装')
  const created = runDsh(['--profile', 'company', '--from-default-profile', 'web', '--dump-default-config'])
  check('company profile 从 web template 建立', created.status === 0, (created.stderr ?? '').slice(-300))
  const added = runDsh(['plugin', '--profile', 'company', 'add', `file:${TARBALL}`])
  check('plugin add exit 0', added.status === 0, (added.stderr ?? '').slice(-300))
  check('roster 含 dsh-company-pack', (() => {
    try {
      const pkg = JSON.parse(readFileSync(join(home, 'profiles/company/package.json'), 'utf8'))
      return (pkg?.dsh?.profile?.bundles ?? []).includes('dsh-company-pack')
    } catch { return false }
  })())
  check('安装副本含 content/ 无 bin/', existsSync(join(home, 'profiles/company/node_modules/dsh-company-pack/content/AGENTS.md'))
    && !existsSync(join(home, 'profiles/company/node_modules/dsh-company-pack/bin')))
  check('profile patch 不写 registrar', !readFileSync(join(home, 'profiles/company/cordis.patch.yml'), 'utf8').includes('company-workspace-register'))

  console.log('② 第一个 workspace：直接 dsh --profile company')
  let handle = await boot(workspace)
  let output = handle.output()
  check('banner 出现', /dsh web:/.test(output), output.slice(-600))
  check('stderr 无 did not activate / skipping bundle', !/did not activate|skipping profile bundle/.test(output), output.slice(-300))
  check('workspace 落 v3 bundle.json', (() => {
    try {
      const manifest = JSON.parse(readFileSync(join(workspace, '.dsh-company/bundle.json'), 'utf8'))
      return manifest.v === 3 && typeof manifest.id === 'string' && manifest.pack?.name === 'dsh-company-pack'
    } catch { return false }
  })())
  check('.dsh-company/kb 状态在场', existsSync(join(workspace, '.dsh-company/kb/company.md'))
    && existsSync(join(workspace, '.dsh-company/kb/org.md'))
    && existsSync(join(workspace, '.dsh-company/kb/owners.md')))
  check('根目录无 AGENTS.md/templates/kb', !existsSync(join(workspace, 'AGENTS.md'))
    && !existsSync(join(workspace, 'COMPANY.md'))
    && !existsSync(join(workspace, 'templates'))
    && !existsSync(join(workspace, 'kb')))
  check('无 seed-consent', !existsSync(join(workspace, '.dsh-company/.seed-consent')))
  check('home 根无 bundle', !existsSync(join(home, 'bundle.json')))
  check('workspace 已登记进 DSH Workspace', (() => {
    try {
      const storage = JSON.parse(readFileSync(join(home, 'storages/workspace.json'), 'utf8'))
      return Object.values(storage?.tables?.workspaces ?? {}).some(row => String(row.path) === workspace)
    } catch { return false }
  })())
  await stop(handle)

  console.log('③ 同一 home 顺序第二个 workspace（不拒绝第二盘）')
  handle = await boot(second)
  output = handle.output()
  check('第二个 workspace banner 出现', /dsh web:/.test(output), output.slice(-600))
  check('第二个 workspace 落自己的 v3 身份', (() => {
    try {
      const manifest = JSON.parse(readFileSync(join(second, '.dsh-company/bundle.json'), 'utf8'))
      return manifest.v === 3 && typeof manifest.id === 'string'
    } catch { return false }
  })())
  check('第二个 workspace 无拒绝文案', !/同一 home 已绑定|换项目请用新的/.test(output), output.slice(-300))
  await stop(handle)
} catch (error) {
  failures.push(String(error))
  console.error(`company-entry-smoke: ${String(error)}`)
} finally {
  if (child !== undefined) await stop({ child })
  if (!KEEP) rmSync(root, { recursive: true, force: true })
  else console.log(`company-entry-smoke: --keep 保留 ${root}`)
}

console.log(failures.length === 0 ? '\ncompany-entry-smoke: ALL PASS' : `\ncompany-entry-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

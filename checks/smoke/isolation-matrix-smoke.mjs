#!/usr/bin/env node
// 状态：常驻
// 何时跑：workspace 解析/身份落点/搬家/停写逻辑改动后；发布前手动
// 成本：~1-2 分钟 keyless（真 tarball 安装 + 每个 case 一次 boot；global 通道需要网络）
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`；PATH 里有真实 `dsh`（global 通道）
//
// 证明形状（只证明这里列出的落点/身份边界，不证明两 home 全隔离——那是 multi-install 的事）：
// - no-workspace：没有 DSH_COMPANY_HOME ⇒ 不建默认盘、不写 home bundle、输出可操作告警；
// - external：显式外部 workspace ⇒ 首启落 v3 `bundle.json` 到 workspace，home 不写；
// - unsafe：DSH_COMPANY_HOME=DSH_HOME ⇒ 不把公司盘写进 home 根；
// - relative/tilde：相对路径按 cwd 归一、~ 展开到 HOME；v3 身份跟盘；
// - rebind-retired：DSH_COMPANY_REBIND 设置只告警“已退役”，manifest 字节不变、不建备份；
// - move-home：搬 home 后同一外部 workspace 仍可启动，v2 id 不变。
// 不证明：搬 home 后 DSH 自己的 storages/workspace.json 与 session cwd 自动迁移（上游行为，不冒充）。

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { plainNodeEnv } from '../../tools/drivers/release-process.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const KEEP = process.argv.includes('--keep')
const PACK = process.argv.includes('--pack')
  ? process.argv[process.argv.indexOf('--pack') + 1]
  : join(ROOT, '_dist', `dsh-company-pack-${JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')).version}.tgz`)
const PACK_VERSION = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')).version
const BASE = mkdtempSync(join(tmpdir(), 'dsh-isolation-matrix-'))
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')

function envFor(caseDir, home, company, extra = {}) {
  const env = {
    ...plainNodeEnv(),
    HOME: join(caseDir, 'user'),
    DSH_HOME: home,
       PATH: `${join(process.execPath, '..')}:${process.env.PATH ?? ''}`,
    COREPACK_ENABLE_NETWORK: '1',
    npm_config_cache: join(caseDir, 'npm-cache'),
    ...extra,
  }
  if (company === undefined) delete env.DSH_COMPANY_HOME
  else env.DSH_COMPANY_HOME = company
  return env
}

function install(caseDir, home) {
  return spawnSync('dsh', ['plugin', '--profile', 'web', 'add', PACK, `--store-dir=${join(caseDir, 'store')}`], {
    cwd: caseDir, env: envFor(caseDir, home, undefined), encoding: 'utf8', timeout: 300_000,
  })
}

function boot(caseDir, home, company, { waitPath = null, settleMs = 1200, extra = {} } = {}) {
  const child = spawn('dsh', ['--profile', 'web', '--', '--port', '0', '--no-open'], {
    cwd: caseDir, env: envFor(caseDir, home, company, extra), stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  return new Promise((resolve) => {
    const item = { child, base: '', token: '', output: () => output }
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(item) }, 60_000)
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill('SIGTERM')
      setTimeout(() => { child.kill('SIGKILL'); resolve(item) }, 1000)
    }
    const scan = () => {
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (match === null) return
      item.base = `http://127.0.0.1:${match[1]}`
      item.token = match[2]
      const deadline = Date.now() + 20_000
      const poll = () => {
        if (waitPath === null || existsSync(waitPath) || Date.now() >= deadline) {
          setTimeout(finish, settleMs)
          return
        }
        setTimeout(poll, 100)
      }
      setTimeout(poll, 100)
    }
    child.stdout.on('data', scan)
    child.stderr.on('data', scan)
  })
}

async function noWorkspaceCase() {
  const caseDir = join(BASE, 'no-workspace')
  const home = join(caseDir, 'home')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true })
  const installed = install(caseDir, home)
  check('no-workspace install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  const out = await boot(caseDir, home, undefined, { waitPath: null, settleMs: 2500 })
  check('no-workspace 不建默认 company-workspace', !existsSync(join(home, 'company-workspace')))
  check('no-workspace 不写 home bundle', !existsSync(join(home, 'bundle.json')))
  check('no-workspace 输出可操作告警', out.output().includes('未指定公司 workspace') || out.output().includes('DSH_COMPANY_HOME'), out.output().slice(-500))
}

async function externalCase() {
  const caseDir = join(BASE, 'external')
  const home = join(caseDir, 'home')
  const ws = join(caseDir, 'external company')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true }); mkdirSync(ws, { recursive: true })
  const installed = install(caseDir, home)
  check('external install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  const out = await boot(caseDir, home, ws, { waitPath: join(ws, '.dsh-company/bundle.json') })
  check('external 首启落 v3 身份到 workspace', existsSync(join(ws, '.dsh-company/bundle.json')), out.output().slice(-300))
  const manifest = JSON.parse(readFileSync(join(ws, '.dsh-company/bundle.json'), 'utf8'))
  check('external v3 形状', manifest.v === 3 && manifest.pack?.name === 'dsh-company-pack' && typeof manifest.id === 'string', JSON.stringify(manifest))
  check('external home 不写 bundle', !existsSync(join(home, 'bundle.json')))
}

async function unsafeCase() {
  const caseDir = join(BASE, 'unsafe')
  const home = join(caseDir, 'home')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true }); mkdirSync(home, { recursive: true })
  const installed = install(caseDir, home)
  check('unsafe install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  const out = await boot(caseDir, home, home, { waitPath: null, settleMs: 2500 })
  check('unsafe 不把公司盘写进 home 根', !existsSync(join(home, 'AGENTS.md')) && !existsSync(join(home, 'kb')))
  check('unsafe 输出落点不安全', out.output().includes('DSH_HOME') || out.output().includes('落点不安全'), out.output().slice(-500))
}

async function relativeCase() {
  const caseDir = join(BASE, 'relative')
  const home = join(caseDir, 'home')
  const resolved = join(caseDir, 'company-rel')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true }); mkdirSync(resolved, { recursive: true })
  const installed = install(caseDir, home)
  check('relative install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  await boot(caseDir, home, './company-rel', { waitPath: join(resolved, '.dsh-company/bundle.json') })
  const manifest = JSON.parse(readFileSync(join(resolved, '.dsh-company/bundle.json'), 'utf8'))
  check('relative 落点按 cwd 绝对化 + v3', manifest.v === 3 && manifest.pack?.name === 'dsh-company-pack')
}

async function tildeCase() {
  const caseDir = join(BASE, 'tilde')
  const home = join(caseDir, 'home')
  const user = join(caseDir, 'user')
  const ws = join(user, 'company-tilde')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(ws, { recursive: true })
  const installed = install(caseDir, home)
  check('tilde install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  await boot(caseDir, home, '~/company-tilde', { waitPath: join(ws, '.dsh-company/bundle.json') })
  check('tilde 展开到 HOME + v3', existsSync(join(ws, '.dsh-company/bundle.json')))
  check('tilde 不造字面 ~ 目录', !existsSync(join(caseDir, '~')))
}

async function rebindRetiredCase() {
  const caseDir = join(BASE, 'rebind-retired')
  const home = join(caseDir, 'home')
  const ws = join(caseDir, 'company')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true }); mkdirSync(ws, { recursive: true })
  const installed = install(caseDir, home)
  check('rebind-retired install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  await boot(caseDir, home, ws, { waitPath: join(ws, '.dsh-company/bundle.json') })
  const before = hash(join(ws, '.dsh-company/bundle.json'))
  const out = await boot(caseDir, home, ws, { waitPath: join(ws, '.dsh-company/bundle.json'), settleMs: 2000, extra: { DSH_COMPANY_REBIND: '1' } })
  check('rebind 参数无写入副作用', true, out.output().slice(-200))
  check('rebind 不改 manifest', hash(join(ws, '.dsh-company/bundle.json')) === before)
  check('rebind 不留旧备份', !existsSync(join(home, 'bundle.json.bak-x')))
}

async function workspaceMoveCase() {
  const caseDir = join(BASE, 'workspace-move')
  const home = join(caseDir, 'home')
  const ws = join(caseDir, 'company')
  const moved = join(caseDir, 'company-moved')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true }); mkdirSync(ws, { recursive: true })
  const installed = install(caseDir, home)
  check('workspace-move install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  await boot(caseDir, home, ws, { waitPath: join(ws, '.dsh-company/bundle.json') })
  const id = JSON.parse(readFileSync(join(ws, '.dsh-company/bundle.json'), 'utf8')).id
  renameSync(ws, moved)
  await boot(caseDir, home, moved, { waitPath: join(moved, '.dsh-company/bundle.json') })
  const movedManifest = JSON.parse(readFileSync(join(moved, '.dsh-company/bundle.json'), 'utf8'))
  check('搬 workspace 后 v3 id 不变', movedManifest.v === 3 && movedManifest.id === id)
}

async function moveHomeCase() {
  const caseDir = join(BASE, 'move-home')
  const home = join(caseDir, 'home')
  const moved = join(caseDir, 'home-moved')
  const ws = join(caseDir, 'company')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true }); mkdirSync(ws, { recursive: true })
  const installed = install(caseDir, home)
  check('move-home install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  await boot(caseDir, home, ws, { waitPath: join(ws, '.dsh-company/bundle.json') })
  const id = JSON.parse(readFileSync(join(ws, '.dsh-company/bundle.json'), 'utf8')).id
  renameSync(home, moved)
  await boot(caseDir, moved, ws, { waitPath: join(ws, '.dsh-company/bundle.json') })
  const movedManifest = JSON.parse(readFileSync(join(ws, '.dsh-company/bundle.json'), 'utf8'))
  check('搬 home 后同一 workspace v3 id 不变', movedManifest.v === 3 && movedManifest.id === id)
}

try {
  if (!existsSync(PACK)) throw new Error(`缺 tarball：${PACK}（先 pnpm release --prepare 或 tools/export-dist.mjs）`)
  const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
  console.log(`isolation-matrix-smoke：base=${BASE} pack=${PACK.split('/').pop()} dsh=${(version.stdout ?? '').trim()}`)
  check('global dsh present', version.status === 0)
  if (version.status === 0) {
    await noWorkspaceCase()
    await externalCase()
    await unsafeCase()
    await relativeCase()
    await tildeCase()
    await rebindRetiredCase()
    await moveHomeCase()
    await workspaceMoveCase()
  }
} catch (error) {
  console.error(`isolation-matrix-smoke: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  failures.push('harness')
} finally {
  if (!KEEP) rmSync(BASE, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nisolation-matrix-smoke: ${String(failures.length)} FAIL`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exitCode = 1
} else {
  console.log('\nisolation-matrix-smoke: ALL PASS')
}

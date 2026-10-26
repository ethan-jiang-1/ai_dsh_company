#!/usr/bin/env node
// 状态：常驻
// 何时跑：bundle.json / DSH_COMPANY_HOME / 首启自举 / 换盘搬家逻辑改动后；发布前手动
// 成本：~1-2 分钟 keyless（真 tarball 安装 + 每个 case 一次或两次 boot；global 通道需要网络）
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`；PATH 里有真实 `dsh`（global 通道）
//
// 证明形状（只证明这里列出的三种落点/身份边界，不证明两 home 全隔离——那是 multi-install 的事）：
// - rebind：已有 bundle.json 时把 DSH_COMPANY_HOME 改到别处 ⇒ 启动输出明确警告、不建新盘、
//   bundle.json 字节不变、旧盘 sentinel 不动。防止一个 home 静默分裂成两个公司盘。
// - relative：DSH_COMPANY_HOME 是相对路径 ⇒ 按 cwd 归一成绝对路径落盘，bundle 记绝对路径。
// - tilde：DSH_COMPANY_HOME=~/... ⇒ 展开到 HOME，不在 cwd 造一个字面 `~` 目录。
// 不证明：搬家后 DSH 自己的 storages/workspace.json 与 session cwd（vendor 存绝对路径）会自动迁移；
//   那是上游行为，本 smoke 不冒充。profile reset/方法层、两 home 同 workspace 的并发写入另案。

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { tmpdir } from 'node:os'
import { plainNodeEnv } from '../../tools/drivers/release-process.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const KEEP = process.argv.includes('--keep')
const PACK = process.argv.includes('--pack')
  ? process.argv[process.argv.indexOf('--pack') + 1]
  : join(ROOT, '_dist', `dsh-company-pack-${JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')).version}.tgz`)
// 仓库外：profile 落在 repo 内时 Node 上行解析会看到 repo 的 vendor node_modules，污染通道结论。
const BASE = mkdtempSync(join(tmpdir(), 'dsh-isolation-matrix-'))
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')

function envFor(caseDir, home, company, extra = {}) {
  return {
    ...plainNodeEnv(),
    HOME: join(caseDir, 'user'),
    DSH_HOME: home,
    DSH_COMPANY_HOME: company,
    DSH_COMPANY_BOOTSTRAP: 'if-missing',
    PATH: `${join(process.execPath, '..')}:${process.env.PATH ?? ''}`,
    COREPACK_ENABLE_NETWORK: '1',
    npm_config_cache: join(caseDir, 'npm-cache'),
    ...extra,
  }
}

function install(caseDir, home) {
  return spawnSync('dsh', ['plugin', '--profile', 'web', 'add', PACK, `--store-dir=${join(caseDir, 'store')}`], {
    cwd: caseDir, env: envFor(caseDir, home, join(caseDir, 'company')), encoding: 'utf8', timeout: 300_000,
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
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(output) }, 60_000)
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill('SIGTERM')
      setTimeout(() => { child.kill('SIGKILL'); resolve(output) }, 1000)
    }
    const scan = () => {
      if (!/http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/.test(output)) return
      const deadline = Date.now() + 20_000
      const poll = () => {
        if (waitPath === null || existsSync(waitPath) || Date.now() >= deadline) {
          // banner 之后 host apply 还在跑；等目标落盘后再留一个落盘/告警窗口，断言仍以盘上事实为准。
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

async function rebindCase() {
  const caseDir = join(BASE, 'rebind')
  const home = join(caseDir, 'home')
  const oldWs = join(home, 'company-workspace')
  const otherWs = join(caseDir, 'other-company')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true })
  const installed = install(caseDir, home)
  check('rebind install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  const first = await boot(caseDir, home, oldWs, { waitPath: join(oldWs, 'kb/company.md') })
  check('rebind 首启落盘', existsSync(join(oldWs, 'kb/company.md')), first.slice(-200))
  writeFileSync(join(oldWs, 'kb/company.md'), '公司名: Rebind Sentinel\n')
  const before = hash(join(home, 'bundle.json'))
  const second = await boot(caseDir, home, otherWs, { waitPath: null, settleMs: 4000 })
  check('rebind 启动输出有明确警告', second.includes('bundle.json 记录的公司盘'), second.slice(-600))
  check('rebind 不建新公司盘', !existsSync(otherWs))
  check('rebind bundle.json 字节不变', hash(join(home, 'bundle.json')) === before)
  check('rebind 旧盘 sentinel 未动', readFileSync(join(oldWs, 'kb/company.md'), 'utf8').includes('Rebind Sentinel'))
}

async function relativeCase() {
  const caseDir = join(BASE, 'relative')
  const home = join(caseDir, 'home')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(join(caseDir, 'user'), { recursive: true })
  const installed = install(caseDir, home)
  check('relative install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  const resolved = join(caseDir, 'company-rel')
  await boot(caseDir, home, './company-rel', { waitPath: join(resolved, 'kb/company.md') })
  check('relative 落点按 cwd 绝对化', existsSync(join(resolved, 'kb/company.md')))
  const manifest = JSON.parse(readFileSync(join(home, 'bundle.json'), 'utf8'))
  check('relative bundle 记绝对路径', isAbsolute(manifest.workspace), manifest.workspace)
}

async function tildeCase() {
  const caseDir = join(BASE, 'tilde')
  const home = join(caseDir, 'home')
  const user = join(caseDir, 'user')
  rmSync(caseDir, { recursive: true, force: true }); mkdirSync(user, { recursive: true })
  const installed = install(caseDir, home)
  check('tilde install', installed.status === 0, (installed.stderr ?? '').slice(-240))
  if (installed.status !== 0) return
  await boot(caseDir, home, '~/company-tilde', { waitPath: join(user, 'company-tilde/kb/company.md') })
  check('tilde 展开到 HOME', existsSync(join(user, 'company-tilde/kb/company.md')))
  check('tilde 不造字面 ~ 目录', !existsSync(join(caseDir, '~')))
  const manifest = JSON.parse(readFileSync(join(home, 'bundle.json'), 'utf8'))
  check('tilde bundle 记展开后的绝对路径', manifest.workspace === join(user, 'company-tilde'), manifest.workspace)
}

try {
  if (!existsSync(PACK)) throw new Error(`缺 tarball：${PACK}（先 pnpm release --prepare 或 tools/export-dist.mjs）`)
  const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
  console.log(`isolation-matrix-smoke：base=${BASE} pack=${PACK.split('/').pop()} dsh=${(version.stdout ?? '').trim()}`)
  check('global dsh present', version.status === 0)
  if (version.status === 0) {
    await rebindCase()
    await relativeCase()
    await tildeCase()
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

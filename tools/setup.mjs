#!/usr/bin/env node
// 状态：常驻
// 何时跑：fresh clone 首跑、vendor pin 变后、或 `pnpm company` 报 “vendor CLI 未构建” 时。
// 成本：全量首次分钟级（取决于机器）；`--types` 只编类型；`--check` 秒级。
// 用法：pnpm setup [--check|--types] [--skip-install]
//
// 这是 docs/guides/bootstrap.md 的机器入口：vendor host/client、native、web 与 pack 构建
// 一条命令补齐。它不写 profile/patch，不改 vendor 源；vendor 仍只读。
// `--types` 只跑 vendor host/client 的 tsc 类型面（fresh-clone CI 的 pack 构建前置）。
// `--check` 只核对现有产物，不构建不改树。
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vendor = join(root, 'vendor/dsh')
const pack = join(root, 'packages/company-pack')
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const typesOnly = args.includes('--types')
const skipInstall = args.includes('--skip-install')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const tsc = join(root, 'node_modules/typescript/bin/tsc')
const tsdown = join(root, 'node_modules/.bin/tsdown')
const vendorTsc = join(vendor, 'node_modules/typescript/bin/tsc')
const vendorTsdown = join(vendor, 'node_modules/.bin/tsdown')
const tsx = join(vendor, 'node_modules/.bin/tsx')
const native = join(vendor, 'native/system')
const required = [
  ['vendor submodule', join(vendor, 'package.json')],
  ['root typeScript', tsc],
  ['root tsdown', tsdown],
  ['vendor deps', join(vendor, 'node_modules')],
  ['vendor typeScript', vendorTsc],
  ['vendor tsdown', vendorTsdown],
  ['vendor CLI', join(vendor, 'apps/cli/lib/bin.js')],
  ['vendor market validator', join(vendor, 'packages/util/plugin-market-index/lib/index.js')],
  ['vendor web dist', join(vendor, 'apps/web/dist/index.html')],
  ['pack host bundle', join(pack, 'lib/index.js')],
  ['pack client bundle', join(pack, 'lib/client.js')],
]

function run(label, command, argv = [], options = {}) {
  console.log(`setup: ${label}`)
  const result = spawnSync(command, argv, { cwd: root, stdio: 'inherit', ...options })
  if (result.error !== undefined) {
    console.error(`setup: ${label} 启动失败：${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`setup: ${label} 退出 ${String(result.status)}；修好后重跑 pnpm setup`)
    process.exit(result.status ?? 1)
  }
}

function check() {
  const missing = required.filter(([, path]) => !existsSync(path)).map(([label]) => label)
  if (missing.length > 0) {
    console.error(`setup: 缺 ${missing.join(' / ')}；跑 pnpm setup（或 pnpm setup --types）补齐`)
    process.exit(1)
  }
  console.log(`setup: 产物齐全（vendor CLI / client / web / pack）`)
}

function install() {
  if (skipInstall) return
  if (!existsSync(join(root, 'node_modules/.pnpm'))) {
    run('root install', pnpm, ['install', '--frozen-lockfile'])
  }
  // vendor 有自己的 lock（与根 lock 可解析到不同版本）；不跑它会拿根 node_modules 的
  // 新版本做类型检查，实测 playwright-core 1.61/1.63 冲突。每次 setup 都按 vendor lock 收敛。
  run('vendor install', pnpm, ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: vendor })
}

function types() {
  run('vendor host types', process.execPath, [vendorTsc, '-b', 'tsconfig.host.json'], { cwd: vendor })
  run('vendor client types', process.execPath, [vendorTsc, '-b', 'tsconfig.client.json'], { cwd: vendor })
}

function build() {
  types()
  run('vendor host runtime', vendorTsdown, ['--env.DSH_BUILD_FACE', 'host'], { cwd: vendor })
  run('vendor client runtime', vendorTsdown, ['--env.DSH_BUILD_FACE', 'client'], {
    cwd: vendor,
    env: { ...process.env, DSH_CLIENT_TITLE: 'DSH 梦之队' },
  })
  run('native system', tsx, ['scripts/build.ts'], { cwd: native })
  run('web frontend', pnpm, ['--filter', '@deepseek-ai/dsh-web-frontend', 'run', 'build'])
  run('pack types', process.execPath, [tsc, '-b', 'packages/company-pack'])
  run('pack runtime', tsdown, [], { cwd: pack })
}

if (!existsSync(join(vendor, 'package.json'))) {
  run('vendor submodule', 'git', ['submodule', 'update', '--init'])
}
checkOnly ? check() : (install(), typesOnly ? types() : build())

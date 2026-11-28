#!/usr/bin/env node
// 状态：常驻
// 何时跑：fresh clone 首跑、vendor pin 变后、或 `pnpm company` 报 “vendor CLI 未构建” 时。
// 成本：全量首次分钟级（取决于机器）；`--types` 只编类型；`--step <name>` 单步排障；`--check` 秒级。
// 用法：node tools/dev/setup.mjs [--check|--types|--step <install|types|vendor-runtime|native|web|pack>] [--skip-install]
//       （pnpm 有内置 `setup` 命令；带参数必须用 node 入口——pnpm 的 setup 会吞掉 --check）
//
// 这是 docs/guides/bootstrap.md 的机器入口：vendor host/client、native、web 与 pack 构建
// 一条命令补齐（vendor tsc 自动确保 >=6GB old-space 防默认 2GB 堆 OOM）。它不写 profile/patch，不改 vendor 源。
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeClientBuildFingerprint } from '../lib/core/client-bundle.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const vendor = join(root, 'vendor/dsh')
const pack = join(root, 'packages/company-pack')
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const typesOnly = args.includes('--types')
const skipInstall = args.includes('--skip-install')
const stepIdx = args.indexOf('--step')
const stepOnly = stepIdx >= 0 ? args[stepIdx + 1] : undefined
const STEPS = new Set(['install', 'types', 'vendor-runtime', 'native', 'web', 'pack'])
if (stepIdx >= 0 && !STEPS.has(stepOnly ?? '')) {
  console.error(`setup: 未知 --step ${JSON.stringify(stepOnly)}；可选：${[...STEPS].join(' | ')}`)
  process.exit(2)
}

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
  ['vendor typert artifacts', join(vendor, 'packages/api/job-controller/lib/typert.remote-client.d.ts')],
  ['vendor CLI', join(vendor, 'apps/cli/lib/bin.js')],
  ['vendor market validator', join(vendor, 'packages/util/plugin-market-index/lib/index.js')],
  ['vendor web dist', join(vendor, 'apps/web/dist/index.html')],
  ['pack host bundle', join(pack, 'lib/index.js')],
  ['pack client bundle', join(pack, 'lib/client.js')],
]

function vendorTscEnv() {
  const current = process.env.NODE_OPTIONS ?? ''
  if (/--max-old-space-size=/.test(current)) return process.env
  return { ...process.env, NODE_OPTIONS: [current, '--max-old-space-size=6144'].filter(Boolean).join(' ') }
}

function run(label, command, argv = [], options = {}) {
  console.log(`setup: ${label}`)
  const result = spawnSync(command, argv, { cwd: root, stdio: 'inherit', ...options })
  if (result.error !== undefined) {
    console.error(`setup: ${label} 启动失败：${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`setup: ${label} 退出 ${String(result.status)}；修好后重跑 node tools/dev/setup.mjs`)
    process.exit(result.status ?? 1)
  }
}

function check() {
  const missing = required.filter(([, path]) => !existsSync(path)).map(([label]) => label)
  if (missing.length > 0) {
    console.error(`setup: 缺 ${missing.join(' / ')}；跑 node tools/dev/setup.mjs（或 node tools/dev/setup.mjs --types）补齐`)
    process.exit(1)
  }
  console.log('setup: 产物齐全（vendor CLI / client / web / pack）')
}

function install() {
  if (skipInstall) return
  if (!existsSync(join(root, 'node_modules/.pnpm'))) {
    run('root install', pnpm, ['install', '--frozen-lockfile'])
  }
  run('vendor install', pnpm, ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: vendor })
}

function types() {
  const env = vendorTscEnv()
  run('vendor host types', process.execPath, [vendorTsc, '-b', 'tsconfig.host.json'], { cwd: vendor, env })
  run('vendor typert artifacts', tsx, ['scripts/generate-typert.ts'], { cwd: vendor })
  run('vendor client types', process.execPath, [vendorTsc, '-b', 'tsconfig.client.json'], { cwd: vendor, env })
}

function vendorRuntime() {
  run('vendor host runtime', vendorTsdown, ['--env.DSH_BUILD_FACE', 'host'], { cwd: vendor })
  run('vendor client runtime', vendorTsdown, ['--env.DSH_BUILD_FACE', 'client'], {
    cwd: vendor,
    env: { ...process.env, DSH_CLIENT_TITLE: 'DSH 梦之队' },
  })
}

function nativeSystem() {
  run('native system', tsx, ['scripts/build.ts'], { cwd: native })
}

function webFrontend() {
  run('web frontend', pnpm, ['--filter', '@deepseek-ai/dsh-web-frontend', 'run', 'build'], {
    env: { ...process.env, DSH_CLIENT_TITLE: 'DSH 梦之队' },
  })
}

function packBuild() {
  run('pack types', process.execPath, [tsc, '-b', 'packages/company-pack'])
  run('pack runtime', tsdown, [], { cwd: pack })
  writeClientBuildFingerprint(root)
}

function build() {
  types()
  vendorRuntime()
  nativeSystem()
  webFrontend()
  packBuild()
}

if (!existsSync(join(vendor, 'package.json'))) {
  run('vendor submodule', 'git', ['submodule', 'update', '--init'])
}
if (checkOnly) {
  check()
} else if (stepOnly !== undefined) {
  if (stepOnly === 'install') install()
  else if (stepOnly === 'types') types()
  else if (stepOnly === 'vendor-runtime') vendorRuntime()
  else if (stepOnly === 'native') nativeSystem()
  else if (stepOnly === 'web') webFrontend()
  else if (stepOnly === 'pack') packBuild()
} else {
  install()
  typesOnly ? types() : build()
}

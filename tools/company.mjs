#!/usr/bin/env node
// 状态：常驻（repo dev-only）
// 何时跑：维护者要在 dev workspace 起一个 `company` profile 看产品形状时。
// 用法：pnpm company [--port <n>] [--no-open] [--home <DSH_HOME>] [--workspace <dir>]
//
// 这**不是**产品入口，也不进 tarball：产品入口是 `dsh --profile company`。
// 本脚本只做三件事：定位 dev workspace、设 DSH_HOME/DSH_COMPANY_HOME、exec vendor CLI。
// 不建 profile、不装 pack、不写 profile patch、不问 workspace。
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(import.meta.url)
const root = resolve(dirname(here), '..')
const args = process.argv.slice(2)
const valueOf = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`用法：pnpm company [--port <n>] [--no-open] [--home <DSH_HOME>] [--workspace <dir>]

dev-only：exec \`dsh --profile company\`。产品安装/启动见 README 与 _dist 手册；
本脚本不建 profile、不装 pack、不写 profile patch、不问 workspace。`)
  process.exit(0)
}
const home = resolve(valueOf('--home') ?? process.env.DSH_HOME ?? join(root, 'runtime/harness-home'))
const workspace = resolve(valueOf('--workspace') ?? join(root, 'company-workspace'))
if (!existsSync(workspace)) {
  console.error(`company(dev): workspace 不存在：${workspace}；先 pnpm bundle:init`)
  process.exit(2)
}
const cli = join(root, 'vendor/dsh/apps/cli/lib/bin.js')
if (!existsSync(cli)) {
  console.error('company(dev): vendor CLI 未构建；先按 docs/guides/bootstrap 构建 vendor')
  process.exit(2)
}
const passthrough = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--home' || args[i] === '--workspace') { i += 1; continue }
  passthrough.push(args[i])
}
const result = spawnSync(process.execPath, [cli, '--profile', 'company', '--', ...passthrough], {
  cwd: workspace,
  env: { ...process.env, DSH_HOME: home, DSH_COMPANY_HOME: workspace },
  stdio: 'inherit',
})
process.exit(result.status ?? 1)

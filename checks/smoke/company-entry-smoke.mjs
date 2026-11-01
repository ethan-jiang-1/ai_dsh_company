#!/usr/bin/env node
// 状态：常驻
// 何时跑：启动器/profile 建/装/workspace 解析/seed consent/一 home 一 workspace 改动后；发布前
// 成本：~1-2 分钟 keyless（临时 home + 真 profile 建/装 + 一次 boot；不调模型）
// 用法：node checks/smoke/company-entry-smoke.mjs [--keep]
//
// 证明形状：`pnpm company` 等价入口（bin 启动器）在干净 HOME 下：
// - 建 company profile（base + web-app + pack）、装 pack、写 seed consent/settings；
// - workspace 落 v2 `bundle.json`，home 根不写 bundle；
// - boot 出 banner，workspace 登记进 DSH Workspace；
// - 同一 home 再传第二个 workspace ⇒ 拒绝（v1 一安装一 workspace）。
// 不证明：浏览器首屏/CEO 会话（client-load 另测）、真模型、跨 OS。

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const KEEP = process.argv.includes('--keep')
const BIN = join(ROOT, 'packages/company-pack/bin/dsh-company.mjs')
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const root = realpathSync(mkdtempSync(join(tmpdir(), 'company-entry-smoke-')))
const home = join(root, 'home')
const workspace = join(root, 'company-workspace')
const secondWorkspace = join(root, 'second-workspace')
const userHome = join(root, 'user')
let child

try {
  mkdirSync(userHome, { recursive: true })
  console.log('① 启动器：干净 home + workspace')
  child = spawn(process.execPath, [BIN, '--home', home, '--workspace', workspace, '--yes', '--no-open', '--port', '0'], {
    env: { ...process.env, HOME: userHome, DSH_COMPANY_BROWSER: 'off' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline && !/dsh web:/.test(output)) await sleep(200)
  check('启动器打出 dsh web banner', /dsh web:/.test(output), output.slice(-600))
  const bundleDeadline = Date.now() + 15_000
  while (Date.now() < bundleDeadline && !existsSync(join(workspace, '.dsh-company/bundle.json'))) await sleep(100)
  check('profile bundles 含 base/web-app/pack',
    (() => {
      try {
        const pkg = JSON.parse(readFileSync(join(home, 'profiles/company/package.json'), 'utf8'))
        const bundles = pkg?.dsh?.profile?.bundles ?? []
        return ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-company-pack'].every(id => bundles.includes(id))
      } catch { return false }
    })())
  check('workspace 落 v2 bundle.json',
    (() => {
      try {
        const manifest = JSON.parse(readFileSync(join(workspace, '.dsh-company/bundle.json'), 'utf8'))
        return manifest.v === 2 && manifest.workspace === undefined && typeof manifest.id === 'string'
      } catch { return false }
    })(), workspace)
  check('home 根不写 bundle', !existsSync(join(home, 'bundle.json')))
  check('seed consent 在场', existsSync(join(workspace, '.dsh-company/.seed-consent')))
  check('settings 记录 workspace', (() => {
    try { return JSON.parse(readFileSync(join(home, 'company/settings.json'), 'utf8')).workspace === workspace } catch { return false }
  })())
  check('workspace 已登记进 DSH Workspace', (() => {
    try {
      const storage = JSON.parse(readFileSync(join(home, 'storages/workspace.json'), 'utf8'))
      return Object.values(storage?.tables?.workspaces ?? {}).some(row => String(row.path).includes('company-workspace'))
    } catch { return false }
  })())
  check('registrar profile patch 在场', readFileSync(join(home, 'profiles/company/cordis.patch.yml'), 'utf8').includes('company-workspace-register'))

  try { process.kill(-child.pid, 'SIGTERM') } catch { /* gone */ }
  await sleep(1200)
  try { process.kill(-child.pid, 'SIGKILL') } catch { /* gone */ }
  await sleep(500)

  const doctor = spawnSync(process.execPath, [BIN, '--doctor', '--home', home, '--workspace', workspace], {
    env: { ...process.env, HOME: userHome, DSH_COMPANY_BROWSER: 'off' }, encoding: 'utf8', timeout: 60_000,
  })
  check('doctor 只读检查全绿', doctor.status === 0, `${doctor.stdout ?? ''}${doctor.stderr ?? ''}`.slice(-500))

  console.log('② 同一 home 第二 workspace ⇒ 拒绝')
  const second = spawnSync(process.execPath, [BIN, '--home', home, '--workspace', secondWorkspace, '--yes', '--no-open'], {
    env: { ...process.env, HOME: userHome, DSH_COMPANY_BROWSER: 'off' }, encoding: 'utf8', timeout: 60_000,
  })
  check('第二 workspace 退出码 2', second.status === 2, `exit=${String(second.status)}`)
  check('第二 workspace 拒绝理由可读', /同一 home 已绑定/.test(second.stderr ?? ''), (second.stderr ?? '').slice(-300))
  check('第二 workspace 未被创建', !existsSync(secondWorkspace))
} catch (error) {
  failures.push(String(error))
  console.error(`company-entry-smoke: ${String(error)}`)
} finally {
  if (child !== undefined) {
    try { process.kill(-child.pid, 'SIGTERM') } catch { try { child.kill('SIGTERM') } catch { /* gone */ } }
    await sleep(500)
    try { process.kill(-child.pid, 'SIGKILL') } catch { /* gone */ }
  }
  if (!KEEP) rmSync(root, { recursive: true, force: true })
  else console.log(`company-entry-smoke: --keep 保留 ${root}`)
}

console.log(failures.length === 0 ? '\ncompany-entry-smoke: ALL PASS' : `\ncompany-entry-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

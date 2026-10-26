#!/usr/bin/env node
// 状态：常驻
// 何时跑：preset/browser 行、安装通道、DSH 版本窗口、roster 装配改动后；发布前手动跑 --channel all
// 成本：~2-4 分钟 keyless（每个 case 一次真装 + 一次 boot + 五角色 session/create）；global 需要网络
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`；global 通道要求 PATH 里有真实 `dsh`；
//       --with-browser 会从 npm 安装两个 browser 包（仅 global；网络）
//
// 证明形状（唯一证明边界：这是“真实启动器通道”的 roster/会话面，不是浏览器 UI 交互）：
// - vendor：vendor built CLI + DSH_COMPANY_BROWSER=on（vendor 安装侧有 browser 两包）⇒ 五角色零 broken。
// - global-off：真实全局 dsh + DSH_COMPANY_BROWSER=off + 无 browser 两包 ⇒ 五角色零 broken、五会话可建。
//   —— 这是 2026-10-26 P0 的回归线：npm 发布的 DSH meta package 不含 browser 两包，
//      旧 pack 的五个角色会全部 broken；条件禁用后应绿。
// - global-auto：全局 dsh + 不设 flag + 无 browser 包 ⇒ 自动禁用，五角色零 broken。
// - global-auto-browser（--with-browser）：把两个 browser 包装进 profile ⇒ 自动启用，五角色零 broken。
// 不证明：浏览器页签交互、真模型、Windows/容器、registry 发布。

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { plainNodeEnv } from '../../tools/drivers/release-process.mjs'

const KEEP = process.argv.includes('--keep')
const CHANNEL = process.argv.includes('--channel') ? process.argv[process.argv.indexOf('--channel') + 1] : 'vendor'
const BROWSER = process.argv.includes('--browser') ? process.argv[process.argv.indexOf('--browser') + 1] : 'auto'
const WITH_BROWSER = process.argv.includes('--with-browser')
const PACK = process.argv.includes('--pack')
  ? process.argv[process.argv.indexOf('--pack') + 1]
  : join(ROOT, '_dist', `dsh-company-pack-${JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')).version}.tgz`)
// 必须在仓库外：repo 根 node_modules 里有 vendor 的 browser 两包，profile 落在 repo 内时
// Node 的上行解析会把它们“变出来”，全局通道的缺包 bug 就被遮住了（2026-10-26 实测）。
const BASE = mkdtempSync(join(tmpdir(), 'dsh-channel-matrix-'))
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
const failures = []
const active = new Set()

const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const stop = (item) => new Promise((done) => {
  active.delete(item.child)
  if (item.child.exitCode !== null) return done()
  item.child.once('exit', done)
  item.child.kill('SIGTERM')
  setTimeout(() => { item.child.kill('SIGKILL') }, 3000)
})
const stopAll = async () => { await Promise.all([...active].map(item => stop(item))) }

/** A launcher channel: the executable and the args before `plugin` / the app args. */
function channelOf(name) {
  if (name === 'global') return { command: 'dsh', prefix: [] }
  if (name === 'vendor') return { command: process.execPath, prefix: [CLI] }
  throw new Error(`unknown channel ${JSON.stringify(name)}`)
}

function envFor(name, base, browser) {
  const env = {
    ...plainNodeEnv(),
    HOME: join(base, 'user'),
    DSH_HOME: join(base, 'home'),
    DSH_COMPANY_HOME: join(base, 'company'),
    DSH_COMPANY_BOOTSTRAP: 'if-missing',
    npm_config_cache: join(base, 'npm-cache'),
    npm_config_store_dir: join(base, 'store'),
    COREPACK_ENABLE_NETWORK: '1',
  }
  // 继承的 dev 值会污染 auto/off；只有显式 on/off 才写回。
  delete env.DSH_COMPANY_BROWSER
  if (browser === 'on' || browser === 'off') env.DSH_COMPANY_BROWSER = browser
  if (name === 'global') {
    // global dsh 的安装锚在全局包；HOME 仍用 lab，避免读用户 ~/.dsh（DSH_HOME 已覆盖，防御性）。
    env.PATH = `${dirname(process.execPath)}:${env.PATH ?? ''}`
  } else {
    env.PATH = `${dirname(process.execPath)}:${env.PATH ?? ''}`
  }
  return env
}

function install(name, base, browser) {
  const { command, prefix } = channelOf(name)
  const result = spawnSync(command, [
    ...prefix, 'plugin', '--profile', 'web', 'add', `file:${PACK}`, `--store-dir=${join(base, 'store')}`,
  ], { cwd: base, env: envFor(name, base, browser), encoding: 'utf8', timeout: 300_000 })
  return result
}

function installBrowser(name, base, browser) {
  const { command, prefix } = channelOf(name)
  const version = spawnSync(command, [...prefix, '--version'], { env: envFor(name, base, browser), encoding: 'utf8' }).stdout.trim()
  if (!/^\d+\.\d+\.\d+/.test(version)) throw new Error(`cannot read ${name} dsh version: ${JSON.stringify(version)}`)
  const result = spawnSync(command, [
    ...prefix, 'plugin', '--profile', 'web', 'add',
    `@deepseek-ai/dsh-browser-use@${version}`,
    `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp@${version}`,
    `--store-dir=${join(base, 'store')}`,
  ], { cwd: base, env: envFor(name, base, browser), encoding: 'utf8', timeout: 300_000 })
  return { result, version }
}

function boot(name, base, browser) {
  const { command, prefix } = channelOf(name)
  const child = spawn(command, [...prefix, '--profile', 'web', '--', '--port', '0', '--no-open'], {
    cwd: base, env: envFor(name, base, browser), stdio: ['ignore', 'pipe', 'pipe'],
  })
  const item = { child, base: '', token: '', output: () => output }
  active.add(item)
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      active.delete(item)
      reject(new Error(`boot timeout\n${output.slice(-3000)}`))
    }, 90_000)
    const scan = () => {
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (match === null) return
      clearTimeout(timer)
      item.base = `http://127.0.0.1:${match[1]}`
      item.token = match[2]
      resolve(item)
    }
    child.stdout.on('data', scan)
    child.stderr.on('data', scan)
    child.once('exit', (code) => {
      clearTimeout(timer)
      active.delete(item)
      reject(new Error(`boot exited ${String(code)}\n${output.slice(-3000)}`))
    })
  })
}

async function assertRoster(name, instance, base) {
  const cookie = await companyCookie({ fetch: globalThis.fetch, base: instance.base, token: instance.token })
  const rpc = companyRpc({ fetch: globalThis.fetch, base: instance.base, cookie, prefix: 'ch-', dumpBodyOnError: true })
  const list = await rpc('agentPresets/list', {})
  for (const id of ROLES) {
    const preset = list.presets?.find(candidate => candidate.id === id)
    check(`${name} roster ${id}`, preset !== undefined, preset === undefined ? 'missing' : '')
    if (preset === undefined) continue
    check(`${name} ${id} not broken`, preset.broken === undefined || preset.broken === '', preset.broken ?? '')
  }
  for (const id of ROLES) {
    try {
      const created = await rpc('session/create', { request: { cwd: join(base, 'company'), agentPreset: id } })
      check(`${name} session ${id}`, created?.agentPreset === id, created?.agentPreset ?? 'no agentPreset')
    } catch (error) {
      check(`${name} session ${id}`, false, error.message.replace(/\n/g, ' | ').slice(0, 240))
    }
  }
}

async function runCase(name, channel, browser) {
  const base = join(BASE, name)
  rmSync(base, { recursive: true, force: true })
  mkdirSync(join(base, 'user'), { recursive: true })
  const installResult = install(channel, base, browser)
  check(`${name} install`, installResult.status === 0, (installResult.stderr ?? '').slice(-300))
  if (installResult.status !== 0) return
  if (WITH_BROWSER && channel === 'global') {
    const { result, version } = installBrowser(channel, base, browser)
    check(`${name} browser packages ${version}`, result.status === 0, (result.stderr ?? '').slice(-300))
    if (result.status !== 0) return
  }
  const instance = await boot(channel, base, browser)
  try {
    await assertRoster(name, instance, base)
  } finally {
    await stop(instance)
  }
}

try {
  if (!existsSync(PACK)) throw new Error(`缺 tarball：${PACK}（先 pnpm release --prepare 或 tools/export-dist.mjs）`)
  console.log(`channel-matrix-smoke：base=${BASE} pack=${PACK.split('/').pop()} channel=${CHANNEL} browser=${BROWSER}${WITH_BROWSER ? ' +with-browser' : ''}`)
  const channels = CHANNEL === 'all' ? ['vendor', 'global'] : [CHANNEL]
  for (const channel of channels) {
    console.log(`\n== ${channel} ==`)
    if (channel === 'global') {
      const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
      check('global dsh present', version.status === 0, (version.stdout ?? '').trim())
      if (version.status !== 0) continue
      if (BROWSER === 'auto') {
        await runCase('global-auto', 'global', 'auto')
        if (WITH_BROWSER) await runCase('global-auto-browser', 'global', 'auto')
      } else {
        await runCase(`global-${BROWSER}`, 'global', BROWSER)
        if (WITH_BROWSER) await runCase(`global-${BROWSER}-browser`, 'global', BROWSER)
      }
    } else {
      await runCase(`vendor-${BROWSER}`, 'vendor', BROWSER)
    }
  }
} catch (error) {
  console.error(`channel-matrix-smoke: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  failures.push('harness')
} finally {
  await stopAll()
  if (!KEEP) rmSync(BASE, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nchannel-matrix-smoke: ${String(failures.length)} FAIL`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exitCode = 1
} else {
  console.log('\nchannel-matrix-smoke: ALL PASS')
}

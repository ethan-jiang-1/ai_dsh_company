#!/usr/bin/env node
// 状态：常驻
// 认证档（不进 pnpm test）：目录独立启动形状——隔离 home、自建 profile、copy 骨架、boot/RPC、relink、reset。
// 何时跑：standalone 入口、run/env.sh、profile 修复、workspace copy 改动后；发布前。
// 用法：node checks/smoke/standalone-smoke.mjs [--keep]
//
// 证明边界：干净 HOME + 干净 home + 当前 repo；不证明真容器/跨 OS/离线预构建。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { plainNodeEnv, releaseProcesses } from '../../tools/drivers/release-process.mjs'
import { COMPANY_ROLE_IDS, COMPANY_SUPPORT_PRESET_IDS } from '../../tools/lib/company-roles.mjs'

const KEEP = process.argv.includes('--keep')
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const BOOT_TIMEOUT_MS = 180_000
const ROLES = [...COMPANY_ROLE_IDS, ...COMPANY_SUPPORT_PRESET_IDS]

let processes
let root
try {
  root = mkdtempSync(join(tmpdir(), 'standalone-smoke-'))
  const home = join(root, 'home')
  const fakeHome = join(root, 'user-home')
  mkdirSync(fakeHome, { recursive: true })
  const env = plainNodeEnv({ ...process.env, HOME: fakeHome, DSH_HOME: join(root, 'unused-dev-home') })
  processes = releaseProcesses({ cwd: ROOT, env })
  const run = (args) => processes.run(process.execPath, [join(ROOT, 'tools/standalone.mjs'), ...args], { timeoutMs: 300_000 })
  const standalone = join(ROOT, 'tools/standalone.mjs')
  const profile = join(home, 'profiles/web/package.json')
  const packDir = join(ROOT, 'packages/company-pack')

  console.log('① 帮助入口')
  const help = await processes.run(process.execPath, [standalone, '--help'], { timeoutMs: 30_000 })
  check('--help 可用', /--home/.test(help) && /--reset/.test(help))

  console.log('①b doctor 负例（缺 pnpm）')
  const noPnpm = releaseProcesses({ cwd: ROOT, env: { ...env, PATH: '/usr/bin:/bin' } })
  let noPnpmRefused = false
  try { await noPnpm.run(process.execPath, [standalone, '--home', join(root, 'no-pnpm-home'), '--provision-only', '--no-build'], { timeoutMs: 30_000 }) } catch { noPnpmRefused = true }
  check('缺 pnpm 拒绝且不建 home', noPnpmRefused && !existsSync(join(root, 'no-pnpm-home')))
  await noPnpm.close()

  console.log('② provision（隔离 home + 自建 web profile + 首启前检查）')
  await run(['--home', home, '--provision-only', '--no-open'])
  check('home 有 .standalone-home 标记', existsSync(join(home, '.standalone-home')))
  check('profile 装的是当前 pack link', JSON.parse(readFileSync(profile, 'utf8'))?.dependencies?.['dsh-company-pack'] === `link:${packDir}`,
    JSON.stringify(JSON.parse(readFileSync(profile, 'utf8'))?.dependencies))
  check('不写日用 ~/.dsh（临时 HOME）', !existsSync(join(fakeHome, '.dsh')))

  console.log('③ relink（把依赖改坏后重跑，入口应指回当前 pack）')
  const manifest = JSON.parse(readFileSync(profile, 'utf8'))
  manifest.dependencies['dsh-company-pack'] = 'link:/tmp/does-not-exist/company-pack'
  writeFileSync(profile, `${JSON.stringify(manifest, null, 2)}\n`)
  await run(['--home', home, '--provision-only', '--no-build', '--no-open'])
  check('relink 修复绝对 link', JSON.parse(readFileSync(profile, 'utf8'))?.dependencies?.['dsh-company-pack'] === `link:${packDir}`)

  console.log('④ boot + RPC（隔离 home）')
  const child = processes.start(process.execPath, [standalone, '--home', home, '--no-build', '--no-open', '--port', '0'], { timeoutMs: 300_000 })
  const banner = await child.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, BOOT_TIMEOUT_MS)
  const base = `http://127.0.0.1:${banner[1]}`
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(15_000) })
    if (!response.ok && !(options.redirect === 'manual' && response.status >= 300 && response.status < 400)) {
      throw new Error(`${path}: HTTP ${response.status}`)
    }
    return response
  }
  const cookie = (await request(`/?token=${banner[2]}`, { redirect: 'manual' })).headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const response = await request(`/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `standalone-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
    return body.result.value
  }
  const roster = await rpc('agentPresets/list', {})
  for (const role of ROLES) {
    const row = (roster.presets ?? []).find(preset => preset.id === role)
    check(`roster 含 ${role}（零 broken）`, row !== undefined && row.broken === undefined,
      row === undefined ? '不在 roster' : (row.broken === undefined ? '' : String(row.broken).slice(0, 120)))
  }
  const workspace = join(home, 'company-workspace')
  check('首启 copy 公司盘骨架', existsSync(join(workspace, 'AGENTS.md')) && existsSync(join(workspace, 'kb/org.md')))
  check('首启 copy 公司身份', existsSync(join(workspace, 'kb/company.md')))
  check('首启写 bundle.json', existsSync(join(home, 'bundle.json')))
  const created = await rpc('session/create', { request: { cwd: workspace, agentPreset: 'ceo' } })
  check('session/create 挂上 ceo', created?.agentPreset === 'ceo' || created?.preset === 'ceo', JSON.stringify(created).slice(0, 120))
  check('全程不写日用 ~/.dsh', !existsSync(join(fakeHome, '.dsh')))
  await child.stop()

  console.log('⑤ reset（只删带标记的隔离 home）')
  await run(['--home', home, '--reset'])
  check('reset 删除隔离 home', !existsSync(home))
  const outside = join(root, 'outside')
  mkdirSync(outside, { recursive: true })
  let refused = false
  try { await run(['--home', outside, '--reset']) } catch { refused = true }
  check('无标记的 --reset 被拒绝', refused && existsSync(outside))
  writeFileSync(join(outside, 'keep.txt'), 'keep\n')
  let adopted = false
  try { await run(['--home', outside, '--provision-only', '--no-build']) } catch { adopted = true }
  check('非空无标记目录拒绝收养', adopted && existsSync(join(outside, 'keep.txt')))
  const external = join(root, 'external-workspace')
  mkdirSync(external, { recursive: true })
  writeFileSync(join(external, 'keep.txt'), 'keep\n')
  const externalHome = join(root, 'home-external')
  await run(['--home', externalHome, '--workspace', external, '--provision-only', '--no-build'])
  await run(['--home', externalHome, '--workspace', external, '--reset'])
  check('reset 保留外部 workspace', !existsSync(externalHome) && existsSync(join(external, 'keep.txt')))
} catch (error) {
  failures.push(error.message)
  console.error(`standalone-smoke: ${error.message}`)
} finally {
  try { await processes?.close() } catch (error) { failures.push(String(error?.message ?? error)) }
  if (!KEEP && root !== undefined) rmSync(root, { recursive: true, force: true })
}
console.log(failures.length === 0
  ? '\nstandalone-smoke: ALL PASS（隔离 home → 自建 profile → copy 骨架 → RPC → relink → reset）'
  : `\nstandalone-smoke: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1

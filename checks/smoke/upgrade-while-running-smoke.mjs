#!/usr/bin/env node
// 状态：常驻
// 何时跑：升级/替换 profile、运行中安装边界改动后；发布前手动
// 成本：~2 分钟 keyless（0.3.9 boot 中 remove/add 0.3.10，再重启验证）
// 前置：已导出当前 `_dist` tarball；当前 pack 可 npm pack
//
// 证明形状：运行中的旧实例不因 profile 包被替换而崩/丢数据；重启后升到新版本，旧 session 仍在。
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

const BASE = join(ROOT, 'runtime/upgrade-while-running-smoke')
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
const V1 = join(ROOT, '_dist', `dsh-company-pack-${PACK.version}.tgz`)
const V2_VERSION = '0.3.10'
const V2 = join(BASE, `dsh-company-pack-${V2_VERSION}.tgz`)
const HOME = join(BASE, 'home'); const WS = join(HOME, 'company-workspace')
const failures = []; const active = new Set()
const check = (label, ok, detail = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `（${detail}）` : ''}`); if (!ok) failures.push(label) }
const env = { HOME: join(BASE, 'user'), DSH_HOME: HOME, DSH_COMPANY_HOME: WS, DSH_COMPANY_BOOTSTRAP: 'if-missing', PATH: `${join(BASE, 'bin')}:${process.env.PATH}`, npm_config_store_dir: join(BASE, 'store'), npm_config_cache: join(BASE, 'cache') }
const dsh = args => spawnSync(join(BASE, 'bin/dsh'), args, { cwd: BASE, env, encoding: 'utf8', timeout: 300_000 })
const boot = () => {
  const child = spawn(join(BASE, 'bin/dsh'), ['--profile', 'web', '--', '--port', '0', '--no-open'], { cwd: BASE, env, stdio: ['ignore', 'pipe', 'pipe'] })
  active.add(child); let output = ''
  child.stdout.on('data', c => { output += c }); child.stderr.on('data', c => { output += c })
  return new Promise((resolveBoot, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); active.delete(child); reject(new Error(output.slice(-2500))) }, 60_000)
    const scan = () => { const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) { clearTimeout(timer); resolveBoot({ child, base: `http://127.0.0.1:${m[1]}`, token: m[2], output: () => output }) } }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); active.delete(child); reject(new Error(`exit ${String(code)}\n${output.slice(-2500)}`)) })
  })
}
const stop = i => new Promise(done => { active.delete(i.child); if (i.child.exitCode !== null) return done(); i.child.once('exit', done); i.child.kill('SIGTERM') })
const rpc = async i => { const cookie = await companyCookie({ fetch: globalThis.fetch, base: i.base, token: i.token }); return companyRpc({ fetch: globalThis.fetch, base: i.base, cookie, prefix: 'upw-' }) }

try {
  rmSync(BASE, { recursive: true, force: true }); mkdirSync(join(BASE, 'bin'), { recursive: true }); mkdirSync(join(BASE, 'user'), { recursive: true })
  writeFileSync(join(BASE, 'bin/dsh'), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} "$@"\n`, { mode: 0o755 })
  if (!existsSync(V1)) throw new Error(`缺 ${V1}；先导出 _dist`)
  check('0.3.9 安装成功', dsh(['plugin', '--profile', 'web', 'add', `file:${V1}`]).status === 0)
  const old = await boot(); const oldRpc = await rpc(old)
  const created = await oldRpc('session/create', { request: { cwd: WS, agentPreset: 'ceo' } })
  const sessionId = created?.sessionId ?? created?.id
  check('旧实例可建 session', created?.agentPreset === 'ceo')
  writeFileSync(join(WS, 'kb/company.md'), '公司名: Acme\n')
  mkdirSync(join(WS, 'kb/ceo/journal'), { recursive: true })
  writeFileSync(join(WS, 'kb/ceo/journal/acme.md'), '# Acme\n')

  console.log('① 构造 0.3.10 tarball')
  const v2Pack = join(BASE, 'pack-v2')
  cpSync(join(ROOT, 'packages/company-pack'), v2Pack, { recursive: true, filter: p => !p.split(sep).includes('node_modules') && !p.split(sep).includes('.git') })
  const manifest = JSON.parse(readFileSync(join(v2Pack, 'package.json'), 'utf8'))
  manifest.version = V2_VERSION
  writeFileSync(join(v2Pack, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(join(v2Pack, 'workspace/templates/weekly-report.md'), `${readFileSync(join(v2Pack, 'workspace/templates/weekly-report.md'), 'utf8')}\n<!-- while-running-v2 -->\n`)
  const packed = spawnSync('npm', ['pack', '--pack-destination', BASE], { cwd: v2Pack, env, encoding: 'utf8', timeout: 120_000 })
  check('0.3.10 tarball 产出', packed.status === 0 && existsSync(V2), (packed.stderr ?? '').slice(-160))

  console.log('② 旧实例仍在运行时 remove/add 0.3.10')
  const removed = dsh(['plugin', '--profile', 'web', 'remove', 'dsh-company-pack'])
  check('运行中 remove 成功', removed.status === 0, `exit=${String(removed.status)}`)
  const added = dsh(['plugin', '--profile', 'web', 'add', `file:${V2}`])
  check('运行中 add 0.3.10 成功', added.status === 0, `exit=${String(added.status)} ${(added.stderr ?? '').slice(-160)}`)
  let oldAlive = false
  try {
    const r = await oldRpc('agentPresets/list', {})
    oldAlive = (r.presets ?? []).some(p => p.id === 'ceo')
    check('旧实例仍可响应 RPC', oldAlive)
    const again = await oldRpc('session/create', { request: { cwd: WS, agentPreset: 'vp-eng' } })
    check('旧实例仍可建新 session', again?.agentPreset === 'vp-eng')
  } catch (error) { check('旧实例仍可响应 RPC', false, String(error.message).split('\n')[0]) }
  await stop(old)

  console.log('③ 重启到 0.3.10：会话/数据还在')
  const next = await boot(); const nextRpc = await rpc(next)
  const bundle = JSON.parse(readFileSync(join(HOME, 'bundle.json'), 'utf8'))
  check('bundle 前移到 0.3.10', bundle?.pack?.version === V2_VERSION, String(bundle?.pack?.version))
  check('重启后 roster 含 ceo', (await nextRpc('agentPresets/list', {})).presets?.some(p => p.id === 'ceo') === true)
  check('旧 session 仍在 session/list', (await nextRpc('session/list', { _request: {} })).items?.some(item => item.sessionId === sessionId) === true, String(sessionId))
  check('数据仍在', readFileSync(join(WS, 'kb/company.md'), 'utf8').includes('Acme') && readFileSync(join(WS, 'kb/ceo/journal/acme.md'), 'utf8').includes('Acme'))
  await stop(next)
} catch (error) { failures.push(error.message); console.error(`upgrade-while-running-smoke: ${error.stack ?? error.message}`) }
finally {
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }
  if (!process.argv.includes('--keep')) rmSync(BASE, { recursive: true, force: true })
}
console.log(failures.length === 0 ? '\nupgrade-while-running-smoke: ALL PASS' : `\nupgrade-while-running-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

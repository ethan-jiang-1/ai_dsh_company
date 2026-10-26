#!/usr/bin/env node
// 状态：常驻
// 何时跑：profile patch/组合行/第二 bundle 改动后；发布前手动
// 成本：~1.5 分钟 keyless（安装 + 用户 profile patch + 第二 bundle）
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`
//
// 证明形状：用户 profile `cordis.patch.yml` 真的生效（default preset 被改），不是只保留文件；
// 第二 bundle 插一个 disabled 的真实 row 可共存/卸载，不抢本包行。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

const BASE = join(ROOT, 'runtime/profile-row-smoke')
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-company-pack-${PACK.version}.tgz`)
const HOME = join(BASE, 'home'); const WS = join(HOME, 'company-workspace')
const failures = []; const active = new Set()
const check = (label, ok, detail = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `（${detail}）` : ''}`); if (!ok) failures.push(label) }
const env = { HOME: join(BASE, 'user'), DSH_HOME: HOME, DSH_COMPANY_HOME: WS, DSH_COMPANY_BOOTSTRAP: 'if-missing', PATH: `${join(BASE, 'bin')}:${process.env.PATH}`, npm_config_store_dir: join(BASE, 'store'), npm_config_cache: join(BASE, 'cache') }
const dsh = args => spawnSync(join(BASE, 'bin/dsh'), args, { cwd: BASE, env, encoding: 'utf8', timeout: 180_000 })
const boot = () => {
  const child = spawn(join(BASE, 'bin/dsh'), ['--profile', 'web', '--', '--port', '0', '--no-open'], { cwd: BASE, env, stdio: ['ignore', 'pipe', 'pipe'] })
  active.add(child); let output = ''
  child.stdout.on('data', c => { output += c }); child.stderr.on('data', c => { output += c })
  return new Promise((resolveBoot, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); active.delete(child); reject(new Error(output.slice(-2000))) }, 60_000)
    const scan = () => { const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) { clearTimeout(timer); resolveBoot({ child, base: `http://127.0.0.1:${m[1]}`, token: m[2], output: () => output }) } }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); active.delete(child); reject(new Error(`exit ${String(code)}\n${output.slice(-2000)}`)) })
  })
}
const stop = i => new Promise(done => { active.delete(i.child); if (i.child.exitCode !== null) return done(); i.child.once('exit', done); i.child.kill('SIGTERM') })
const rpc = async i => { const cookie = await companyCookie({ fetch: globalThis.fetch, base: i.base, token: i.token }); return companyRpc({ fetch: globalThis.fetch, base: i.base, cookie, prefix: 'row-' }) }
const profileDir = join(HOME, 'profiles/web')

try {
  rmSync(BASE, { recursive: true, force: true }); mkdirSync(join(BASE, 'bin'), { recursive: true }); mkdirSync(join(BASE, 'user'), { recursive: true })
  writeFileSync(join(BASE, 'bin/dsh'), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} "$@"\n`, { mode: 0o755 })
  if (!existsSync(TARBALL)) throw new Error(`缺 ${TARBALL}`)
  check('安装成功', dsh(['plugin', '--profile', 'web', 'add', `file:${TARBALL}`]).status === 0)

  console.log('① 用户 profile patch 改 default preset（真实生效）')
  writeFileSync(join(profileDir, 'cordis.patch.yml'), `- id: agent-preset-registry\n  name: '@deepseek-ai/dsh-agent-preset-registry'\n  config:\n    default: vp-eng\n`)
  const first = await boot(); const r = await rpc(first)
  const created = await r('session/create', { request: { cwd: WS } })
  check('未指定 preset 时 default = vp-eng', created?.agentPreset === 'vp-eng', JSON.stringify(created).slice(0, 160))
  await stop(first)

  console.log('② 第二 bundle 插 disabled 真实 row：共存/卸载')
  const extra = join(BASE, 'acme-row-bundle')
  mkdirSync(extra, { recursive: true })
  writeFileSync(join(extra, 'package.json'), `${JSON.stringify({ name: 'acme-row-bundle', version: '0.0.1', dsh: { bundle: { patch: ['./cordis.patch.yml'] } } }, null, 2)}\n`)
  writeFileSync(join(extra, 'cordis.patch.yml'), `- insert:\n    - id: acme-disabled-row\n      name: '@deepseek-ai/dsh-tool-todo'\n      disabled: true\n`)
  const add = dsh(['plugin', '--profile', 'web', 'add', `file:${extra}`])
  check('第二 bundle 安装成功', add.status === 0, `exit=${String(add.status)} ${(add.stderr ?? '').slice(-160)}`)
  const second = await boot(); const r2 = await rpc(second)
  check('第二 bundle 共存后 default 仍是 vp-eng', (await r2('session/create', { request: { cwd: WS } }))?.agentPreset === 'vp-eng')
  await stop(second)
  const rm = dsh(['plugin', '--profile', 'web', 'remove', 'acme-row-bundle'])
  check('第二 bundle 可卸载', rm.status === 0, `exit=${String(rm.status)}`)
  const third = await boot(); const r3 = await rpc(third)
  check('卸载后 default 仍是 vp-eng', (await r3('session/create', { request: { cwd: WS } }))?.agentPreset === 'vp-eng')
  await stop(third)
} catch (error) { failures.push(error.message); console.error(`profile-row-smoke: ${error.stack ?? error.message}`) }
finally {
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }
  if (!process.argv.includes('--keep')) rmSync(BASE, { recursive: true, force: true })
}
console.log(failures.length === 0 ? '\nprofile-row-smoke: ALL PASS' : `\nprofile-row-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

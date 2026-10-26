#!/usr/bin/env node
// 状态：常驻
// 何时跑：DSH_COMPANY_HOME/搬家/外部盘逻辑改动后；发布前手动
// 成本：~1 分钟 keyless（安装 + 外部盘 boot + 搬 home 后 boot）
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`
//
// 证明形状：DSH_COMPANY_HOME 在 home 外时 bundle.workspace 记绝对路径；只搬 home 后仍能 boot，数据不丢。
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

const BASE = join(ROOT, 'runtime/external-workspace-smoke')
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-company-pack-${PACK.version}.tgz`)
const HOME = join(BASE, 'home'); const MOVED = join(BASE, 'home-moved'); const EXT = join(BASE, '外部 公司盘')
const failures = []; const active = new Set()
const check = (label, ok, detail = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `（${detail}）` : ''}`); if (!ok) failures.push(label) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const envFor = (home) => ({ HOME: join(BASE, 'user'), DSH_HOME: home, DSH_COMPANY_HOME: EXT, DSH_COMPANY_BOOTSTRAP: 'if-missing', PATH: `${join(BASE, 'bin')}:${process.env.PATH}`, npm_config_store_dir: join(BASE, 'store'), npm_config_cache: join(BASE, 'cache') })
const dsh = (home, args) => spawnSync(join(BASE, 'bin/dsh'), args, { cwd: BASE, env: envFor(home), encoding: 'utf8', timeout: 180_000 })
const boot = (home) => {
  const child = spawn(join(BASE, 'bin/dsh'), ['--profile', 'web', '--', '--port', '0', '--no-open'], { cwd: BASE, env: envFor(home), stdio: ['ignore', 'pipe', 'pipe'] })
  active.add(child); let output = ''
  child.stdout.on('data', c => { output += c }); child.stderr.on('data', c => { output += c })
  return new Promise((resolveBoot, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); active.delete(child); reject(new Error(output.slice(-1500))) }, 60_000)
    const scan = () => { const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) { clearTimeout(timer); resolveBoot({ child, base: `http://127.0.0.1:${m[1]}`, token: m[2], output: () => output }) } }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); active.delete(child); reject(new Error(`exit ${String(code)}\n${output.slice(-1500)}`)) })
  })
}
const stop = i => new Promise(done => { active.delete(i.child); if (i.child.exitCode !== null) return done(); i.child.once('exit', done); i.child.kill('SIGTERM') })
const rpc = async i => { const cookie = await companyCookie({ fetch: globalThis.fetch, base: i.base, token: i.token }); return companyRpc({ fetch: globalThis.fetch, base: i.base, cookie, prefix: 'ext-' }) }

try {
  rmSync(BASE, { recursive: true, force: true }); mkdirSync(join(BASE, 'bin'), { recursive: true }); mkdirSync(join(BASE, 'user'), { recursive: true }); mkdirSync(EXT, { recursive: true })
  writeFileSync(join(BASE, 'bin/dsh'), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} "$@"\n`, { mode: 0o755 })
  if (!existsSync(TARBALL)) throw new Error(`缺 ${TARBALL}`)
  check('安装成功', dsh(HOME, ['plugin', '--profile', 'web', 'add', `file:${TARBALL}`]).status === 0)
  console.log('① 外部 workspace 首启')
  const first = await boot(HOME)
  const r = await rpc(first)
  await r('session/create', { request: { cwd: EXT, agentPreset: 'ceo' } })
  mkdirSync(join(EXT, 'kb/ceo/journal'), { recursive: true })
  writeFileSync(join(EXT, 'kb/company.md'), '公司名: Acme\n')
  writeFileSync(join(EXT, 'kb/ceo/journal/acme.md'), '# Acme\n')
  const bundle1 = JSON.parse(readFileSync(join(HOME, 'bundle.json'), 'utf8'))
  check('bundle.workspace 是外部绝对路径', bundle1.workspace === EXT, bundle1.workspace)
  await stop(first)

  console.log('② 只搬 home（外部盘不动）')
  renameSync(HOME, MOVED)
  const second = await boot(MOVED)
  const r2 = await rpc(second)
  check('搬 home 后 roster 仍含 ceo', (await r2('agentPresets/list', {})).presets?.some(p => p.id === 'ceo') === true)
  check('搬 home 后公司盘/数据仍在', existsSync(join(EXT, 'kb/company.md')) && readFileSync(join(EXT, 'kb/company.md'), 'utf8').includes('Acme'))
  const bundle2 = JSON.parse(readFileSync(join(MOVED, 'bundle.json'), 'utf8'))
  check('搬 home 后 bundle.workspace 仍指向外部盘', bundle2.workspace === EXT, bundle2.workspace)
  await stop(second)
} catch (error) { failures.push(error.message); console.error(`external-workspace-smoke: ${error.stack ?? error.message}`) }
finally {
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }
  if (!process.argv.includes('--keep')) rmSync(BASE, { recursive: true, force: true })
}
console.log(failures.length === 0 ? '\nexternal-workspace-smoke: ALL PASS' : `\nexternal-workspace-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

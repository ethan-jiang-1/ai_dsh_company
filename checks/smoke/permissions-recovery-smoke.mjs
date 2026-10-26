#!/usr/bin/env node
// 状态：常驻
// 何时跑：bootstrap/catalog/文件权限/坏索引改动后；发布前手动
// 成本：~1.5 分钟 keyless（安装 + 只读 workspace + 缺骨架 + 坏 catalog）
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`
//
// 证明边界：只读 workspace 允许“boot 继续、catalog 写失败可解释”；缺骨架要补；坏 catalog 要重建。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

const BASE = join(ROOT, 'runtime/permissions-recovery-smoke')
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
const rpc = async i => { const cookie = await companyCookie({ fetch: globalThis.fetch, base: i.base, token: i.token }); return companyRpc({ fetch: globalThis.fetch, base: i.base, cookie, prefix: 'perm-' }) }
const restore = () => { spawnSync('chmod', ['-R', 'u+rwX', BASE]); }

try {
  rmSync(BASE, { recursive: true, force: true }); mkdirSync(join(BASE, 'bin'), { recursive: true }); mkdirSync(join(BASE, 'user'), { recursive: true })
  writeFileSync(join(BASE, 'bin/dsh'), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} "$@"\n`, { mode: 0o755 })
  if (!existsSync(TARBALL)) throw new Error(`缺 ${TARBALL}`)
  check('安装成功', dsh(['plugin', '--profile', 'web', 'add', `file:${TARBALL}`]).status === 0)
  const first = await boot(); const r = await rpc(first)
  await r('session/create', { request: { cwd: WS, agentPreset: 'ceo' } })
  writeFileSync(join(WS, 'kb/company.md'), '公司名: Acme\n')
  await stop(first)

  console.log('① 只读 workspace：boot 应继续，catalog 写失败不应崩')
  rmSync(join(WS, 'kb/deliverables-index.json'), { force: true })
  spawnSync('chmod', ['-R', 'a-w', WS])
  let readOnlyBoot
  try { readOnlyBoot = await boot() } catch (error) { check('只读 workspace boot', false, String(error.message).split('\n')[0]) }
  if (readOnlyBoot !== undefined) {
    const rr = await rpc(readOnlyBoot)
    check('只读 workspace 仍可建会话', (await rr('session/create', { request: { cwd: WS, agentPreset: 'ceo' } }))?.agentPreset === 'ceo')
    check('只读 workspace 不破坏 company.md', readFileSync(join(WS, 'kb/company.md'), 'utf8').includes('Acme'))
    await stop(readOnlyBoot)
  }
  restore()

  console.log('② 缺骨架目录：下一 boot 补建')
  rmSync(join(WS, 'kb/ceo'), { recursive: true, force: true })
  const missing = await boot(); await stop(missing)
  check('缺 kb/ceo 后被补建', existsSync(join(WS, 'kb/ceo/CHARTER.md')))
  check('补建不覆盖 company.md', readFileSync(join(WS, 'kb/company.md'), 'utf8').includes('Acme'))

  console.log('③ catalog 坏 JSON：下一 boot 重建')
  mkdirSync(join(WS, 'kb'), { recursive: true })
  writeFileSync(join(WS, 'kb/deliverables-index.json'), '{ definitely not json')
  const corrupt = await boot(); await stop(corrupt)
  const catalog = JSON.parse(readFileSync(join(WS, 'kb/deliverables-index.json'), 'utf8'))
  check('坏 catalog 被重建为 schema 1', catalog?.schema === 1 && Array.isArray(catalog.entries))
} catch (error) { failures.push(error.message); console.error(`permissions-recovery-smoke: ${error.stack ?? error.message}`) }
finally {
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }
  restore()
  if (!process.argv.includes('--keep')) rmSync(BASE, { recursive: true, force: true })
}
console.log(failures.length === 0 ? '\npermissions-recovery-smoke: ALL PASS' : `\npermissions-recovery-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

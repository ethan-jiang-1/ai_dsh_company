#!/usr/bin/env node
// 状态：常驻
// 何时跑：install/remove/upgrade/恢复路径改动后；发布前手动
// 成本：~2 分钟 keyless（一次真装 + remove + 两次坏 add + reinstall + 一次坏 profile boot）
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`
//
// 证明形状：remove 后 add 损坏/缺文件不能让公司数据消失；坏 profile 要可诊断；reinstall 后 roster 恢复。
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

const BASE = join(ROOT, 'runtime/interrupted-install-smoke')
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-company-pack-${PACK.version}.tgz`)
const HOME = join(BASE, 'home')
const WS = join(HOME, 'company-workspace')
const failures = []
const active = new Set()
const check = (label, ok, detail = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `（${detail}）` : ''}`); if (!ok) failures.push(label) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const env = {
  HOME: join(BASE, 'user'), DSH_HOME: HOME, DSH_COMPANY_HOME: WS, DSH_COMPANY_BOOTSTRAP: 'if-missing',
  PATH: `${join(BASE, 'bin')}:${process.env.PATH}`, npm_config_store_dir: join(BASE, 'store'), npm_config_cache: join(BASE, 'cache'),
}
const dsh = (args, options = {}) => spawnSync(join(BASE, 'bin/dsh'), args, { cwd: BASE, env, encoding: 'utf8', timeout: 180_000, ...options })
const profile = () => join(HOME, 'profiles/web')
const bundles = () => JSON.parse(readFileSync(join(profile(), 'package.json'), 'utf8'))?.dsh?.profile?.bundles ?? []
const install = (tgz = TARBALL) => dsh(['plugin', '--profile', 'web', 'add', `file:${tgz}`])
const boot = () => {
  const child = spawn(join(BASE, 'bin/dsh'), ['--profile', 'web', '--', '--port', '0', '--no-open'], { cwd: BASE, env, stdio: ['ignore', 'pipe', 'pipe'] })
  active.add(child)
  let output = ''
  child.stdout.on('data', c => { output += c }); child.stderr.on('data', c => { output += c })
  return new Promise((resolveBoot, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); active.delete(child); reject(new Error(output.slice(-2000))) }, 60_000)
    const scan = () => { const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) { clearTimeout(timer); resolveBoot({ child, base: `http://127.0.0.1:${m[1]}`, token: m[2], output: () => output }) } }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); active.delete(child); reject(new Error(`boot exited ${String(code)}\n${output.slice(-2000)}`)) })
  })
}
const stop = i => new Promise(done => { active.delete(i.child); if (i.child.exitCode !== null) return done(); i.child.once('exit', done); i.child.kill('SIGTERM') })
const rpc = async i => { const cookie = await companyCookie({ fetch: globalThis.fetch, base: i.base, token: i.token }); return companyRpc({ fetch: globalThis.fetch, base: i.base, cookie, prefix: 'int-' }) }

try {
  rmSync(BASE, { recursive: true, force: true })
  mkdirSync(join(BASE, 'bin'), { recursive: true }); mkdirSync(env.HOME, { recursive: true })
  writeFileSync(join(BASE, 'bin/dsh'), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} "$@"\n`, { mode: 0o755 })
  if (!existsSync(TARBALL)) throw new Error(`缺 ${TARBALL}；先导出 _dist`)
  console.log(`interrupted-install-smoke: ${TARBALL.split('/').pop()}`)

  console.log('① 正常安装 + 造数据')
  check('首次安装成功', install().status === 0)
  const first = await boot()
  const r = await rpc(first)
  await r('session/create', { request: { cwd: WS, agentPreset: 'ceo' } })
  mkdirSync(join(WS, 'kb/ceo/journal'), { recursive: true })
  writeFileSync(join(WS, 'kb/company.md'), '公司名: Acme\n')
  writeFileSync(join(WS, 'kb/ceo/journal/acme.md'), '# Acme\n')
  mkdirSync(join(WS, 'deliverables/2026-10-26-a'), { recursive: true })
  writeFileSync(join(WS, 'deliverables/2026-10-26-a/final.md'), '# final\n')
  const before = { company: sha(join(WS, 'kb/company.md')), journal: sha(join(WS, 'kb/ceo/journal/acme.md')), final: sha(join(WS, 'deliverables/2026-10-26-a/final.md')) }
  const sessionsBefore = readdirSync(join(HOME, 'sessions')).length
  await stop(first)
  check('profile 含 company-pack', bundles().includes('dsh-company-pack'))

  console.log('② remove 后坏 add：数据必须还在，profile 不能假装成功')
  const removed = dsh(['plugin', '--profile', 'web', 'remove', 'dsh-company-pack'])
  check('remove 成功', removed.status === 0)
  check('remove 后 bundles 不含 pack', !bundles().includes('dsh-company-pack'))
  const corrupt = join(BASE, 'corrupt.tgz')
  const bytes = readFileSync(TARBALL); bytes[bytes.length - 1] ^= 0xff; writeFileSync(corrupt, bytes)
  const bad = install(corrupt)
  check('损坏 tarball add 失败', bad.status !== 0, `exit=${String(bad.status)}`)
  check('坏 add 后 bundles 仍不含 pack', !bundles().includes('dsh-company-pack'))
  const missing = install(join(BASE, 'does-not-exist.tgz'))
  check('不存在 tarball add 失败', missing.status !== 0, `exit=${String(missing.status)}`)
  check('坏 add 后数据仍在', sha(join(WS, 'kb/company.md')) === before.company
    && sha(join(WS, 'kb/ceo/journal/acme.md')) === before.journal
    && sha(join(WS, 'deliverables/2026-10-26-a/final.md')) === before.final)
  check('坏 add 后 session 文件仍在', readdirSync(join(HOME, 'sessions')).length === sessionsBefore)

  console.log('③ re-add 好包：roster 恢复，数据不变')
  const re = install()
  check('re-add 成功', re.status === 0, `exit=${String(re.status)}`)
  const second = await boot()
  const r2 = await rpc(second)
  const roster = await r2('agentPresets/list', {})
  check('re-add 后 roster 含 ceo', (roster.presets ?? []).some(p => p.id === 'ceo'))
  check('re-add 后数据仍不变', sha(join(WS, 'kb/company.md')) === before.company
    && sha(join(WS, 'kb/ceo/journal/acme.md')) === before.journal
    && sha(join(WS, 'deliverables/2026-10-26-a/final.md')) === before.final)
  await stop(second)

  console.log('④ profile package.json 损坏：boot 必须可诊断，修复后恢复')
  const manifestPath = join(profile(), 'package.json')
  const goodManifest = readFileSync(manifestPath, 'utf8')
  writeFileSync(manifestPath, goodManifest.slice(0, Math.floor(goodManifest.length / 2)))
  let failed = false; let diagnostic = ''
  try { const broken = await boot(); await stop(broken) } catch (error) { failed = true; diagnostic = String(error.message) }
  check('坏 profile package 启动失败且可诊断', failed && /JSON|Unexpected|package\.json|parse/i.test(diagnostic), diagnostic.split('\n')[0])
  writeFileSync(manifestPath, goodManifest)
  const third = await boot()
  const r3 = await rpc(third)
  check('修复 profile 后 boot 恢复', (await r3('agentPresets/list', {})).presets?.some(p => p.id === 'ceo') === true)
  await stop(third)
} catch (error) {
  failures.push(error.message)
  console.error(`interrupted-install-smoke: ${error.stack ?? error.message}`)
} finally {
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }
  rmSync(BASE, { recursive: true, force: true })
}
console.log(failures.length === 0 ? '\ninterrupted-install-smoke: ALL PASS' : `\ninterrupted-install-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

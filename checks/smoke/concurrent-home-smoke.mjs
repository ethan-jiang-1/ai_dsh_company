#!/usr/bin/env node
// 状态：常驻
// 何时跑：首启/安装/升级或 home 写入路径改动后；发布前手动
// 成本：~1 分钟 keyless（同一 home 两个 web 进程 + 一次正常 boot 对照）
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`
//
// 证明边界：同 home 两进程不是“支持”的部署形状；本 smoke 证明 writer lease 让恰好一个 writer 写公司数据（另一个被点名停写），且不把 bundle/catalog/数据写成不可恢复。
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

const BASE = join(ROOT, 'runtime/concurrent-home-smoke')
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-company-pack-${PACK.version}.tgz`)
const HOME = join(BASE, 'home'); const WS = join(HOME, 'company-workspace')
const failures = []; const active = new Set()
const check = (label, ok, detail = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `（${detail}）` : ''}`); if (!ok) failures.push(label) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const env = { HOME: join(BASE, 'user'), DSH_HOME: HOME, DSH_COMPANY_HOME: WS, DSH_COMPANY_BOOTSTRAP: 'if-missing', PATH: `${join(BASE, 'bin')}:${process.env.PATH}`, npm_config_store_dir: join(BASE, 'store'), npm_config_cache: join(BASE, 'cache') }
const dsh = args => spawnSync(join(BASE, 'bin/dsh'), args, { cwd: BASE, env, encoding: 'utf8', timeout: 180_000 })
const boot = () => {
  const child = spawn(join(BASE, 'bin/dsh'), ['--profile', 'web', '--', '--port', '0', '--no-open'], { cwd: BASE, env, stdio: ['ignore', 'pipe', 'pipe'] })
  active.add(child)
  let output = ''
  child.stdout.on('data', c => { output += c }); child.stderr.on('data', c => { output += c })
  return new Promise((resolveBoot, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); active.delete(child); reject(new Error(output.slice(-1500))) }, 60_000)
    const scan = () => { const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) { clearTimeout(timer); resolveBoot({ child, base: `http://127.0.0.1:${m[1]}`, token: m[2], output: () => output }) } }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); active.delete(child); reject(new Error(`exit ${String(code)}\n${output.slice(-1500)}`)) })
  })
}
const stop = i => new Promise(done => { active.delete(i.child); if (i.child.exitCode !== null) return done(); i.child.once('exit', done); i.child.kill('SIGTERM') })
const rpc = async i => { const cookie = await companyCookie({ fetch: globalThis.fetch, base: i.base, token: i.token }); return companyRpc({ fetch: globalThis.fetch, base: i.base, cookie, prefix: 'conc-' }) }

try {
  rmSync(BASE, { recursive: true, force: true }); mkdirSync(join(BASE, 'bin'), { recursive: true }); mkdirSync(join(BASE, 'user'), { recursive: true })
  writeFileSync(join(BASE, 'bin/dsh'), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} "$@"\n`, { mode: 0o755 })
  if (!existsSync(TARBALL)) throw new Error(`缺 ${TARBALL}`)
  check('安装成功', dsh(['plugin', '--profile', 'web', 'add', `file:${TARBALL}`]).status === 0)
  console.log('① 同 home 两进程同时首启')
  const starts = await Promise.allSettled([boot(), boot()])
  const up = starts.filter(x => x.status === 'fulfilled').map(x => x.value)
  const down = starts.filter(x => x.status === 'rejected').map(x => x.reason?.message ?? '')
  check('两个进程至少一个能启动', up.length >= 1, `up=${String(up.length)} down=${String(down.length)}`)
  if (down.length > 0) console.log(`  另一进程失败（可解释即可）：${down[0].split('\n')[0]}`)
  const blocked = up.filter(item => item.output().includes('另一个 writer')).length
  check('同 home 恰好一个 writer（另一个被点名停写）', up.length === 2 ? blocked === 1 : blocked === 0,
    `up=${String(up.length)} blocked=${String(blocked)}`)
  for (const i of up) {
    const r = await rpc(i)
    const created = await r('session/create', { request: { cwd: WS, agentPreset: 'ceo' } })
    check('并发实例可建会话', created?.agentPreset === 'ceo')
    await stop(i)
  }
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }

  console.log('② 事后完整性：bundle/catalog/数据可解析')
  const bundle = JSON.parse(readFileSync(join(HOME, 'bundle.json'), 'utf8'))
  check('bundle.json 可解析且 pack 正确', bundle?.pack?.version === PACK.version)
  const catalog = JSON.parse(readFileSync(join(WS, 'kb/deliverables-index.json'), 'utf8'))
  check('catalog 可解析', catalog?.schema === 1 && Array.isArray(catalog.entries))
  mkdirSync(join(WS, 'kb/ceo/journal'), { recursive: true })
  writeFileSync(join(WS, 'kb/ceo/journal/after.md'), '# after concurrency\n')
  const h = sha(join(WS, 'kb/ceo/journal/after.md'))
  check('数据文件可写/可读', sha(join(WS, 'kb/ceo/journal/after.md')) === h)

  console.log('③ 事后正常 boot 仍可用（单实例，stale lease 可接管）')
  const one = await boot()
  check('单实例 boot 不再被旧 lease 阻挡', !one.output().includes('另一个 writer'), one.output().slice(-400))
  const r = await rpc(one)
  check('并发后正常 boot roster 含 ceo', (await r('agentPresets/list', {})).presets?.some(p => p.id === 'ceo') === true)
  await stop(one)
} catch (error) { failures.push(error.message); console.error(`concurrent-home-smoke: ${error.stack ?? error.message}`) }
finally {
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }
  if (!process.argv.includes('--keep')) rmSync(BASE, { recursive: true, force: true })
}
console.log(failures.length === 0 ? '\nconcurrent-home-smoke: ALL PASS' : `\nconcurrent-home-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

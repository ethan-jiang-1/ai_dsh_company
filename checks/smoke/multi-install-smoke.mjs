#!/usr/bin/env node
// 状态：常驻
// 何时跑：profile 组合/安装形状/多 pack 共存/自定义 profile 改动后；发布前手动
// 成本：~3-4 分钟 keyless（真 tarball 安装 + 两次 boot + RPC + 一次预期失败）；不进 pnpm test
// 前置：已导出 `_dist/dsh-company-pack-<version>.tgz`（pnpm release --prepare 或 tools/export-dist.mjs）
//
// 证明形状：
// A 两个 home 各一个 web profile：bundle id / company.md / catalog / journal 不串。
// B 非空 home 先有 stock workspace+session，再装 pack：旧数据在，pack 能挂。
// C 同 home 两个自定义 profile：自动 profile 只有 base（缺 web-app）⇒ presets pending；
//   这是**反例/预期失败**，证明“profile 名不是隔离单位、一个 home 一个 run bundle”。
// D 给自定义 profile 补 @deepseek-ai/dsh-web-app 后可启动（合同：公司包要求 web profile）。
// E 同 home 再装一个空 bundle 层：不抢行、不覆盖，remove 后公司包仍可用。
// F 同版本重复 add：bundle 不重复。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

const KEEP = process.argv.includes('--keep')
const BASE = join(ROOT, 'runtime/multi-install-smoke')
const CLI = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
const PACK = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-company-pack-${PACK.version}.tgz`)
const failures = []
const active = new Set()
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const envFor = (home, workspace) => ({
  HOME: join(home, 'user'), DSH_HOME: join(home, 'dsh'), DSH_COMPANY_HOME: workspace,
  DSH_COMPANY_BOOTSTRAP: 'if-missing', PATH: `${join(BASE, 'bin')}:${process.env.PATH}`,
  npm_config_store_dir: join(home, 'store'), npm_config_cache: join(home, 'cache'),
})
const shim = () => {
  mkdirSync(join(BASE, 'bin'), { recursive: true })
  writeFileSync(join(BASE, 'bin/dsh'), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} "$@"\n`, { mode: 0o755 })
}
const install = (home, profile, spec) => spawnSync(join(BASE, 'bin/dsh'), ['plugin', '--profile', profile, 'add', spec], {
  cwd: BASE, env: envFor(home, join(home, 'ws')), encoding: 'utf8', timeout: 300_000,
})
const makeHome = (name) => {
  const home = join(BASE, name)
  for (const dir of ['user', 'store', 'cache']) mkdirSync(join(home, dir), { recursive: true })
  return home
}
const boot = (home, workspace, profile = 'web') => {
  const child = spawn(join(BASE, 'bin/dsh'), ['--profile', profile, '--', '--port', '0', '--no-open'], {
    cwd: BASE, env: envFor(home, workspace), stdio: ['ignore', 'pipe', 'pipe'],
  })
  active.add(child)
  let output = ''
  child.stdout.on('data', c => { output += c }); child.stderr.on('data', c => { output += c })
  return new Promise((resolveBoot, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); active.delete(child); reject(new Error(`boot timeout\n${output.slice(-2500)}`)) }, 90_000)
    const scan = () => {
      const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (m === null) return
      clearTimeout(timer)
      resolveBoot({ child, base: `http://127.0.0.1:${m[1]}`, token: m[2], output: () => output })
    }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', (code) => { clearTimeout(timer); active.delete(child); reject(new Error(`boot exited ${String(code)}\n${output.slice(-2500)}`)) })
  })
}
const stop = (i) => new Promise(done => {
  if (i === undefined) return done()
  active.delete(i.child)
  if (i.child.exitCode !== null) return done()
  i.child.once('exit', done); i.child.kill('SIGTERM')
  setTimeout(() => { try { i.child.kill('SIGKILL') } catch { /* gone */ } }, 3000)
})
const rpc = async (i) => {
  const cookie = await companyCookie({ fetch: globalThis.fetch, base: i.base, token: i.token })
  return companyRpc({ fetch: globalThis.fetch, base: i.base, cookie, prefix: 'multi-' })
}
const writeCompany = (workspace, name) => {
  mkdirSync(join(workspace, 'kb/ceo/journal'), { recursive: true })
  writeFileSync(join(workspace, 'kb/company.md'), `公司名: ${name}\n`)
  writeFileSync(join(workspace, 'kb/ceo/journal/acme.md'), `# ${name}\n`)
}
const profileBundles = (home, profile) => JSON.parse(readFileSync(join(home, 'dsh/profiles', profile, 'package.json'), 'utf8'))?.dsh?.profile?.bundles ?? []

let aBoot, bBoot, cBoot, dBoot
try {
  rmSync(BASE, { recursive: true, force: true })
  mkdirSync(BASE, { recursive: true })
  shim()
  if (!existsSync(TARBALL)) throw new Error(`缺 ${TARBALL}；先导出 _dist`)
  console.log(`multi-install-smoke: ${TARBALL.split('/').pop()}`)

  console.log('① 两个 home 各一个 web profile（真装隔离）')
  const homes = [makeHome('home-acme'), makeHome('home-beta')]
  for (const [home, name] of [[homes[0], 'Acme'], [homes[1], 'Beta']]) {
    const installed = install(home, 'web', `file:${TARBALL}`)
    check(`${name} 安装成功`, installed.status === 0, `exit=${String(installed.status)} ${(installed.stderr ?? '').slice(-160)}`)
    // 用户 profile patch 不属于包；重复 add 不应覆盖它。
    const patchFile = join(home, 'dsh/profiles/web/cordis.patch.yml')
    mkdirSync(join(home, 'dsh/profiles/web'), { recursive: true })
    writeFileSync(patchFile, `- id: agent-preset-registry\n  name: '@deepseek-ai/dsh-agent-preset-registry'\n  config:\n    default: vp-eng\n`)
    const againInstall = install(home, 'web', `file:${TARBALL}`)
    check(`${name} 重复 add 保留用户 profile patch`, againInstall.status === 0 && readFileSync(patchFile, 'utf8').includes('default: vp-eng'))
    const ws = join(home, 'ws')
    const booted = await boot(home, ws)
    if (name === 'Acme') aBoot = booted; else bBoot = booted
    const r = await rpc(booted)
    const created = await r('session/create', { request: { cwd: ws, agentPreset: 'ceo' } })
    check(`${name} 可建 ceo 会话`, created?.agentPreset === 'ceo')
    const defaulted = await r('session/create', { request: { cwd: ws } })
    check(`${name} profile patch 真实生效（default=vp-eng）`, defaulted?.agentPreset === 'vp-eng', JSON.stringify(defaulted).slice(0, 120))
    writeCompany(ws, name)
    await stop(booted)
  }
  const idA = JSON.parse(readFileSync(join(homes[0], 'dsh/bundle.json'), 'utf8')).id
  const idB = JSON.parse(readFileSync(join(homes[1], 'dsh/bundle.json'), 'utf8')).id
  check('两个 home 的 bundle id 不同', idA !== idB)
  check('两个 home 的 company.md/journal 不串',
    readFileSync(join(homes[0], 'ws/kb/company.md'), 'utf8').includes('Acme')
    && readFileSync(join(homes[1], 'ws/kb/company.md'), 'utf8').includes('Beta'))
  check('两个 home 的 session 目录都非空', [homes[0], homes[1]].every(home => existsSync(join(home, 'dsh/sessions')) && readdirSync(join(home, 'dsh/sessions')).length > 0))

  console.log('② 非空 home：先有 stock workspace+session，再装 pack')
  const stock = makeHome('home-stock')
  mkdirSync(join(stock, 'ws'), { recursive: true })
  const stockProfile = join(stock, 'dsh/profiles/web')
  mkdirSync(stockProfile, { recursive: true })
  writeFileSync(join(stockProfile, 'package.json'), `${JSON.stringify({ name: 'dsh-profile-web', private: true, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'startup' } } }, null, 2)}\n`)
  writeFileSync(join(stockProfile, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
  const stockBoot = await boot(stock, join(stock, 'ws'))
  const stockRpc = await rpc(stockBoot)
  await stockRpc('workspace/create', { request: { path: join(stock, 'ws') } })
  const stockSession = await stockRpc('session/create', { request: { cwd: join(stock, 'ws'), agentPreset: 'standard' } })
  await stop(stockBoot)
  const stockInstall = install(stock, 'web', `file:${TARBALL}`)
  check('非空 home 后装 pack 成功', stockInstall.status === 0, `exit=${String(stockInstall.status)} ${(stockInstall.stderr ?? '').slice(-160)}`)
  const afterStock = await boot(stock, join(stock, 'ws'))
  const afterRpc = await rpc(afterStock)
  const roster = await afterRpc('agentPresets/list', {})
  check('非空 home 后 roster 含 ceo', (roster.presets ?? []).some(p => p.id === 'ceo'))
  check('非空 home 的旧 session 文件仍在', existsSync(join(stock, 'dsh/sessions')) && readdirSync(join(stock, 'dsh/sessions')).length > 0, String(stockSession?.sessionId ?? ''))
  await stop(afterStock)

  console.log('③ 同 home 两个自定义 profile（预期反例：缺 web-app ⇒ presets pending）')
  const shared = makeHome('home-shared')
  for (const profile of ['web-a', 'web-b']) {
    const r = install(shared, profile, `file:${TARBALL}`)
    check(`同 home ${profile} 安装成功`, r.status === 0, `exit=${String(r.status)}`)
  }
  check('自动 profile 只有 base（缺 web-app）', !profileBundles(shared, 'web-a').includes('@deepseek-ai/dsh-web-app'), profileBundles(shared, 'web-a').join(','))
  let customFailed = false
  try {
    const c = await boot(shared, join(shared, 'ws-a'), 'web-a')
    cBoot = c
    await rpc(c)
    await stop(c)
  } catch (error) {
    customFailed = /did not activate|waiting for service: agentPresets|pending/.test(String(error.message))
    check('base-only 自定义 profile 启动失败且诊断指向 presets', customFailed, String(error.message).split('\n')[0])
  }
  if (!customFailed) check('base-only 自定义 profile 未失败（合同可能变了）', false)

  console.log('④ 给自定义 profile 补 web-app 后可启动')
  const customProfile = join(shared, 'dsh/profiles/web-a/package.json')
  const customManifest = JSON.parse(readFileSync(customProfile, 'utf8'))
  customManifest.dsh.profile.bundles = [...new Set([...customManifest.dsh.profile.bundles, '@deepseek-ai/dsh-web-app'])]
  writeFileSync(customProfile, `${JSON.stringify(customManifest, null, 2)}\n`)
  const customBoot = await boot(shared, join(shared, 'ws-a'), 'web-a')
  cBoot = customBoot
  const customRpc = await rpc(customBoot)
  const customRoster = await customRpc('agentPresets/list', {})
  check('补 web-app 后 roster 含 ceo', (customRoster.presets ?? []).some(p => p.id === 'ceo'), (customRoster.presets ?? []).map(p => p.id).join(','))
  await stop(customBoot)

  console.log('⑤ 空 bundle 与公司包共存/卸载')
  const extra = join(BASE, 'empty-bundle')
  mkdirSync(extra, { recursive: true })
  writeFileSync(join(extra, 'package.json'), `${JSON.stringify({ name: 'acme-empty-bundle', version: '0.0.1', dsh: { bundle: { patch: ['./cordis.patch.yml'] } } }, null, 2)}\n`)
  writeFileSync(join(extra, 'cordis.patch.yml'), '[]\n')
  const addExtra = install(homes[0], 'web', `file:${extra}`)
  check('空 bundle 可与公司包共存安装', addExtra.status === 0, `exit=${String(addExtra.status)} ${(addExtra.stderr ?? '').slice(-160)}`)
  check('profile 同时含两个 bundle', ['dsh-company-pack', 'acme-empty-bundle'].every(id => profileBundles(homes[0], 'web').includes(id)))
  const removeExtra = spawnSync(join(BASE, 'bin/dsh'), ['plugin', '--profile', 'web', 'remove', 'acme-empty-bundle'], { cwd: BASE, env: envFor(homes[0], join(homes[0], 'ws')), encoding: 'utf8', timeout: 120_000 })
  check('空 bundle 可卸载', removeExtra.status === 0, `exit=${String(removeExtra.status)}`)

  console.log('⑥ 同版本重复安装幂等')
  const again = install(homes[0], 'web', `file:${TARBALL}`)
  check('重复 add 成功', again.status === 0, `exit=${String(again.status)}`)
  check('bundle 不重复', profileBundles(homes[0], 'web').filter(id => id === 'dsh-company-pack').length === 1)
} catch (error) {
  failures.push(error.message)
  console.error(`multi-install-smoke: ${error.stack ?? error.message}`)
} finally {
  for (const child of active) { try { child.kill('SIGTERM') } catch { /* gone */ } }
  if (!KEEP) rmSync(BASE, { recursive: true, force: true })
  else console.log(`multi-install-smoke: --keep 保留 ${BASE}`)
}
console.log(failures.length === 0
  ? '\nmulti-install-smoke: ALL PASS'
  : `\nmulti-install-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

#!/usr/bin/env node
// 状态：常驻
// 何时跑：present 事件 → catalog/账本接线、run bundle 路径改动后
// 成本：秒级 keyless（临时 home/workspace + host apply + 假 session/event；不调模型）
// 用法：node --import tsx/esm checks/smoke/present-catalog-smoke.mjs
// 为什么带 tsx：本脚本 import src/**.ts（源码面）；plain node 的 strip-only 模式不支持参数属性等
//   TS-only 语法——2026-11-13 release --verify 实测 ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX
//   （startup-watch.ts:104 的 constructor 参数属性）。
//
// 证明：host apply 注册的 session/event 监听把 `.dsh-company/deliverables/.../final.md` 的 present
// 写进 host-only 账本，并重生成 `.dsh-company/kb/deliverables-index.json`；workspace 不写旧 W 账本。
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../../packages/company-pack/src/index.ts'
import { ledgerFilePath } from '../../packages/company-pack/src/host/ledger/presented-domain.ts'
import { canonicalPath } from '../../packages/company-pack/src/host/run-bundle/paths.ts'
import { RUN_BUNDLE_PATHS } from '../../packages/company-pack/src/lib/run-bundle-paths.ts'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function waitFor(predicate, label, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`waitFor 超时：${label}`)
    await sleep(25)
  }
}

const root = realpathSync(mkdtempSync(join(tmpdir(), 'present-catalog-')))
const workspace = join(root, 'workspace')
const home = join(root, 'home')
const saved = { DSH_HOME: process.env.DSH_HOME, DSH_COMPANY_HOME: process.env.DSH_COMPANY_HOME }
process.env.DSH_HOME = home
process.env.DSH_COMPANY_HOME = workspace
try {
  mkdirSync(join(workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-alpha'), { recursive: true })
  mkdirSync(home, { recursive: true })
  const rel = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`
  writeFileSync(join(workspace, rel), '# final\n')
  writeFileSync(join(workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-alpha/meta.md'),
    'slug: alpha\nkickoff: 2026-10-25\ntype: decision\nresult: completed\nsummary: present e2e\n')

  const listeners = new Map()
  const ctx = {
    tools: { register: () => {} },
    commands: { register: () => {} },
    on: (name, listener) => { listeners.set(name, [...(listeners.get(name) ?? []), listener]) },
    logger: { info: () => {}, warn: message => console.error(`  warn ${message}`) },
    get: () => undefined,
    effect: callback => callback(),
    inject: () => {},
    workspaceRegistry: { create: async () => ({ id: 'ws-test', path: workspace }) },
  }
  await apply(ctx)
  const catalogPath = join(workspace, RUN_BUNDLE_PATHS.catalog)
  await waitFor(() => existsSync(catalogPath), '首启 catalog')
  const before = JSON.parse(readFileSync(catalogPath, 'utf8'))
  check('首启生成 catalog（presented=null）', before.entries?.length === 1 && before.entries[0]?.presented === null)

  const event = { type: 'deliverables/presented', data: { files: [{ path: join(workspace, rel) }] } }
  for (const listener of listeners.get('session/event') ?? []) listener({}, event)
  await waitFor(() => {
    try {
      const current = JSON.parse(readFileSync(catalogPath, 'utf8'))
      return current.entries?.[0]?.presented === true
    } catch { return false }
  }, 'present 投影')
  const after = JSON.parse(readFileSync(catalogPath, 'utf8'))
  check('present 后 catalog presented=true', after.entries?.[0]?.presented === true)

  const ledger = JSON.parse(readFileSync(ledgerFilePath(home, canonicalPath(workspace)), 'utf8'))
  check('host-only 账本记录 .dsh-company 路径', ledger.paths?.[rel] === true, JSON.stringify(ledger.paths))
  check('workspace 不写旧 W 账本', !existsSync(join(workspace, RUN_BUNDLE_PATHS.presented)))
} catch (error) {
  failures.push(error.message)
  console.error(`present-catalog-smoke: ${error.stack ?? error.message}`)
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  rmSync(root, { recursive: true, force: true })
}

console.log(failures.length === 0 ? '\npresent-catalog-smoke: ALL PASS' : `\npresent-catalog-smoke: ${failures.length} FAILURE(S)\n  - ${failures.join('\n  - ')}`)
process.exitCode = failures.length === 0 ? 0 : 1

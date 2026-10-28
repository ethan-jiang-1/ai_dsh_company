#!/usr/bin/env node
// 状态：常驻
// 何时跑：catalog/present 接线改动；release --verify（前置：company-pack 已构建）
// 成本：~1s keyless；真 vendor `present` 工具 + 真 Cordis 装配，不启 web/模型
//
// 证明链：vendor `@deepseek-ai/dsh-tool-present` 执行 → owner session 追加
// `deliverables/presented` → 本包 `apply()` 注册的 `session/event` 监听 → catalog `presented=true`。
// 这不是合成事件：event 由 vendor 工具真实产生；只是不经过模型（模型只决定“调不调”，不决定事件形状）。
// ⚠ 本 smoke 的 host ctx 不 mount `storageDomain` ⇒ 走 legacy 同步路径（旧 W 账本）；
//   domain 路径（company_deliverables）由 tests/company/presented-domain*.spec +
//   catalog-wiring 的 fake-facility 集成覆盖；真 profile 的 base 提供 storage-domain。
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '../../vendor/dsh/vendor/cordis/lib/index.js'
import AgentRegistry from '../../vendor/dsh/packages/core/agent/lib/index.js'
import LocalFileSystem from '../../vendor/dsh/packages/fs/fs-local/lib/index.js'
import { createScope } from '../../vendor/dsh/packages/core/scope/lib/index.js'
import { ToolCallId } from '../../vendor/dsh/packages/llm/llm/lib/index.js'
import SessionStore, { SessionId } from '../../vendor/dsh/packages/core/session/lib/index.js'
import SessionProjectionRegistry from '../../vendor/dsh/packages/session/session-projection/lib/index.js'
import { turnBoundaryProjectionDefinition } from '../../vendor/dsh/packages/core/agent-loop/lib/index.js'
import { TestSessionQueryEngine } from '../../vendor/dsh/packages/session-query/session-query/tests/test-service.ts'
import SystemPrompt from '../../vendor/dsh/packages/core/system-prompt/lib/index.js'
import ToolRuntime from '../../vendor/dsh/packages/core/tools/lib/index.js'
import { provideWorkingDirectoryFixture, unsupportedInbox } from '../../vendor/dsh/packages/test-support/agent-loop-testkit/lib/index.js'
import * as Present from '../../vendor/dsh/packages/deliverables/tool-present/lib/index.js'
import { apply } from '../../packages/company-pack/lib/index.js'

const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

const root = mkdtempSync(join(tmpdir(), 'present-catalog-'))
const workspace = join(root, 'company-workspace')
const home = join(root, 'home')
mkdirSync(join(workspace, 'deliverables/2026-10-25-alpha'), { recursive: true })
mkdirSync(home, { recursive: true })
const finalPath = join(workspace, 'deliverables/2026-10-25-alpha/final.md')
writeFileSync(finalPath, '# final\n')
writeFileSync(join(workspace, 'deliverables/2026-10-25-alpha/meta.md'),
  'slug: alpha\nkickoff: 2026-10-25\n类型: 决策\n结果: 已完成\n一句话结论: present e2e\n')

const saved = { DSH_HOME: process.env.DSH_HOME, DSH_COMPANY_HOME: process.env.DSH_COMPANY_HOME, DSH_COMPANY_BOOTSTRAP: process.env.DSH_COMPANY_BOOTSTRAP }
process.env.DSH_HOME = home
process.env.DSH_COMPANY_HOME = workspace
process.env.DSH_COMPANY_BOOTSTRAP = 'off'

let runtime
try {
  // 1. vendor 侧：真 Cordis + 真 present 工具
  const ctx = new Context()
  runtime = ctx
  provideWorkingDirectoryFixture(ctx)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(LocalFileSystem, { cwd: workspace })
  await ctx.plugin(SessionProjectionRegistry)
  ctx.sessionProjections.register(turnBoundaryProjectionDefinition)
  await ctx.plugin(TestSessionQueryEngine)
  await ctx.plugin(Present, { maxFiles: 2 })

  const id = SessionId('present-owner-1')
  let scope
  const session = ctx.sessions.create(id, { meta: { cwd: workspace } })
  const owner = {
    id, options: {}, session, inbox: unsupportedInbox(), status: 'idle',
    get ctx() { return scope.ctx }, send: () => {}, followup: () => {},
    steer: () => ({ outcome: Promise.resolve({ status: 'rejected' }) }), inject: () => {},
    cancel() {}, runMaintenance: task => task(new AbortController().signal), whenIdle: () => Promise.resolve(),
  }
  await ctx.plugin(Object.assign((inner) => { scope = createScope(inner, owner) }, { inject: ['tools'] }))
  await ctx.agents.register(owner)
  owner.session.append('turn/start', { turn: 1 })
  const result = await ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId('call-present-1'),
    name: 'present',
    arguments: { files: [{ path: 'deliverables/2026-10-25-alpha/final.md' }] },
    agent: owner,
  })
  check('vendor present 工具执行成功', result.isError === false)
  const event = owner.session.snapshotEvents().find(item => item.type === 'deliverables/presented')
  check('vendor 工具真的追加 deliverables/presented', event !== undefined && Array.isArray(event.data?.files))
  check('事件路径是公司盘内的真实路径', event?.data?.files?.[0]?.path === realpathSync(finalPath), String(event?.data?.files?.[0]?.path ?? '无'))

  // 2. host 侧：apply 注册的监听消费同一个真实 event
  const makeHostCtx = (sessionQuery) => {
    const listeners = new Map()
    const ctx = {
      tools: { register: () => {} }, commands: { register: () => {} },
      on: (name, listener) => { listeners.set(name, [...(listeners.get(name) ?? []), listener]) },
      logger: { info: () => {}, warn: (message) => console.error(`  warn ${message}`) },
      get: () => undefined,
      inject: (deps, callback) => { if (sessionQuery !== undefined && deps.includes('sessionQuery')) callback({ sessionQuery }) },
    }
    return { ctx, listeners }
  }
  const first = makeHostCtx()
  apply(first.ctx)
  const eventListeners = first.listeners.get('session/event') ?? []
  check('host apply 注册了 session/event 监听', eventListeners.length > 0)
  for (const listener of eventListeners) listener(owner.session, event)
  const catalog = JSON.parse(readFileSync(join(workspace, 'kb/deliverables-index.json'), 'utf8'))
  const entry = catalog.entries?.find(item => item.slug === 'alpha')
  check('catalog 出现该条目且 presented=true', entry?.presented === true, JSON.stringify(entry ?? null))
  check('catalog 只有这一条', catalog.entries?.length === 1, String(catalog.entries?.length ?? -1))
  const ledgerPath = join(workspace, 'kb/deliverables-presented.json')
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  check('present 写入审计账本', ledger.paths?.['deliverables/2026-10-25-alpha/final.md'] === true, JSON.stringify(ledger))

  // 3. 真重建：删 index + ledger，由 vendor sessionQuery 服务回扫 live session 的真实事件恢复 true
  rmSync(join(workspace, 'kb/deliverables-index.json'), { force: true })
  rmSync(ledgerPath, { force: true })
  apply(makeHostCtx(ctx.sessionQuery).ctx)
  const deadline = Date.now() + 5_000
  while (!existsSync(ledgerPath) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25))
  check('删 index/ledger 后由会话事件重建账本', existsSync(ledgerPath))
  const rebuiltLedger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : {}
  check('重建的 presented=true 来自会话事件', rebuiltLedger.paths?.['deliverables/2026-10-25-alpha/final.md'] === true, JSON.stringify(rebuiltLedger))
  const rebuiltCatalog = JSON.parse(readFileSync(join(workspace, 'kb/deliverables-index.json'), 'utf8'))
  check('重建后 catalog presented=true', rebuiltCatalog.entries?.find(item => item.slug === 'alpha')?.presented === true, JSON.stringify(rebuiltCatalog.entries ?? null))

  // 4. false 审计是显式状态：删 index 不丢
  writeFileSync(ledgerPath, JSON.stringify({
    schema: 1,
    updatedAt: '2026-10-27T00:00:00.000Z',
    paths: { 'deliverables/2026-10-25-alpha/final.md': false },
    slugs: {},
  }, null, 2))
  rmSync(join(workspace, 'kb/deliverables-index.json'), { force: true })
  apply(makeHostCtx().ctx)
  const audited = JSON.parse(readFileSync(join(workspace, 'kb/deliverables-index.json'), 'utf8'))
  check('false 审计在重建索引后仍保留', audited.entries?.find(item => item.slug === 'alpha')?.presented === false, JSON.stringify(audited.entries ?? null))
} catch (error) {
  failures.push(error.message)
  console.error(`present-catalog-smoke: ${error.stack ?? error.message}`)
} finally {
  try { await runtime?.fiber.dispose() } catch (error) { failures.push(String(error?.message ?? error)) }
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  rmSync(root, { recursive: true, force: true })
}
console.log(failures.length === 0
  ? '\npresent-catalog-smoke: ALL PASS（vendor present → session event → host catalog）'
  : `\npresent-catalog-smoke: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1

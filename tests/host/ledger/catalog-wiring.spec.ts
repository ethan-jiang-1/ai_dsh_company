/**
 * host 成品目录接线（2026-11-01 v3）：`apply()` 注册的 `session/event` 监听把 present
 * 写进 host-only 账本并重生成 `.dsh-company/kb/deliverables-index.json`；不写 workspace 根。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../../../packages/company-pack/src/index.ts'
import { createTempEnv, type TempEnv } from '../../support/temp-env.ts'
import { catalogPath } from '../../../packages/company-pack/src/host/ledger/catalog.ts'
import { ledgerFilePath, ledgerKey } from '../../../packages/company-pack/src/host/ledger/presented-domain.ts'
import { canonicalPath } from '../../../packages/company-pack/src/host/run-bundle/paths.ts'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/run-bundle-paths.ts'

let root: string
let workspace: string
let env: TempEnv
const rel = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`

async function waitFor(check: () => boolean, timeoutMs = 2_000): Promise<void> {
  const started = Date.now()
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error('waitFor timeout')
    await new Promise(resolve => setTimeout(resolve, 20))
  }
}

beforeEach(() => {
  env = createTempEnv('catalog-wiring-')
  root = env.dir
  workspace = env.workspace
  mkdirSync(join(workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-alpha'), { recursive: true })
  writeFileSync(join(workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-alpha/final.md'), '# final\n')
  writeFileSync(join(workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-alpha/meta.md'),
    'slug: alpha\nkickoff: 2026-10-25\ntype: decision\nresult: completed\nsummary: wiring\n')
  env.set({ DSH_HOME: root, DSH_COMPANY_HOME: workspace })
})

afterEach(() => { env.cleanup() })

function fakeCtx(options: { domain?: boolean } = {}) {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
  const records = new Map<string, unknown>()
  const table = {
    get: (key: string) => records.get(key),
    put: async (key: string, value: unknown) => { records.set(key, value) },
  }
  const handle = { name: 'company_run_bundle_ledger', table: () => table, close: async () => {} }
  const ctx = {
    tools: { register: () => {} },
    commands: { register: () => {} },
    on: (event: string, listener: (...args: unknown[]) => void) => { listeners.set(event, [...(listeners.get(event) ?? []), listener]) },
    logger: { info: () => {}, warn: () => {} },
    ...(options.domain === true
      ? { get: (name: string) => name === 'storageDomain' ? { open: async () => handle } : undefined, effect: (callback: () => () => void) => callback }
      : { get: () => undefined }),
  }
  return { ctx, listeners, records }
}

describe('host catalog wiring', () => {
  it('present 事件写 host-only 账本并重生成索引', async () => {
    const { ctx, listeners } = fakeCtx()
    apply(ctx as never)
    await waitFor(() => existsSync(catalogPath(workspace)))
    const before = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(before.entries).toHaveLength(1)
    expect(before.entries[0]?.presented).toBeNull()

    for (const listener of listeners.get('session/event') ?? []) {
      listener({}, { type: 'deliverables/presented', data: { files: [{ path: join(workspace, rel) }] } })
    }
    await waitFor(() => {
      const current = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
      return current.entries[0]?.presented === true
    })
    const ledger = JSON.parse(readFileSync(ledgerFilePath(root, canonicalPath(workspace)), 'utf8')) as { paths: Record<string, boolean> }
    expect(ledger.paths[rel]).toBe(true)
    expect(existsSync(join(workspace, RUN_BUNDLE_PATHS.presented))).toBe(false)
  })

  it('domain 可用时走 domain，按 workspace key 分区；模型写 workspace 文件不改权威', async () => {
    const { ctx, records, listeners } = fakeCtx({ domain: true })
    apply(ctx as never)
    await waitFor(() => records.has(ledgerKey(canonicalPath(workspace))))
    expect(records.get(ledgerKey(canonicalPath(workspace)))).toMatchObject({ workspace: canonicalPath(workspace), paths: {} })
    const before = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(before.entries[0]?.presented).toBeNull()

    // 模型/外部直接往盘上写一份成品目录（不经 present）：盘上出现 ≠ 成品。
    // 权威只来自 present 事件 + domain 账本；索引重生成后，多出来的目录只能是「未核」（null）。
    mkdirSync(join(workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-26-model'), { recursive: true })
    writeFileSync(join(workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-26-model/final.md'), '# model wrote this\n')
    for (const listener of listeners.get('session/event') ?? []) {
      listener({}, { type: 'deliverables/presented', data: { files: [{ path: join(workspace, rel) }] } })
    }
    await waitFor(() => {
      const current = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
      return current.entries.some(entry => entry.presented === true)
    })
    const after = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { dir: string; presented: boolean | null }[] }
    expect(after.entries.find(entry => entry.dir === '2026-10-25-alpha')?.presented).toBe(true)
    expect(after.entries.find(entry => entry.dir === '2026-10-26-model')?.presented).toBeNull()
  })

  it('host guard：session cwd 不在 workspace → 告警；子目录 → 提示用根', () => {
    const { ctx, listeners } = fakeCtx()
    const warn = vi.spyOn(ctx.logger, 'warn')
    apply(ctx as never)
    const added = listeners.get('api-session/added') ?? []
    expect(added.length).toBeGreaterThan(0)
    for (const listener of added) (listener as (arg: unknown) => void)({ origin: 'root', sessionId: 'session-outside', cwd: join(root, 'elsewhere'), running: true })
    expect((warn.mock.calls as unknown as Array<[unknown]>).some(([message]) => String(message).includes('不在 workspace'))).toBe(true)
    for (const listener of added) (listener as (arg: unknown) => void)({ origin: 'root', sessionId: 'session-inside', cwd: workspace, running: true })
    expect((warn.mock.calls as unknown as Array<[unknown]>).some(([message]) => String(message).includes('session-inside'))).toBe(false)
    mkdirSync(join(workspace, 'sub'), { recursive: true })
    for (const listener of added) (listener as (arg: unknown) => void)({ origin: 'root', sessionId: 'session-sub', cwd: join(workspace, 'sub'), running: true })
    expect((warn.mock.calls as unknown as Array<[unknown]>).some(([message]) => String(message).includes('不是根'))).toBe(true)
  })

  it('损坏的 bundle.json 告警且不覆盖', () => {
    mkdirSync(join(workspace, RUN_BUNDLE_PATHS.root), { recursive: true })
    const path = join(workspace, RUN_BUNDLE_PATHS.manifest)
    writeFileSync(path, '{"v":3,"id":"cut')
    const { ctx } = fakeCtx()
    const warn = vi.spyOn(ctx.logger, 'warn')
    apply(ctx as never)
    expect((warn.mock.calls as unknown as Array<[unknown]>).some(([message]) => String(message).includes('bundle.json 损坏'))).toBe(true)
    expect(readFileSync(path, 'utf8')).toBe('{"v":3,"id":"cut')
  })
})

describe('deliverables 审计命令', () => {
  it('/deliverables audit 写 false 并重生成索引', async () => {
    const commands: unknown[] = []
    const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
    const ctx = {
      tools: { register: () => {} },
      commands: { register: (definition: unknown) => { commands.push(definition); return () => {} } },
      on: (event: string, listener: (...args: unknown[]) => void) => { listeners.set(event, [...(listeners.get(event) ?? []), listener]) },
      logger: { info: () => {}, warn: () => {} },
      get: () => undefined,
    }
    apply(ctx as never)
    await waitFor(() => existsSync(catalogPath(workspace)))
    const command = commands.find(entry => (entry as { name?: string }).name === 'deliverables') as { handler: (input: unknown) => Promise<unknown> } | undefined
    expect(command).toBeDefined()
    const result = await command!.handler({ rawInput: `audit ${rel} false`, agent: undefined, signal: new AbortController().signal })
    expect(result).toMatchObject({ kind: 'success' })
    const ledger = JSON.parse(readFileSync(ledgerFilePath(root, canonicalPath(workspace)), 'utf8')) as { paths: Record<string, boolean> }
    expect(ledger.paths[rel]).toBe(false)
    const catalog = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(catalog.entries[0]?.presented).toBe(false)
    void listeners
  })
})

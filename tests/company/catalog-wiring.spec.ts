/**
 * host 成品目录接线（2026-10-25 审查补证）：`apply()` 注册的 `session/event` 监听在收到
 * present 事件后，真的把 `presented` 写进 catalog。之前只测了纯函数，没有测接线；
 * 这里用最小 ctx 桩 + 真培养注册（tools/commands 桩），跑真 `apply`。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apply } from '../../packages/company-pack/src/index.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'
import { catalogPath, presentedLedgerPath, writePresentedLedger } from '../../packages/company-pack/src/host/catalog.ts'

let root: string
let workspace: string
let env: TempEnv

beforeEach(() => {
  env = createTempEnv('catalog-wiring-')
  root = env.dir
  workspace = env.workspace
  mkdirSync(join(workspace, 'deliverables/2026-10-25-alpha'), { recursive: true })
  writeFileSync(join(workspace, 'deliverables/2026-10-25-alpha/final.md'), '# final\n')
  writeFileSync(join(workspace, 'deliverables/2026-10-25-alpha/meta.md'),
    'slug: alpha\nkickoff: 2026-10-25\n类型: 决策\n结果: 已完成\n一句话结论: wiring\n')
  env.set({
    DSH_HOME: root,
    DSH_COMPANY_HOME: workspace,
    DSH_COMPANY_BOOTSTRAP: 'off',
  })
})

afterEach(() => { env.cleanup() })

describe('host catalog wiring', () => {
  it('apply 注册的 session/event 监听把 present 事件写进 catalog', () => {
    const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
    const ctx = {
      tools: { register: () => {} },
      commands: { register: () => {} },
      on: (event: string, listener: (...args: unknown[]) => void) => { listeners.set(event, [...(listeners.get(event) ?? []), listener]) },
      logger: { info: () => {}, warn: () => {} },
    }
    apply(ctx as never)
    const before = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(before.entries).toHaveLength(1)
    expect(before.entries[0]?.presented).toBeNull()

    const eventListeners = listeners.get('session/event') ?? []
    expect(eventListeners.length).toBeGreaterThan(0)
    for (const listener of eventListeners) listener({}, {
      type: 'deliverables/presented',
      data: { files: [{ path: join(workspace, 'deliverables/2026-10-25-alpha/final.md') }] },
    })

    const after = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(after.entries).toHaveLength(1)
    expect(after.entries[0]?.presented).toBe(true)
    const ledger = JSON.parse(readFileSync(presentedLedgerPath(workspace), 'utf8')) as { paths: Record<string, boolean> }
    expect(ledger.paths['deliverables/2026-10-25-alpha/final.md']).toBe(true)
  })

  it('storageDomain 可用时账本走 domain；模型写旧 W 文件不改权威', async () => {
    writePresentedLedger(workspace, {
      schema: 1,
      updatedAt: '2026-10-25T00:00:00.000Z',
      paths: { 'deliverables/2026-10-25-alpha/final.md': false },
      slugs: {},
    })
    const records = new Map<string, unknown>()
    const table = {
      get: (key: string) => records.get(key),
      put: async (key: string, value: unknown) => { records.set(key, value) },
    }
    const handle = { name: 'company_deliverables', table: () => table, close: async () => {} }
    const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
    const ctx = {
      tools: { register: () => {} },
      commands: { register: () => {} },
      on: (event: string, listener: (...args: unknown[]) => void) => { listeners.set(event, [...(listeners.get(event) ?? []), listener]) },
      logger: { info: () => {}, warn: () => {} },
      get: (name: string) => name === 'storageDomain' ? { open: async () => handle } : undefined,
      effect: (callback: () => () => void) => callback,
    }
    apply(ctx as never)
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(records.get('state')).toMatchObject({ paths: { 'deliverables/2026-10-25-alpha/final.md': false } })
    const before = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(before.entries[0]?.presented).toBe(false)

    for (const listener of listeners.get('session/event') ?? []) {
      listener({}, {
        type: 'deliverables/presented',
        data: { files: [{ path: join(workspace, 'deliverables/2026-10-25-alpha/final.md') }] },
      })
    }
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(records.get('state')).toMatchObject({ paths: { 'deliverables/2026-10-25-alpha/final.md': true } })
    const after = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(after.entries[0]?.presented).toBe(true)

    // 模型改旧 W 账本不该影响 domain 权威。
    writePresentedLedger(workspace, {
      schema: 1,
      updatedAt: '2026-10-25T00:00:00.000Z',
      paths: { 'deliverables/2026-10-25-alpha/final.md': false },
      slugs: {},
    })
    expect(records.get('state')).toMatchObject({ paths: { 'deliverables/2026-10-25-alpha/final.md': true } })
  })

  it('host guard：session cwd 不在公司盘 → 告警', () => {
    const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
    const warn = vi.fn()
    const ctx = {
      tools: { register: () => {} },
      commands: { register: () => {} },
      on: (event: string, listener: (...args: unknown[]) => void) => { listeners.set(event, [...(listeners.get(event) ?? []), listener]) },
      logger: { info: () => {}, warn },
    }
    apply(ctx as never)
    const added = listeners.get('api-session/added') ?? []
    expect(added.length).toBeGreaterThan(0)
    for (const listener of added) listener({ origin: 'root', sessionId: 'session-outside', cwd: join(root, 'elsewhere'), running: true })
    expect(warn.mock.calls.some(([message]) => String(message).includes('不在公司盘'))).toBe(true)
    for (const listener of added) listener({ origin: 'root', sessionId: 'session-inside', cwd: workspace, running: true })
    expect(warn.mock.calls.some(([message]) => String(message).includes('session-inside'))).toBe(false)
    mkdirSync(join(workspace, 'sub'), { recursive: true })
    for (const listener of added) listener({ origin: 'root', sessionId: 'session-sub', cwd: join(workspace, 'sub'), running: true })
    expect(warn.mock.calls.some(([message]) => String(message).includes('不是公司盘根'))).toBe(true)
  })

  it('损坏的 bundle.json 告警且不覆盖（不把损坏当首启）', () => {
    const path = join(root, 'bundle.json')
    writeFileSync(path, '{"v":1,"id":"cut')
    const warn = vi.fn()
    const ctx = {
      tools: { register: () => {} },
      commands: { register: () => {} },
      on: () => {},
      logger: { info: () => {}, warn },
    }
    apply(ctx as never)
    expect(warn.mock.calls.some(([message]) => String(message).includes('bundle.json 损坏'))).toBe(true)
    expect(readFileSync(path, 'utf8')).toBe('{"v":1,"id":"cut')
  })
})


describe('deliverables 审计命令（2026-10-27 F7）', () => {
  it('/deliverables audit 写 false 并重生成索引', async () => {
    const commands: unknown[] = []
    const ctx = {
      tools: { register: () => {} },
      commands: { register: (definition: unknown) => { commands.push(definition); return () => {} } },
      on: () => {},
      logger: { info: () => {}, warn: () => {} },
      get: () => undefined,
    }
    apply(ctx as never)
    const command = commands.find(entry => (entry as { name?: string }).name === 'deliverables') as { handler: (input: unknown) => Promise<unknown> } | undefined
    expect(command).toBeDefined()
    const result = await command!.handler({ rawInput: 'audit deliverables/2026-10-25-alpha/final.md false', agent: undefined, signal: new AbortController().signal })
    expect(result).toMatchObject({ kind: 'success' })
    const ledger = JSON.parse(readFileSync(presentedLedgerPath(workspace), 'utf8')) as { paths: Record<string, boolean> }
    expect(ledger.paths['deliverables/2026-10-25-alpha/final.md']).toBe(false)
    const catalog = JSON.parse(readFileSync(catalogPath(workspace), 'utf8')) as { entries: { presented: boolean | null }[] }
    expect(catalog.entries[0]?.presented).toBe(false)
  })
})

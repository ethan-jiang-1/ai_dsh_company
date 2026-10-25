/**
 * host 成品目录接线（2026-10-25 审查补证）：`apply()` 注册的 `session/event` 监听在收到
 * present 事件后，真的把 `presented` 写进 catalog。之前只测了纯函数，没有测接线；
 * 这里用最小 ctx 桩 + 真培养注册（tools/commands 桩），跑真 `apply`。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apply } from '../../packages/company-pack/src/index.ts'
import { catalogPath } from '../../packages/company-pack/src/host/catalog.ts'

let root: string
let workspace: string
let saved: Record<string, string | undefined>

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'catalog-wiring-'))
  workspace = join(root, 'company-workspace')
  mkdirSync(join(workspace, 'deliverables/2026-10-25-alpha'), { recursive: true })
  writeFileSync(join(workspace, 'deliverables/2026-10-25-alpha/final.md'), '# final\n')
  writeFileSync(join(workspace, 'deliverables/2026-10-25-alpha/meta.md'),
    'slug: alpha\nkickoff: 2026-10-25\n类型: 决策\n结果: 已完成\n一句话结论: wiring\n')
  saved = {
    DSH_HOME: process.env.DSH_HOME,
    DSH_COMPANY_HOME: process.env.DSH_COMPANY_HOME,
    DSH_COMPANY_BOOTSTRAP: process.env.DSH_COMPANY_BOOTSTRAP,
  }
  process.env.DSH_HOME = root
  process.env.DSH_COMPANY_HOME = workspace
  process.env.DSH_COMPANY_BOOTSTRAP = 'off'
})

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  rmSync(root, { recursive: true, force: true })
})

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

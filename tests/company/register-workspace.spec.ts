/**
 * boot 时 workspace 登记的 keyless 完成定义（2026-11-01 产品化）。
 *
 * 判据：无 env/坏路径/不安全落点 ⇒ 不调用 registry；合法路径 ⇒ create(canonical)；
 * registry 抛错 ⇒ 只 warn、不抛（不能连累 boot）。
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../../packages/company-pack/src/host/register-workspace.ts'

const roots: string[] = []
const saved = { ...process.env }
afterEach(() => {
  for (const key of ['DSH_HOME', 'DSH_COMPANY_HOME']) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function ctxWith(create = vi.fn(async path => ({ id: 'ws-1', path }))): { ctx: Record<string, unknown>; create: typeof create; warn: ReturnType<typeof vi.fn> } {
  const warn = vi.fn()
  return {
    ctx: { logger: { info: vi.fn(), warn }, workspaceRegistry: { create } },
    create: create as typeof create,
    warn,
  }
}

describe('register-workspace row', () => {
  it('无 DSH_COMPANY_HOME ⇒ 不登记', async () => {
    const { ctx, create } = ctxWith()
    delete process.env.DSH_COMPANY_HOME
    await apply(ctx as never)
    expect(create).not.toHaveBeenCalled()
  })

  it('合法 workspace ⇒ create(canonical path)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'register-ws-'))
    roots.push(root)
    const ws = join(root, 'company')
    mkdirSync(ws, { recursive: true })
    process.env.DSH_HOME = join(root, 'home')
    process.env.DSH_COMPANY_HOME = ws
    const { ctx, create } = ctxWith()
    await apply(ctx as never)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0]?.[0]).toContain('company')
  })

  it('workspace == DSH_HOME ⇒ 不登记（落点不安全）', async () => {
    const root = mkdtempSync(join(tmpdir(), 'register-ws-'))
    roots.push(root)
    process.env.DSH_HOME = root
    process.env.DSH_COMPANY_HOME = root
    const { ctx, create, warn } = ctxWith()
    await apply(ctx as never)
    expect(create).not.toHaveBeenCalled()
    expect(warn.mock.calls.some(([message]) => String(message).includes('落点不安全'))).toBe(true)
  })

  it('路径不存在 ⇒ 不登记', async () => {
    const root = mkdtempSync(join(tmpdir(), 'register-ws-'))
    roots.push(root)
    process.env.DSH_HOME = join(root, 'home')
    process.env.DSH_COMPANY_HOME = join(root, 'missing')
    const { ctx, create, warn } = ctxWith()
    await apply(ctx as never)
    expect(create).not.toHaveBeenCalled()
    expect(warn.mock.calls.some(([message]) => String(message).includes('不存在'))).toBe(true)
  })

  it('registry 抛错 ⇒ 不抛、只 warn', async () => {
    const root = mkdtempSync(join(tmpdir(), 'register-ws-'))
    roots.push(root)
    const ws = join(root, 'company')
    mkdirSync(ws, { recursive: true })
    process.env.DSH_HOME = join(root, 'home')
    process.env.DSH_COMPANY_HOME = ws
    const create = vi.fn(async () => { throw new Error('boom') })
    const { ctx, warn } = ctxWith(create as never)
    await expect(apply(ctx as never)).resolves.toBeUndefined()
    expect(warn.mock.calls.some(([message]) => String(message).includes('登记失败'))).toBe(true)
  })
})

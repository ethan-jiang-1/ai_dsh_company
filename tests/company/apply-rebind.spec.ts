/**
 * host apply 的 workspace/迁移/停写接线（2026-11-01 产品化改版；原“显式换盘”已退役）。
 *
 * 判据：
 * - 没有 DSH_COMPANY_HOME ⇒ 不 seed、不写 home bundle；
 * - DSH_COMPANY_HOME == DSH_HOME / 损坏 workspace manifest ⇒ 停写、不覆盖；
 * - v1 home manifest + 匹配 workspace ⇒ 迁移到 workspace v2，id 保留，旧文件改名；
 * - DSH_COMPANY_REBIND 设置时只告警“已退役”，不改任何盘。
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../../packages/company-pack/src/index.ts'
import { bundleManifestPath, readBundleManifestState } from '../../packages/company-pack/src/host/bundle-manifest.ts'

const roots: string[] = []
const saved = { ...process.env }

afterEach(() => {
  for (const key of ['DSH_HOME', 'DSH_COMPANY_HOME', 'DSH_COMPANY_BOOTSTRAP', 'DSH_COMPANY_REBIND']) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function workspaceAt(): { root: string; ws: string } {
  const root = mkdtempSync(join(tmpdir(), 'apply-product-'))
  roots.push(root)
  const ws = join(root, 'company')
  cpSync(join(process.cwd(), 'packages/company-pack/workspace'), ws, { recursive: true })
  return { root, ws }
}

function ctxStub(): Record<string, unknown> {
  return {
    tools: { register: () => {} },
    commands: { register: () => {} },
    on: () => {},
    logger: { info: vi.fn(), warn: vi.fn() },
    get: () => undefined,
  }
}

function runWithEnv(root: string, ws: string | undefined, extra: Record<string, string> = {}): { warn: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn>; ctx: Record<string, unknown> } {
  process.env.DSH_HOME = root
  if (ws === undefined) delete process.env.DSH_COMPANY_HOME
  else process.env.DSH_COMPANY_HOME = ws
  process.env.DSH_COMPANY_BOOTSTRAP = 'if-missing'
  for (const [key, value] of Object.entries(extra)) process.env[key] = value
  const warn = vi.fn()
  const info = vi.fn()
  const ctx = { ...ctxStub(), logger: { info, warn } }
  apply(ctx as never)
  return { warn, info, ctx }
}

describe('host apply 的 workspace 接线', () => {
  it('没有 workspace ⇒ 不 seed、不写 home bundle、告警可操作', () => {
    const { root } = workspaceAt()
    try {
      const { warn } = runWithEnv(root, undefined)
      expect(warn.mock.calls.some(([message]) => String(message).includes('未指定公司 workspace'))).toBe(true)
      expect(existsSync(join(root, 'bundle.json'))).toBe(false)
      expect(existsSync(join(root, 'AGENTS.md'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('workspace == DSH_HOME ⇒ 停写、不把公司盘写进 home 根', () => {
    const { root } = workspaceAt()
    try {
      const { warn } = runWithEnv(root, root)
      expect(warn.mock.calls.some(([message]) => String(message).includes('落点不安全'))).toBe(true)
      expect(existsSync(join(root, 'bundle.json'))).toBe(false)
      expect(existsSync(join(root, 'AGENTS.md'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('损坏 workspace manifest ⇒ 停写、保留原文件', () => {
    const { root, ws } = workspaceAt()
    try {
      mkdirSync(join(ws, '.dsh-company'), { recursive: true })
      const path = bundleManifestPath(ws)
      writeFileSync(path, '{"v":2,"id":"cut')
      const { warn } = runWithEnv(root, ws)
      expect(warn.mock.calls.some(([message]) => String(message).includes('bundle.json 损坏'))).toBe(true)
      expect(readFileSync(path, 'utf8')).toBe('{"v":2,"id":"cut')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('v1 home manifest + 匹配 workspace ⇒ 迁移到 workspace v2，id 保留，旧文件改名', () => {
    const { root, ws } = workspaceAt()
    try {
      writeFileSync(join(root, 'bundle.json'), JSON.stringify({
        v: 1,
        id: 'bundle-legacy',
        createdAt: '2026-10-24T00:00:00.000Z',
        pack: { name: 'dsh-company-pack', version: '0.4.6' },
        workspace: ws,
        skeleton: { version: '0.4.6', files: { 'AGENTS.md': 'oldhash' } },
      }))
      runWithEnv(root, ws)
      const state = readBundleManifestState(ws)
      expect(state.status).toBe('ok')
      if (state.status !== 'ok') return
      expect(state.manifest.id).toBe('bundle-legacy')
      expect(existsSync(join(root, 'bundle.json'))).toBe(false)
      expect(existsSync(bundleManifestPath(ws))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('DSH_COMPANY_REBIND 设置 ⇒ 只告警“已退役”，不改盘', () => {
    const { root, ws } = workspaceAt()
    try {
      const { warn } = runWithEnv(root, ws, { DSH_COMPANY_REBIND: '1' })
      expect(warn.mock.calls.some(([message]) => String(message).includes('已退役'))).toBe(true)
      expect(existsSync(join(root, 'bundle.json'))).toBe(false)
      expect(existsSync(join(root, 'bundle.json.bak-x'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

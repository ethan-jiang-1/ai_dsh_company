/**
 * host apply 的显式换盘接线（2026-10-27 FAQ 26 数据模型对齐 P0）。
 *
 * 判据：`DSH_COMPANY_REBIND=1` + 旧盘已搬走 + 新盘形状对 ⇒ apply 改写 bundle.json、留备份、
 * 记升级日志，并继续用新盘；旧盘仍在 ⇒ 拒绝且 manifest 字节不变。
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../../packages/company-pack/src/index.ts'
import {
  bundleManifestPath,
  planBundleManifest,
  readBundleManifest,
  writeBundleManifest,
} from '../../packages/company-pack/src/host/bundle-manifest.ts'

const PACK = { name: 'dsh-company-pack', version: '0.3.10' }
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
  const root = mkdtempSync(join(tmpdir(), 'apply-rebind-'))
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

describe('host apply 显式换盘', () => {
  it('另一个 writer 持锁 ⇒ 公司数据停写并点名', () => {
    const home = workspaceAt()
    try {
      writeFileSync(join(home.root, 'company-pack.lock'), JSON.stringify({
        schema: 1, pid: process.ppid, token: 'other', startedAt: 'x',
      }))
      const warn = vi.fn()
      const ctx = { ...ctxStub(), logger: { info: vi.fn(), warn } }
      process.env.DSH_HOME = home.root
      process.env.DSH_COMPANY_HOME = home.ws
      process.env.DSH_COMPANY_BOOTSTRAP = 'if-missing'
      apply(ctx as never)
      expect(warn.mock.calls.some(([message]) => String(message).includes('另一个 writer'))).toBe(true)
      expect(existsSync(join(home.root, 'bundle.json'))).toBe(false)
      expect(existsSync(join(home.ws, 'kb/deliverables-index.json'))).toBe(false)
    } finally {
      rmSync(home.root, { recursive: true, force: true })
    }
  })

  it('同 home 多个 profile 装本包 ⇒ 启动点名方法层不共享', () => {
    const home = workspaceAt()
    try {
      for (const name of ['web', 'web-b']) {
        const dir = join(home.root, 'profiles', name)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['dsh-company-pack'] } } }))
      }
      const warn = vi.fn()
      const ctx = { ...ctxStub(), logger: { info: vi.fn(), warn } }
      process.env.DSH_HOME = home.root
      process.env.DSH_COMPANY_HOME = home.ws
      process.env.DSH_COMPANY_BOOTSTRAP = 'off'
      apply(ctx as never)
      expect(warn.mock.calls.some(([message]) => String(message).includes('方法层按 profile 隔离'))).toBe(true)
    } finally {
      rmSync(home.root, { recursive: true, force: true })
    }
  })

  it('DSH_COMPANY_HOME=DSH_HOME ⇒ 不把公司盘写进 home 根', () => {
    const home = workspaceAt()
    try {
      process.env.DSH_HOME = home.root
      process.env.DSH_COMPANY_HOME = home.root
      process.env.DSH_COMPANY_BOOTSTRAP = 'if-missing'
      apply(ctxStub() as never)
      expect(existsSync(join(home.root, 'AGENTS.md'))).toBe(false)
      expect(existsSync(join(home.root, 'kb'))).toBe(false)
      expect(existsSync(join(home.root, 'bundle.json'))).toBe(false)
    } finally {
      rmSync(home.root, { recursive: true, force: true })
    }
  })

  it('损坏 manifest ⇒ 不写默认盘、不覆盖原文件', () => {
    const home = workspaceAt()
    const newCompany = join(home.root, 'new-company')
    try {
      const corrupt = '{"v":1,"id":"cut'
      writeFileSync(join(home.root, 'bundle.json'), corrupt)
      process.env.DSH_HOME = home.root
      process.env.DSH_COMPANY_HOME = newCompany
      process.env.DSH_COMPANY_BOOTSTRAP = 'if-missing'
      apply(ctxStub() as never)
      expect(existsSync(newCompany)).toBe(false)
      expect(readFileSync(join(home.root, 'bundle.json'), 'utf8')).toBe(corrupt)
    } finally {
      rmSync(home.root, { recursive: true, force: true })
    }
  })

  it('旧盘搬走 + 新盘形状对 ⇒ 改写 workspace、备份原 manifest、继续用新盘', () => {
    const home = workspaceAt()
    const target = workspaceAt()
    const skel = join(process.cwd(), 'packages/company-pack/workspace')
    try {
      const plan = planBundleManifest({ dshHome: home.root, companyHome: home.ws, skeletonDir: skel, pack: PACK, id: 'apply-rebind' })
      writeBundleManifest(plan)
      const before = readFileSync(bundleManifestPath(home.root), 'utf8')
      rmSync(target.ws, { recursive: true, force: true })
      renameSync(home.ws, target.ws)

      process.env.DSH_HOME = home.root
      process.env.DSH_COMPANY_HOME = target.ws
      process.env.DSH_COMPANY_BOOTSTRAP = 'off'
      process.env.DSH_COMPANY_REBIND = '1'
      apply(ctxStub() as never)

      const manifest = readBundleManifest(home.root)
      expect(manifest?.id).toBe('apply-rebind')
      expect(manifest?.workspace).toBe(target.ws.split('\\').join('/'))
      const backups = readdirSync(home.root).filter(name => name.startsWith('bundle.json.bak-'))
      expect(backups).toHaveLength(1)
      expect(readFileSync(join(home.root, backups[0]!), 'utf8')).toBe(before)
      expect(readFileSync(join(home.root, 'logs/company-pack-upgrade.log'), 'utf8')).toContain('换盘')
      expect(existsSync(join(target.ws, 'kb/deliverables-index.json'))).toBe(true)
    } finally {
      rmSync(home.root, { recursive: true, force: true })
      rmSync(target.root, { recursive: true, force: true })
    }
  })

  it('旧盘仍在 ⇒ 拒绝换盘，manifest 字节不变', () => {
    const home = workspaceAt()
    const target = workspaceAt()
    const skel = join(process.cwd(), 'packages/company-pack/workspace')
    try {
      const plan = planBundleManifest({ dshHome: home.root, companyHome: home.ws, skeletonDir: skel, pack: PACK, id: 'apply-refuse' })
      writeBundleManifest(plan)
      const before = readFileSync(bundleManifestPath(home.root), 'utf8')

      process.env.DSH_HOME = home.root
      process.env.DSH_COMPANY_HOME = target.ws
      process.env.DSH_COMPANY_BOOTSTRAP = 'off'
      process.env.DSH_COMPANY_REBIND = '1'
      apply(ctxStub() as never)

      expect(readFileSync(bundleManifestPath(home.root), 'utf8')).toBe(before)
      expect(readdirSync(home.root).some(name => name.startsWith('bundle.json.bak-'))).toBe(false)
    } finally {
      rmSync(home.root, { recursive: true, force: true })
      rmSync(target.root, { recursive: true, force: true })
    }
  })
})

/**
 * run bundle manifest v3 的 keyless 完成定义（2026-11-01）。
 *
 * 判据：
 * - 身份住 `<workspace>/.dsh-company/bundle.json`；
 * - v3 只记 `v/id/createdAt/pack/runBundle.schema`，不含 workspace/handbookTarget/skeleton；
 * - 只创建、不覆盖；home 留 identity 备份；
 * - v2 原地升 v3，保留 id/createdAt，旧文件备份 `bundle.v2.json`；
 * - 损坏/更高版本 fail loud（返回状态、保留原文件），不 cast、不覆盖。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUNDLE_MANIFEST_VERSION,
  appendUpgradeLog,
  bundleManifestPath,
  identityBackupPath,
  planBundleManifest,
  readBundleManifestState,
  writeBundleManifest,
} from '../../packages/company-pack/src/host/bundle-manifest.ts'

const PACK = { name: 'dsh-company-pack', version: '0.6.0' }

const workspace = (): string => mkdtempSync(join(tmpdir(), 'company-manifest-ws-'))
const home = (): string => mkdtempSync(join(tmpdir(), 'company-manifest-home-'))

function create(dshHome: string, ws: string, pack = PACK) {
  const plan = planBundleManifest({ dshHome, workspace: ws, pack })
  const written = writeBundleManifest(plan)
  return { plan, written }
}

describe('bundle.json v3：身份与位置', () => {
  it('路径在 workspace/.dsh-company；v3 形状无 workspace/handbookTarget/skeleton', () => {
    const h = home()
    const ws = workspace()
    try {
      const { plan, written } = create(h, ws)
      expect(written.created).toBe(true)
      expect(plan.path).toBe(bundleManifestPath(ws))
      const parsed = JSON.parse(readFileSync(plan.path, 'utf8'))
      expect(parsed.v).toBe(BUNDLE_MANIFEST_VERSION)
      expect(parsed.v).toBe(3)
      expect(parsed.workspace).toBeUndefined()
      expect(parsed.handbookTarget).toBeUndefined()
      expect(parsed.skeleton).toBeUndefined()
      expect(parsed.id).toMatch(/^bundle-/)
      expect(parsed.pack).toEqual(PACK)
      expect(parsed.runBundle).toEqual({ schema: 1 })
      expect(existsSync(identityBackupPath(h, parsed.id))).toBe(true)
    } finally {
      rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
    }
  })

  it('只创建、不覆盖：第二次 skip，字节不变', () => {
    const h = home()
    const ws = workspace()
    try {
      const first = create(h, ws)
      const bytes = readFileSync(first.plan.path, 'utf8')
      const second = create(h, ws)
      expect(second.written.created).toBe(false)
      expect(readFileSync(first.plan.path, 'utf8')).toBe(bytes)
    } finally {
      rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
    }
  })

  it('hard link 不支持 ⇒ wx 回退并仍不覆盖', () => {
    const h = home()
    const ws = workspace()
    try {
      const plan = planBundleManifest({ dshHome: h, workspace: ws, pack: PACK })
      const result = writeBundleManifest(plan, {
        link: () => { throw Object.assign(new Error('nope'), { code: 'EPERM' }) },
      })
      expect(result).toMatchObject({ created: true, fallback: 'wx' })
      expect(existsSync(plan.path)).toBe(true)
    } finally {
      rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
    }
  })
})

describe('bundle.json v3：损坏、版本与 v2 升级', () => {
  it('损坏保留原文件；更高版本 unsupported；v2 标 legacy 并可原地升级', () => {
    const h = home()
    const ws = workspace()
    try {
      const path = bundleManifestPath(ws)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, '{"v":3,"id":"cut')
      const corrupt = readBundleManifestState(ws)
      expect(corrupt.status).toBe('corrupt')
      expect(readFileSync(path, 'utf8')).toBe('{"v":3,"id":"cut')

      writeFileSync(path, JSON.stringify({ v: 99, id: 'x', createdAt: 't', pack: PACK, runBundle: { schema: 1 } }))
      expect(readBundleManifestState(ws).status).toBe('unsupported')

      writeFileSync(path, JSON.stringify({
        v: 2,
        id: 'bundle-legacy',
        createdAt: '2026-10-24T00:00:00.000Z',
        pack: PACK,
        handbookTarget: 'AGENTS.md',
        skeleton: { version: '0.5.0', files: {} },
      }))
      const legacy = readBundleManifestState(ws)
      expect(legacy.status).toBe('legacy')
      const { plan, written } = create(h, ws)
      expect(written.upgraded).toBe(true)
      const upgraded = readBundleManifestState(ws)
      expect(upgraded.status).toBe('ok')
      if (upgraded.status !== 'ok') return
      expect(upgraded.manifest.id).toBe('bundle-legacy')
      expect(upgraded.manifest.createdAt).toBe('2026-10-24T00:00:00.000Z')
      expect(plan.legacyPath).toBe(`${path}.v2.bak`)
      expect(existsSync(`${path}.v2.bak`)).toBe(true)
    } finally {
      rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
    }
  })
})

describe('升级日志', () => {
  it('写到 workspace/.dsh-company/logs/company-pack-upgrade.log', () => {
    const ws = workspace()
    try {
      appendUpgradeLog(ws, 'upgrade-test')
      expect(readFileSync(join(ws, '.dsh-company/logs/company-pack-upgrade.log'), 'utf8')).toContain('upgrade-test')
    } finally {
      rmSync(ws, { recursive: true, force: true })
    }
  })
})

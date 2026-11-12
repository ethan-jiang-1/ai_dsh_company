// 负例留证 2026-11-13：去掉 ensureCompanyRoot + 直写 ⇒ root-symlink bundle 写外部、read 不 corrupt（BUG-148）；safe 写即绿。
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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
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
} from '../../../packages/company-pack/src/host/run-bundle/bundle-manifest.ts'

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

  it('create 既有 bundle 不覆盖（原子写也保持 create 语义）', () => {
    const h = home()
    const ws = workspace()
    try {
      const plan = planBundleManifest({ dshHome: h, workspace: ws, pack: PACK })
      expect(writeBundleManifest(plan)).toMatchObject({ created: true })
      expect(existsSync(plan.path)).toBe(true)
      expect(writeBundleManifest(plan)).toMatchObject({ created: false, skipped: true })
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

  it('不安全 id 不穿出身份目录：v3 判 corrupt；v2 升级换安全 id；identityBackupPath 拒绝', () => {
    const h = home()
    const ws = workspace()
    try {
      const path = bundleManifestPath(ws)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, JSON.stringify({
        v: 3, id: '../../../pwn', createdAt: 't', pack: PACK, runBundle: { schema: 1 },
      }))
      expect(readBundleManifestState(ws).status).toBe('corrupt')
      expect(() => identityBackupPath(h, '../../../pwn')).toThrow()
      const skipped = create(h, ws)
      expect(skipped.written.skipped).toBe(true)
      expect(existsSync(join(h, '..', 'pwn.json'))).toBe(false)

      writeFileSync(path, JSON.stringify({ v: 2, id: '../pwn', createdAt: 't', pack: PACK }))
      const upgraded = create(h, ws)
      expect(upgraded.written.upgraded).toBe(true)
      const state = readBundleManifestState(ws)
      expect(state.status).toBe('ok')
      if (state.status !== 'ok') return
      expect(state.manifest.id).toMatch(/^bundle-/)
      expect(existsSync(identityBackupPath(h, state.manifest.id))).toBe(true)
      expect(existsSync(join(h, '..', 'pwn.json'))).toBe(false)
    } finally {
      rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
    }
  })

  it('id 是绝对路径 / 含分隔符 / 点段 时同样拒绝', () => {
    const h = home()
    for (const id of ['/abs', 'a/b', '.', '..', '', 'a b', 'x\\y']) {
      expect(() => identityBackupPath(h, id)).toThrow()
    }
    rmSync(h, { recursive: true, force: true })
  })

  it('.dsh-company 是 symlink → bundle 写拒绝、读 corrupt、外部不写（BUG-148）', () => {
    const h = home()
    const ws = workspace()
    const outside = mkdtempSync(join(tmpdir(), 'bundle-root-outside-'))
    try {
      symlinkSync(outside, join(ws, '.dsh-company'))
      const safe = workspace()
      const plan = planBundleManifest({ dshHome: h, workspace: safe, pack: PACK })
      const forced = { ...plan, path: join(ws, '.dsh-company/bundle.json') }
      expect(() => writeBundleManifest(forced)).toThrow(/symlink/)
      rmSync(safe, { recursive: true, force: true })
      expect(existsSync(join(outside, 'bundle.json'))).toBe(false)
      expect(readBundleManifestState(ws).status).toBe('corrupt')
    } finally {
      rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true })
    }
  })
})

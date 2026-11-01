/**
 * run bundle manifest v2 的 keyless 完成定义（2026-11-01 产品化改版）。
 *
 * 判据：
 * - 身份住 `<workspace>/.dsh-company/bundle.json`，v2 无 `workspace` 字段，有 `handbookTarget`；
 * - 只创建、不覆盖；home 留 identity 备份；
 * - 基部升级：未改替换、改过保留、缺失补建、符号链接 keep、第二轮零变更；
 * - v1 home manifest 只在 workspace 匹配时迁移，保留 id/createdAt，旧文件改名；
 * - 损坏/更高版本 fail loud（返回状态、保留原文件），不 cast、不覆盖。
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUNDLE_MANIFEST_VERSION,
  appendUpgradeLog,
  applySkeletonUpgrade,
  bundleManifestPath,
  identityBackupPath,
  migrateLegacyManifest,
  planBundleManifest,
  planSkeletonUpgrade,
  readBundleManifestState,
  readLegacyManifest,
  skeletonDigest,
  writeBundleManifest,
  writeUpgradedManifest,
} from '../../packages/company-pack/src/host/bundle-manifest.ts'

const PACK = { name: 'dsh-company-pack', version: '0.5.0' }
const PACK_V2 = { name: 'dsh-company-pack', version: '0.6.0' }

function skeleton(): string {
  const dir = mkdtempSync(join(tmpdir(), 'company-manifest-skel-'))
  mkdirSync(join(dir, 'kb'), { recursive: true })
  mkdirSync(join(dir, 'templates'), { recursive: true })
  writeFileSync(join(dir, 'AGENTS.md'), '# 手册 v1\n')
  writeFileSync(join(dir, 'kb/org.md'), '# org v1\n')
  writeFileSync(join(dir, 'templates/meta.md'), '# meta v1\n')
  return dir
}

function workspace(): string {
  return mkdtempSync(join(tmpdir(), 'company-manifest-ws-'))
}

function seedWorkspace(ws: string, skel: string): void {
  mkdirSync(join(ws, 'kb'), { recursive: true })
  mkdirSync(join(ws, 'templates'), { recursive: true })
  copyFileSync(join(skel, 'AGENTS.md'), join(ws, 'AGENTS.md'))
  copyFileSync(join(skel, 'kb/org.md'), join(ws, 'kb/org.md'))
  copyFileSync(join(skel, 'templates/meta.md'), join(ws, 'templates/meta.md'))
}

function createManifest(home: string, ws: string, skel: string, pack = PACK, target: 'AGENTS.md' | 'COMPANY.md' = 'AGENTS.md') {
  const plan = planBundleManifest({ dshHome: home, companyHome: ws, skeletonDir: skel, pack, handbookTarget: target })
  const written = writeBundleManifest(plan)
  return { plan, written }
}

describe('bundle.json v2：身份与位置', () => {
  it('路径在 workspace/.dsh-company；v2 形状含 handbookTarget、无 workspace 字段', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-manifest-home-'))
    const ws = workspace()
    const skel = skeleton()
    try {
      const { plan, written } = createManifest(home, ws, skel)
      expect(written.created).toBe(true)
      expect(plan.path).toBe(bundleManifestPath(ws))
      const parsed = JSON.parse(readFileSync(plan.path, 'utf8'))
      expect(parsed.v).toBe(BUNDLE_MANIFEST_VERSION)
      expect(parsed.workspace).toBeUndefined()
      expect(parsed.handbookTarget).toBe('AGENTS.md')
      expect(parsed.id).toMatch(/^bundle-/)
      expect(parsed.pack).toEqual(PACK)
      expect(Object.keys(parsed.skeleton.files)).toContain('AGENTS.md')
      expect(existsSync(identityBackupPath(home, parsed.id))).toBe(true)
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(ws, { recursive: true, force: true })
      rmSync(skel, { recursive: true, force: true })
    }
  })

  it('只创建、不覆盖：第二次调用 skip，字节不变', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-manifest-home-'))
    const ws = workspace()
    const skel = skeleton()
    try {
      const first = createManifest(home, ws, skel)
      const bytes = readFileSync(first.plan.path, 'utf8')
      const second = createManifest(home, ws, skel)
      expect(second.written.created).toBe(false)
      expect(readFileSync(first.plan.path, 'utf8')).toBe(bytes)
    } finally {
      rmSync(home, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }); rmSync(skel, { recursive: true, force: true })
    }
  })

  it('handbookTarget=COMPANY.md 时骨架指纹键用目标名', () => {
    const skel = skeleton()
    try {
      const digest = skeletonDigest(skel, 'COMPANY.md')
      expect(Object.keys(digest)).toContain('COMPANY.md')
      expect(Object.keys(digest)).not.toContain('AGENTS.md')
    } finally {
      rmSync(skel, { recursive: true, force: true })
    }
  })

  it('hard link 不支持 ⇒ wx 回退并仍不覆盖', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-manifest-home-'))
    const ws = workspace()
    const skel = skeleton()
    try {
      const plan = planBundleManifest({ dshHome: home, companyHome: ws, skeletonDir: skel, pack: PACK, handbookTarget: 'AGENTS.md' })
      const result = writeBundleManifest(plan, {
        link: () => { throw Object.assign(new Error('nope'), { code: 'EPERM' }) },
      })
      expect(result).toMatchObject({ created: true, fallback: 'wx' })
      expect(existsSync(plan.path)).toBe(true)
    } finally {
      rmSync(home, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }); rmSync(skel, { recursive: true, force: true })
    }
  })
})

describe('bundle.json v2：损坏与版本', () => {
  it('损坏保留原文件；更高版本 unsupported；v1 直接当 v2 是 corrupt', () => {
    const ws = workspace()
    try {
      const path = bundleManifestPath(ws)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, '{"v":1,"id":"cut')
      const corrupt = readBundleManifestState(ws)
      expect(corrupt.status).toBe('corrupt')
      expect(readFileSync(path, 'utf8')).toBe('{"v":1,"id":"cut')
      writeFileSync(path, JSON.stringify({ v: 99, id: 'x', createdAt: 't', pack: PACK, handbookTarget: 'AGENTS.md', skeleton: { version: '1', files: {} } }))
      expect(readBundleManifestState(ws).status).toBe('unsupported')
      writeFileSync(path, JSON.stringify({ v: 1, id: 'x', createdAt: 't', pack: PACK, workspace: ws, skeleton: { version: '1', files: {} } }))
      expect(readBundleManifestState(ws).status).toBe('corrupt')
    } finally {
      rmSync(ws, { recursive: true, force: true })
    }
  })
})

describe('基部升级（哈希判定）', () => {
  it('未改替换、改过保留、缺失补建、新增补建、第二轮零变更；符号链接 keep', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-manifest-home-'))
    const ws = workspace()
    const skel = skeleton()
    try {
      seedWorkspace(ws, skel)
      const { plan } = createManifest(home, ws, skel)
      // 用户改了手册；org 被删；meta 未改；再加一个用户文件
      writeFileSync(join(ws, 'AGENTS.md'), '# 用户改过\n')
      rmSync(join(ws, 'kb/org.md'))
      writeFileSync(join(ws, 'kb/user.md'), '# user\n')
      const skel2 = skeleton()
      writeFileSync(join(skel2, 'AGENTS.md'), '# 手册 v2\n')
      writeFileSync(join(skel2, 'kb/org.md'), '# org v2\n')
      writeFileSync(join(skel2, 'templates/meta.md'), '# meta v2\n')
      writeFileSync(join(skel2, 'templates/new.md'), '# new\n')
      const upgrade = planSkeletonUpgrade({ manifest: plan.manifest, skeletonDir: skel2, workspace: ws, pack: PACK_V2 })
      const result = applySkeletonUpgrade(upgrade, skel2, ws)
      expect(result.updated).toContain('templates/meta.md')
      expect(result.created).toContain('kb/org.md')
      expect(result.created).toContain('templates/new.md')
      expect(readFileSync(join(ws, 'AGENTS.md'), 'utf8')).toBe('# 用户改过\n')
      expect(readFileSync(join(ws, 'templates/meta.md'), 'utf8')).toBe('# meta v2\n')
      expect(readFileSync(join(ws, 'kb/user.md'), 'utf8')).toBe('# user\n')
      writeUpgradedManifest(bundleManifestPath(ws), upgrade.manifest)
      const again = planSkeletonUpgrade({ manifest: upgrade.manifest, skeletonDir: skel2, workspace: ws, pack: PACK_V2 })
      expect(again.changed).toBe(false)
      expect(again.actions.every(action => action.action === 'keep')).toBe(true)
    } finally {
      rmSync(home, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }); rmSync(skel, { recursive: true, force: true })
    }
  })

  it('基部目标是指向用户文件的符号链接 ⇒ keep，不覆盖', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-manifest-home-'))
    const ws = workspace()
    const skel = skeleton()
    const outside = mkdtempSync(join(tmpdir(), 'company-manifest-outside-'))
    try {
      seedWorkspace(ws, skel)
      const { plan } = createManifest(home, ws, skel)
      writeFileSync(join(outside, 'meta.md'), '# outside\n')
      rmSync(join(ws, 'templates/meta.md'))
      symlinkSync(join(outside, 'meta.md'), join(ws, 'templates/meta.md'))
      const upgrade = planSkeletonUpgrade({ manifest: plan.manifest, skeletonDir: skel, workspace: ws, pack: PACK })
      const meta = upgrade.actions.find(action => action.rel === 'templates/meta.md')
      expect(meta).toMatchObject({ action: 'keep', reason: 'occupied' })
      applySkeletonUpgrade(upgrade, skel, ws)
      expect(readFileSync(join(outside, 'meta.md'), 'utf8')).toBe('# outside\n')
    } finally {
      rmSync(home, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }); rmSync(skel, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true })
    }
  })
})

describe('v1 → v2 迁移', () => {
  it('workspace 匹配：v2 写入 workspace，id/createdAt 保留，旧文件改名，identity 备份在场', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-manifest-home-'))
    const ws = workspace()
    const skel = skeleton()
    try {
      const legacy = {
        v: 1,
        id: 'bundle-legacy',
        createdAt: '2026-10-24T00:00:00.000Z',
        pack: PACK,
        workspace: ws,
        skeleton: { version: '0.4.6', files: { 'AGENTS.md': 'oldhash' } },
      }
      writeFileSync(join(home, 'bundle.json'), JSON.stringify(legacy))
      expect(readLegacyManifest(home)?.id).toBe('bundle-legacy')
      const migration = migrateLegacyManifest({ dshHome: home, companyHome: ws, handbookTarget: 'AGENTS.md' })
      expect(migration.migrated).toBe(true)
      const state = readBundleManifestState(ws)
      expect(state.status).toBe('ok')
      if (state.status !== 'ok') return
      expect(state.manifest.id).toBe('bundle-legacy')
      expect(state.manifest.createdAt).toBe(legacy.createdAt)
      expect(state.manifest.handbookTarget).toBe('AGENTS.md')
      expect(state.manifest.skeleton.files['AGENTS.md']).toBe('oldhash')
      expect(existsSync(join(home, 'bundle.json'))).toBe(false)
      expect(existsSync(identityBackupPath(home, 'bundle-legacy'))).toBe(true)
      expect(existsSync(skel)).toBe(true)
    } finally {
      rmSync(home, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }); rmSync(skel, { recursive: true, force: true })
    }
  })

  it('workspace 不匹配：不迁移', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-manifest-home-'))
    const ws = workspace()
    try {
      writeFileSync(join(home, 'bundle.json'), JSON.stringify({
        v: 1, id: 'bundle-other', createdAt: 't', pack: PACK, workspace: '/some/other', skeleton: { version: '1', files: {} },
      }))
      const migration = migrateLegacyManifest({ dshHome: home, companyHome: ws, handbookTarget: 'AGENTS.md' })
      expect(migration.migrated).toBe(false)
      expect(existsSync(join(home, 'bundle.json'))).toBe(true)
    } finally {
      rmSync(home, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
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

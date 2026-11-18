// 负例留证 2026-11-13：去掉 ensureCompanyRoot + 直写 ⇒ root-symlink bundle 写外部、read 不 corrupt（BUG-148）；safe 写即绿。
// 负例留证 2026-11-18：createdAt 'not-a-date' 仍 ok（BUG-255）；ISO 往返后 corrupt。
// 负例留证 2026-11-18：pack 身份与当前 pack 不符仍 ok（BUG-256）；对账后 corrupt。
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
import { basename, dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pathToFileURL } from 'node:url'
import {
  BUNDLE_MANIFEST_VERSION,
  appendUpgradeLog,
  bundleManifestPath,
  identityBackupPath,
  isSafeBundleId,
  resolvePackMetadata,
  currentPackMetadata,
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

  it('createdAt 非 ISO 往返 → corrupt（BUG-255）', () => {
    const h = home(); const ws = workspace()
    try {
      const { plan } = create(h, ws)
      const parsed = JSON.parse(readFileSync(plan.path, 'utf8'))
      parsed.createdAt = 'not-a-date'
      writeFileSync(plan.path, JSON.stringify(parsed))
      const state = readBundleManifestState(ws, PACK)
      expect(state.status).toBe('corrupt')
      if (state.status === 'corrupt') expect(state.error).toContain('ISO')
    } finally { rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }) }
  })

  it('pack.name/version 与当前 pack 不符 → corrupt（BUG-256）', () => {
    const h = home(); const ws = workspace()
    try {
      const { plan } = create(h, ws)
      const parsed = JSON.parse(readFileSync(plan.path, 'utf8'))
      parsed.pack = { name: 'other', version: '0.6.0' }
      writeFileSync(plan.path, JSON.stringify(parsed))
      const state = readBundleManifestState(ws, PACK)
      expect(state.status).toBe('corrupt')
      if (state.status === 'corrupt') expect(state.error).toContain('pack 名称不匹配')
      expect(currentPackMetadata().name).toBe('dsh-company-pack')
    const badBase = mkdtempSync(join(tmpdir(), 'bad-pack-meta-'))
    const badModule = join(badBase, 'a', 'b', 'm.js')
    mkdirSync(join(badBase, 'a'), { recursive: true })
    writeFileSync(join(badBase, 'a', 'package.json'), '{}')
    expect(() => currentPackMetadata(pathToFileURL(badModule).href)).toThrow(/name\/version/)
    rmSync(badBase, { recursive: true, force: true })
    } finally { rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }) }
  })

  it('同 name 的 pack 版本升级 → upgrade 保留 id/createdAt（BUG-256 升级语义）', () => {
    const h = home(); const ws = workspace()
    try {
      const { plan } = create(h, ws, { name: PACK.name, version: '0.6.0' })
      const old = JSON.parse(readFileSync(plan.path, 'utf8'))
      const next = planBundleManifest({ dshHome: h, workspace: ws, pack: { name: PACK.name, version: '0.11.9' } })
      expect(next.action).toBe('upgrade')
      expect(next.manifest.id).toBe(old.id)
      expect(next.manifest.createdAt).toBe(old.createdAt)
      expect(next.manifest.pack.version).toBe('0.11.9')
      expect(writeBundleManifest(next).upgraded).toBe(true)
      expect(readBundleManifestState(ws, { name: PACK.name, version: '0.11.9' }).status).toBe('ok')
    } finally { rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }) }
  })

  // 负例留证 2026-11-19：v3 版本升级不带备份路径 ⇒ writeBundleManifest 直接覆盖 bundle.json，旧版本证据丢失（BUG-279）。
  it('v3 版本升级保留旧字节备份（BUG-279）', () => {
    const h = home(); const ws = workspace()
    try {
      const oldPack = { name: 'dsh-company-pack', version: '0.11.8' }
      const created = create(h, ws, oldPack)
      expect(created.written.created).toBe(true)
      const oldBytes = readFileSync(created.plan.path, 'utf8')

      const next = planBundleManifest({ dshHome: h, workspace: ws, pack: { name: oldPack.name, version: '0.11.9' } })
      expect(next.action).toBe('upgrade')
      expect(next.previousVersionPath).toBe(`${next.path}.v3-0.11.8.bak`)
      expect(writeBundleManifest(next).upgraded).toBe(true)
      const current = readBundleManifestState(ws, { name: oldPack.name, version: '0.11.9' })
      expect(current.status).toBe('ok')
      if (current.status !== 'ok') return
      expect(current.manifest.pack.version).toBe('0.11.9')

      const backup = next.previousVersionPath
      if (backup === undefined) return
      expect(existsSync(backup)).toBe(true)
      expect(readFileSync(backup, 'utf8')).toBe(oldBytes)
      const backupJson = JSON.parse(readFileSync(backup, 'utf8'))
      expect(backupJson.v).toBe(BUNDLE_MANIFEST_VERSION)
      expect(backupJson.pack.version).toBe('0.11.8')

      // 盘上旧版本号不可信：`../../evil` 不得把备份带出 bundle.json 所在目录。
      const crafted = JSON.parse(oldBytes)
      crafted.pack = { name: oldPack.name, version: '../../evil' }
      writeFileSync(next.path, JSON.stringify(crafted))
      const craftedBytes = readFileSync(next.path, 'utf8')
      const evil = planBundleManifest({ dshHome: h, workspace: ws, pack: { name: oldPack.name, version: '0.11.9' } })
      expect(evil.action).toBe('upgrade')
      const evilBackup = evil.previousVersionPath
      expect(evilBackup).toBeDefined()
      if (evilBackup === undefined) return
      expect(dirname(evilBackup)).toBe(dirname(evil.path))
      expect(basename(evilBackup)).not.toContain('..')
      expect(basename(evilBackup)).toMatch(/^bundle\.json\.v3-[0-9A-Za-z._-]+\.bak$/)
      expect(writeBundleManifest(evil).upgraded).toBe(true)
      expect(readFileSync(evilBackup, 'utf8')).toBe(craftedBytes)
      expect(JSON.parse(readFileSync(evilBackup, 'utf8')).pack.version).toBe('../../evil')

      // 旧版本号清洗后为空（全是点）→ 固定 fallback 名，仍在同一目录（不拼出隐藏路径）。
      const dotted = JSON.parse(craftedBytes)
      dotted.pack = { name: oldPack.name, version: '...' }
      writeFileSync(next.path, JSON.stringify(dotted))
      const fallback = planBundleManifest({ dshHome: h, workspace: ws, pack: { name: oldPack.name, version: '0.11.9' } })
      expect(basename(fallback.previousVersionPath ?? '')).toBe('bundle.json.v3-prev.bak')
      expect(writeBundleManifest(fallback).upgraded).toBe(true)

      // skip 与 create 不产生备份路径。
      const skipped = planBundleManifest({ dshHome: h, workspace: ws, pack: { name: oldPack.name, version: '0.11.9' } })
      expect(skipped.action).toBe('skip')
      expect(skipped.previousVersionPath).toBeUndefined()
      const fresh = workspace()
      try {
        const freshPlan = planBundleManifest({ dshHome: h, workspace: fresh, pack: oldPack })
        expect(freshPlan.action).toBe('create')
        expect(freshPlan.previousVersionPath).toBeUndefined()
      } finally { rmSync(fresh, { recursive: true, force: true }) }
    } finally { rmSync(h, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true }) }
  })

  it('bundle id / 包元数据边界（BUG-256 边界）', () => {
    expect(isSafeBundleId('')).toBe(false)
    expect(isSafeBundleId('..')).toBe(false)
    expect(isSafeBundleId('a/b')).toBe(false)
    expect(isSafeBundleId('a'.repeat(129))).toBe(false)
    expect(isSafeBundleId('safe-id_1')).toBe(true)
    expect(() => identityBackupPath('/tmp', '../x')).toThrow()
    const base = mkdtempSync(join(tmpdir(), 'pack-meta-'))
    mkdirSync(join(base, 'x'), { recursive: true })
    writeFileSync(join(base, 'package.json'), JSON.stringify({ name: 'n', version: '1' }))
    expect(resolvePackMetadata(pathToFileURL(join(base, 'x', 'm.js')).href)).toEqual({ name: 'n', version: '1' })
    writeFileSync(join(base, 'package.json'), '{}')
    expect(() => resolvePackMetadata(pathToFileURL(join(base, 'x', 'm.js')).href)).toThrow(/name\/version/)
    rmSync(base, { recursive: true, force: true })
  })
})

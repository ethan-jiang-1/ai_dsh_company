/**
 * run bundle 身份（bundle.json）的 keyless 完成定义（2026-10-24 立，RFC run-bundle-install-unit）。
 *
 * 判据：①首启写 id/createdAt/pack/workspace/skeleton 指纹；②二次调用不覆盖（字节不变）；
 * ③workspace 在 home 内记相对、在外记绝对；④workspace 不存在不冒充 bundle；⑤骨架指纹跳过 dotfile/符号链接。
 * 反证：把 `writeFileSync(..., { flag: 'wx' })` 的 flag 换成默认 ⇒ 「二次不覆盖」红。
 */
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  appendUpgradeLog,
  applySkeletonUpgrade,
  applyWorkspaceRebind,
  bundleManifestPath,
  planBundleManifest,
  planSkeletonUpgrade,
  planWorkspaceRebind,
  pruneBundleBackups,
  readBundleManifest,
  readBundleManifestState,
  resolvePackMetadata,
  resolveRecordedWorkspace,
  skeletonDigest,
  validateBundleManifest,
  workspaceRecord,
  writeBundleManifest,
  writeUpgradedManifest,
} from '../../packages/company-pack/src/host/bundle-manifest.ts'

const PACK = { name: 'dsh-company-pack', version: '0.3.0' }

describe('bundle.json 的 workspace 记录', () => {
  it('相对路径按 home 还原，绝对路径原样，空白/非字符串不冒充', () => {
    expect(resolveRecordedWorkspace('/h', 'company-workspace')).toBe('/h/company-workspace')
    expect(resolveRecordedWorkspace('/h', '/abs/company')).toBe('/abs/company')
    expect(resolveRecordedWorkspace('/h', '  ')).toBeUndefined()
    expect(resolveRecordedWorkspace('/h', 42)).toBeUndefined()
  })
})

function skeleton(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-skeleton-'))
  mkdirSync(join(dir, 'kb/ceo'), { recursive: true })
  writeFileSync(join(dir, 'AGENTS.md'), '# 手册\n')
  writeFileSync(join(dir, 'kb/ceo/CHARTER.md'), '# ceo\n')
  writeFileSync(join(dir, '.gitkeep'), '')
  return dir
}

function home(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-home-'))
  mkdirSync(join(dir, 'company-workspace'), { recursive: true })
  return dir
}

describe('run bundle manifest：身份与指纹', () => {
  it('首启创建 manifest；id/createdAt/pack/workspace/skeleton 齐；二次调用不覆盖', () => {
    const skel = skeleton()
    const dsh = home()
    try {
      const plan = planBundleManifest({ dshHome: dsh, companyHome: join(dsh, 'company-workspace'), skeletonDir: skel, pack: PACK, id: 'bundle-test', now: new Date('2026-10-24T00:00:00Z') })
      expect(plan.action).toBe('create')
      expect(writeBundleManifest(plan).created).toBe(true)

      const manifest = JSON.parse(readFileSync(plan.path, 'utf8'))
      expect(manifest).toMatchObject({
        v: 1,
        id: 'bundle-test',
        createdAt: '2026-10-24T00:00:00.000Z',
        pack: PACK,
        workspace: 'company-workspace',
        skeleton: { version: '0.3.0' },
      })
      expect(manifest.skeleton.files['AGENTS.md']).toMatch(/^[0-9a-f]{64}$/)
      expect(manifest.skeleton.files['.gitkeep']).toBeUndefined()

      const before = readFileSync(plan.path, 'utf8')
      const second = planBundleManifest({ dshHome: dsh, companyHome: join(dsh, 'company-workspace'), skeletonDir: skel, pack: PACK })
      expect(second.action).toBe('skip')
      expect(writeBundleManifest(second).created).toBe(false)
      expect(readFileSync(plan.path, 'utf8')).toBe(before)

      // 并发/竞态第二道保险：即使拿一个 action=create 的计划再写，wx 也必须让它 skip、不改字节。
      const forced = { ...plan, action: 'create' as const, manifest: { ...plan.manifest, id: 'bundle-race' } }
      expect(writeBundleManifest(forced).created).toBe(false)
      expect(JSON.parse(readFileSync(plan.path, 'utf8')).id).toBe('bundle-test')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('workspace 在 home 外 ⇒ 记绝对路径；在 home 内 ⇒ 记相对路径', () => {
    const dsh = home()
    try {
      expect(workspaceRecord(dsh, join(dsh, 'company-workspace'))).toBe('company-workspace')
      const outside = join(tmpdir(), 'elsewhere-company-workspace')
      expect(workspaceRecord(dsh, outside)).toBe(outside.split('\\').join('/'))
    } finally {
      rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('workspace 不存在 ⇒ skip（没有盘就不冒充 bundle）', () => {
    const skel = skeleton()
    const dsh = home()
    try {
      const plan = planBundleManifest({ dshHome: dsh, companyHome: join(dsh, 'no-such-workspace'), skeletonDir: skel, pack: PACK })
      expect(plan.action).toBe('skip')
      expect(writeBundleManifest(plan).created).toBe(false)
      expect(readBundleManifest(dsh)).toBeNull()
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('骨架指纹跳过符号链接；读回 manifest 可解析', () => {
    const skel = skeleton()
    const dsh = home()
    const outside = join(mkdtempSync(join(tmpdir(), 'bundle-outside-')), 'x.md')
    try {
      writeFileSync(outside, '# 外部\n')
      symlinkSync(outside, join(skel, 'LINK.md'))
      const digest = skeletonDigest(skel)
      expect(digest['LINK.md']).toBeUndefined()
      expect(digest['AGENTS.md']).toBeDefined()

      const plan = planBundleManifest({ dshHome: dsh, companyHome: join(dsh, 'company-workspace'), skeletonDir: skel, pack: PACK })
      writeBundleManifest(plan)
      expect(readBundleManifest(dsh)?.pack.version).toBe('0.3.0')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true }); rmSync(join(outside, '..'), { recursive: true, force: true })
    }
  })

  it('resolvePackMetadata 从 `<pack>/lib/index.js` 的上一级读 package.json', () => {
    const pack = mkdtempSync(join(tmpdir(), 'bundle-pack-'))
    try {
      mkdirSync(join(pack, 'lib'))
      writeFileSync(join(pack, 'package.json'), JSON.stringify(PACK))
      expect(resolvePackMetadata(pathToFileURL(join(pack, 'lib/index.js')).href)).toEqual(PACK)
    } finally {
      rmSync(pack, { recursive: true, force: true })
    }
  })
})


describe('基部升级（哈希判定，S3）', () => {
  it('未改的基部替换、改过的保留、新增件补建、扩张面不动；第二轮零变更', () => {
    const skel = skeleton()
    const dsh = home()
    const ws = join(dsh, 'company-workspace')
    try {
      writeFileSync(join(skel, 'kb/org.md'), '# org v1\n')
      cpSync(skel, ws, { recursive: true })
      const v1 = planBundleManifest({ dshHome: dsh, companyHome: ws, skeletonDir: skel, pack: { ...PACK, version: '0.3.0' }, id: 'b1' })
      writeBundleManifest(v1)

      // 用户改手册；扩张面写 journal；基部 org 不动。
      writeFileSync(join(ws, 'AGENTS.md'), '# 用户改过\n')
      mkdirSync(join(ws, 'kb/ceo/journal'), { recursive: true })
      writeFileSync(join(ws, 'kb/ceo/journal/x.md'), '# 纪要\n')

      // pack 升到 0.3.1：org 变、手册变、新增模板。
      writeFileSync(join(skel, 'AGENTS.md'), '# 手册 v2\n')
      writeFileSync(join(skel, 'kb/org.md'), '# org v2\n')
      mkdirSync(join(skel, 'templates'), { recursive: true })
      writeFileSync(join(skel, 'templates/new.md'), '# new\n')

      const plan = planSkeletonUpgrade({ manifest: readBundleManifest(dsh)!, skeletonDir: skel, workspace: ws, pack: { ...PACK, version: '0.3.1' } })
      expect(plan.changed).toBe(true)
      const result = applySkeletonUpgrade(plan, skel, ws)
      expect(result.updated).toContain('kb/org.md')
      expect(result.created).toContain('templates/new.md')
      expect(readFileSync(join(ws, 'AGENTS.md'), 'utf8')).toBe('# 用户改过\n')
      expect(readFileSync(join(ws, 'kb/org.md'), 'utf8')).toBe('# org v2\n')
      expect(readFileSync(join(ws, 'kb/ceo/journal/x.md'), 'utf8')).toBe('# 纪要\n')
      expect(plan.actions.find(a => a.rel === 'AGENTS.md')?.reason).toBe('modified')

      writeUpgradedManifest(bundleManifestPath(dsh), plan.manifest)
      const after = readBundleManifest(dsh)!
      expect(after.skeleton.version).toBe('0.3.1')
      expect(after.skeleton.files['kb/org.md']).not.toBe(after.skeleton.files['AGENTS.md'])

      // 第二轮：用户改过的手册继续保留；其余相同 ⇒ 零变更。
      const again = planSkeletonUpgrade({ manifest: after, skeletonDir: skel, workspace: ws, pack: { ...PACK, version: '0.3.1' } })
      expect(again.changed).toBe(false)
      expect(again.actions.every(a => a.action === 'keep')).toBe(true)
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
    }
  })
})


describe('两 bundle 身份隔离（S1 自动化）', () => {
  it('用户删掉的基部文件在下一版被补建；v2 移除的基部文件不删用户盘', () => {
    const skel = skeleton()
    const dsh = home()
    const ws = join(dsh, 'company-workspace')
    try {
      writeFileSync(join(skel, 'kb/org.md'), '# org v1\n')
      mkdirSync(join(skel, 'templates'), { recursive: true })
      writeFileSync(join(skel, 'templates/meta.md'), '# meta\n')
      writeFileSync(join(skel, 'templates/legacy.md'), '# legacy\n')
      cpSync(skel, ws, { recursive: true })
      const v1 = planBundleManifest({ dshHome: dsh, companyHome: ws, skeletonDir: skel, pack: { ...PACK, version: '0.3.0' }, id: 'b-del' })
      writeBundleManifest(v1)
      // 用户误删了一个基部文件；v2 仍带它 ⇒ 应补建。
      rmSync(join(ws, 'templates/meta.md'), { force: true })
      // v2 把 legacy 从骨架移除；用户盘里的旧 legacy 不应被删。
      rmSync(join(skel, 'templates/legacy.md'), { force: true })
      const plan = planSkeletonUpgrade({ manifest: readBundleManifest(dsh)!, skeletonDir: skel, workspace: ws, pack: { ...PACK, version: '0.3.1' } })
      const result = applySkeletonUpgrade(plan, skel, ws)
      expect(result.created).toContain('templates/meta.md')
      expect(plan.actions.some(a => a.rel === 'templates/legacy.md')).toBe(false)
      expect(existsSync(join(ws, 'templates/legacy.md'))).toBe(true)
      expect(readFileSync(join(ws, 'templates/legacy.md'), 'utf8')).toBe('# legacy\n')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('两个 home 生成不同 id；各自 workspace 记录独立', () => {
    const skel = skeleton()
    const a = home()
    const b = home()
    try {
      const pa = planBundleManifest({ dshHome: a, companyHome: join(a, 'company-workspace'), skeletonDir: skel, pack: PACK })
      const pb = planBundleManifest({ dshHome: b, companyHome: join(b, 'company-workspace'), skeletonDir: skel, pack: PACK })
      expect(pa.manifest.id).not.toBe(pb.manifest.id)
      expect(pa.manifest.workspace).toBe('company-workspace')
      expect(pb.manifest.workspace).toBe('company-workspace')
      expect(pa.path).not.toBe(pb.path)
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true })
    }
  })
})

describe('manifest 损坏与原子写（2026-10-25 审查补证）', () => {
  it('区分 missing 与 corrupt；损坏文件原样保留', () => {
    const dsh = home()
    try {
      expect(readBundleManifestState(dsh).status).toBe('missing')
      const path = join(dsh, 'bundle.json')
      writeFileSync(path, '{"v":1,"id":"cut')
      const state = readBundleManifestState(dsh)
      expect(state.status).toBe('corrupt')
      expect(readFileSync(path, 'utf8')).toBe('{"v":1,"id":"cut')
    } finally {
      rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('写回走临时文件，目录里不留 .tmp', () => {
    const dsh = home()
    const skel = skeleton()
    try {
      const plan = planBundleManifest({ dshHome: dsh, companyHome: join(dsh, 'company-workspace'), skeletonDir: skel, pack: PACK })
      writeUpgradedManifest(bundleManifestPath(dsh), { ...plan.manifest, pack: { ...PACK, version: '0.3.2' } })
      expect(readBundleManifest(dsh)?.pack.version).toBe('0.3.2')
      expect(readdirSync(dsh).some(name => name.endsWith('.tmp'))).toBe(false)
    } finally {
      rmSync(skel, { recursive: true, force: true })
      rmSync(dsh, { recursive: true, force: true })
    }
  })
})


describe('manifest 版本校验（2026-10-27 FAQ 26 对齐）', () => {
  it('v 比本包新 ⇒ unsupported（保留原文件，不 cast 成 v1）', () => {
    const dsh = home()
    try {
      const path = join(dsh, 'bundle.json')
      const raw = JSON.stringify({
        v: 2,
        id: 'future',
        createdAt: '2026-10-27T00:00:00.000Z',
        pack: PACK,
        workspace: 'company-workspace',
        skeleton: { version: '0.3.0', files: {} },
      })
      writeFileSync(path, raw)
      const state = readBundleManifestState(dsh)
      expect(state.status).toBe('unsupported')
      if (state.status === 'unsupported') {
        expect(state.version).toBe(2)
        expect(state.error).toContain('高于本包支持')
      }
      expect(readBundleManifest(dsh)).toBeNull()
      expect(readFileSync(path, 'utf8')).toBe(raw)
    } finally {
      rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('v1 但缺 skeleton/files 等必填 ⇒ corrupt；坏文件原样保留', () => {
    const dsh = home()
    try {
      const path = join(dsh, 'bundle.json')
      writeFileSync(path, JSON.stringify({ v: 1, id: 'x', createdAt: 't', pack: PACK, workspace: 'w' }))
      const state = readBundleManifestState(dsh)
      expect(state.status).toBe('corrupt')
      expect(validateBundleManifest({ v: 1 }).ok).toBe(false)
      expect(readFileSync(path, 'utf8')).toContain('"v":1')
    } finally {
      rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('hard link 不支持 ⇒ wx 回退并仍不覆盖', () => {
    const skel = skeleton()
    const dsh = home()
    try {
      const plan = planBundleManifest({ dshHome: dsh, companyHome: join(dsh, 'company-workspace'), skeletonDir: skel, pack: PACK, id: 'fallback' })
      const link = (() => { throw Object.assign(new Error('unsupported'), { code: 'ENOTSUP' }) }) as unknown as typeof import('node:fs').linkSync
      const result = writeBundleManifest(plan, { link })
      expect(result).toMatchObject({ created: true, fallback: 'wx' })
      expect(readBundleManifest(dsh)?.id).toBe('fallback')
      const before = readFileSync(plan.path, 'utf8')
      expect(writeBundleManifest(plan, { link }).created).toBe(false)
      expect(readFileSync(plan.path, 'utf8')).toBe(before)
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('首建用临时文件 + link 发布，不留 .tmp；强制并发计划也不会覆盖', () => {
    const skel = skeleton()
    const dsh = home()
    try {
      const plan = planBundleManifest({ dshHome: dsh, companyHome: join(dsh, 'company-workspace'), skeletonDir: skel, pack: PACK, id: 'first' })
      expect(writeBundleManifest(plan).created).toBe(true)
      expect(readdirSync(dsh).some(name => name.endsWith('.tmp'))).toBe(false)
      const before = readFileSync(plan.path, 'utf8')
      expect(writeBundleManifest({ ...plan, action: 'create', manifest: { ...plan.manifest, id: 'second' } }).created).toBe(false)
      expect(readFileSync(plan.path, 'utf8')).toBe(before)
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
    }
  })

  it('基部目标是指向用户文件的符号链接 ⇒ keep，不覆盖', () => {
    const skel = skeleton()
    const dsh = home()
    const ws = join(dsh, 'company-workspace')
    const outside = join(mkdtempSync(join(tmpdir(), 'bundle-link-')), 'outside.md')
    try {
      writeFileSync(join(skel, 'kb/org.md'), '# org\n')
      cpSync(skel, ws, { recursive: true })
      const v1 = planBundleManifest({ dshHome: dsh, companyHome: ws, skeletonDir: skel, pack: PACK, id: 'link' })
      writeBundleManifest(v1)
      rmSync(join(ws, 'kb/org.md'))
      writeFileSync(outside, '# user-owned\n')
      symlinkSync(outside, join(ws, 'kb/org.md'))
      writeFileSync(join(skel, 'kb/org.md'), '# org v2\n')
      const plan = planSkeletonUpgrade({ manifest: readBundleManifest(dsh)!, skeletonDir: skel, workspace: ws, pack: { ...PACK, version: '0.3.1' } })
      expect(plan.actions.find(action => action.rel === 'kb/org.md')).toMatchObject({ action: 'keep', reason: 'occupied' })
      applySkeletonUpgrade(plan, skel, ws)
      expect(lstatSync(join(ws, 'kb/org.md')).isSymbolicLink()).toBe(true)
      expect(readFileSync(join(ws, 'kb/org.md'), 'utf8')).toBe('# user-owned\n')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true }); rmSync(join(outside, '..'), { recursive: true, force: true })
    }
  })
})

describe('显式换盘（2026-10-27 FAQ 26 对齐 P0）', () => {
  const external = (): { root: string; ws: string } => {
    const root = mkdtempSync(join(tmpdir(), 'rebind-'))
    const ws = join(root, 'company')
    mkdirSync(join(ws, 'kb'), { recursive: true })
    writeFileSync(join(ws, 'AGENTS.md'), '# 手册\n')
    writeFileSync(join(ws, 'kb/org.md'), '# org\n')
    return { root, ws }
  }

  it('旧盘已不在 + 新盘形状对 ⇒ 备份旧 manifest、改写 workspace、记日志、数据不动', () => {
    const skel = skeleton()
    const dsh = home()
    const source = external()
    const target = external()
    try {
      cpSync(skel, source.ws, { recursive: true })
      writeFileSync(join(source.ws, 'AGENTS.md'), '# 用户手册\n')
      const plan = planBundleManifest({ dshHome: dsh, companyHome: source.ws, skeletonDir: skel, pack: PACK, id: 'rebind' })
      writeBundleManifest(plan)
      const before = readFileSync(plan.path, 'utf8')
      cpSync(source.ws, target.ws, { recursive: true })
      rmSync(source.ws, { recursive: true, force: true })

      const decision = planWorkspaceRebind({ dshHome: dsh, manifest: readBundleManifest(dsh)!, companyHome: target.ws, now: new Date('2026-10-27T00:00:00Z') })
      expect(decision.ok).toBe(true)
      if (!decision.ok) return
      expect(decision.plan.backupPath).toContain('bundle.json.bak-')
      applyWorkspaceRebind(decision.plan)
      const manifest = readBundleManifest(dsh)!
      expect(manifest.id).toBe('rebind')
      expect(manifest.workspace).toBe(target.ws.split('\\').join('/'))
      expect(readFileSync(decision.plan.backupPath, 'utf8')).toBe(before)
      expect(readFileSync(join(dsh, 'logs/company-pack-upgrade.log'), 'utf8')).toContain('换盘')
      expect(readFileSync(join(target.ws, 'AGENTS.md'), 'utf8')).toBe('# 用户手册\n')
      expect(readFileSync(join(target.ws, 'kb/org.md'), 'utf8')).toBe('# org\n')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
      rmSync(source.root, { recursive: true, force: true }); rmSync(target.root, { recursive: true, force: true })
    }
  })

  it('拒绝：旧盘仍在 / 新盘不存在 / 新盘形状不对 / 同一路径', () => {
    const skel = skeleton()
    const dsh = home()
    const source = external()
    const target = external()
    try {
      cpSync(skel, source.ws, { recursive: true })
      const plan = planBundleManifest({ dshHome: dsh, companyHome: source.ws, skeletonDir: skel, pack: PACK, id: 'rebind-deny' })
      writeBundleManifest(plan)
      const manifest = readBundleManifest(dsh)!
      expect(planWorkspaceRebind({ dshHome: dsh, manifest, companyHome: target.ws }).ok).toBe(false)
      expect(planWorkspaceRebind({ dshHome: dsh, manifest, companyHome: join(target.root, 'missing') }).ok).toBe(false)
      rmSync(source.ws, { recursive: true, force: true })
      const empty = join(target.root, 'empty')
      mkdirSync(empty, { recursive: true })
      expect(planWorkspaceRebind({ dshHome: dsh, manifest, companyHome: empty }).ok).toBe(false)
      expect(planWorkspaceRebind({ dshHome: dsh, manifest, companyHome: source.ws }).ok).toBe(false)
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(dsh, { recursive: true, force: true })
      rmSync(source.root, { recursive: true, force: true }); rmSync(target.root, { recursive: true, force: true })
    }
  })
})


describe('换盘备份保留（2026-10-27 F6）', () => {
  it('只保留最近 N 份 bundle.json.bak-*', () => {
    const dsh = home()
    try {
      for (let i = 0; i < 7; i += 1) writeFileSync(join(dsh, `bundle.json.bak-2026-10-2${String(i)}`), String(i))
      const removed = pruneBundleBackups(dsh, 3)
      expect(removed).toHaveLength(4)
      expect(readdirSync(dsh).filter(name => name.startsWith('bundle.json.bak-')).sort())
        .toEqual(['bundle.json.bak-2026-10-24', 'bundle.json.bak-2026-10-25', 'bundle.json.bak-2026-10-26'])
    } finally {
      rmSync(dsh, { recursive: true, force: true })
    }
  })
})


describe('v1 fixture 迁移演练入口（2026-10-27 F8）', () => {
  it('v1 fixture 可读；改 v2 后保留原文件并 unsupported', () => {
    const dsh = home()
    try {
      const fixture = readFileSync(join(process.cwd(), 'tests/fixtures/bundle-manifest-v1.json'), 'utf8')
      writeFileSync(join(dsh, 'bundle.json'), fixture)
      expect(readBundleManifestState(dsh).status).toBe('ok')
      expect(readBundleManifest(dsh)?.id).toBe('bundle-fixture-v1')
      const future = JSON.stringify({ ...JSON.parse(fixture), v: 2 }, null, 2)
      writeFileSync(join(dsh, 'bundle.json'), future)
      expect(readBundleManifestState(dsh)).toMatchObject({ status: 'unsupported', version: 2 })
      expect(readFileSync(join(dsh, 'bundle.json'), 'utf8')).toBe(future)
    } finally {
      rmSync(dsh, { recursive: true, force: true })
    }
  })
})


describe('升级日志有界（2026-10-28 二轮）', () => {
  it('appendUpgradeLog 超过 256 KiB 轮转为 .1', () => {
    const dir = mkdtempSync(join(tmpdir(), 'upgrade-log-'))
    try {
      const logs = join(dir, 'logs')
      mkdirSync(logs, { recursive: true })
      const path = join(logs, 'company-pack-upgrade.log')
      writeFileSync(path, 'x'.repeat(256 * 1024))
      appendUpgradeLog(dir, 'rotation')
      expect(existsSync(`${path}.1`)).toBe(true)
      expect(readFileSync(path, 'utf8')).toContain('rotation')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

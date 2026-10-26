/**
 * run bundle 身份（bundle.json）的 keyless 完成定义（2026-10-24 立，RFC run-bundle-install-unit）。
 *
 * 判据：①首启写 id/createdAt/pack/workspace/skeleton 指纹；②二次调用不覆盖（字节不变）；
 * ③workspace 在 home 内记相对、在外记绝对；④workspace 不存在不冒充 bundle；⑤骨架指纹跳过 dotfile/符号链接。
 * 反证：把 `writeFileSync(..., { flag: 'wx' })` 的 flag 换成默认 ⇒ 「二次不覆盖」红。
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  applySkeletonUpgrade,
  bundleManifestPath,
  planBundleManifest,
  planSkeletonUpgrade,
  readBundleManifest,
  readBundleManifestState,
  resolvePackMetadata,
  skeletonDigest,
  workspaceRecord,
  writeBundleManifest,
  writeUpgradedManifest,
} from '../../packages/company-pack/src/host/bundle-manifest.ts'

const PACK = { name: 'dsh-company-pack', version: '0.3.0' }

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

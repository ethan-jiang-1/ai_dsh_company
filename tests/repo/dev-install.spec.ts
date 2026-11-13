import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { COMPANY_ROLE_IDS } from '../../tools/lib/company-roles.mjs'
import {
  devInstallSpec,
  devTarballName,
  ensureDefaultPort,
  migrationNotice,
  needsInstall,
  planDevStart,
  resolveDevMode,
  shouldReuseBuild,
} from '../../tools/lib/dev-install.mjs'

const SHA = 'a'.repeat(64)

describe('dev 启动器安装规划（dev/产品路径 parity）', () => {
  it('默认 tarball（产品同形）；--link 才走快速通道', () => {
    expect(resolveDevMode([])).toBe('tarball')
    expect(resolveDevMode(['--port', '0'])).toBe('tarball')
    expect(resolveDevMode(['--link'])).toBe('link')
  })

  it('端口缺省补 0；显式 --port / --port= 不被覆盖', () => {
    expect(ensureDefaultPort(['--no-open'])).toEqual(['--no-open', '--port', '0'])
    expect(ensureDefaultPort(['--port', '3081'])).toEqual(['--port', '3081'])
    expect(ensureDefaultPort(['--port=3082'])).toEqual(['--port=3082'])
    expect(ensureDefaultPort([])).toEqual(['--port', '0'])
  })

  it('tarball spec 是 file:，link spec 是 link:', () => {
    expect(devInstallSpec({ mode: 'tarball', tarballPath: '/tmp/x.tgz', sourceDir: '/src' })).toBe('file:/tmp/x.tgz')
    expect(devInstallSpec({ mode: 'link', tarballPath: '/tmp/x.tgz', sourceDir: '/src' })).toBe('link:/src')
  })

  it('tarball 名内容寻址：内容一变 spec 就变（否则 pnpm 不会换安装副本）', () => {
    const a = devTarballName({ name: 'dsh-company-pack', version: '0.7.0', sha256: SHA })
    const b = devTarballName({ name: 'dsh-company-pack', version: '0.7.0', sha256: 'b'.repeat(64) })
    expect(a).toBe('dsh-company-pack-0.7.0-aaaaaaaa.tgz')
    expect(a).not.toBe(b)
    expect(() => devTarballName({ name: 'p', version: '1.0.0', sha256: 'short' })).toThrow()
  })

  it('同 spec 不重复安装；不同 spec 才装', () => {
    expect(needsInstall('file:/a.tgz', 'file:/a.tgz')).toBe(false)
    expect(needsInstall('link:/src', 'file:/a.tgz')).toBe(true)
    expect(needsInstall(undefined, 'file:/a.tgz')).toBe(true)
  })

  it('从 link 迁到默认 tarball 时有显式提示（不静默改）', () => {
    expect(migrationNotice({ mode: 'tarball', currentDependency: 'link:/src' })).toContain('--link')
    expect(migrationNotice({ mode: 'tarball', currentDependency: 'file:/a.tgz' })).toBeUndefined()
    expect(migrationNotice({ mode: 'link', currentDependency: 'link:/src' })).toBeUndefined()
  })

  it('规划顺序：缺 profile 先初始化；tarball 先构建后打包；最后 exec', () => {
    const plan = planDevStart({
      mode: 'tarball', version: '0.7.0', profileExists: false,
      currentDependency: undefined, tarballPath: '/tmp/a.tgz', sourceDir: '/src',
    })
    expect(plan.steps.map(step => step.kind)).toEqual(['init-profile', 'build', 'pack', 'install', 'exec'])
    expect(plan.steps.find(step => step.kind === 'install')?.spec).toBe('file:/tmp/a.tgz')
  })

  it('dev 启动器默认路径包含 pack + plugin add file:（门禁同判据）', () => {
    const launcher = readFileSync(join(ROOT, 'tools/company.mjs'), 'utf8')
    expect(launcher, '缺 npm pack').toMatch(/npm'\s*,\s*\['pack'/)
    expect(launcher, '缺 plugin add file:').toMatch(/'plugin', '--profile', 'company', 'add'/)
    expect(launcher, '默认模式必须从 resolveDevMode 来').toContain('resolveDevMode(args)')
  })
})

describe('构建缓存判据（源未变才复用 tarball）', () => {
  const fingerprint = 'f'.repeat(64)
  const stamp = { schema: 1, version: '0.8.8', fingerprint, tarball: '/tmp/x.tgz', tarballSha: SHA }
  const ok = {
    stamp, fingerprint, version: '0.8.8',
    tarballPresent: true, tarballShaMatches: true, libPresent: true,
  }

  it('全部匹配才复用', () => {
    expect(shouldReuseBuild(ok)).toBe(true)
  })

  it('指纹变/版本变 → 重建', () => {
    expect(shouldReuseBuild({ ...ok, fingerprint: 'e'.repeat(64) })).toBe(false)
    expect(shouldReuseBuild({ ...ok, version: '0.8.9' })).toBe(false)
    expect(shouldReuseBuild({ ...ok, fingerprint: '' })).toBe(false)
  })

  it('缺戳/坏戳/缺产物/缺 lib 或 sha 不符 → 重建', () => {
    expect(shouldReuseBuild({ ...ok, stamp: undefined })).toBe(false)
    expect(shouldReuseBuild({ ...ok, stamp: { ...stamp, schema: 2 } })).toBe(false)
    expect(shouldReuseBuild({ ...ok, tarballPresent: false })).toBe(false)
    expect(shouldReuseBuild({ ...ok, tarballShaMatches: false })).toBe(false)
    expect(shouldReuseBuild({ ...ok, libPresent: false })).toBe(false)
  })

  it('--rebuild / 缺 vendor pin 信息 → 强制重建', () => {
    expect(shouldReuseBuild({ ...ok, force: true })).toBe(false)
  })

  it('company.mjs 真的调用了判据与指纹（wiring）', () => {
    const launcher = readFileSync(join(ROOT, 'tools/company.mjs'), 'utf8')
    expect(launcher).toContain('shouldReuseBuild')
    expect(launcher).toContain('devBuildFingerprint')
    expect(launcher).toContain('--rebuild')
  })
})

describe('dev 初始化工具与角色唯一事实家', () => {
  it('bundle:init 覆盖全部公司角色（含 2026-11-05 新增的 CMO）', () => {
    const launcher = readFileSync(join(ROOT, 'tools/bundle-init.mjs'), 'utf8')
    for (const role of COMPANY_ROLE_IDS) expect(launcher, role).toContain(`'${role}'`)
  })
})

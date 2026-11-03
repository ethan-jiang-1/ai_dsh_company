import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'
import {
  devInstallSpec,
  devTarballName,
  migrationNotice,
  needsInstall,
  planDevStart,
  resolveDevMode,
} from '../../../tools/lib/dev-install.mjs'

const SHA = 'a'.repeat(64)

describe('dev 启动器安装规划（dev/产品路径 parity）', () => {
  it('默认 tarball（产品同形）；--link 才走快速通道', () => {
    expect(resolveDevMode([])).toBe('tarball')
    expect(resolveDevMode(['--port', '0'])).toBe('tarball')
    expect(resolveDevMode(['--link'])).toBe('link')
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

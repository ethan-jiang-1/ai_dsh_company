import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'
import { devBuildFingerprint, packageSourceFiles, sourceFingerprint } from '../../../tools/lib/pack-source.mjs'

const makePack = () => {
  const dir = mkdtempSync(join(tmpdir(), 'pack-source-'))
  mkdirSync(join(dir, 'src'), { recursive: true })
  mkdirSync(join(dir, 'presets', 'ceo'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), '{"name":"x","version":"0.0.0"}\n')
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1\n')
  writeFileSync(join(dir, 'presets', 'ceo', 'persona.md'), 'ceo\n')
  return dir
}

describe('包源指纹（release 与 dev 缓存共用）', () => {
  it('文件清单 = 排序后的随包源；不含 node_modules', () => {
    const dir = makePack()
    try {
      mkdirSync(join(dir, 'src', 'node_modules'), { recursive: true })
      writeFileSync(join(dir, 'src', 'node_modules', 'x.js'), 'x')
      expect(packageSourceFiles(dir)).toEqual(['package.json', 'presets/ceo/persona.md', 'src/a.ts'])
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('同内容同指纹；内容/增删文件都改指纹', () => {
    const dir = makePack()
    try {
      const a = sourceFingerprint(dir)
      expect(sourceFingerprint(dir)).toBe(a)
      writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 2\n')
      const b = sourceFingerprint(dir)
      expect(b).not.toBe(a)
      writeFileSync(join(dir, 'src', 'b.ts'), 'export const b = 1\n')
      const c = sourceFingerprint(dir)
      expect(c).not.toBe(b)
      rmSync(join(dir, 'src', 'b.ts'))
      expect(sourceFingerprint(dir)).toBe(b)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('dev 复合指纹对 vendor pin 与 lockfile 变化敏感（基座/依赖变也重建）', () => {
    const dir = makePack()
    try {
      const base = devBuildFingerprint(dir, { vendorSha: 'a'.repeat(40), lockfilePath: undefined })
      expect(devBuildFingerprint(dir, { vendorSha: 'a'.repeat(40), lockfilePath: undefined })).toBe(base)
      expect(devBuildFingerprint(dir, { vendorSha: 'b'.repeat(40), lockfilePath: undefined })).not.toBe(base)
      const lock = join(dir, 'pnpm-lock.yaml')
      writeFileSync(lock, 'lockfileVersion: 9\n')
      expect(devBuildFingerprint(dir, { vendorSha: 'a'.repeat(40), lockfilePath: lock })).not.toBe(base)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('release 的唯一 owner 是 pack-source（不许再私藏第二份清单）', () => {
    const release = readFileSync(join(ROOT, 'tools/release.mjs'), 'utf8')
    expect(release).toContain("from './lib/pack-source.mjs'")
    expect(release).not.toContain('const PACKAGE_SOURCE_DIRS')
  })
})

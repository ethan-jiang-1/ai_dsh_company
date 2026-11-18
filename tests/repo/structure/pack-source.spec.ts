import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'
import { devBuildFingerprint, packageSourceFiles, releasePipelineFiles, sourceFingerprint } from '../../../tools/lib/core/pack-source.mjs'

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
      writeFileSync(join(dir, 'src', '.DS_Store'), 'x')
      mkdirSync(join(dir, 'src', 'nested'), { recursive: true })
      writeFileSync(join(dir, 'src', 'nested', 'b.ts'), 'export const b = 1\n')
      expect(packageSourceFiles(dir)).toEqual(['package.json', 'presets/ceo/persona.md', 'src/a.ts', 'src/nested/b.ts'])
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
    const release = readFileSync(join(ROOT, 'tools/release/release.mjs'), 'utf8')
    // 断言「依赖存在」而不是某一层深度：lib 内部分组（core/ 等）不该让这条不变量变红。
    expect(release).toMatch(/from '\.\.\/lib\/(?:[a-z]+\/)?pack-source\.mjs'/)
    expect(release).not.toContain('const PACKAGE_SOURCE_DIRS')
  })
})

// 负例留证 2026-11-19：发布面目录里的 install-manual.mjs 改字节，pipeline 指纹不变（BUG-263）。
// 负例留证 2026-11-19：market-index.mjs 同样不在手写 5 条清单里（BUG-264）。
describe('发布管线输入集（目录派生，BUG-263/264）', () => {
  it('目录缺失/非 .mjs/跨目录项缺失都不崩，集随目录派生', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pipeline-files-'))
    try {
      mkdirSync(join(dir, 'tools', 'release'), { recursive: true })
      writeFileSync(join(dir, 'tools', 'release', 'a.mjs'), '// a\n')
      writeFileSync(join(dir, 'tools', 'release', 'b.txt'), 'x')
      // tools/lib/release 不在盘上 → 目录缺失分支；pack-source/pin 不在盘上 → 显式项缺失分支
      expect(releasePipelineFiles(dir)).toEqual(['tools/release/a.mjs'])
      mkdirSync(join(dir, 'tools', 'lib', 'core'), { recursive: true })
      writeFileSync(join(dir, 'tools', 'lib', 'core', 'pack-source.mjs'), '// s\n')
      expect(releasePipelineFiles(dir)).toEqual(['tools/lib/core/pack-source.mjs', 'tools/release/a.mjs'])
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})

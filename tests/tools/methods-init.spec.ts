/**
 * Starter 质量环方法包：内容配对 + 安装幂等。
 *
 * 判据：`content/methods/<side>/<pack>/SKILL.md` 两侧同 method/version、check-id 同批；
 * `seedMethods` 只复制不覆盖；源缺失时跳过而不是静默假成功。
 *
 * 红配方：把 verifier 的 `version` 改成 1.2.0 → 配对用例红；预置目标文件后再 seed →
 * 该文件内容必须不变（覆盖即红）。
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { METHOD_SIDES, STARTER_METHODS, seedMethods } from '../../tools/lib/methods-init.mjs'
import { parseMethodSkill } from '../../tools/lib/quality-loop.mjs'

const CONTENT = join(ROOT, 'packages/company-pack/content')

function parse(rel: string): NonNullable<ReturnType<typeof parseMethodSkill>> {
  const parsed = parseMethodSkill(readFileSync(join(CONTENT, rel), 'utf8'))
  if (parsed === null) throw new Error(`不是合法方法包：${rel}`)
  return parsed
}

describe('starter 方法包：两侧同 id 同版本、check-id 同批', () => {
  for (const pack of STARTER_METHODS) {
    it(`${pack}@1.0.0`, () => {
      const producer = parse(`methods/quality-loop-producer/${pack}/SKILL.md`)
      const verifier = parse(`methods/quality-loop-verifier/${pack}/SKILL.md`)
      expect(producer.method).toBe(pack)
      expect(verifier.method).toBe(pack)
      expect(producer.version).toBe('1.0.0')
      expect(verifier.version).toBe('1.0.0')
      expect(producer.side).toBe('producer')
      expect(verifier.side).toBe('verifier')
      expect(producer.checkIds.length).toBeGreaterThan(0)
      expect(verifier.checkIds).toEqual(producer.checkIds)
    })
  }
})

describe('seedMethods：复制、幂等、不覆盖', () => {
  it('复制两侧四个包；再跑跳过；已存在内容不变', () => {
    const methodsRoot = mkdtempSync(join(tmpdir(), 'methods-init-'))
    try {
      const first = seedMethods({ contentDir: CONTENT, methodsRoot })
      expect([...first.copied].sort()).toEqual(METHOD_SIDES.flatMap(side => STARTER_METHODS.map(pack => `${side}/${pack}`)).sort())
      expect(first.skipped).toEqual([])
      for (const side of METHOD_SIDES) {
        for (const pack of STARTER_METHODS) {
          expect(readFileSync(join(methodsRoot, side, pack, 'SKILL.md'), 'utf8')).toContain(`method: ${pack}`)
        }
      }
      const target = join(methodsRoot, 'quality-loop-producer', 'vv-plan', 'SKILL.md')
      writeFileSync(target, '# 人改过的版本\n')
      const second = seedMethods({ contentDir: CONTENT, methodsRoot })
      expect(second.copied).toEqual([])
      expect(second.skipped.every(item => item.reason === 'exists')).toBe(true)
      expect(readFileSync(target, 'utf8')).toBe('# 人改过的版本\n')
    } finally {
      rmSync(methodsRoot, { recursive: true, force: true })
    }
  })

  it('源缺失 → 跳过并报 source-missing，不假成功', () => {
    const contentDir = mkdtempSync(join(tmpdir(), 'methods-content-'))
    const methodsRoot = mkdtempSync(join(tmpdir(), 'methods-root-'))
    try {
      const result = seedMethods({ contentDir, methodsRoot })
      expect(result.copied).toEqual([])
      expect(result.skipped).toHaveLength(METHOD_SIDES.length * STARTER_METHODS.length)
      expect(result.skipped.every(item => item.reason === 'source-missing')).toBe(true)
    } finally {
      rmSync(contentDir, { recursive: true, force: true })
      rmSync(methodsRoot, { recursive: true, force: true })
    }
  })
})

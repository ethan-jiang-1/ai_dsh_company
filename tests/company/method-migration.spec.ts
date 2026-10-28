/**
 * 方法层迁移（2026-10-28 M3）：旧 `<home>/profiles/<p>/company-cultivation/` → 公司级
 * `<home>/company/methods/`。只读旧文件、不覆盖新根、冲突落 `.legacy/<profile>/`、marker 幂等。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { migrateLegacyMethodLayers, METHOD_MIGRATION_MARKER } from '../../packages/company-pack/src/host/cultivation-storage.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'

let env: TempEnv
let methodRoot: string

beforeEach(() => {
  env = createTempEnv('method-migration-')
  methodRoot = join(env.home, 'company', 'methods')
})
afterEach(() => { env.cleanup() })

function seed(profile: string, role: string, slug: string, description: string): string {
  const dir = join(env.home, 'profiles', profile, 'company-cultivation', role, slug)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'SKILL.md')
  writeFileSync(path, `---\nname: ${slug}\ndescription: ${description}\n---\n\n# ${slug}\n`)
  return path
}

describe('方法层旧 profile → 公司级迁移', () => {
  it('复制缺失方法到新根；旧文件保留；marker 幂等', () => {
    const foo = seed('web', 'ceo', 'foo', 'from web')
    seed('web', 'cfo', 'bar', 'from web')
    const first = migrateLegacyMethodLayers(env.home, methodRoot)
    expect(first.skipped).toBe(false)
    expect(first.copied.sort()).toEqual(['ceo/foo', 'cfo/bar'])
    expect(readFileSync(join(methodRoot, 'ceo/foo/SKILL.md'), 'utf8')).toContain('from web')
    expect(existsSync(foo)).toBe(true)
    expect(existsSync(join(methodRoot, METHOD_MIGRATION_MARKER))).toBe(true)

    const second = migrateLegacyMethodLayers(env.home, methodRoot)
    expect(second.skipped).toBe(true)
    expect(second.copied).toEqual([])
  })

  it('新根已有且内容不同：新根保留；旧版本落 .legacy/<profile>/', () => {
    seed('web', 'ceo', 'foo', 'from web')
    seed('web-b', 'ceo', 'foo', 'from web-b')
    const first = migrateLegacyMethodLayers(env.home, methodRoot)
    expect(first.copied).toContain('ceo/foo')
    expect(first.conflicts).toContain('ceo/foo (web-b)')
    expect(readFileSync(join(methodRoot, 'ceo/foo/SKILL.md'), 'utf8')).toContain('from web')
    expect(readFileSync(join(methodRoot, 'ceo/.legacy/web-b/foo.md'), 'utf8')).toContain('from web-b')
  })

  it('非名册角色不迁；根目录按需创建（含 company 父目录）', () => {
    seed('web', 'researcher', 'research-method', 'not a company role')
    const result = migrateLegacyMethodLayers(env.home, methodRoot)
    expect(result.copied).toEqual([])
    expect(existsSync(join(methodRoot, 'researcher'))).toBe(false)
    expect(existsSync(methodRoot)).toBe(true)
  })
})

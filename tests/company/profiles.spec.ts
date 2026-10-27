import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { profilesWithCompanyPack } from '../../packages/company-pack/src/host/profiles.ts'

describe('同 home 多 profile 体检（2026-10-27 G7）', () => {
  it('只点名装了本包的 profile；坏 package.json 跳过', () => {
    const root = mkdtempSync(join(tmpdir(), 'company-profiles-'))
    try {
      const write = (name: string, bundles: unknown): void => {
        mkdirSync(join(root, name), { recursive: true })
        writeFileSync(join(root, name, 'package.json'), JSON.stringify({ dsh: { profile: { bundles } } }))
      }
      write('web', ['@deepseek-ai/dsh-base', 'dsh-company-pack'])
      write('web-b', ['dsh-company-pack'])
      write('web-c', ['@deepseek-ai/dsh-base'])
      mkdirSync(join(root, 'broken'), { recursive: true })
      writeFileSync(join(root, 'broken/package.json'), '{ bad')
      expect(profilesWithCompanyPack(root)).toEqual(['web', 'web-b'])
      expect(profilesWithCompanyPack(join(root, 'missing'))).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

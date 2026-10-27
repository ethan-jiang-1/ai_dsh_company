/**
 * 两个 CEO 两个 home（需求 2）：身份、公司盘、catalog 三样都不串。
 * 这里只做 keyless 盘面/纯逻辑；真装第二 home 的证据在第二机模拟与 release/lifecycle smoke。
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { bootstrapCompanyWorkspace } from '../../packages/company-pack/src/host/bootstrap.ts'
import { planBundleManifest } from '../../packages/company-pack/src/host/bundle-manifest.ts'
import { recordPresented, regenerateCatalog } from '../../packages/company-pack/src/host/catalog.ts'
import { makeTempDir } from '../support/temp-env.ts'

const PACK = { name: 'dsh-company-pack', version: '0.3.8' }
const skeleton = join(ROOT, 'packages/company-pack/workspace')

describe('两个 home 的公司盘隔离', () => {
  it('bundle id / 公司名 / catalog 不串', () => {
    const a = makeTempDir('two-home-a-')
    const b = makeTempDir('two-home-b-')
    const wa = join(a, 'company-workspace')
    const wb = join(b, 'company-workspace')
    try {
      bootstrapCompanyWorkspace(skeleton, wa)
      bootstrapCompanyWorkspace(skeleton, wb)
      writeFileSync(join(wa, 'kb/company.md'), '公司名: Acme\n')
      writeFileSync(join(wb, 'kb/company.md'), '公司名: Beta\n')
      mkdirSync(join(wa, 'deliverables/2026-10-26-a'), { recursive: true })
      writeFileSync(join(wa, 'deliverables/2026-10-26-a/final.md'), '# a\n')
      writeFileSync(join(wa, 'deliverables/2026-10-26-a/meta.md'), 'slug: a\nkickoff: 2026-10-26\n类型: 决策\n结果: 已完成\n')
      const pa = planBundleManifest({ dshHome: a, companyHome: wa, skeletonDir: skeleton, pack: PACK })
      const pb = planBundleManifest({ dshHome: b, companyHome: wb, skeletonDir: skeleton, pack: PACK })
      expect(pa.manifest.id).not.toBe(pb.manifest.id)
      expect(readFileSync(join(wa, 'kb/company.md'), 'utf8')).toContain('Acme')
      expect(readFileSync(join(wb, 'kb/company.md'), 'utf8')).toContain('Beta')
      const recorded = recordPresented(wa, { paths: ['deliverables/2026-10-26-a/final.md'] })
      const ca = regenerateCatalog(wa, recorded.ledger).catalog
      const cb = regenerateCatalog(wb).catalog
      expect(ca?.entries.map(e => e.slug)).toEqual(['a'])
      expect(ca?.entries[0]?.presented).toBe(true)
      expect(cb?.entries).toEqual([])
    } finally {
      rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true })
    }
  })
})

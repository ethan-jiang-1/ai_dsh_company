/**
 * 两个 workspace 的 run bundle 隔离：bundle id / 公司名 / catalog 不串。
 * 这里只做 keyless 盘面/纯逻辑；真装第二 home 的证据在 release/lifecycle smoke。
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'
import { bootstrapCompanyWorkspace } from '../../../packages/company-pack/src/host/run-bundle/bootstrap.ts'
import { planBundleManifest } from '../../../packages/company-pack/src/host/run-bundle/bundle-manifest.ts'
import { regenerateCatalog } from '../../../packages/company-pack/src/host/ledger/catalog.ts'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/run-bundle-paths.ts'
import { makeTempDir } from '../../support/temp-env.ts'

const PACK = { name: 'dsh-company-pack', version: '0.6.0' }
const content = join(ROOT, 'packages/company-pack/content')

describe('两个 workspace 的 run bundle 隔离', () => {
  it('bundle id / 公司名 / catalog 不串', () => {
    const a = makeTempDir('two-home-a-')
    const b = makeTempDir('two-home-b-')
    const wa = join(a, 'workspace')
    const wb = join(b, 'workspace')
    const rel = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-26-a/final.md`
    try {
      bootstrapCompanyWorkspace(content, wa)
      bootstrapCompanyWorkspace(content, wb)
      writeFileSync(join(wa, RUN_BUNDLE_PATHS.company), '公司名: Acme\n')
      writeFileSync(join(wb, RUN_BUNDLE_PATHS.company), '公司名: Beta\n')
      mkdirSync(join(wa, RUN_BUNDLE_PATHS.deliverables, '2026-10-26-a'), { recursive: true })
      writeFileSync(join(wa, RUN_BUNDLE_PATHS.deliverables, '2026-10-26-a/final.md'), '# a\n')
      writeFileSync(join(wa, RUN_BUNDLE_PATHS.deliverables, '2026-10-26-a/meta.md'), 'slug: a\nkickoff: 2026-10-26\n类型: 决策\n结果: 已完成\n')
      const pa = planBundleManifest({ dshHome: a, workspace: wa, pack: PACK })
      const pb = planBundleManifest({ dshHome: b, workspace: wb, pack: PACK })
      expect(pa.manifest.id).not.toBe(pb.manifest.id)
      expect(readFileSync(join(wa, RUN_BUNDLE_PATHS.company), 'utf8')).toContain('Acme')
      expect(readFileSync(join(wb, RUN_BUNDLE_PATHS.company), 'utf8')).toContain('Beta')
      const ledger = {
        schema: 1 as const,
        updatedAt: '2026-10-26T00:00:00.000Z',
        paths: { [rel]: true },
        slugs: { a: true },
      }
      const ca = regenerateCatalog(wa, ledger).catalog
      const cb = regenerateCatalog(wb).catalog
      expect(ca?.entries.map(e => e.slug)).toEqual(['a'])
      expect(ca?.entries[0]?.presented).toBe(true)
      expect(cb?.entries).toEqual([])
    } finally {
      rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true })
    }
  })
})

/**
 * engines.dsh 窗口语义（T6 的最小可证部分）：当前 pin 在窗口内，窗口下界外/上界外拒绝。
 * 真实多 DSH 版本安装矩阵不可得（需要第二份 built CLI），这里不冒充；真装拒绝由 lifecycle-smoke 的坏 engines 覆盖。
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const requireFromVendor = createRequire(join(ROOT, 'vendor/dsh/packages/boot/app-boot/package.json'))
const semver = requireFromVendor('semver') as { satisfies: (version: string, range: string, options?: { includePrerelease?: boolean }) => boolean }

describe('engines.dsh 窗口（语义）', () => {
  const pack = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
  const range = pack.engines.dsh as string
  it('当前 pin 在窗口内；下一 minor 与窗口下界外不在', () => {
    expect(semver.satisfies('0.2.1-rc.2', range, { includePrerelease: true })).toBe(true)
    expect(semver.satisfies('0.3.0', range, { includePrerelease: true })).toBe(false)
    expect(semver.satisfies('0.2.0', range, { includePrerelease: true })).toBe(false)
  })
})

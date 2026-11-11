/**
 * npm pack 的 prepack 守护（2026-11-11 接手审计 Y1）。
 *
 * 为什么：`lib/` 是 gitignored 构建产物；clean clone 直接 `npm pack` 会静默缺 `lib/index.js`
 * 与 `lib/client.js`，产出能装但 import 不了的空包。发布路径会先 build，手工 pack 没有保护。
 * 判据 = pack 声明 prepack 且脚本点名两个入口；行为证据 = 临时移走 lib 后 `npm pack --dry-run`
 * 非零（见当版 Note）。
 *
 * 证明不了：npm 生命周期一定会执行 prepack（归 npm 合同）；只证明包声明与脚本在场。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

describe('company-pack prepack 守护', () => {
  it('prepack 指向脚本，脚本检查 lib 两半', () => {
    const pkg = JSON.parse(read('packages/company-pack/package.json')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.prepack).toBe('node scripts/prepack-check.mjs')
    const guard = read('packages/company-pack/scripts/prepack-check.mjs')
    expect(guard).toContain("'lib/index.js'")
    expect(guard).toContain("'lib/client.js'")
  })
})

/**
 * 启动策略选项的内容预算（2026-11-12）。
 *
 * 判据：真实 `content/` 枚举出的条目数 ≤ `STARTUP_OPTIONS_MAX_ENTRIES`，序列化行数 ≤
 * `STARTUP_OPTIONS_READ_LIMIT`；模板绝对路径指向随包目录。固定 64 行只对当前 2+3 内容成立，
 * 60 个类型时就会静默截断——所以预算必须对**真实内容**算，不是手写夹具。
 *
 * 红配方：把 `STARTUP_OPTIONS_MAX_ENTRIES` 改成 1 → 预算用例红（当前内容已超）；
 * 把 `STARTUP_OPTIONS_READ_LIMIT` 改回 64 → 行数用例红。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { enumerateStartupOptions } from '../../packages/company-pack/src/host/startup/startup-store.ts'
import {
  EMPTY_WIKI_CHECK,
  serializeStartupOptions,
  STARTUP_OPTIONS_MAX_ENTRIES,
  STARTUP_OPTIONS_READ_LIMIT,
} from '../../packages/company-pack/src/lib/startup-settings.ts'

const CONTENT = join(repositoryRoot, 'packages/company-pack/content')

describe('startup options 内容预算', () => {
  it('真实内容的条目数与序列化行数都在预算内', () => {
    const options = enumerateStartupOptions(CONTENT)
    const entries = options.productTypes.length + options.deliveryModes.length
    expect(entries).toBeLessThanOrEqual(STARTUP_OPTIONS_MAX_ENTRIES)
    const text = serializeStartupOptions({
      ...options,
      wikiCheck: { value: '/w', ok: true, problem: null, location: 'outside', checkedAt: '2026-11-12T00:00:00.000Z' },
    })
    expect(text.split('\n').length).toBeLessThanOrEqual(STARTUP_OPTIONS_READ_LIMIT)
  })

  it('模板绝对路径指向随包目录（安装视图）', () => {
    const template = enumerateStartupOptions(CONTENT).wikiTemplate
    expect(template).toBe(join(CONTENT, 'wiki-template'))
    expect(existsSync(join(template ?? '', 'README.md'))).toBe(true)
    expect(EMPTY_WIKI_CHECK.value).toBeNull()
  })
})

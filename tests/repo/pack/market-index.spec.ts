import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildMarketIndex, repositoryWebUrl, stablePublishTimestamp, unpublishedVersionInIndex } from '../../../tools/lib/market-index.mjs'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const PACK = join(ROOT, 'packages/company-pack')
const manifest = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const locales = Object.fromEntries(['en', 'zh'].map(lang => [lang, JSON.parse(readFileSync(join(PACK, 'locale', `${lang}.json`), 'utf8'))]))

describe('插件市场 index（format 1）', () => {
  it('manifest → 条目：DSH 真校验器接受，展示字段与 manifest/locale 对齐', async () => {
    const index = buildMarketIndex({ manifest, locales, publishTimestamp: 1_790_000_000 })
    const { parseMarketIndex } = await import('../../../vendor/dsh/packages/util/plugin-market-index/lib/index.js')
    const parsed = parseMarketIndex(index, 'https://example.invalid/index.json')
    const plugin = parsed.plugins[0]
    expect(plugin.name).toBe(manifest.name)
    expect(plugin.title?.en).toBe(locales.en.meta.title)
    expect(plugin.title?.zh).toBe(locales.zh.meta.title)
    expect(plugin.description?.en).toBe(locales.en.meta.description)
    expect(plugin.author).toBe(manifest.author)
    expect(plugin.homepage).toBe(manifest.homepage)
    expect(plugin.repository?.url).toBe('https://github.com/ethan-jiang-1/ai_dsh_company')
    expect(plugin.repository?.directory).toBe('packages/company-pack')
    expect(plugin.metadata.keywords).toEqual(manifest.keywords)
    expect(plugin.versions[0]?.version).toBe(manifest.version)
    expect(plugin.versions[0]?.engines.dsh).toBe(manifest.engines.dsh)
  })

  it('仓库根 market-index.json 与包版本一致，且被 DSH 校验器接受', async () => {
    const tracked = JSON.parse(readFileSync(join(ROOT, 'market-index.json'), 'utf8'))
    const { parseMarketIndex } = await import('../../../vendor/dsh/packages/util/plugin-market-index/lib/index.js')
    const parsed = parseMarketIndex(tracked, 'https://example.invalid/market-index.json')
    const plugin = parsed.plugins.find((item: { name: string }) => item.name === manifest.name)
    expect(plugin, 'tracked index 缺本包条目').toBeDefined()
    expect(plugin?.versions.some((version: { version: string }) => version.version === manifest.version), 'tracked index 版本落后于 package.json（先跑 node tools/market-index.mjs --prepare）').toBe(true)
    expect(plugin?.icon?.startsWith('data:image/svg+xml;base64,'), 'tracked index 图标应内联，单文件可托管').toBe(true)
    expect(plugin?.metadata.category).toBe('company')
  })

  it('同版本重复生成保持发布时间不变（tracked index 不被"生成时刻"弄脏）', () => {
    const existing = buildMarketIndex({ manifest, locales, publishTimestamp: 1_700_000_000, icon: 'data:image/svg+xml;base64,AA==' })
    expect(stablePublishTimestamp({ existingIndex: existing, name: manifest.name, version: manifest.version, now: 1_800_000_000 })).toBe(1_700_000_000)
    expect(stablePublishTimestamp({ existingIndex: existing, name: manifest.name, version: '9.9.9', now: 1_800_000_000 })).toBe(1_800_000_000)
    expect(stablePublishTimestamp({ existingIndex: existing, name: manifest.name, version: manifest.version, now: 1_800_000_000, refresh: true })).toBe(1_800_000_000)
  })

  it('仓库网页 URL 去 git+ / .git，不把 clone URL 原样塞给市场', () => {
    expect(repositoryWebUrl('git+https://github.com/acme/pack.git')).toBe('https://github.com/acme/pack')
    expect(repositoryWebUrl('https://github.com/acme/pack/')).toBe('https://github.com/acme/pack')
  })

  it('托管前检查：served index 仍列 staged 未发布版本时命中该版本', () => {
    const index = buildMarketIndex({ manifest, locales, publishTimestamp: 1_790_000_000 })
    expect(unpublishedVersionInIndex({ index, staged: { version: manifest.version, requiresPublish: true } })).toBe(manifest.version)
    expect(unpublishedVersionInIndex({ index, staged: { version: manifest.version, requiresPublish: false } })).toBeUndefined()
    expect(unpublishedVersionInIndex({ index, staged: undefined as never })).toBeUndefined()
    expect(unpublishedVersionInIndex({ index, staged: { version: '9.9.9', requiresPublish: true } })).toBeUndefined()
  })
})

describe('locale 与 tracked market index 的六角色描述', () => {
  it('不含 Five/五个角色，含 CMO；tracked index 与 locale 同源', () => {
    const tracked = JSON.parse(readFileSync(join(ROOT, 'market-index.json'), 'utf8'))
    const plugin = tracked.plugins.find((item: { name: string }) => item.name === manifest.name)
    for (const lang of ['en', 'zh']) {
      const description = locales[lang].meta.description
      expect(description).not.toMatch(/Five role|五个角色/)
      expect(description).toContain('CMO')
      expect(plugin.description[lang]).toBe(description)
    }
  })
})

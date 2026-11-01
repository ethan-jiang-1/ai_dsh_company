import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildMarketIndex, repositoryWebUrl } from '../../tools/lib/market-index.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const PACK = join(ROOT, 'packages/company-pack')
const manifest = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const locales = Object.fromEntries(['en', 'zh'].map(lang => [lang, JSON.parse(readFileSync(join(PACK, 'locale', `${lang}.json`), 'utf8'))]))

describe('插件市场 index（format 1）', () => {
  it('manifest → 条目：DSH 真校验器接受，展示字段与 manifest/locale 对齐', async () => {
    const index = buildMarketIndex({ manifest, locales, publishTimestamp: 1_790_000_000 })
    // @ts-expect-error vendor built ESM has no root .d.ts; runtime shape is the authority here.
    const { parseMarketIndex } = await import('../../vendor/dsh/packages/util/plugin-market-index/lib/index.js')
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

  it('仓库网页 URL 去 git+ / .git，不把 clone URL 原样塞给市场', () => {
    expect(repositoryWebUrl('git+https://github.com/acme/pack.git')).toBe('https://github.com/acme/pack')
    expect(repositoryWebUrl('https://github.com/acme/pack/')).toBe('https://github.com/acme/pack')
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DeliverablesView,
  filterCatalog,
  formatGeneratedAt,
  parseCatalog,
  type DeliverablesCatalog,
} from '../../packages/company-pack/src/client/DeliverablesTab.tsx'
import { sessionFileAddress } from '../../packages/company-pack/src/lib/deliverables-address.ts'
import { buildDeliverablesCatalog } from '../../tools/lib/deliverables-catalog.mjs'

/**
 * 成品目录的 keyless 层（2026-10-19 成品台账卡）：
 * 解析形状 / 筛选 / 静态渲染 / final.md 的文件资源地址。
 * 真浏览器证据（页签打开、行数、截图）归 `deliverables-catalog-probe`。
 */
const CATALOG = parseCatalog(JSON.stringify({
  schema: 1,
  generatedAt: '2026-10-19T15:14:50.242Z',
  counts: { total: 3, active: 2, archive: 1, unledgered: 2, presented: 1, notPresented: 1, presentUnknown: 1 },
  entries: [
    {
      slug: 'ledgered-one', kickoff: '2026-10-19', type: '诊断', result: '已完成',
      summary: '一句结论一：这是看板上的成品摘要。', root: 'deliverables',
      dir: '2026-10-19-ledgered-one', path: 'deliverables/2026-10-19-ledgered-one/final.md', ledgered: true, presented: true,
    },
    {
      slug: 'archive-two', kickoff: '2026-10-12', type: '生产', result: '已采纳',
      summary: '一句结论二：归档件。', root: 'deliverables-archive',
      dir: '2026-10-12-archive-two', path: 'deliverables-archive/2026-10-12-archive-two/final.md', ledgered: false, presented: false,
    },
    {
      slug: 'active-three', kickoff: '2026-10-19', type: '口径问答', result: '判不了',
      summary: '一句结论三：台账外。', root: 'deliverables',
      dir: '2026-10-19-active-three', path: 'deliverables/2026-10-19-active-three/final.md', ledgered: false, presented: null,
    },
  ],
})) as DeliverablesCatalog

describe('parseCatalog', () => {
  it('接受 schema 1；坏 JSON / 错 schema / 缺 entries 返回 null', () => {
    expect(parseCatalog('{')).toBeNull()
    expect(parseCatalog(JSON.stringify({ schema: 2, entries: [] }))).toBeNull()
    expect(parseCatalog(JSON.stringify({ schema: 1 }))).toBeNull()
    expect(CATALOG.entries).toHaveLength(3)
  })

  it('缺字段的条目跳过；ledgered 缺省按 true（不让缺字段的旧索引全变成台账外）', () => {
    const parsed = parseCatalog(JSON.stringify({
      schema: 1, generatedAt: 'x', entries: [{ slug: 's', path: 'deliverables/s/final.md' }, { slug: '', path: 'x' }],
    }))
    expect(parsed?.entries).toHaveLength(1)
    expect(parsed?.entries[0]?.ledgered).toBe(true)
    expect(parsed?.entries[0]?.presented).toBeNull()
  })
})

describe('filterCatalog / formatGeneratedAt', () => {
  it('活跃 / 归档 / 台账外三档各自只留对应项', () => {
    expect(filterCatalog(CATALOG.entries, 'active').map(entry => entry.slug)).toEqual(['ledgered-one', 'active-three'])
    expect(filterCatalog(CATALOG.entries, 'archive').map(entry => entry.slug)).toEqual(['archive-two'])
    expect(filterCatalog(CATALOG.entries, 'unledgered').map(entry => entry.slug)).toEqual(['archive-two', 'active-three'])
    expect(filterCatalog(CATALOG.entries, 'unpresented').map(entry => entry.slug)).toEqual(['archive-two'])
    expect(filterCatalog(CATALOG.entries, 'all')).toHaveLength(3)
  })

  it('生成时间显示为 UTC 分钟（不依赖浏览器时区）', () => {
    expect(formatGeneratedAt('2026-10-19T15:14:50.242Z')).toBe('2026-10-19 15:14 UTC')
    expect(formatGeneratedAt('not-a-date')).toBe('not-a-date')
  })
})

describe('DeliverablesView（静态渲染）', () => {
  const html = renderToStaticMarkup(createElement(DeliverablesView, {
    catalog: CATALOG,
    sessionId: 'session-test' as never,
    openFinal: () => {},
  }))

  it('先给统计：共 3 份 / 活跃 2 / 归档 1 / 台账外 2 / present 1 / 未 present 1 / 未核 1', () => {
    expect(html).toContain('共 <strong>3</strong> 份成品')
    expect(html).toContain('活跃 2')
    expect(html).toContain('归档 1')
    expect(html).toContain('台账外 2')
    expect(html).toContain('present 1')
    expect(html).toContain('未 present 1')
    expect(html).toContain('present 未核 1')
  })

  it('按月分组，行里同时有 slug、日期/类型、结论、结果 tag 与「打开」', () => {
    expect(html).toContain('2026-10 · 3 份')
    expect(html).toContain('ledgered-one')
    expect(html).toContain('2026-10-19 · 诊断')
    expect(html).toContain('一句结论一')
    expect(html).toContain('打开')
    expect(html).toContain('归档')
    expect(html).toContain('台账外')
    expect(html).toContain('未 present')
    expect(html).toContain('present 未核')
  })

  it('有可访问的目录与筛选面；行/打开按钮不是纯视觉', () => {
    expect(html).toContain('aria-label="成品目录"')
    expect(html).toContain('role="listitem"')
    expect(html).toContain('aria-label="打开 ledgered-one 的 final.md"')
    expect(html).toContain('aria-pressed="true"')
  })
})

describe('generator → parser 契约', () => {
  it('工具生成的真实形状可被页签 parser 解析（含 counts 与条目字段）', () => {
    const built = buildDeliverablesCatalog({
      entries: [{
        root: 'deliverables',
        dir: '2026-10-20-contract',
        fields: new Map([['slug', 'contract'], ['kickoff', '2026-10-20'], ['类型', '决策'], ['结果', '已采纳'], ['一句话结论', '一句结论']]),
        final: true,
        presented: true,
      }],
      ledgerSlugs: new Set(['contract']),
      generatedAt: '2026-10-20T00:00:00.000Z',
    })
    const parsed = parseCatalog(JSON.stringify(built))
    expect(parsed?.counts).toEqual(built.counts)
    expect(parsed?.entries).toEqual([{
      slug: 'contract', kickoff: '2026-10-20', type: '决策', result: '已采纳', summary: '一句结论',
      root: 'deliverables', dir: '2026-10-20-contract', path: 'deliverables/2026-10-20-contract/final.md',
      ledgered: true, presented: true,
    }])
  })
})

describe('sessionFileAddress', () => {
  it('生成 dsh-resource://file/session 地址；段级编码，空格/# 不丢', () => {
    expect(sessionFileAddress('session-1', 'deliverables/2026-10-19-a/final.md'))
      .toBe('dsh-resource://file/session/session-1/deliverables/2026-10-19-a/final.md')
    expect(sessionFileAddress('session-1', 'deliverables/a b/final #1.md'))
      .toBe('dsh-resource://file/session/session-1/deliverables/a%20b/final%20%231.md')
  })
})

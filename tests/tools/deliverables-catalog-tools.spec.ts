// 负例留证 2026-11-24：让 slug 集合继续收列数不符的行 ⇒ 本文件 BUG-362 用例红。BUG-362
import { describe, expect, it } from 'vitest'
import { buildDeliverablesCatalog, deliverableSlug, ledgerSlugsFromText, metaProblemsOf } from '../../tools/lib/company/deliverables-catalog.mjs'
import { ledgerSlugsFromText as ledgerSlugsFromTextTs } from '../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts'

/**
 * 成品目录的 keyless 形状判据（2026-10-19 成品台账卡）。
 *
 * 只钉纯逻辑：有无 final、排序、活跃/归档、台账外、slug 回落。盘上扫描与页签渲染
 * 各自有 owner（`tools/repo/deliverables-index.mjs` / `DeliverablesTab` spec）。
 */
const fields = (record: Record<string, string>): Map<string, string> => new Map(Object.entries(record))

describe('buildDeliverablesCatalog', () => {
  const catalog = buildDeliverablesCatalog({
    generatedAt: '2026-10-19T00:00:00.000Z',
    ledgerSlugs: new Set(['ledgered-one']),
    entries: [
      {
        root: '.dsh-company/deliverables',
        dir: '2026-10-18-ledgered-one',
        fields: fields({ slug: 'ledgered-one', kickoff: '2026-10-18', type: 'diagnostic', result: 'completed', summary: '一句结论一' }),
        final: true, presented: true,
      },
      {
        root: '.dsh-company/deliverables-archive',
        dir: '2026-10-17-archived-two',
        fields: fields({ slug: 'archived-two', kickoff: '2026-10-17', type: 'production', result: 'accepted', summary: '一句结论二' }),
        final: true, presented: false,
      },
      {
        root: '.dsh-company/deliverables',
        dir: '2026-10-19-draft-no-final',
        fields: fields({ slug: 'draft-no-final', kickoff: '2026-10-19', type: 'diagnostic', result: 'in-progress' }),
        final: false,
      },
      {
        // meta 缺 slug/kickoff/类型/结果/结论：slug 从目录回落，其余给空串，不崩。
        root: '.dsh-company/deliverables',
        dir: '2026-10-16-fallback-slug',
        fields: new Map(),
        final: true, presented: null,
      },
    ],
  })

  it('只收 final.md；无 final 的过程稿不进目录', () => {
    expect(catalog.entries.map(entry => entry.slug)).toEqual(['ledgered-one', 'archived-two', 'fallback-slug'])
  })

  it('按 kickoff 倒序、同日起 slug 升序', () => {
    expect(catalog.entries.map(entry => entry.kickoff)).toEqual(['2026-10-18', '2026-10-17', ''])
  })

  it('计数分开活跃 / 归档 / 台账外', () => {
    expect(catalog.counts).toEqual({ total: 3, active: 2, archive: 1, unledgered: 2, presented: 1, notPresented: 1, presentUnknown: 1 })
    expect(catalog.entries.find(entry => entry.slug === 'ledgered-one')?.ledgered).toBe(true)
    expect(catalog.entries.find(entry => entry.slug === 'archived-two')?.ledgered).toBe(false)
  })

  it('path = root/dir/final.md；slug 缺省从目录剥日期前缀', () => {
    expect(catalog.entries.find(entry => entry.slug === 'archived-two')?.path)
      .toBe('.dsh-company/deliverables-archive/2026-10-17-archived-two/final.md')
    const fallback = catalog.entries.find(entry => entry.slug === 'fallback-slug')
    expect(fallback).toMatchObject({ dir: '2026-10-16-fallback-slug', kickoff: '', type: '', result: '', summary: '' })
  })

  it('空输入给零计数，不抛', () => {
    expect(buildDeliverablesCatalog({ entries: [], ledgerSlugs: new Set(), generatedAt: 'x' }))
      .toMatchObject({ schema: 1, counts: { total: 0, active: 0, archive: 0, unledgered: 0, presented: 0, notPresented: 0, presentUnknown: 0 }, entries: [] })
  })
})

// 负例留证 2026-11-24：把 tools 侧 slug 改回 `fields.get('slug') ?? dir` ⇒ 空 `slug:` 用例红（产出 slug ""、客户端整条丢弃）。BUG-347
describe('tools 侧空 slug 回落（BUG-347）', () => {
  it('缺失 / 空串 / 纯空白 slug 都回落到目录名', () => {
    expect(deliverableSlug(new Map(), '2026-10-16-fallback')).toBe('fallback')
    expect(deliverableSlug(new Map([['slug', '']]), '2026-10-16-fallback')).toBe('fallback')
    expect(deliverableSlug(new Map([['slug', '   ']]), '2026-10-16-fallback')).toBe('fallback')
  })

  it('空 slug 的成品仍按回退 slug 对上台账，客户端 parseCatalog 不丢条', async () => {
    const catalog = buildDeliverablesCatalog({
      generatedAt: '2026-11-24T00:00:00.000Z',
      ledgerSlugs: new Set(['fallback']),
      entries: [{
        root: '.dsh-company/deliverables',
        dir: '2026-10-16-fallback',
        fields: new Map([['slug', '  '], ['kickoff', '2026-10-16'], ['type', 'diagnostic'], ['result', 'completed']]),
        final: true, presented: true,
      }],
    })
    expect(catalog.entries[0]).toMatchObject({ slug: 'fallback', ledgered: true, presented: true })
    const { parseCatalog } = await import('../../packages/company-pack/src/client/data/deliverables-index.ts')
    const parsed = parseCatalog(JSON.stringify(catalog))
    expect(parsed).not.toBeNull()
    if (parsed === null) throw new Error('catalog should parse')
    expect(parsed.skipped).toBe(0)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0]?.slug).toBe('fallback')
  })
})

// 负例留证 2026-11-24：tools 侧裸 split('|') ⇒ 与 TS 侧转义竖线用例红/发散。BUG-356
describe('台账 slug 集合：TS/JS 同方言（BUG-356）', () => {
  const TEXT = [
    '| slug | date | type | participants | wallClock | deliverable | summary |',
    '|---|---|---|---|---|---|---|',
    '| a | 2026-11-20 | decision | ceo | 1m | ✅ | A\\|B |',
    '| b | 2026-11-21 | decision | ceo | 1m | ✅ | plain |',
  ].join('\n')

  it('列数不符的坏行不进 slug 集合（BUG-362）', () => {
    const text = [
      '| slug | date | type | participants | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '| ok-1 | 2026-01-01 | decision | ceo | 1m | ✅ | s |',
      '| broken | x |',
    ].join('\n')
    expect([...ledgerSlugsFromText(text)]).toEqual(['ok-1'])
    expect([...ledgerSlugsFromTextTs(text)]).toEqual(['ok-1'])
  })

  it('无表头 / 分隔行 / 空首列都被跳过且两侧一致', () => {
    const edge = [
      '正文行不是表格',
      '| date | slug |',
      '|---|---|',
      '| x | y |',
      '| slug | date | type | participants | wallClock | deliverable | summary |',
      '|---|---|---|---|---|---|---|',
      '|  | 2026-11-20 | decision | ceo | 1m | ✅ | empty first |',
      '| a | 2026-11-20 | decision | ceo | 1m | ✅ | A\\|B |',
    ].join('\n')
    expect([...ledgerSlugsFromText(edge)]).toEqual([...ledgerSlugsFromTextTs(edge)])
    expect([...ledgerSlugsFromText(edge)]).toEqual(['a'])
  })

  it('非权威表头 / 重复表头：两侧一致，重复表头不产出 slug', () => {
    const wrong = '| slug | 日期 |\n|---|---|\n| alpha | 2026-10-25 |\n'
    expect([...ledgerSlugsFromText(wrong)]).toEqual([])
    expect([...ledgerSlugsFromTextTs(wrong)]).toEqual([])
    const header = '| slug | date | type | participants | wallClock | deliverable | summary |'
    const repeated = [header, '|---|---|---|---|---|---|---|', '| a | 2026-10-25 | decision | ceo | 1m | ✅ | s |', header].join('\n')
    expect([...ledgerSlugsFromText(repeated)]).toEqual(['a'])
    expect([...ledgerSlugsFromTextTs(repeated)]).toEqual(['a'])
  })

  it('两侧解析同一份含 \\| 的台账得到相同 slug 集合', () => {
    const js = ledgerSlugsFromText(TEXT)
    const ts = ledgerSlugsFromTextTs(TEXT)
    expect([...js].sort()).toEqual(['a', 'b'])
    expect([...ts].sort()).toEqual([...js].sort())
  })
})

describe('metaProblemsOf / deliverableSlug 分支（BUG-356 复查）', () => {
  it('缺行/枚举外/日期格式都记账', () => {
    expect(metaProblemsOf(new Map())).toHaveLength(2) // kickoff/type 缺行；result/slug 可省（BUG-371）
    const problems = metaProblemsOf(new Map([['kickoff', '2026/11/20'], ['type', 'bogus'], ['result', 'bogus']]))
    expect(problems.join('\n')).toContain('YYYY-MM-DD')
    expect(problems.join('\n')).toContain('type 不在词表')
    expect(problems.join('\n')).toContain('result 不在词表')
  })

  it('显式 slug 原样返回；空/空白回落目录名', () => {
    expect(deliverableSlug(new Map([['slug', 'explicit']]), '2026-11-20-dir')).toBe('explicit')
    expect(deliverableSlug(new Map([['slug', ' ']]), '2026-11-20-dir')).toBe('dir')
  })
})

describe('catalog metaProblem 分支（BUG-356 复查）', () => {
  it('meta 字段坏 ⇒ metaProblem 非空', () => {
    const catalog = buildDeliverablesCatalog({
      generatedAt: '2026-11-24T00:00:00.000Z',
      ledgerSlugs: new Set(),
      entries: [{
        root: '.dsh-company/deliverables',
        dir: '2026-11-24-bad',
        fields: new Map([['slug', 'bad'], ['kickoff', '2026/11/24'], ['type', 'bogus'], ['result', 'bogus']]),
        final: true, presented: null,
      }],
    })
    expect(catalog.entries[0]?.metaProblem).toBeTruthy()
  })
})

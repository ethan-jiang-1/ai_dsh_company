import { describe, expect, it } from 'vitest'
import { buildDeliverablesCatalog } from '../../../tools/lib/deliverables-catalog.mjs'

/**
 * 成品目录的 keyless 形状判据（2026-10-19 成品台账卡）。
 *
 * 只钉纯逻辑：有无 final、排序、活跃/归档、台账外、slug 回落。盘上扫描与页签渲染
 * 各自有 owner（`tools/deliverables-index.mjs` / `DeliverablesTab` spec）。
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
        fields: fields({ slug: 'ledgered-one', kickoff: '2026-10-18', type: 'diagnostic', result: 'completed', 一句话结论: '一句结论一' }),
        final: true, presented: true,
      },
      {
        root: '.dsh-company/deliverables-archive',
        dir: '2026-10-17-archived-two',
        fields: fields({ slug: 'archived-two', kickoff: '2026-10-17', type: 'production', result: 'accepted', 一句话结论: '一句结论二' }),
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

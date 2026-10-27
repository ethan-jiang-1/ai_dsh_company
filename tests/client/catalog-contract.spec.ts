import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildDeliverablesCatalog, metaProblemsOf as metaProblemsJs } from '../../tools/lib/deliverables-catalog.mjs'
import { META_RESULTS } from '../../tools/lib/deliverables.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { parseCatalog } from '../../packages/company-pack/src/client/deliverables-index.ts'
import { resultTone } from '../../packages/company-pack/src/client/DeliverablesTab.tsx'
import { metaProblemsOf as metaProblemsTs } from '../../packages/company-pack/src/lib/deliverables-catalog.ts'

/**
 * 成品目录的**契约夹具**（2026-10-23 架构评审候选 2）。
 *
 * 此前同一份 schema 被写三遍：生成器 JSDoc、页签 parser、浏览器探针；真实对账只在最重的浏览器层。
 * 本文件把「生成器的输出形状」落成一个提交的 JSON，两侧共钉：
 *   - 生成器侧：同一输入必须产出与夹具逐字段相等的结果；
 *   - 页签侧：parser 必须把夹具解析回同一批 entries。
 * 加一个字段会同时打破两个断言（生成器产物变、parser 不认），不会静默漂。
 * 夹具只描述形状，不描述业务事实：`tests/fixtures/catalog.contract.json`。
 */
const FIXTURE_TEXT = readFileSync(join(ROOT, 'tests', 'fixtures', 'catalog.contract.json'), 'utf8')
const FIXTURE = JSON.parse(FIXTURE_TEXT) as {
  counts: Record<string, number>
  entries: Array<Record<string, unknown>>
}

/** 与生成夹具时同一份输入：两根、台账内外、present 三态、7 个结果词 + 1 个未知词、缺字段、无 final。 */
const INPUT = {
  generatedAt: '2026-10-23T00:00:00.000Z',
  ledgerSlugs: new Set(['alpha', 'gamma', 'eta']),
  entries: [
    { root: 'deliverables', dir: '2026-10-01-alpha', fields: new Map([['slug', 'alpha'], ['kickoff', '2026-10-01'], ['类型', '决策'], ['结果', '已完成'], ['一句话结论', '甲']]), final: true, presented: true },
    { root: 'deliverables', dir: '2026-10-02-beta', fields: new Map([['kickoff', '2026-10-02'], ['类型', '诊断'], ['结果', '进行中'], ['一句话结论', '乙']]), final: true, presented: false },
    { root: 'deliverables-archive', dir: '2026-09-30-gamma', fields: new Map([['slug', 'gamma'], ['kickoff', '2026-09-30'], ['结果', '已否决']]), final: true, presented: null },
    { root: 'deliverables', dir: '2026-10-03-delta', fields: new Map([['slug', 'delta'], ['kickoff', '2026-10-03'], ['结果', '已搁置']]), final: true, presented: undefined },
    { root: 'deliverables', dir: '2026-10-04-epsilon', fields: new Map([['slug', 'epsilon'], ['kickoff', '2026-10-04'], ['结果', '已废弃']]), final: true, presented: false },
    { root: 'deliverables', dir: '2026-10-05-zeta', fields: new Map([['slug', 'zeta'], ['kickoff', '2026-10-05'], ['结果', '判不了']]), final: true, presented: null },
    { root: 'deliverables', dir: '2026-10-06-eta', fields: new Map([['slug', 'eta'], ['kickoff', '2026-10-06'], ['结果', '已采纳']]), final: true, presented: true },
    { root: 'deliverables', dir: '2026-10-07-theta', fields: new Map([['slug', 'theta'], ['kickoff', '2026-10-07'], ['结果', '未知值']]), final: true, presented: undefined },
    { root: 'deliverables', dir: '2026-10-08-iota', fields: new Map([['slug', 'iota'], ['kickoff', '2026-10-08']]), final: false, presented: undefined },
  ],
}

describe('成品目录契约（生成器 ↔ 页签 parser 共钉一份夹具）', () => {
  it('生成器对固定输入产出的就是夹具本身（形状变更先破这里）', () => {
    expect(buildDeliverablesCatalog(INPUT)).toEqual(FIXTURE)
  })

  it('parser 把夹具解析回同一批 entries（不解析 counts——视图从 entries 现算）', () => {
    const parsed = parseCatalog(FIXTURE_TEXT)
    expect(parsed?.entries).toEqual(FIXTURE.entries)
    expect(parsed !== null && 'counts' in parsed).toBe(false)
  })

  it('两侧 metaProblemsOf 同判据（防复制后漂移）', () => {
    const cases = [
      new Map([['kickoff', '2026-10-01'], ['类型', '决策'], ['结果', '已完成']]),
      new Map([['kickoff', '2026/10/01'], ['类型', '未知'], ['结果', '完成']]),
      new Map(),
    ]
    for (const fields of cases) expect(metaProblemsTs(fields)).toEqual(metaProblemsJs(fields))
  })

  it('结果词表全覆盖：META_RESULTS 的每个值都有色调，未知值才落 outline', () => {
    for (const value of META_RESULTS as string[]) expect(resultTone(value), value).not.toBe('outline')
    expect(resultTone('未知值')).toBe('outline')
  })

  it('坏行不装成条目：缺 slug / 缺 path 的行丢弃，root 只认两值', () => {
    const parsed = parseCatalog(JSON.stringify({
      schema: 1,
      generatedAt: '2026-10-23T00:00:00.000Z',
      entries: [
        { slug: '', path: 'deliverables/x/final.md' },
        { slug: 'ok', path: '' },
        { slug: 'kept', path: 'deliverables/kept/final.md', root: 'bogus-root', ledgered: undefined },
      ],
    }))
    expect(parsed?.entries).toHaveLength(1)
    expect(parsed?.entries[0]).toMatchObject({ slug: 'kept', root: 'deliverables', ledgered: true, presented: null })
  })
})

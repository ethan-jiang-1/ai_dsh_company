// 负例留证 2026-11-24：让 tools `validateMeta` 保留旧判据（强制 slug/空 result 判红）⇒ 本对拍红。BUG-371
/** meta.md 形状判据三处同源对拍：面板（TS）、catalog 孪生（JS）、仓库审计（validateMeta）。 */
import { describe, expect, it } from 'vitest'
import { metaProblemsOf as metaProblemsTs, parseMeta as parseMetaTs } from '../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts'
import { metaProblemsOf as metaProblemsJs } from '../../tools/lib/company/deliverables-catalog.mjs'
import { validateMeta } from '../../tools/lib/company/deliverables.mjs'

const bodies = {
  'ok': 'slug: foo\nkickoff: 2026-11-20\ntype: decision\nresult: accepted\n',
  'no slug': 'kickoff: 2026-11-20\ntype: decision\nresult: accepted\n',
  'dated slug': 'slug: 2026-11-20-foo\nkickoff: 2026-11-20\ntype: decision\nresult: accepted\n',
  'empty result': 'slug: foo\nkickoff: 2026-11-20\ntype: decision\nresult:   \n',
  'missing result': 'slug: foo\nkickoff: 2026-11-20\ntype: decision\n',
  'bad kickoff': 'slug: foo\nkickoff: 2026/11/20\ntype: decision\nresult: accepted\n',
  'blank type': 'slug: foo\nkickoff: 2026-11-20\ntype:   \nresult: accepted\n',
  'bad type': 'slug: foo\nkickoff: 2026-11-20\ntype: bogus\nresult: accepted\n',
  'bad result': 'slug: foo\nkickoff: 2026-11-20\ntype: decision\nresult: bogus\n',
}

describe('meta 形状三处同源（BUG-371）', () => {
  for (const [name, body] of Object.entries(bodies)) {
    it(`${name}：面板 / 孪生 / 审计结论逐字相等`, () => {
      const ts = metaProblemsTs(parseMetaTs(body).fields)
      const js = metaProblemsJs(parseMetaTs(body).fields)
      const audit = validateMeta(body).problems
      expect(js, 'catalog 孪生').toEqual(ts)
      expect(audit, '仓库审计').toEqual(ts)
    })
  }

  it('result 留空与缺行都合法；缺 slug 合法；日期前缀 slug 红', () => {
    expect(metaProblemsTs(parseMetaTs(bodies['empty result']).fields)).toEqual([])
    expect(metaProblemsTs(parseMetaTs(bodies['missing result']).fields)).toEqual([])
    expect(metaProblemsTs(parseMetaTs(bodies['no slug']).fields)).toEqual([])
    expect(metaProblemsTs(parseMetaTs(bodies['dated slug']).fields)).toEqual(['slug 字段写剥前缀形式（不带日期前缀——日期住 kickoff 字段）'])
  })
})

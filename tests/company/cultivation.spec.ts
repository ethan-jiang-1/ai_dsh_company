/** 培养面板读模型（驾驶舱④切片四 + 2026-10-13 培养卡的 keyless 完成定义）。 */
import { describe, expect, it } from 'vitest'
import {
  CULTIVATION_ROLES,
  PREVIEW_LIMIT,
  feedbackItems,
  inboxRows,
  journalTitle,
  methodSkillText,
  parseRecord,
  recordInbox,
  recordText,
  type CultivationRecord,
} from '../../packages/company-pack/src/lib/cultivation.ts'

/**
 * 只测纯函数（毫秒级）。真数据渲染（company-workspace 真 journal 进面板）是认证档：
 * 浏览器开真页面走查（guides/dev-loop §9.1 分层）。
 */

describe('journalTitle', () => {
  it('优先取首个标题行；无标题取首段非空行', () => {
    expect(journalTitle('# 对账模块评估\n\n结论：接得住。')).toBe('对账模块评估')
    expect(journalTitle('## 2026-09-22 复盘\n细节…')).toBe('2026-09-22 复盘')
    expect(journalTitle('\n\n结论先行：三件事。\n后续')).toBe('结论先行：三件事。')
  })

  it('长标题截断；空文本给（空）', () => {
    expect(journalTitle(`# ${'长'.repeat(80)}`)).toBe(`${'长'.repeat(60)}…`)
    expect(journalTitle('   \n\n')).toBe('（空）')
  })
})

describe('inboxRows', () => {
  it('每角色一行：计数 + 文件名倒序前 3 条预览；已读条目用标题、未读降级文件名', () => {
    const rows = inboxRows(
      { ceo: ['b.md', 'a.md', 'c.md', 'd.md'], coo: ['only.md'] },
      { 'ceo/d.md': '# 最新复盘', 'ceo/c.md': '结论：预算内。' },
    )
    expect(rows).toHaveLength(CULTIVATION_ROLES.length)
    const ceo = rows.find(row => row.role === 'ceo')!
    expect(ceo.count).toBe(4)
    expect(ceo.entries.map(entry => entry.name)).toEqual(['d.md', 'c.md', 'b.md'])
    expect(ceo.entries[0]!.title).toBe('最新复盘')
    expect(ceo.entries[1]!.title).toBe('结论：预算内。')
    expect(ceo.entries[2]!.title).toBe('b') // 未读 → 文件名去后缀
    const coo = rows.find(row => row.role === 'coo')!
    expect(coo.count).toBe(1)
    expect(coo.entries).toHaveLength(1)
  })

  it('缺角色清单 = 0 条待审（不撒谎：全部存量就是待审）', () => {
    const rows = inboxRows({}, {})
    for (const row of rows) {
      expect(row.count).toBe(0)
      expect(row.entries).toHaveLength(0)
    }
    expect(rows.map(row => row.label)).toEqual(['CEO', 'VP-Eng', 'VP-Sales', 'COO', 'CFO'])
  })

  it('预览上限 = PREVIEW_LIMIT', () => {
    const names = Array.from({ length: 10 }, (_, i) => `j${String(i)}.md`)
    const [ceo] = inboxRows({ ceo: names }, {})
    expect(ceo.entries).toHaveLength(PREVIEW_LIMIT)
    expect(ceo.count).toBe(10)
  })

  // 2026-10-13 培养卡 V2（数据诚实）：清单不可达 ≠ 0——目录缺失/断流必须以「不可达」态
  // 呈现，不许折成「无待审」（负例 = 旧实现把缺失当 0）。
  it('清单不可达 → 该角色行 reach=unreachable（不是 0 待审）', () => {
    const rows = inboxRows({ ceo: ['a.md'], cfo: null }, {})
    const ceo = rows.find(row => row.role === 'ceo')!
    const cfo = rows.find(row => row.role === 'cfo')!
    expect(ceo.reach).toBe('ok')
    expect(ceo.count).toBe(1)
    expect(cfo.reach).toBe('unreachable')
    expect(cfo.count).toBe(0)
    expect(cfo.entries).toHaveLength(0)
  })
})

// ── 培养记录读模型（2026-10-13 卡：本人教学 / 跨角色建议 / 采纳回执）──
// 记录 = 公司盘 cultivation/records/*.md，frontmatter 扁平字段（手解析，不引 yaml 进浏览器包）。
describe('培养记录：写读往返与坏形状', () => {
  const draft = {
    kind: 'correction',
    targetRole: 'ceo',
    proposerRole: 'ceo',
    proposerKind: 'human',
    source: 'deliverables/x/final.md',
    expectation: '收口前逐项列出未决项',
    body: '做法：收口盘点先列未决清单，再下结论。',
  } as const

  it('recordText → parseRecord 往返保住全部领域字段', () => {
    const text = recordText(draft)
    const record = parseRecord('20261013-120000-closing', text)
    expect(record).not.toBeNull()
    expect(record!.id).toBe('20261013-120000-closing')
    expect(record!.kind).toBe('correction')
    expect(record!.targetRole).toBe('ceo')
    expect(record!.proposerRole).toBe('ceo')
    expect(record!.proposerKind).toBe('human')
    expect(record!.source).toBe('deliverables/x/final.md')
    expect(record!.expectation).toBe('收口前逐项列出未决项')
    expect(record!.status).toBe('open')
    expect(record!.title).toBe('做法：收口盘点先列未决清单，再下结论。')
  })

  it('采纳后的记录：status/methodSlug/decidedAt/verification/reason 带出', () => {
    const text = recordText(draft)
      .replace('status: open', 'status: adopted\nmethodSlug: closing-checklist\ndecidedAt: 2026-10-13T12:05:00.000Z')
    const record = parseRecord('r1', text)!
    expect(record.status).toBe('adopted')
    expect(record.methodSlug).toBe('closing-checklist')
    expect(record.decidedAt).toBe('2026-10-13T12:05:00.000Z')
    const rejected = parseRecord('r2', recordText({ ...draft, kind: 'suggestion', targetRole: 'cfo', proposerRole: 'ceo' })
      .replace('status: open', 'status: rejected\nreason: 数字口径已有 KB 单一来源'))!
    expect(rejected.status).toBe('rejected')
    expect(rejected.reason).toBe('数字口径已有 KB 单一来源')
    expect(rejected.kind).toBe('suggestion')
  })

  it('坏形状给 null（面板不撒谎也不崩）：无 frontmatter / 枚举外值 / 缺必填', () => {
    expect(parseRecord('r', '没有 frontmatter 的正文')).toBeNull()
    expect(parseRecord('r', '---\nkind: weird\n---\n正文')).toBeNull()
    expect(parseRecord('r', '---\nkind: correction\n---\n正文')).toBeNull() // 缺 targetRole 等
  })
})

describe('recordInbox：按 viewer 角色分箱（V7 归属过滤 + 回执）', () => {
  const base = (over: Partial<CultivationRecord>): CultivationRecord => ({
    id: 'r',
    kind: 'correction',
    targetRole: 'ceo',
    proposerRole: 'ceo',
    proposerKind: 'human',
    source: 's',
    expectation: 'e',
    status: 'open',
    title: 't',
    ...over,
  })

  it('需要我处理 = open 且 target=viewer；我的提案含回执；已采纳 = adopted 且 target=viewer', () => {
    const records = [
      base({ id: 'a', targetRole: 'cfo', proposerRole: 'ceo', kind: 'suggestion' }),          // CFO 的待办
      base({ id: 'b', targetRole: 'ceo', proposerRole: 'cfo', kind: 'suggestion' }),          // CEO 的待办（跨角色进我屋）
      base({ id: 'c', targetRole: 'ceo', proposerRole: 'ceo', status: 'adopted', methodSlug: 'closing-checklist' }),
      base({ id: 'd', targetRole: 'cfo', proposerRole: 'ceo', status: 'rejected', reason: '口径走 KB' }), // 我提的，被拒（有回执）
    ]
    const inbox = recordInbox(records, 'ceo')
    expect(inbox.needsDecision.map(r => r.id)).toEqual(['b'])
    expect(inbox.mine.map(r => r.id)).toEqual(['a', 'c', 'd'])
    expect(inbox.adoptedForViewer.map(r => r.id)).toEqual(['c'])
    // CFO 视角：a 是它的待办，c（CEO 已采纳）不进它的已采纳箱
    const cfoInbox = recordInbox(records, 'cfo')
    expect(cfoInbox.needsDecision.map(r => r.id)).toEqual(['a'])
    expect(cfoInbox.adoptedForViewer).toHaveLength(0)
  })

  it('viewer 缺席（未选角色）→ 四个箱全空，不猜身份', () => {
    const records = [base({ id: 'a' })]
    expect(recordInbox(records, '')).toEqual({ needsDecision: [], mine: [], adoptedForViewer: [], processedForViewer: [] })
  })
})

describe('methodSkillText：部署进方法层的 SKILL.md（D17 只写方法论）', () => {
  it('frontmatter 带 name/description（skill-filesystem 发现必需），正文为做法', () => {
    const text = methodSkillText({ slug: 'closing-checklist', expectation: '收口前逐项列出未决项', body: '收口三步：列未决、对稿面、再结论。' })
    expect(text).toContain('---\nname: closing-checklist\n')
    expect(text).toContain('description: 收口前逐项列出未决项')
    expect(text).toContain('收口三步：列未决、对稿面、再结论。')
  })
})

// feedback 读模型半边（D1「两者都要」的读模型侧，2026-10-03）：事件流 → 赞/踩当前态。
// wire 形状 = vendor message-feedback 的会话事件（put 载荷 { item }、delete 载荷 { messageId }）。
describe('feedbackItems', () => {
  const put = (messageId: string, rating: 'positive' | 'negative', updatedAt: number, note?: string) =>
    ({ type: 'feedback/message-put', data: { sessionId: 's1', item: { messageId, rating, note, version: 'v', createdAt: updatedAt - 1, updatedAt } } })

  it('put → 当前态一条；note 与 rating 原样带出', () => {
    const rows = feedbackItems([put('m1', 'positive', 100, '好判断')])
    expect(rows).toEqual([{ messageId: 'm1', rating: 'positive', note: '好判断', updatedAt: 100 }])
  })

  it('同一 messageId 二次 put = upsert（最新覆盖）；delete = 移除', () => {
    expect(feedbackItems([put('m1', 'positive', 100), put('m1', 'negative', 200)])).toEqual([{ messageId: 'm1', rating: 'negative', updatedAt: 200 }])
    expect(feedbackItems([put('m1', 'positive', 100), { type: 'feedback/message-delete', data: { sessionId: 's1', messageId: 'm1' } }])).toEqual([])
  })

  it('多条按 updatedAt 倒序（最新在前）', () => {
    const rows = feedbackItems([put('a', 'positive', 10), put('b', 'negative', 30), put('c', 'positive', 20)])
    expect(rows.map(r => r.messageId)).toEqual(['b', 'c', 'a'])
  })

  it('非 feedback 事件与坏形状一律跳过（wire 边界不信任）', () => {
    expect(feedbackItems([
      { type: 'turn/start', data: {} },
      { type: 'feedback/message-put', data: { item: { messageId: '', rating: 'positive', updatedAt: 1 } } },
      { type: 'feedback/message-put', data: { item: { messageId: 'x', rating: 'weird', updatedAt: 1 } } },
      { type: 'feedback/message-put', data: {} },
      null,
    ])).toEqual([])
  })
})

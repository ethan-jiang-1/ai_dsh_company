import { describe, expect, it } from 'vitest'
import { classifyAuthorship, citedVersionsOf, crossCheckVersions, currentVersionOf, nominalRoleOf, RECLAIM, SIG } from '../scripts/lib/authorship.mjs'

const BODY_SIGNED = (role: string) => `# 标题\n\n> 出稿：${role}｜版本 v1｜任务书 = deliverables/x/drafts/ceo.md\n\n正文`
const BODY_LEGACY = '> 出稿：CFO（wochen 财务职能）｜正文 42 非空行｜状态：现行意见'

describe('署名核对：档位判定（判据单一来源 = scripts/lib/authorship.mjs）', () => {
  it('署名与写入者一致 ⇒ match', () => {
    const r = classifyAuthorship(BODY_SIGNED('cfo'), 'cfo.md', 'cfo')
    expect(r.level).toBe('match')
    expect(r.claimed).toBe('cfo')
  })

  it('署名 ≠ 写入者但有"复核并署名"更正行 ⇒ reclaimed（观察，不判红）', () => {
    const body = BODY_SIGNED('cfo') + '\n\n> 本稿由 cfo 根会话复核并署名（首版系 ceo 会话代笔）'
    const r = classifyAuthorship(body, 'cfo.md', 'ceo')
    expect(r.level).toBe('reclaimed')
    expect(r.claimed).toBe('cfo')
    expect(r.writer).toBe('ceo')
  })

  it('声明了署名、写入者不符、无更正行 ⇒ fail（署名不实，判红）——sea-reconcile 真实反例的仪器化', () => {
    const r = classifyAuthorship(BODY_SIGNED('cfo'), 'cfo.md', 'ceo')
    expect(r.level).toBe('fail')
  })

  it('文件名推的归属 ≠ 写入者、但稿里没有署名行 ⇒ 只观察（不判红）——首跑 12 条假 FAIL 的教训', () => {
    const r = classifyAuthorship('# 稿\n正文', 'vp-sales.md', 'ceo')
    expect(r.level).toBe('unsigned-mismatch')
    expect(r.byName).toBe('vp-sales')
    expect(r.writer).toBe('ceo')
  })

  it('无署名行且名义归属与写入者一致 ⇒ unsigned（观察）', () => {
    const r = classifyAuthorship('# 稿\n正文', 'coo.md', 'coo')
    expect(r.level).toBe('unsigned')
  })

  it('有署名行但写入者不可考 ⇒ unknown（观察——证据不可考不判红）', () => {
    const r = classifyAuthorship(BODY_SIGNED('cfo'), 'cfo.md', null)
    expect(r.level).toBe('unknown')
  })

  it('早期模板署名（出稿：CFO（wochen 财务职能）…）也能识别 ⇒ 两种形状兼容', () => {
    expect(SIG.test(BODY_LEGACY)).toBe(true)
    const r = classifyAuthorship(BODY_LEGACY, 'cfo.md', 'cfo')
    expect(r.level).toBe('match')
    expect(r.claimed).toBe('cfo')
  })

  it('更正行的角色要跟声明的署名一致才认（声东击西不算收回）', () => {
    const body = BODY_SIGNED('cfo') + '\n\n> 本稿由 coo 根会话复核并署名'
    const r = classifyAuthorship(body, 'cfo.md', 'ceo')
    expect(r.level).toBe('fail')
  })

  it('nominalRoleOf：<角色>.md / <角色>-review.md / 非角色名', () => {
    expect(nominalRoleOf('vp-eng.md')).toBe('vp-eng')
    expect(nominalRoleOf('coo-review.md')).toBe('coo')
    expect(nominalRoleOf('ceo-brief.md')).toBeUndefined()
    expect(nominalRoleOf('final.md')).toBeUndefined()
  })
})

// RECLAIM 正则本身（声东击西用例依赖它只认与署名同角色）
describe('RECLAIM 正则', () => {
  it('只捕角色名', () => {
    expect(RECLAIM.exec('本稿由 cfo 根会话复核并署名')?.[1]).toBe('cfo')
    expect(RECLAIM.exec('别的句子')).toBeNull()
  })
})

// 版本一致交叉核对（R0-3，2026-10-03；判据单一来源 = scripts/lib/authorship.mjs）
// fixture 形状 = quote-z-2026 盘上真实文本（引用行 4 连引 + 审批记录表两种引用形状）。
describe('版本一致交叉核对（R0-3）', () => {
  const FINAL_QUOTEZ = [
    '过程稿（引用一律按稿面原文与**权威版号**）：`drafts/ceo.md`（任务书 **v1**）｜`drafts/cfo.md`（T1，**本定稿以 v2 为准**）｜`drafts/coo.md`（T2 **v1**）｜`drafts/cfo-review.md`（T3 **v1**）',
    '| **CEO 侧** | …… | **`deliverables/quote-z-2026/drafts/cfo.md` v2**（用户明文指定） | allowed-once |',
    '| **CFO 侧** | …… | `drafts/cfo.md` **v3**（CFO 稿 v3 变更行自述） | allowed-once |',
  ].join('\n')
  const CURRENT = new Map([['drafts/ceo.md', 1], ['drafts/cfo.md', 3], ['drafts/coo.md', 1], ['drafts/cfo-review.md', 1]])

  it('quote-z 失败模式精确命中：final 锚 v2、稿面已 v3 ⇒ stale（红）', () => {
    const rows = crossCheckVersions(FINAL_QUOTEZ, CURRENT)
    const stale = rows.filter(r => r.stale)
    expect(stale.length).toBe(2) // 引用行 v2 + 审批记录表 v2，两处都要暴露
    expect(stale[0]).toMatchObject({ draft: 'drafts/cfo.md', cited: 2, current: 3 })
  })

  it('引用版号 == 稿面当前版号 ⇒ 全绿（干净 final：单一版号引用）', () => {
    // 冲突 fixture（cfo 同时被引 v2/v3）任何盘面版号都无法全绿——引用冲突本身就是待解状态，这正是仪器要暴露的。
    const clean = '过程稿：`drafts/ceo.md`（任务书 **v1**）｜`drafts/cfo.md`（**本定稿以 v3 为准**）'
    const rows = crossCheckVersions(clean, CURRENT)
    expect(rows.filter(r => r.stale).length).toBe(0)
  })

  it('一行多引逐条配对（引用行 4 连引不串行）', () => {
    const rows = citedVersionsOf(FINAL_QUOTEZ)
    expect(rows.length).toBe(6)
    expect(rows[0]).toEqual({ draft: 'drafts/ceo.md', cited: 1 })
    expect(rows[1]).toEqual({ draft: 'drafts/cfo.md', cited: 2 })
    expect(rows[3]).toEqual({ draft: 'drafts/cfo-review.md', cited: 1 })
  })

  it('全路径引用形状（deliverables/<slug>/drafts/…）归一到 drafts/<name>.md', () => {
    const rows = citedVersionsOf('依据：**`deliverables/quote-z-2026/drafts/cfo.md` v2**')
    expect(rows).toEqual([{ draft: 'drafts/cfo.md', cited: 2 }])
  })

  it('稿面无版号行（历史稿）⇒ 观察不判红（证据不可考不判红精神）', () => {
    const rows = crossCheckVersions('依据：`drafts/old.md`（**v1**）', new Map([['drafts/old.md', undefined]]))
    expect(rows[0].stale).toBe(false)
    expect(rows[0].current).toBeUndefined()
  })

  it('currentVersionOf：认署名行 `版本 vN`', () => {
    expect(currentVersionOf(BODY_SIGNED('cfo'))).toBe(1)
    expect(currentVersionOf('# 无版号稿')).toBeUndefined()
  })
})

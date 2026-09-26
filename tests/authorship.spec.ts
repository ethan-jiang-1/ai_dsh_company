import { describe, expect, it } from 'vitest'
import { classifyAuthorship, nominalRoleOf, RECLAIM, SIG } from '../scripts/lib/authorship.mjs'

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

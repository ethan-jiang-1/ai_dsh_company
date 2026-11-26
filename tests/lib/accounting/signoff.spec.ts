/** 审批闸门纯函数（驾驶舱②切片二的 keyless 完成定义：签字线 → 审批请求映射）。 */
import { describe, expect, it } from 'vitest'
import {
  parseSignoffReason,
  signoffDecisionNote,
  signoffReason,
} from '../../../packages/company-pack/src/lib/accounting/signoff.ts'

/**
 * 只测纯函数（毫秒级）。真链路（agent 触线 → request_signoff → approval/asked → 人批 →
 * 同轮继续）是认证档：真模型 CFO 会话证据 + 浏览器 e2e（guides/dev-loop §9.1 分层）。
 */

describe('signoffReason · 签字线 → 审批请求 reason', () => {
  it('基础形态 = <签字线>：<摘要>', () => {
    expect(signoffReason({ line: '毛利线双签', summary: 'reconcile-package 报价毛利 26%，客户不肯加价' }))
      .toBe('毛利线双签：reconcile-package 报价毛利 26%，客户不肯加价')
  })

  it('detail 拼在括号里；空白 detail 忽略', () => {
    expect(signoffReason({ line: '折扣线双签', summary: 'support-sla 报 8.5 折', detail: 'A 8.5 折毛利 27%；B 原价毛利 31%' }))
      .toBe('折扣线双签：support-sla 报 8.5 折（A 8.5 折毛利 27%；B 原价毛利 31%）')
    expect(signoffReason({ line: 'X', summary: 'Y', detail: '   ' }))
      .toBe('X：Y')
  })
})

describe('signoffDecisionNote · 结果 → 模型提示语', () => {
  it('四种结局各有明确动作指引；未知值按 fail-closed 落', () => {
    expect(signoffDecisionNote('allowed-once')).toContain('可按结论落稿')
    expect(signoffDecisionNote('rejected')).toContain('行使 veto')
    expect(signoffDecisionNote('cancelled')).toContain('不要按原结论落稿')
    expect(signoffDecisionNote('unavailable')).toContain('fail-closed')
    expect(signoffDecisionNote('whatever')).toContain('fail-closed')
  })
})

// 负例留证 2026-11-24：signoffDecisionNote/signoffReason 去掉 text 参数 ⇒ 本组红（en 仍中文/全角标点）。BUG-367
describe('signoff 双语（BUG-367）', () => {
  const en = (_zh: string, text: string): string => text
  it('en：四种结局与 reason 分隔符全 ASCII', () => {
    for (const decision of ['allowed-once', 'rejected', 'cancelled', 'timeout']) {
      const note = signoffDecisionNote(decision, en)
      expect(note).not.toMatch(/[\u3400-\u9fff]/u)
      expect(note.length).toBeGreaterThan(0)
    }
    const reason = signoffReason({ line: 'Margin line', summary: 'discount 22%', detail: 'also considered 20%' }, en)
    expect(reason).toContain('Margin line: discount 22%')
    expect(reason).toContain('(also considered 20%)')
    expect(reason).not.toMatch(/[：（）]/)
  })
})

describe('parseSignoffReason · 结构化回读（zh + en + 兜底）', () => {
  const en = (_zh: string, text: string): string => text
  it('往返解析 zh / en 带 detail 与无 detail 的 reason', () => {
    const zhReason = signoffReason({ line: '毛利线双签', summary: '报价毛利 26%', detail: 'A 26% / B 31%' })
    expect(parseSignoffReason(zhReason)).toEqual({ line: '毛利线双签', summary: '报价毛利 26%', detail: 'A 26% / B 31%' })

    const enReason = signoffReason({ line: 'Margin line', summary: 'discount 22%', detail: 'opt B 18%' }, en)
    expect(parseSignoffReason(enReason)).toEqual({ line: 'Margin line', summary: 'discount 22%', detail: 'opt B 18%' })

    expect(parseSignoffReason('毛利线双签：报价毛利 26%')).toEqual({ line: '毛利线双签', summary: '报价毛利 26%', detail: '' })
    expect(parseSignoffReason('plain fallback text')).toEqual({ line: '', summary: 'plain fallback text', detail: '' })
    expect(parseSignoffReason('不配对）')).toEqual({ line: '', summary: '不配对）', detail: '' })
    expect(parseSignoffReason('unmatched)')).toEqual({ line: '', summary: 'unmatched)', detail: '' })
    expect(parseSignoffReason('margin: rate：high')).toEqual({ line: 'margin', summary: 'rate：high', detail: '' })
    expect(parseSignoffReason(undefined)).toEqual({ line: '', summary: '', detail: '' })
  })
})

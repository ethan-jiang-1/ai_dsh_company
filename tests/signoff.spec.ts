/** 审批闸门纯函数（驾驶舱②切片二的 keyless 完成定义：签字线 → 审批请求映射）。 */
import { describe, expect, it } from 'vitest'
import {
  signoffDecisionNote,
  signoffReason,
} from '../packages/company-pack/src/lib/signoff.ts'

/**
 * 只测纯函数（毫秒级）。真链路（agent 触线 → request_signoff → approval/asked → 人批 →
 * 同轮继续）是认证档：真模型 CFO 会话证据 + 浏览器 e2e（guides/dev-loop §9.1 分层）。
 */

describe('signoffReason · 签字线 → 审批请求 reason', () => {
  it('基础形态 = <签字线>：<摘要>', () => {
    expect(signoffReason({ line: '毛利<30% 双签', summary: 'reconcile-package 报价毛利 26%，客户不肯加价' }))
      .toBe('毛利<30% 双签：reconcile-package 报价毛利 26%，客户不肯加价')
  })

  it('detail 拼在括号里；空白 detail 忽略', () => {
    expect(signoffReason({ line: '折扣<9折 双签', summary: 'support-sla 报 8.5 折', detail: 'A 8.5 折毛利 27%；B 9 折毛利 31%' }))
      .toBe('折扣<9折 双签：support-sla 报 8.5 折（A 8.5 折毛利 27%；B 9 折毛利 31%）')
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

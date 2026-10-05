import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DelegationCard, delegationCardModel } from '../../packages/company-pack/src/client/DelegationCard.tsx'

/**
 * 委派工具卡的 keyless 层（R3）。
 *
 * 为什么这层是主门禁：卡片是 **call/result 切片的纯函数**——不需要浏览器、不需要模型、
 * 毫秒级。真模型 + 真浏览器的 e2e（`scripts/smoke/replay-smoke.mjs --ui`）是**认证档**，
 * 按受影响面运行，不进回归（它分钟级、还依赖模型配合；R3 实测 240s 都没等到）。
 */

/** wire 事实的构造：running = RunningToolCall；settled = ToolResultNode（只用到的子集）。 */
type Block = Parameters<typeof delegationCardModel>[1]
type CardProps = Parameters<typeof DelegationCard>[0]

const running = (argsRaw: string): Block => ({
  callId: 'call-1', name: 'vp_eng', argsRaw, turn: 1, step: 1, time: 0, subCalls: [],
} as unknown as Block)

const settled = (argsRaw: string, text: string, extra: Record<string, unknown> = {}): Block => ({
  kind: 'tool-result',
  seq: 1,
  time: 0,
  callId: 'call-1',
  call: { name: 'vp_eng', argsRaw },
  callTime: 0,
  content: [{ type: 'text', text }],
  isError: false,
  subCalls: [],
  ...extra,
} as unknown as Block)

const BRIEF = JSON.stringify({ description: '技术可行性评估', prompt: '评估可复制交付包的技术可行性，一页纸。' })

describe('委派工具卡（R3 keyless：纯函数视图模型）', () => {
  it('running：状态 running、汇报对象是显示名、brief 两段解析出来、还没有结果', () => {
    const model = delegationCardModel('vp_eng', running(BRIEF))
    expect(model.state).toBe('running')
    expect(model.role).toBe('VP-Eng（研发）')
    expect(model.brief).toEqual({ title: '技术可行性评估', prompt: '评估可复制交付包的技术可行性，一页纸。' })
    expect(model.output).toBeNull()
  })

  it('settled 成功：状态 ok 且结果正文可读（VP 交回的稿子）', () => {
    const model = delegationCardModel('vp_sales', settled(BRIEF, '结论：可复制交付包成立。'))
    expect(model.state).toBe('ok')
    expect(model.role).toBe('VP-Sales（销售）')
    expect(model.output).toBe('结论：可复制交付包成立。')
  })

  it('settled 失败 / 被中断：分别映射到 error 与 stopped', () => {
    expect(delegationCardModel('vp_eng', settled(BRIEF, 'boom', { isError: true })).state).toBe('error')
    expect(delegationCardModel('vp_eng', settled(BRIEF, 'stopped', { error: { name: 'interrupt', code: 'interrupted' } })).state).toBe('stopped')
  })

  it('错误结果没有 content 时，用 error.code 兜底成正文（卡片不留白）', () => {
    const block = settled(BRIEF, '', { isError: true, content: [], error: { name: 'ToolError', code: 'E_DELEGATE' } })
    expect(delegationCardModel('vp_eng', block).output).toBe('ToolError: E_DELEGATE')
  })

  it('argsRaw 是截断的 JSON 前缀时回退成原文（流式期间不许把卡片变空）', () => {
    const model = delegationCardModel('vp_eng', running('{"description":"半截'))
    expect(model.brief.title).toBe('')
    expect(model.brief.prompt).toBe('{"description":"半截')
  })

  it('未知工具名不炸：role 回退成工具名本身', () => {
    expect(delegationCardModel('vp_marketing', running(BRIEF)).role).toBe('vp_marketing')
  })

  it('静态渲染出可断言的公司语义（data-tool / data-state / 汇报对象 / 状态文案）', () => {
    const html = renderToStaticMarkup(createElement(DelegationCard, {
      toolName: 'vp_eng',
      block: settled(BRIEF, '结论：可行。'),
    } as unknown as CardProps))
    expect(html).toContain('data-tool="vp_eng"')
    expect(html).toContain('data-state="ok"')
    expect(html).toContain('委派')
    expect(html).toContain('VP-Eng（研发）')
    expect(html).toContain('已交稿')
    expect(html).toContain('技术可行性评估')
  })
})

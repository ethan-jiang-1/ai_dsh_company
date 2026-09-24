import { describe, expect, it } from 'vitest'
import { assistantMessageText, collectText } from '../scripts/lib/session-log.mjs'
import { ENTRY_QUESTIONS, evaluateEntryProbe, assertCodingBaseline } from '../scripts/lib/entry-probe.mjs'

const evidence = { path: 'ROADMAP.md', quote: '逐字可核的证据原文至少八字符' }
function good() {
  const texts = [
    'ROADMAP 队列无活动项；implemented Note 留记录',
    '完成即离队，历史移入 Note',
    'company-workspace/AGENTS.md 公司手册',
    'dsh-v0.1.5-rc.2 只读',
    'preset-smoke 验证挂载',
    '条目队列 D23',
    '60-dev-loop 真模型不进回归',
    '开工检索决定和取舍，核对实现，留下验证证据',
  ]
  return { answers: ENTRY_QUESTIONS.map((q: { id: string }, i: number) => ({ id: q.id, status: 'answered', answer: texts[i], evidence: [evidence] })), conflicts: [] as string[] }
}
const readSource = (path: string) => {
  if (path !== evidence.path) throw new Error('unknown source')
  return evidence.quote
}
const evaluate = (value: unknown) => evaluateEntryProbe(JSON.stringify(value), readSource)

describe('会话回答只取组装消息，不重复遍历 stream', () => {
  it('从 assistant/message 的公开 message content 读取一次文本', () => {
    const text = '{"answers":[],"conflicts":[]}'
    const event = {
      message: { content: [{ type: 'text', text }] },
      stream: [
        { type: 'text-chunks', texts: [text] },
        { type: 'chunk', chunk: { type: 'block-end', block: { type: 'text', text } } },
      ],
    }
    expect(assistantMessageText({ data: event })).toBe(text)
    expect(collectText(event).join('\n')).toBe([text, text].join('\n'))
  })
})

describe('入口探针不使用全文兜底', () => {
  it('逐题回答与原文均匹配时通过机器层', () => {
    expect(evaluate(good())).toEqual({ passed: 8, failures: [] })
  })
  it('支持一个完整 JSON code fence', () => {
    expect(evaluateEntryProbe(`\`\`\`json\n${JSON.stringify(good())}\n\`\`\``, readSource).failures).toEqual([])
  })
  it('缺题不能靠其他题或全文关键词蒙混通过', () => {
    const value = good()
    value.answers[0].answer = value.answers.map(a => a.answer).join(' ')
    value.answers = value.answers.slice(0, 1)
    expect(evaluate(value).passed).toBe(1)
    expect(evaluate(value).failures).toContain('Q2: 缺题或重复')
  })
  it('重复题号、未知题号及非 JSON 均失败', () => {
    const value = good()
    value.answers[1].id = 'Q1'
    expect(evaluate(value).failures).toContain('Q1: 缺题或重复')
    value.answers[1].id = 'Q9'
    expect(evaluate(value).failures).toContain('Q2: 缺题或重复')
    expect(evaluateEntryProbe('ROADMAP implemented D23 只读 8/8 PASS', readSource).passed).toBe(0)
  })
  it('无答案、有冲突或证据伪造都会失败', () => {
    const value = good()
    value.answers[0].status = 'unresolved'
    value.answers[1].evidence = [{ ...evidence, quote: '这段原文实际上不存在于文件中' }]
    value.answers[2].evidence = [{ ...evidence, path: '../../secret.md' }]
    value.conflicts = ['队列和当前合同不一致']
    expect(evaluate(value).failures).toHaveLength(4)
  })
  it('证据中的关键词不能代替本题答案', () => {
    const value = good()
    value.answers[0].answer = '不知道'
    expect(evaluate(value).passed).toBe(7)
  })
  it.each([null, {}, { answers: [] }, { answers: {}, conflicts: [] }])('缺明确结构即失败：%j', value => {
    expect(evaluate(value).failures.length).toBeGreaterThan(0)
  })
})

describe('coding 指令与公司运行指令分开', () => {
  it('只接受开发入口基线', () => {
    expect(() => assertCodingBaseline('# AGENTS.md — 本仓库的入口链\nvendor 铁律')).not.toThrow()
    expect(() => assertCodingBaseline('# wochen · 公司手册')).toThrow('缺开发仓库入口')
    expect(() => assertCodingBaseline('# AGENTS.md — 本仓库的入口链\nvendor 铁律\n# wochen · 公司手册')).toThrow('混入')
  })
})

import { describe, expect, it } from 'vitest'
import { assistantMessageText, collectText } from '../../tools/lib/session-log.mjs'
import { ENTRY_QUESTIONS, evaluateEntryProbe, assertCodingBaseline } from '../../tools/lib/entry-probe.mjs'

// 通配证据路径：单测桩对它返回 quote 自身（自洽），与下方真夹具（AGENTS.md）不撞车
const evidence = { path: 'docs/index.md', quote: '逐字可核的证据原文至少八字符' }
// 按**题号**取答案（不是按位置）——加题时不会静默错位；数量断言一律用 ENTRY_QUESTIONS.length
// 推导，别写死（写死就是"枚举型事实写两处"，2026-09-26 从 8 扩到 12 时正是这里要改）。
const ANSWERS: Record<string, string> = {
  Q1: '任务源 = 已批 RFC 与磨活；implemented Note 留记录',
  Q2: '完成即离场，历史移入 Note',
  Q3: 'company-workspace/AGENTS.md 公司手册',
  Q4: 'dsh-v0.1.7-rc.2 只读',
  Q5: 'preset-smoke 验证挂载',
  Q6: '任务源与推敲卡规矩 D31 D32',
  Q7: 'dev-loop 真模型不进回归',
  Q8: '开工检索决定和取舍，核对实现，留下验证证据',
  Q9: 'Plan Mode 呈批；已批准或机械单步可直接做',
  Q10: 'dag-visual 视觉夹具；human-loop-e2e 人机回路；date-rule 日期口径',
  Q11: 'implemented Note 收尾（授权链线索记在状态行）+ 事实 owner 合同同步',
  Q12: '交付型与打磨型；停止 = 预算耗尽 / 输入源枯竭 / 真卡住',
  Q13: '挂载 = preset-smoke，行为 = 场景/判据，安装 = release-smoke，批准 = 语义审 + 用户验收；语义审按 dev-loop §13 最小清单，结果记进收尾 Note',
}
function good() {
  return { answers: ENTRY_QUESTIONS.map((q: { id: string }) => ({ id: q.id, status: 'answered', answer: ANSWERS[q.id], evidence: [evidence] })), conflicts: [] as string[] }
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
    expect(evaluate(good())).toEqual({ passed: ENTRY_QUESTIONS.length, failures: [] })
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
    value.answers[1].id = 'Q99'
    expect(evaluate(value).failures).toContain('Q2: 缺题或重复')
    expect(evaluateEntryProbe('队列 implemented D23 只读 8/8 PASS', readSource).passed).toBe(0)
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
    expect(evaluate(value).passed).toBe(ENTRY_QUESTIONS.length - 1)
  })
  it.each([null, {}, { answers: [] }, { answers: {}, conflicts: [] }])('缺明确结构即失败：%j', value => {
    expect(evaluate(value).failures.length).toBeGreaterThan(0)
  })
  // 2026-09-26 立：首跑实证——模型 12 题全答对、还报了 6 条真矛盾，只因正文写了一处
  // `「"""历史维护记录"""」`（未转义的 ASCII 双引号）就整份判 0，而旧报错只有一句
  // "必须是完整 JSON"，定位靠手工二分。全有或全无是**有意的**（不做全文兜底），
  // 但失败必须指得出位置。
  it('JSON 语法错误要报位置与附近片段（fail-loud 诊断）', () => {
    const broken = '{"answers":[{"id":"Q1","status":"answered","answer":"他说"""行"""","evidence":[]}],"conflicts":[]}'
    const result = evaluateEntryProbe(broken, readSource)
    expect(result.passed).toBe(0)
    expect(result.failures[0]).toContain('position')
    expect(result.failures[0]).toContain('出错处附近')
  })
  // 2026-09-26 立（基线 8/12 的 Q5）：命令表用空格对齐，模型把 `mjs          #` 引成 `mjs #`
  // 是自然的规范化，不是幻觉 ⇒ 比对前归一化空白。防幻觉性质不变（文字仍须真在文件里）。
  // 2026-09-26 实证：模型把 12 题全答对、JSON 主体完整，却在结尾泄漏了一段工具调用标记
  // （`</｜｜DSML｜｜ parameter>`）⇒ 判 0/12。**判 0 是对的**（判据不做全文兜底），
  // 但报错必须点明"可重跑、不是仓库问题"。
  it('JSON 后多出内容：判失败但报错要标明可重跑（模型格式抖动）', () => {
    const ok = JSON.stringify(good())
    const result = evaluateEntryProbe(`${ok}\n</｜｜DSML｜｜ parameter></｜｜DSML｜｜ invoke>`, readSource)
    expect(result.passed).toBe(0)
    expect(result.failures[0]).toContain('JSON 主体已完整')
    expect(result.failures[0]).toContain('可重跑')
  })

  // 2026-09-26 两次实测（Q4/Q5）：源文件**折行**处有换行、引用自然没有那个空格（中文无词边界）；
  // 源文件在**下一行注释**里、引用会丢掉 `// ` 前缀。两类都是排版，不是幻觉。
  it('归一化覆盖折行与注释前缀（中文无词边界）', () => {
    const src = '（submodule HEAD == 簿记 SHA + 工作树零改动，\n`pnpm verify` 双门禁强制，均带反证）'
    const reader = (path: string) => (path === 'AGENTS.md' ? src : evidence.quote)
    const a = good()
    a.answers[0].evidence = [{ path: 'AGENTS.md', quote: '（submodule HEAD == 簿记 SHA + 工作树零改动，pnpm verify 双门禁强制，均带反证）' }]
    expect(evaluateEntryProbe(JSON.stringify(a), reader).failures).toEqual([])

    const src2 = '// `--dump-config` 只打印 profile 树，\n// 两者都看不到 config 校验；'
    const reader2 = (path: string) => (path === 'AGENTS.md' ? src2 : evidence.quote)
    const b = good()
    b.answers[0].evidence = [{ path: 'AGENTS.md', quote: '`--dump-config` 只打印 profile 树，两者都看不到 config 校验；' }]
    expect(evaluateEntryProbe(JSON.stringify(b), reader2).failures).toEqual([])
  })

  it('引用比对忽略排版空白，但文字仍须真实存在', () => {
    // 忠实复刻 Q5 现场：源文件用空格对齐，模型引用时把它规范化了。
    const aligned = 'node checks/smoke/preset-smoke.mjs          # preset 改动的完成定义'
    const reader = (path: string) => (path === 'AGENTS.md' ? aligned : evidence.quote)
    const spaced = good()
    spaced.answers[4].evidence = [{ path: 'AGENTS.md', quote: 'node checks/smoke/preset-smoke.mjs # preset 改动的完成定义' }]
    expect(evaluateEntryProbe(JSON.stringify(spaced), reader).failures).toEqual([])
    const wrong = good()
    wrong.answers[4].evidence = [{ path: 'AGENTS.md', quote: '这段原文其实并不存在于任何文件里' }]
    const failures = evaluateEntryProbe(JSON.stringify(wrong), reader).failures
    expect(failures.join()).toContain('原文不匹配')
    expect(failures.join()).toContain('引的是')   // 报错要带上引了什么，便于一眼改
  })
  // 2026-09-26 立：三类**渲染层**差异不得算幻觉（都在同一轮里真实误杀过正确答案）。
  it('归一化只抹渲染层差异：换行/反引号/引号字形', () => {
    const src = '**只有防线二能抓"preset 挂载失败"**：行 config 校验发生在挂载时'
    const reader = (path: string) => (path === 'AGENTS.md' ? src : evidence.quote)
    const cases = [
      '**只有防线二能抓「preset 挂载失败」**：行 config 校验发生在挂载时',  // 引号字形（提示词逼出来的）
      '只有防线二能抓"preset 挂载失败"：行 config 校验发生在挂载时',        // 去掉强调标记
      '只有防线二能抓"preset\n挂载失败"：行 config 校验发生在挂载时',       // 跨行取句
    ]
    for (const quote of cases) {
      const value = good()
      value.answers[0].evidence = [{ path: 'AGENTS.md', quote }]
      expect(evaluateEntryProbe(JSON.stringify(value), reader).failures, quote).toEqual([])
    }
    const wrong = good()
    wrong.answers[0].evidence = [{ path: 'AGENTS.md', quote: '这段文字真的不在源文件里出现过' }]
    expect(evaluateEntryProbe(JSON.stringify(wrong), reader).failures.join()).toContain('原文不匹配')
  })
})

describe('coding 指令与公司运行指令分开', () => {
  it('只接受开发入口基线', () => {
    expect(() => assertCodingBaseline('# AGENTS.md — 本仓库的入口链\nvendor 铁律')).not.toThrow()
    expect(() => assertCodingBaseline('# wochen · 公司手册')).toThrow('缺开发仓库入口')
    expect(() => assertCodingBaseline('# AGENTS.md — 本仓库的入口链\nvendor 铁律\n# wochen · 公司手册')).toThrow('混入')
  })
})

/** Stable routing questions; current values must come from repository evidence. */
export const ENTRY_QUESTIONS = [
  { id: 'Q1', ask: '当前可开工的队列项是什么？若只有暂停项或没有活动项，明确说明。完成记录住哪里？', expect: [/ROADMAP|队列/, /Note|implemented|台账/] },
  { id: 'Q2', ask: '完成即离队是什么意思？当前队列与历史记录如何区分？', expect: [/离队|移除|删/, /Note|implemented|历史/] },
  { id: 'Q3', ask: '交付物三态规则的事实家在哪个文件？', expect: [/company-workspace\/AGENTS\.md|公司手册/] },
  { id: 'Q4', ask: 'vendor/dsh 当前钉住哪个 tag？受控源码如何处理？', expect: [/dsh-v\d+\.\d+/, /只读|零改动|不改/] },
  { id: 'Q5', ask: '改 preset 组合后用哪个脚本验真入口？为什么 dump-config 不够？', expect: [/preset-smoke/, /挂载|行校验/] },
  { id: 'Q6', ask: '开发单位与当前队列在哪？哪些决定记录说明它？', expect: [/条目|队列/, /D23|D24|Note/] },
  { id: 'Q7', ask: '回归与认证档在哪定义？真模型是否进 pnpm test？', expect: [/dev-loop|9\.1/, /不进|不含|排除/] },
  { id: 'Q8', ask: 'notes 在开工、实现、收尾各起什么作用？若 Note 与当前实现冲突如何核对？', expect: [/检索|读取|读/, /决定|取舍|方案/, /验证|证据/, /核对|源码|实现/] },
  // ── 执行链四跳（2026-09-26 扩面：原 8 问只覆盖探查链，收尾动作与授权条件无人认证）──
  { id: 'Q9', ask: '队列里的 feature 条目开工前要不要先呈批？什么情况下可以直接做、不必求批？', expect: [/Plan Mode|呈批|exit_plan_mode/, /机械单步|已批准|明确批准/] },
  // 措辞要点（2026-09-26 修）：不能说"人机接口全回路"——AGENTS.md 里 attention-e2e 自称
  // "人机三节点全回路"，答它完全合理（首跑实测即如此，属题目歧义而非模型错）。用该脚本自己的
  // 区分词"三载体"提问，答案才唯一。
  { id: 'Q10', ask: '客户端视觉改动、人机接口三载体（补料落盘／建议非阻塞落稿／规矩缺口回流 journal）、日期口径行为面，各该跑哪个脚本？', expect: [/dag-visual/, /human-loop-e2e/, /date-rule/] },
  { id: 'Q11', ask: '一个非平凡变更收尾时，除了改实现，还要动哪些文件或登记处？', expect: [/intents/, /Note|implemented/, /ROADMAP|队列/] },
  { id: 'Q12', ask: '长程自主执行的 goal 有哪两种写法？停止条件有哪几类？', expect: [/交付型/, /打磨型/, /预算|枯竭|卡住/] },
]

/**
 * 空白归一化后再比：命令表/表格里的对齐空格是**排版**，不是原文语义。
 * 为什么（2026-09-26 实证，基线 8/12 的 Q5）：模型引的命令表行把 `mjs          #` 规范成
 * `mjs #`，逐字节比对因此判"原文不匹配"——而它引的确实是那一行。归一化空白仍然证明
 * "这段文字在文件里存在"（防幻觉性质不变），只是不再因排版空格误杀。
 */
const squash = (text) => text.replace(/[ \t]+/g, ' ').trim()

/**
 * Check each answer independently plus literal source evidence; this is not a semantic proof.
 * @param {string} reply - Whole final response: JSON object, optionally fenced as JSON.
 * @param {(path: string) => string} readSource - Read only an allowed current repository source.
 * @returns {{passed: number, failures: string[]}} Machine-check results, never human approval.
 */
export function evaluateEntryProbe(reply, readSource) {
  let value
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i.exec(reply.trim())
  const body = fenced ? fenced[1] : reply.trim()
  try { value = JSON.parse(body) } catch (error) {
    // 诊断要指位置（2026-09-26 实证）：首跑时模型把 12 题全答对了、还报了 6 条真矛盾，
    // 只因正文里写了一处 `「"""历史维护记录"""」`（未转义的 ASCII 双引号）⇒ 整份判 0/12，
    // 而原报错只有一句"必须是完整 JSON"，人得手工二分定位。全有或全无是**有意的**
    // （不做全文兜底/跨题匹配），但失败必须 fail-loud 到能一眼改。
    const at = /position (\d+)/.exec(error.message)?.[1]
    const idx = at === undefined ? -1 : Number(at)
    const near = idx < 0 ? '' : `；出错处附近：…${body.slice(Math.max(0, idx - 60), idx + 60)}…`
    return { passed: 0, failures: [`回答必须是完整 JSON；不使用全文兜底或跨题匹配（${error.message}${near}）`] }
  }
  if (!value || typeof value !== 'object' || !Array.isArray(value.answers) || !Array.isArray(value.conflicts)) {
    return { passed: 0, failures: ['缺 answers/conflicts 数组'] }
  }
  const failures = []
  let passed = 0
  if (value.conflicts.length) failures.push(`报告了 ${value.conflicts.length} 个矛盾：${JSON.stringify(value.conflicts)}`)
  if (value.answers.length !== ENTRY_QUESTIONS.length) failures.push(`必须恰好 ${ENTRY_QUESTIONS.length} 个回答`)
  for (const q of ENTRY_QUESTIONS) {
    const matches = value.answers.filter(answer => answer?.id === q.id)
    if (matches.length !== 1) { failures.push(`${q.id}: 缺题或重复`); continue }
    const answer = matches[0]
    const errors = []
    if (answer.status !== 'answered') errors.push('未解决')
    if (typeof answer.answer !== 'string' || q.expect.some(pattern => !pattern.test(answer.answer))) errors.push('本题要点不全')
    if (!Array.isArray(answer.evidence) || answer.evidence.length === 0) errors.push('缺来源原文')
    else for (const evidence of answer.evidence) {
      if (typeof evidence?.path !== 'string' || typeof evidence?.quote !== 'string' || evidence.quote.trim().length < 8) {
        errors.push('来源需 path 和至少 8 字符的原文'); continue
      }
      try {
        if (!squash(readSource(evidence.path)).includes(squash(evidence.quote))) {
          errors.push(`原文不匹配：${evidence.path}（引的是：${squash(evidence.quote).slice(0, 60)}…）`)
        }
      } catch (error) { errors.push(`来源不可读：${evidence.path} (${error.message})`) }
    }
    if (errors.length) failures.push(`${q.id}: ${errors.join('；')}`)
    else passed++
  }
  return { passed, failures }
}

/**
 * Require the coding instruction baseline, not the company-role handbook.
 * @param {string} baseline - Text from logged agent-instructions baseline events.
 * @returns {void} Throws when the entry probe is reading the wrong instruction chain.
 */
export function assertCodingBaseline(baseline) {
  if (!baseline.includes('AGENTS.md — 本仓库的入口链') || !baseline.includes('vendor 铁律')) {
    throw new Error('指令基线缺开发仓库入口')
  }
  if (baseline.includes('# wochen · 公司手册')) throw new Error('指令基线混入公司运行手册')
}

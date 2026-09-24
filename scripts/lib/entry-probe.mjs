/** Stable routing questions; current values must come from repository evidence. */
export const ENTRY_QUESTIONS = [
  { id: 'Q1', ask: '当前可开工的队列项是什么？若只有暂停项或没有活动项，明确说明。完成记录住哪里？', expect: [/ROADMAP|队列/, /Note|implemented|台账/] },
  { id: 'Q2', ask: '完成即离队是什么意思？当前队列与历史记录如何区分？', expect: [/离队|移除|删/, /Note|implemented|历史/] },
  { id: 'Q3', ask: '交付物三态规则的事实家在哪个文件？', expect: [/company-workspace\/AGENTS\.md|公司手册/] },
  { id: 'Q4', ask: 'vendor/dsh 当前钉住哪个 tag？受控源码如何处理？', expect: [/dsh-v\d+\.\d+/, /只读|零改动|不改/] },
  { id: 'Q5', ask: '改 preset 组合后用哪个脚本验真入口？为什么 dump-config 不够？', expect: [/preset-smoke/, /挂载|行校验/] },
  { id: 'Q6', ask: '开发单位与当前队列在哪？哪些决定记录说明它？', expect: [/条目|队列/, /D23|D24|Note/] },
  { id: 'Q7', ask: '回归与认证档在哪定义？真模型是否进 pnpm test？', expect: [/60-dev-loop|9\.1/, /不进|不含|排除/] },
  { id: 'Q8', ask: 'notes 在开工、实现、收尾各起什么作用？若 Note 与当前实现冲突如何核对？', expect: [/检索|读取|读/, /决定|取舍|方案/, /验证|证据/, /核对|源码|实现/] },
]

/**
 * Check each answer independently plus literal source evidence; this is not a semantic proof.
 * @param {string} reply - Whole final response: JSON object, optionally fenced as JSON.
 * @param {(path: string) => string} readSource - Read only an allowed current repository source.
 * @returns {{passed: number, failures: string[]}} Machine-check results, never human approval.
 */
export function evaluateEntryProbe(reply, readSource) {
  let value
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i.exec(reply.trim())
  try { value = JSON.parse(fenced ? fenced[1] : reply.trim()) } catch {
    return { passed: 0, failures: ['回答必须是完整 JSON；不使用全文兜底或跨题匹配'] }
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
        if (!readSource(evidence.path).includes(evidence.quote)) errors.push(`原文不匹配：${evidence.path}`)
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

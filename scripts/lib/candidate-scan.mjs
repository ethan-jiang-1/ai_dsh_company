// 「共享盘中的待核工作候选」扫描的纯逻辑（2026-09-26 立；实验 B 的仪器）。
// 为什么存在：独立评审指出"扫盘推待办"的三种误报（把已关闭动议的历史缺稿报成新待办 /
// 把已出首稿但仍有依赖的角色报成完成 / 漏掉互审、返工、取消、审批等不产生 drafts/<角色>.md 的任务）。
// 本模块实现**三条规则**供对照实验，判据与实现在这里单一来源；IO 与打分在 scripts/candidate-scan-eval.mjs。
//
// ⚠ 命名纪律（评审 §五 B 的零容忍条款）：未达判据前，输出只能叫「**待核工作候选**」，
// 不叫"我的待办"，不自动通知。候选项必须带「待核实」标记。

/** 五角色 id。 */
export const ROLE_IDS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']

/**
 * 结构化派活行（R2/R3 用）。形状（一行一格，机器可读）：
 *   `派活｜T1｜vp-sales｜市场门证据｜依赖：无｜状态：待办`
 *   `派活｜T6｜coo｜审 VP-Sales 交付承诺｜依赖：T1,T3｜状态：待办`
 *   `派活｜T2｜vp-eng｜技术可行性｜依赖：无｜状态：取消`
 * 状态枚举：待办 / 已出稿 / 完成 / 取消。
 */
export const ASSIGN_LINE = /^派活｜(T\d+)｜(vp-eng|vp-sales|coo|cfo|ceo)｜([^｜]*)｜依赖：([^｜]*)｜状态：(待办|已出稿|完成|取消)/

/** 自然语言"点名"（R1 用）：任务书正文里出现 `角色 —` 或 `T<n> · 角色` 的地方。 */
export const MENTION = /^(?:###\s*)?(?:T\d+\s*·\s*|\*\*)?(VP-Eng|VP-Sales|COO|CFO|CEO|vp-eng|vp-sales|coo|cfo|ceo)\b/
const canon = (role) => role === null ? undefined : String(role).toLowerCase()

/** 解析任务书 → 结构化任务清单（R2/R3 的输入）。 */
export function parseAssignments(briefText) {
  const out = []
  for (const line of briefText.split('\n')) {
    const m = ASSIGN_LINE.exec(line.trim())
    if (m === null) continue
    out.push({
      id: m[1], role: m[2], title: m[3],
      deps: m[4] === '无' || m[4] === '' ? [] : m[4].split(',').map(s => s.trim()).filter(Boolean),
      status: m[5],
    })
  }
  return out
}

/** 自然语言点名（R1 的输入；已知会误报/漏报——这正是实验要量化的）。 */
export function mentionedRoles(briefText) {
  const found = new Set()
  for (const line of briefText.split('\n')) {
    const m = MENTION.exec(line.trim())
    if (m !== null) found.add(canon(m[1]))
  }
  return [...found]
}

/**
 * R1 · 纯文件存在规则：任务书"点名"了角色 X，且 drafts 里没有 X 的稿 ⇒ 报候选。
 * 已知缺陷（评审 §三 L2）：不看动议状态、不看依赖、漏互审/返工/取消。
 * @param briefText 任务书全文
 * @param draftsDir 稿目录的文件名清单（如 ['cfo.md','coo-review.md']）
 */
export function scanR1(briefText, draftFiles) {
  const roles = mentionedRoles(briefText)
  const have = new Set(draftFiles.map(f => f.replace(/\.md$/, '').replace(/-review$/, '')))
  return roles.filter(r => !have.has(r))
    .map(role => ({ rule: 'R1', role, why: `任务书点名 ${role}，drafts/ 无其稿`, needsVerify: true }))
}

/**
 * R2 · 结构化派活行：按机器可读的派活行报"状态=待办"的任务（不看动议整体状态）。
 */
export function scanR2(briefText) {
  return parseAssignments(briefText)
    .filter(t => t.status === '待办')
    .map(t => ({ rule: 'R2', role: t.role, task: t.id, title: t.title, deps: t.deps, why: `派活行状态=待办`, needsVerify: true }))
}

/**
 * R3 · R2 + 动议状态：动议已关闭（final.md 在场）⇒ 不报新候选（历史缺稿不是新待办）；
 * 依赖未满足的任务 ⇒ 标"依赖未齐"而非直接候选。
 * @param motionHasFinal 动议是否已有 final.md
 * @returns 候选 + blocked（依赖未齐）两个清单
 */
export function scanR3(briefText, draftFiles, motionHasFinal) {
  if (motionHasFinal) return { candidates: [], blocked: [], closed: true }
  const tasks = parseAssignments(briefText)
  const done = new Set(tasks.filter(t => t.status === '已出稿' || t.status === '完成').map(t => t.id))
  const candidates = []
  const blocked = []
  for (const t of tasks) {
    if (t.status !== '待办') continue
    const missing = t.deps.filter(d => !done.has(d))
    if (missing.length === 0) candidates.push({ rule: 'R3', role: t.role, task: t.id, title: t.title, why: '状态=待办且依赖已齐', needsVerify: true })
    else blocked.push({ rule: 'R3', role: t.role, task: t.id, title: t.title, missingDeps: missing, why: `依赖未齐：${missing.join(',')}`, needsVerify: true })
  }
  return { candidates, blocked, closed: false }
}

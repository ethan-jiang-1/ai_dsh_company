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

// ═══════════════ 金标准标注（实验 B 打分腿；纯逻辑，IO 在 scripts/candidate-scan-eval.mjs）═══════════════

/** 标注状态枚举（格式约定唯一见标注文件头部；改枚举要同步改约定）。 */
export const GOLD_STATUSES = ['待办', '阻塞', '待核实', '取消', '已出稿', '完成', '关闭']
/** 真候选 / 待核实 = 该显示（显示类别不同但都算"surfaced"）。 */
const goldPending = (s) => s === '待办' || s === '待核实'

/** 解析标注文件全文 → 行数组。格式约定唯一见标注文件头部（`；` 分隔条目；条目 = 角色·T号·状态·一句话）。 */
export function parseLabelsText(text) {
  const rows = []
  let section = null
  for (const line of text.split('\n')) {
    if (line.startsWith('## 合成语料')) { section = 'synthetic'; continue }
    if (line.startsWith('## 真盘动议')) { section = 'real'; continue }
    if (line.startsWith('## ') || line.startsWith('# ')) { section = null; continue }
    if (!section || !line.trim().startsWith('|') || /\|-{2,}/.test(line)) continue
    const cells = line.split('|').slice(1, -1).map(c => c.trim())
    if (cells.length < 4 || !cells[0] || cells[0] === 'case' || cells[0] === 'slug') continue
    const tasks = []
    // 分隔符 = `；`，但描述文字里也可能出现 `；` ⇒ 碎片不以下一条的「角色·」开头时并回上一条
    const ENTRY_HEAD = /^(vp-eng|vp-sales|coo|cfo|ceo|——)·/
    const fragments = []
    for (const raw of cells[1].split('；')) {
      if (raw === '' || raw === '无') continue
      if (fragments.length > 0 && !ENTRY_HEAD.test(raw)) fragments[fragments.length - 1] += `；${raw}`
      else fragments.push(raw)
    }
    for (const entry of fragments) {
      const f = entry.split('·')
      if (f.length < 3) throw new Error(`标注条目缺字段：「${entry}」（${cells[0]}）`)
      const [role, task, status] = [f[0], f[1], f[2]]
      if (!GOLD_STATUSES.includes(status)) throw new Error(`状态非法：「${status}」（${cells[0]}：${entry}）`)
      tasks.push({ role, task, status })
    }
    const approvalMatch = /审批×(\d+)/.exec(cells[3])
    rows.push({
      id: cells[0], kind: section, tasks,
      closed: tasks.some(t => t.status === '关闭'),
      approvals: approvalMatch ? Number(approvalMatch[1]) : 0,
      remind: cells[2], zeroNote: cells[3],
    })
  }
  return rows
}

/**
 * 三规则 vs 金标准打分（纯逻辑）。判据 = 评审 §五 B：召回/精确/错误"已完成"/错误"需立即处理"
 * + 零容忍计数（审批漏报 / 取消误报与静默漏显示 / 阻塞漏显示 / 已关闭动议仍报）。
 * @param rows parseLabelsText 的输出
 * @param scans Map<id, {r1, r2, r3, drafts}>——同 id 的三规则实跑结果与稿清单（IO 由调用方做）
 * @returns {M, zeroTol, details}——M 按 R1（角色级）/R2/R3（任务级）累加
 */
export function scoreLabels(rows, scans) {
  const M = { R1: freshMetric(), R2: freshMetric(), R3: freshMetric() }
  function freshMetric() {
    return { tp: 0, reported: 0, falseImmediate: 0, blockedAsCandidate: 0, staleAsCandidate: 0, miss: 0, missWithDraft: 0 }
  }
  const zeroTol = { approvalMiss: 0, cancelReported: 0, cancelSilent: 0, blockedMissR1: 0, blockedMissR2: 0, blockedMissR3: 0, closedButReported: 0 }
  const details = []

  for (const row of rows) {
    const scan = scans.get(row.id)
    if (scan === undefined) throw new Error(`标注行没有对应的扫描结果：${row.id}`)
    const { r1, r2, r3, drafts } = scan

    const goldTasks = new Map(row.tasks.filter(t => t.status !== '关闭').map(t => [t.task, t]))
    const goldPendingRoles = new Set(row.tasks.filter(t => goldPending(t.status) && t.role !== '——').map(t => t.role))
    const goldBlockedRoles = new Set(row.tasks.filter(t => t.status === '阻塞' && t.role !== '——').map(t => t.role))
    const roleHasDraft = (r) => drafts.some(f => f.replace(/\.md$/, '').replace(/-review$/, '') === r)

    // R1：角色级
    for (const c of r1) {
      M.R1.reported++
      if (goldPendingRoles.has(c.role)) M.R1.tp++
      else if (goldBlockedRoles.has(c.role)) M.R1.blockedAsCandidate++
      else { M.R1.falseImmediate++; if (row.closed) zeroTol.closedButReported++ }
    }
    for (const role of goldPendingRoles) {
      if (!r1.some(c => c.role === role)) {
        M.R1.miss++
        if (roleHasDraft(role)) M.R1.missWithDraft++
      }
    }

    // R2 / R3：任务级
    for (const rule of ['R2', 'R3']) {
      const reports = rule === 'R2' ? r2 : r3.candidates
      for (const t of reports) {
        M[rule].reported++
        const gold = goldTasks.get(t.task)
        if (gold !== undefined && goldPending(gold.status)) {
          M[rule].tp++
          // 显示类别错误：待核实（稿与状态行矛盾）被当**候选**报出 ⇒ 人会去"立即处理"一件没核实的事
          if (gold.status === '待核实') M[rule].staleAsCandidate++
        }
        else if (gold !== undefined && gold.status === '阻塞') M[rule].blockedAsCandidate++
        else if (gold !== undefined && gold.status === '取消') { M[rule].falseImmediate++; zeroTol.cancelReported++ }
        else { M[rule].falseImmediate++; if (row.closed) zeroTol.closedButReported++ }
      }
      for (const [id, gold] of goldTasks) {
        if (!goldPending(gold.status)) continue
        if (!reports.some(t => t.task === id)) {
          M[rule].miss++
          if (gold.role !== '——' && roleHasDraft(gold.role)) M[rule].missWithDraft++
        }
      }
    }

    // 取消：静默漏显示（规则无"取消"通道 ⇒ 已取消事项在人视角不可见——评审零容忍口径，按全局计）
    zeroTol.cancelSilent += row.tasks.filter(t => t.status === '取消').length

    // 阻塞漏显示：**逐规则记账**（盲审 2026-09-26：此前只查 R3 ⇒ R1/R2 的结构性盲区只有碰巧才被计）
    // - R1 角色级：该角色的阻塞活一整条不可见（角色不在候选里）
    // - R2 任务级：报"状态=待办"的派活行（阻塞若报出 = blockedAsCandidate，可见只是类别错）；无行 ⇒ 不可见
    // - R3 任务级：候选与"依赖未齐"两处都无 ⇒ 不可见（原逻辑）
    for (const gold of row.tasks.filter(t => t.status === '阻塞')) {
      if (gold.role !== '——' && !r1.some(c => c.role === gold.role)) zeroTol.blockedMissR1++
      if (gold.task !== '——' && !r2.some(c => c.task === gold.task)) zeroTol.blockedMissR2++
      if (gold.task !== '——' && !r3.blocked.some(b => b.task === gold.task) && !r3.candidates.some(c => c.task === gold.task)) zeroTol.blockedMissR3++
    }

    // 审批：三条规则结构性看不见 ⇒ 全部计漏报（零容忍）
    zeroTol.approvalMiss += row.approvals

    details.push({ id: row.id, r1, r2, r3, gold: row.tasks, approvals: row.approvals })
  }
  return { M, zeroTol, details }
}

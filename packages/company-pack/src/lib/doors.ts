/**
 * 工作区门的读模型（BUG-002 修复轮，2026-10-06）：
 * 把 `ctx.sessions.list` 快照折算成「工作区 × preset → 门清单」投影——纯函数、keyless。
 *
 * 守什么：
 * - **双 CEO 检测面**：同一 cwd 下出现 ≥2 个同 preset 根会话（delegationDepth === 0）⇒
 *   `duplicateWarning` 行——人侧开门忘选 preset（默认 ceo）时唯一的可机检防线（BUG-002）。
 * - 门概览：每行 = `{ preset, sessionCount, sessionIds, running }`，按 preset 聚合——client 公司视图
 *   直接渲染；`duplicateWarning` 供高亮。
 *
 * 不证明：实时性（快照由调用方刷新）；UI 渲染（client-load-smoke）；跨进程（DSH_HOME 维度不在
 * 本层——单进程多门是 BUG-002 的靶面，跨进程是 E2/C8 的靶面，别混）。
 */

/** 一个根会话的最小事实（从 SessionSummary 提取：cwd + projections.values.agentPreset + parentId）。 */
export interface RootSessionFact {
  readonly sessionId: string
  readonly cwd: string
  readonly agentPreset?: string
  readonly running: boolean
}

/** 工作区 × preset 的门投影行。 */
export interface DoorRow {
  readonly preset: string
  readonly sessionCount: number
  readonly sessionIds: readonly string[]
  readonly running: boolean
  /** 同 cwd 同 preset ≥2 个根会话 ⇒ true（BUG-002 检测面）。 */
  readonly duplicateWarning: boolean
}

/** 同 cwd 的门投影。 */
export interface WorkspaceDoorsModel {
  readonly rows: readonly DoorRow[]
  /** ≥1 行带 duplicateWarning ⇒ true（UI 高亮入口）。 */
  readonly hasDuplicate: boolean
}

/**
 * 把根会话事实列表折算成门投影。
 * @param facts - 同一 cwd 下的根会话（调用方已按 cwd 过滤——本模块不重复过滤，避免两层耦合）。
 * @returns 按 preset 聚合的投影行 + duplicate 警告面。
 */
export function doorsFromSessions(facts: readonly RootSessionFact[]): WorkspaceDoorsModel {
  const byPreset = new Map<string, { ids: string[]; running: boolean }>()
  for (const fact of facts) {
    const preset = fact.agentPreset ?? '(未选 preset)'
    const entry = byPreset.get(preset) ?? { ids: [], running: false }
    entry.ids.push(fact.sessionId)
    if (fact.running) entry.running = true
    byPreset.set(preset, entry)
  }
  const rows: DoorRow[] = [...byPreset.entries()]
    .map(([preset, entry]) => ({
      preset,
      sessionCount: entry.ids.length,
      sessionIds: entry.ids,
      running: entry.running,
      duplicateWarning: entry.ids.length >= 2,
    }))
    .sort((a, b) => a.preset.localeCompare(b.preset))
  return { rows, hasDuplicate: rows.some(row => row.duplicateWarning) }
}

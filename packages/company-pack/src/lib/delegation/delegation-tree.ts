/**
 * 委派树：把客户端 sessions store 的 `byId` + `subagentCatalog` 折成只读树。
 *
 * 为什么不在 UI 里直接拼 parentId：`byId` 的 parentId 只说明“谁生的”，不说明展示顺序/深度/
 * 未注册的直接子代；`subagentCatalog` 是父会话的直接 child 投影，两者合起来才是完整树。
 *
 * 边界（诚实记账）：
 * - 客户端默认拿不到 durable 终态；host `companyDelegationTerminal` 投影（turn/end reason）
 *   提供时用它；没有时由 subagentTiming 的 completed bool 兜底；都没有才 `unavailable`，不伪造。
 * - 没有 `byId` 的 child（catalog 先到/已回收）标 `missing`，仍出现在树里，不静默丢。
 * - 纯函数，不读盘、不依赖 React；unit test 直接喂快照。
 */

/** `byId` 里本模块用到的 session 摘要（结构型，只依赖 wire 形状）。 */
export interface DelegationSessionSummaryLike {
  readonly parentId?: string
  readonly origin?: 'subagent'
  readonly running?: boolean
  readonly displayTitle?: string
  readonly projectionValues?: {
    readonly agentPreset?: string | null
    readonly subagentCatalog?: readonly DelegationCatalogEntryLike[]
    readonly subagentTiming?: { readonly lastTurnCompleted?: boolean }
    readonly companyDelegationTerminal?: { readonly lastTurnEnd?: string }
  }
}

/** 父会话 `subagentCatalog` 投影里的一个直接 child。 */
export interface DelegationCatalogEntryLike {
  readonly id: string
  readonly label?: string
  readonly mode?: string
  readonly createdAt?: number
}

/** 本模块需要的 sessions store 切片。 */
export interface DelegationSessionStoreLike {
  readonly byId?: Readonly<Record<string, DelegationSessionSummaryLike>>
}

/** 一个只读节点。`terminal` 优先来自 host 投影；缺时 unavailable，不当作“已完成”。 */
export interface DelegationNode {
  readonly id: string
  readonly parentId: string | null
  readonly depth: number
  readonly label: string
  readonly preset: string | null
  readonly mode: string | null
  readonly status: 'running' | 'inactive' | 'unknown'
  readonly terminal: 'completed' | 'failed' | 'interrupted' | 'aborted' | 'max-tokens' | 'refusal' | 'lost' | 'unavailable'
  readonly missing: boolean
  readonly children: readonly DelegationNode[]
}

export interface DelegationTree {
  readonly root: DelegationNode | null
  readonly nodes: readonly DelegationNode[]
  readonly maxDepth: number
}

const labelOf = (id: string, summary: DelegationSessionSummaryLike | undefined, entry: DelegationCatalogEntryLike | undefined): string => {
  const display = summary?.displayTitle?.trim()
  if (display !== undefined && display !== '') return display
  const catalog = entry?.label?.trim()
  if (catalog !== undefined && catalog !== '') return catalog
  return id.slice(0, 8)
}

/**
 * 从 root session 折整棵委派树。
 * @param store - `{ byId }` 快照（可只给当前 root + 后代）。
 * @param rootSessionId - 树的根（通常是 Lead 会话）。
 * @returns 根节点、扁平节点与最大深度；root 不在快照里时 root=null。
 */
export function buildDelegationTree(store: DelegationSessionStoreLike, rootSessionId: string): DelegationTree {
  const byId = store.byId ?? {}
  const seen = new Set<string>()

  const visit = (id: string, parentId: string | null, depth: number, entry?: DelegationCatalogEntryLike): DelegationNode => {
    seen.add(id)
    const summary = byId[id]
    const catalog = summary?.projectionValues?.subagentCatalog ?? []
    const childEntries = new Map<string, DelegationCatalogEntryLike>()
    for (const child of catalog) childEntries.set(child.id, child)
    // byId 里 parentId 指向本节点的 child 也要进树（catalog 可能迟到/缺条目）。
    for (const [candidateId, candidate] of Object.entries(byId)) {
      if (candidate.parentId !== id || childEntries.has(candidateId)) continue
      childEntries.set(candidateId, { id: candidateId })
    }
    const timing = summary?.projectionValues?.subagentTiming
    const terminalKind = summary?.projectionValues?.companyDelegationTerminal?.lastTurnEnd
    const terminal = terminalKind === 'completed'
      ? 'completed'
      : terminalKind === 'error'
        ? 'failed'
        : terminalKind === 'interrupted' || terminalKind === 'aborted'
          || terminalKind === 'max-tokens' || terminalKind === 'refusal' || terminalKind === 'lost'
          ? terminalKind
          : timing?.lastTurnCompleted === true ? 'completed' : timing?.lastTurnCompleted === false ? 'failed' : 'unavailable'
    const children = [...childEntries.values()]
      .filter(child => !seen.has(child.id))
      .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0) || left.id.localeCompare(right.id))
      .map(child => visit(child.id, id, depth + 1, child))
    const node: DelegationNode = {
      id,
      parentId,
      depth,
      label: labelOf(id, summary, entry),
      preset: summary?.projectionValues?.agentPreset ?? null,
      mode: entry?.mode ?? summary?.origin ?? null,
      status: summary === undefined ? 'unknown' : summary.running === true ? 'running' : 'inactive',
      terminal,
      missing: summary === undefined,
      children,
    }
    return node
  }

  if (byId[rootSessionId] === undefined) return { root: null, nodes: [], maxDepth: 0 }
  const root = visit(rootSessionId, null, 0)
  // flat 是后序；排序成稳定先序，方便列表/图渲染与测试。
  const ordered: DelegationNode[] = []
  const walk = (node: DelegationNode): void => {
    ordered.push(node)
    for (const child of node.children) walk(child)
  }
  walk(root)
  return { root, nodes: ordered, maxDepth: ordered.reduce((max, node) => Math.max(max, node.depth), 0) }
}

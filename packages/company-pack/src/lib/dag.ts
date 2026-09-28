/**
 * 任务 DAG 布局（条目 ① S1）：纯函数分层 + 定坐标；视图只负责画 SVG。
 *
 * 零依赖（研究 §3「最小可行组合」）：节点数在我们的规模（一次动议 ≤20）下，最长路径分层
 * 只需几十行，不需要 dagre/elkjs；布局库留到图确实变大时再按采用度门槛引。
 * 分层语义 = **关键路径**：`level(n) = max(level(blocker) + 1)`，根任务在第 0 层——
 * 一列看下去就是"最长的依赖链有多长"，同级任务可并行。
 */
import { dependencyEdges, type TaskRow } from './board.ts'

/** 一个节点（含算好的视口坐标；渲染层不自己算布局）。 */
export interface DagNode {
  readonly id: string
  readonly subject: string
  readonly status: TaskRow['status']
  readonly ownerLabel: string | null
  /** 层级（0 = 无依赖的根）。 */
  readonly level: number
  /** 还没走完的前置数（0 = 依赖已就绪；徽章用）。**悬空 blocker 按未完成计**（与 `board.ts` 同口径）。 */
  readonly waitingOn: number
  /** 同级内序号（0 起）：**blocker 重心排序**后的位置；输入序只做平局兜底。 */
  readonly order: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** 一条依赖边（blocker → blocked）。 */
export interface DagEdge {
  readonly from: string
  readonly to: string
  /** SVG `path` 的 `d`：blocker 底边中点 → blocked 顶边中点（三次贝塞尔）。 */
  readonly path: string
  /** blocker 已完成 ⇒ 这条依赖"已走通"（渲染成实线/高亮）。 */
  readonly done: boolean
}

export interface DagLayout {
  readonly nodes: readonly DagNode[]
  readonly edges: readonly DagEdge[]
  readonly width: number
  readonly height: number
}

export interface DagOptions {
  readonly nodeWidth?: number
  readonly nodeHeight?: number
  readonly hGap?: number
  readonly vGap?: number
  readonly padding?: number
}

const DEFAULTS = { nodeWidth: 176, nodeHeight: 54, hGap: 32, vGap: 60, padding: 16 } as const

/**
 * 分层：`level(n) = max(level(blocker) + 1)`，根 = 0。
 * 缺失的 blocker 忽略；**成环不挂**——层级钳在 `节点数 - 1`（任何 DAG 的层级上界），
 * 松弛迭代上限 = 节点数，所以环内节点会停在有限层、画布尺寸也有界。
 * @param tasks - 任务行。
 * @returns 任务 id → 层级。
 */
export function dagLevels(tasks: readonly TaskRow[]): Map<string, number> {
  const byId = new Map(tasks.map(task => [task.id, task]))
  const levels = new Map<string, number>(tasks.map(task => [task.id, 0]))
  const ceiling = Math.max(0, tasks.length - 1)
  for (let round = 0; round < tasks.length; round++) {
    let changed = false
    for (const task of tasks) {
      const own = levels.get(task.id) ?? 0
      for (const blocker of task.blockedBy) {
        if (!byId.has(blocker)) continue
        const candidate = Math.min((levels.get(blocker) ?? 0) + 1, ceiling)
        if (candidate > own) {
          levels.set(task.id, candidate)
          changed = true
        }
      }
    }
    if (!changed) break
  }
  return levels
}

/** 坐标取一位小数（快照/金样友好：浮点尾巴不制造假 diff）。 */
function round(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * 分层 + 同级居中 + 定坐标 → 可直接画的布局（含边路径与画布尺寸）。
 * @param tasks - 任务行（同级内按 blocker 重心重排；输入序仅作平局兜底）。
 * @param options - 尺寸/间距覆盖（默认值见 `DEFAULTS`）。
 * @returns 布局。
 */
export function layoutDag(tasks: readonly TaskRow[], options: DagOptions = {}): DagLayout {
  const nodeWidth = options.nodeWidth ?? DEFAULTS.nodeWidth
  const nodeHeight = options.nodeHeight ?? DEFAULTS.nodeHeight
  const hGap = options.hGap ?? DEFAULTS.hGap
  const vGap = options.vGap ?? DEFAULTS.vGap
  const padding = options.padding ?? DEFAULTS.padding

  const levels = dagLevels(tasks)
  const statusOf = new Map(tasks.map(task => [task.id, task.status]))
  const byLevel = new Map<number, TaskRow[]>()
  for (const task of tasks) {
    const level = levels.get(task.id) ?? 0
    const bucket = byLevel.get(level)
    if (bucket === undefined) byLevel.set(level, [task])
    else bucket.push(task)
  }
  // 同级排序 = **blocker 重心**（barycenter）：每层按"它的前置们在上一层里的平均位置"排序，
  // 输入序只做平局兜底——一条链上的节点会尽量排在彼此正下方，边交叉显著减少（≤20 节点规模够用）。
  const orderByLevel = new Map<number, Map<string, number>>()
  const sortedByLevel = new Map<number, TaskRow[]>()
  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    const bucket = [...(byLevel.get(level) ?? [])]
    if (orderByLevel.size > 0 && level > 0) {
      const prevOrder = orderByLevel.get(level - 1) ?? new Map<string, number>()
      bucket.sort((a, b) => {
        const bary = (task: TaskRow): number => {
          const positions = task.blockedBy.map(id => prevOrder.get(id)).filter((v): v is number => v !== undefined)
          return positions.length === 0 ? Number.MAX_SAFE_INTEGER : positions.reduce((sum, v) => sum + v, 0) / positions.length
        }
        return bary(a) - bary(b)
      })
    }
    const order = new Map<string, number>()
    bucket.forEach((task, index) => order.set(task.id, index))
    orderByLevel.set(level, order)
    sortedByLevel.set(level, bucket)
  }

  const levelKeys = [...byLevel.keys()].sort((a, b) => a - b)
  const maxLevel = levelKeys.length === 0 ? 0 : levelKeys[levelKeys.length - 1]!
  const widest = Math.max(1, ...[...byLevel.values()].map(bucket => bucket.length))
  const width = padding * 2 + widest * nodeWidth + (widest - 1) * hGap
  const height = padding * 2 + (maxLevel + 1) * nodeHeight + maxLevel * vGap

  const nodes: DagNode[] = []
  for (const level of levelKeys) {
    const bucket = sortedByLevel.get(level) ?? []
    const rowWidth = bucket.length * nodeWidth + Math.max(0, bucket.length - 1) * hGap
    const startX = padding + (width - padding * 2 - rowWidth) / 2
    bucket.forEach((task, order) => {
      nodes.push({
        id: task.id,
        subject: task.subject,
        status: task.status,
        ownerLabel: task.ownerName,
        level,
        waitingOn: task.blockedBy.filter(id => (statusOf.get(id) ?? 'pending') !== 'completed').length,
        order,
        x: round(startX + order * (nodeWidth + hGap)),
        y: round(padding + level * (nodeHeight + vGap)),
        width: nodeWidth,
        height: nodeHeight,
      })
    })
  }

  // ── 边路径 + 车道分离（2026-09-28 RFC：同带重合消除）──
  // 交叉是行布局下限（barycenter 已最优、排序无解），但多条边共用同一条走廊会让交叉段
  // **重合**——收官全绿时中段读作一团乱麻。车道 = 同一带（from 层→to 层）内的边按
  // （源 x、目标 x）排序各占一条 y 通道（(i+1)/(n+1) 等分带高），控制点从共用的 mid 改为
  // 各自 lane ⇒ 中段水平段互斥、交叉从「叠着过」变「错层跨越」。单边带 lane = 中点，
  // 渲染与旧版逐像素相同（向后兼容）；跨多层的边自成一组，仍走中点。
  const positionById = new Map(nodes.map(node => [node.id, node]))
  const positioned: { from: DagNode; to: DagNode }[] = []
  for (const edge of dependencyEdges(tasks)) {
    const from = positionById.get(edge.from)
    const to = positionById.get(edge.to)
    if (from === undefined || to === undefined) continue
    positioned.push({ from, to })
  }
  const bands = new Map<string, { from: DagNode; to: DagNode }[]>()
  for (const edge of positioned) {
    const key = `${String(edge.from.level)}→${String(edge.to.level)}`
    const bucket = bands.get(key)
    if (bucket === undefined) bands.set(key, [edge])
    else bucket.push(edge)
  }
  const laneY = new Map<{ from: DagNode; to: DagNode }, number>()
  for (const bucket of bands.values()) {
    bucket.sort((a, b) => (a.from.x - b.from.x) || (a.to.x - b.to.x))
    bucket.forEach((edge, index) => {
      const y1 = edge.from.y + edge.from.height
      const y2 = edge.to.y
      laneY.set(edge, y1 + (y2 - y1) * ((index + 1) / (bucket.length + 1)))
    })
  }
  const edges: DagEdge[] = positioned.map(edge => {
    const x1 = round(edge.from.x + edge.from.width / 2)
    const y1 = round(edge.from.y + edge.from.height)
    const x2 = round(edge.to.x + edge.to.width / 2)
    const y2 = round(edge.to.y)
    const lane = round(laneY.get(edge) ?? (y1 + y2) / 2)
    return {
      from: edge.from.id,
      to: edge.to.id,
      path: `M ${String(x1)} ${String(y1)} C ${String(x1)} ${String(lane)}, ${String(x2)} ${String(lane)}, ${String(x2)} ${String(y2)}`,
      done: statusOf.get(edge.from.id) === 'completed',
    }
  })

  return { nodes, edges, width: round(width), height: round(height) }
}

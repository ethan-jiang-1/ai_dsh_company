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
  /** SVG `path` 的 `d`：贝塞尔圆弧——blocker 底边锚点 → 带中车道 → blocked 顶边锚点（锚点散开、车道互斥）。 */
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

  // ── 边路径：圆弧 + 车道分离（车道收带中部）──
  // 三轮试用反馈定稿（2026-09-28）：
  // ① 同带多边共用一条走廊的重合段要消——车道互斥（同带边按〔源 x、目标 x〕排序各占一条）。
  // ② 风格 = **圆弧**（贝塞尔；直角走线被用户否决——"肯定是圆弧风格"）。
  // ③ 车道只铺在**带中部 [25%, 75%]**：车道铺满整条带时，长轨贴着节点行飞（离行仅 ~10px），
  //    会被读作"线从隔壁节点出来"（几何实证：T1→T7 轨在 T2 卡正下方 10px 且与 T2 出线相交成
  //    十字接头）——收中后曲线离两侧行 ≥ 带高 1/4，只在走廊中央流动。
  // 多入/多出节点锚点按 (k+1)/(n+1) 散开在顶/底边（曲线落点不挤一点）；单入单出保持中心
  // 锚点（渲染向后兼容）。
  // **跨多层边**（to.level > from.level+1，如 T8 合稿直接吃第 0 行的根前置）：任何穿过
  // 中间行的走法都会切卡（T8 场实测：T1..T4→T8 中段横穿 T5/T6/T7 卡身 = "线穿节点"）——
  // 改走**画布两侧边缘通道**（padding 16px 里）：带内转到边缘 → 沿边缘竖直下 → 目标上方
  // 带内转入；同侧多条时边缘 x 分车道。跨层边因此不与带内车道竞争。
  const LANE_LO = 0.25
  const LANE_HI = 0.75
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
    if (edge.to.level > edge.from.level + 1) continue // 跨层边走边缘通道，不进带车道
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
      const fraction = LANE_LO + (LANE_HI - LANE_LO) * ((index + 1) / (bucket.length + 1))
      laneY.set(edge, y1 + (y2 - y1) * fraction)
    })
  }
  const exitX = new Map<{ from: DagNode; to: DagNode }, number>()
  const entryX = new Map<{ from: DagNode; to: DagNode }, number>()
  const outEdges = new Map<DagNode, { from: DagNode; to: DagNode }[]>()
  const inEdges = new Map<DagNode, { from: DagNode; to: DagNode }[]>()
  for (const edge of positioned) {
    outEdges.set(edge.from, [...(outEdges.get(edge.from) ?? []), edge])
    inEdges.set(edge.to, [...(inEdges.get(edge.to) ?? []), edge])
  }
  for (const [source, list] of outEdges) {
    list.sort((a, b) => a.to.x - b.to.x)
    list.forEach((edge, index) => exitX.set(edge, source.x + source.width * ((index + 1) / (list.length + 1))))
  }
  for (const [target, list] of inEdges) {
    list.sort((a, b) => a.from.x - b.from.x)
    list.forEach((edge, index) => entryX.set(edge, target.x + target.width * ((index + 1) / (list.length + 1))))
  }
  // 边缘通道车道：跨层边按（源中点 vs 目标中点）选侧；同侧按 y 排序分 x 车道（padding 16 内）。
  const marginX = new Map<{ from: DagNode; to: DagNode }, number>()
  for (const side of ['left', 'right'] as const) {
    const list = positioned
      .filter(edge => edge.to.level > edge.from.level + 1)
      .filter(edge => (side === 'left'
        ? edge.from.x + edge.from.width / 2 <= edge.to.x + edge.to.width / 2
        : edge.from.x + edge.from.width / 2 > edge.to.x + edge.to.width / 2))
      .sort((a, b) => (a.from.y - b.from.y) || (a.to.y - b.to.y))
    list.forEach((edge, index) => {
      const offset = 3 + 10 * ((index + 1) / (list.length + 1))
      marginX.set(edge, side === 'left' ? offset : width - offset)
    })
  }
  const edges: DagEdge[] = positioned.map(edge => {
    const y1 = round(edge.from.y + edge.from.height)
    const y2 = round(edge.to.y)
    const x1 = round(exitX.get(edge) ?? edge.from.x + edge.from.width / 2)
    const x2 = round(entryX.get(edge) ?? edge.to.x + edge.to.width / 2)
    const margin = marginX.get(edge)
    if (margin !== undefined) {
      // 带内转到边缘（第一段 y 不超过源下方第一条带的中点 ⇒ 不进中间行）→ 沿边缘下 → 转入。
      const a = round(y1 + vGap / 2)
      const b = round(y2 - vGap / 2)
      const m = round((b + y2) / 2)
      return {
        from: edge.from.id,
        to: edge.to.id,
        path: `M ${String(x1)} ${String(y1)} C ${String(x1)} ${String(a)}, ${String(margin)} ${String(a)}, ${String(margin)} ${String(a)} L ${String(margin)} ${String(b)} C ${String(margin)} ${String(m)}, ${String(x2)} ${String(m)}, ${String(x2)} ${String(y2)}`,
        done: statusOf.get(edge.from.id) === 'completed',
      }
    }
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

/** 任务 DAG 布局（条目 ① S1）：分层 / 关键路径 / 成环安全 / 坐标的 keyless 完成定义。 */
import { describe, expect, it } from 'vitest'
import type { TaskRow } from '../packages/company-pack/src/lib/board.ts'
import { dagLevels, layoutDag } from '../packages/company-pack/src/lib/dag.ts'

/** 造一行任务（只填布局关心的字段）。 */
function task(id: string, blockedBy: readonly string[] = [], status: TaskRow['status'] = 'pending'): TaskRow {
  return { id, subject: `任务 ${id}`, status, ownerName: null, revision: 1, blockedBy, ready: true }
}

describe('dagLevels', () => {
  it('链：层级 = 关键路径长度（根 0）', () => {
    const levels = dagLevels([task('a'), task('b', ['a']), task('c', ['b'])])
    expect([levels.get('a'), levels.get('b'), levels.get('c')]).toEqual([0, 1, 2])
  })

  it('菱形：两路汇合取最长路径', () => {
    const levels = dagLevels([task('a'), task('b', ['a']), task('c', ['a']), task('d', ['b', 'c'])])
    expect([levels.get('b'), levels.get('c'), levels.get('d')]).toEqual([1, 1, 2])
  })

  it('一任务多前置时取最深前置 +1', () => {
    const levels = dagLevels([task('a'), task('b', ['a']), task('c', ['a', 'b'])])
    expect(levels.get('c')).toBe(2)
  })

  it('悬空前置忽略（不当成层级来源）', () => {
    const levels = dagLevels([task('a', ['ghost'])])
    expect(levels.get('a')).toBe(0)
  })

  it('成环不挂：层级有限且有界（≤ 节点数-1），画布尺寸仍为正', () => {
    const cyclic = [task('a', ['b']), task('b', ['a'])]
    const levels = dagLevels(cyclic)
    for (const value of levels.values()) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeLessThanOrEqual(cyclic.length - 1)
    }
    const layout = layoutDag(cyclic)
    expect(layout.nodes).toHaveLength(2)
    expect(layout.width).toBeGreaterThan(0)
    expect(layout.height).toBeGreaterThan(0)
  })
})

describe('layoutDag', () => {
  it('节点数 = 任务数；y 随层级递增；画布尺寸为正', () => {
    const layout = layoutDag([task('a'), task('b', ['a']), task('c', ['b'])])
    expect(layout.nodes).toHaveLength(3)
    const [a, b, c] = layout.nodes
    expect(a!.level).toBe(0)
    expect(b!.y).toBeGreaterThan(a!.y)
    expect(c!.y).toBeGreaterThan(b!.y)
    expect(layout.width).toBeGreaterThan(0)
    expect(layout.height).toBeGreaterThan(0)
  })

  it('边路径是 SVG path，done 标记跟 blocker 状态', () => {
    const layout = layoutDag([task('a', [], 'completed'), task('b', ['a'])])
    expect(layout.edges).toHaveLength(1)
    expect(layout.edges[0]?.path.startsWith('M ')).toBe(true)
    expect(layout.edges[0]?.done).toBe(true)
  })

  it('悬空依赖不出边（无节点可连）', () => {
    const layout = layoutDag([task('a', ['ghost'])])
    expect(layout.edges).toHaveLength(0)
    expect(layout.nodes).toHaveLength(1)
  })

  it('waitingOn：悬空 blocker 按未完成计（与 board.ts 同口径，不静默放行）', () => {
    expect(layoutDag([task('a', ['ghost'])]).nodes[0]?.waitingOn).toBe(1)
    expect(layoutDag([task('a', ['b']), task('b', [], 'completed')]).nodes.find(n => n.id === 'a')?.waitingOn).toBe(0)
    expect(layoutDag([task('a', ['b']), task('b')]).nodes.find(n => n.id === 'a')?.waitingOn).toBe(1)
  })

  it('同级按 blocker 重心排序（输入序只做平局兜底）', () => {
    // b、c 同在第 1 层；b 的前置是第 0 层最右的 y，c 的前置是最左的 x ⇒ 期望 c 在 b 左边。
    const tasks = [task('x'), task('y'), task('b', ['y']), task('c', ['x'])]
    const layout = layoutDag(tasks)
    const cx = layout.nodes.find(n => n.id === 'c')!.x
    const bx = layout.nodes.find(n => n.id === 'b')!.x
    expect(cx).toBeLessThan(bx)
    // 只把**同一层内的输入序**倒过来（第 0 层不动）：重心排序应当压过输入序，落位不变。
    const swapped = layoutDag([task('x'), task('y'), task('c', ['x']), task('b', ['y'])])
    expect(swapped.nodes.find(n => n.id === 'c')!.x).toBe(cx)
    expect(swapped.nodes.find(n => n.id === 'b')!.x).toBe(bx)
  })

  it('同级无前置信息时退回输入序（平局兜底）', () => {
    const layout = layoutDag([task('p'), task('q')])
    expect(layout.nodes.map(n => n.id)).toEqual(['p', 'q'])
  })

  it('同级节点水平铺开且不重叠', () => {
    const layout = layoutDag([task('a'), task('b'), task('c')])
    const [a, b, c] = layout.nodes
    expect(b!.x).toBeGreaterThanOrEqual(a!.x + a!.width)
    expect(c!.x).toBeGreaterThanOrEqual(b!.x + b!.width)
  })

  it('空输入不抛：零节点、尺寸 = 单节点高 + padding', () => {
    const layout = layoutDag([])
    expect(layout.nodes).toHaveLength(0)
    expect(layout.edges).toHaveLength(0)
    expect(layout.width).toBeGreaterThan(0)
    expect(layout.height).toBeGreaterThan(0)
  })
})

describe('layoutDag 边线车道分离（圆弧 + 带中车道；2026-09-28 两轮试用反馈定稿）', () => {
  /** 解析 path `M x1 y1 C x1 lane, x2 lane, x2 y2`（贝塞尔圆弧，控制点在各自车道）。 */
  const parse = (path: string): { x1: number; y1: number; lane: number; x2: number; y2: number } => {
    const match = /^M ([\d.-]+) ([\d.-]+) C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+)$/.exec(path)
    if (match === null) throw new Error(`path 形状意外：${path}`)
    return { x1: Number(match[1]), y1: Number(match[2]), lane: Number(match[4]), x2: Number(match[7]), y2: Number(match[8]) }
  }
  /** 现场形状（2026-09-28 试用反馈那场）：4 根 → 3 子，带 0→1 里 5 条边。 */
  const tangled = () => [
    task('t1'), task('t2'), task('t3'), task('t4'),
    task('t5', ['t4']), task('t6', ['t2', 't3']), task('t7', ['t1', 't4']),
  ]

  it('边线带圆弧（C 命令在场；直角 V-H-V 已被用户否决）', () => {
    for (const edge of layoutDag(tangled()).edges) {
      expect(edge.path).toMatch(/ C /) // 全直角版被否决；跨层边也保留 C 转角
    }
  })

  it('同层间带的边中段车道互斥（交叉允许、重合不允许）', () => {
    const layout = layoutDag(tangled())
    const levelOf = new Map(layout.nodes.map(node => [node.id, node.level]))
    const byBand = new Map<string, number[]>()
    for (const edge of layout.edges) {
      if ((levelOf.get(edge.to) ?? 0) > (levelOf.get(edge.from) ?? 0) + 1) continue // 跨层边走边缘，不占带车道
      const { y1, y2, lane } = parse(edge.path)
      const key = `${String(y1)}→${String(y2)}`
      byBand.set(key, [...(byBand.get(key) ?? []), lane])
    }
    const multi = [...byBand.entries()].filter(([, lanes]) => lanes.length >= 2)
    expect(multi.length).toBeGreaterThan(0) // 夹具确实造出了同带多边，否则断言空转
    for (const [band, lanes] of multi) {
      expect(new Set(lanes).size, `带 ${band} 车道：${lanes.join('、')}`).toBe(lanes.length)
    }
  })

  it('车道收在带中部 [25%, 75%]（离两侧行 ≥ 带高 1/4——长轨贴行会被读作连错节点）；单边带 = 中点', () => {
    const layout = layoutDag(tangled())
    const levelOf = new Map(layout.nodes.map(node => [node.id, node.level]))
    for (const edge of layout.edges) {
      if ((levelOf.get(edge.to) ?? 0) > (levelOf.get(edge.from) ?? 0) + 1) continue
      const { y1, lane, y2 } = parse(edge.path)
      expect(lane).toBeGreaterThanOrEqual(y1 + (y2 - y1) * 0.25 - 0.1)
      expect(lane).toBeLessThanOrEqual(y1 + (y2 - y1) * 0.75 + 0.1)
    }
    const chain = parse(layoutDag([task('a'), task('b', ['a'])]).edges[0]!.path)
    expect(chain.lane).toBeCloseTo((chain.y1 + chain.y2) / 2, 5)
  })

  it('同靶多入边锚点散开（曲线落点不挤一点）；单入单出保持中心锚点', () => {
    const layout = layoutDag(tangled())
    const levelOf = new Map(layout.nodes.map(node => [node.id, node.level]))
    const byTarget = new Map<string, number[]>()
    for (const edge of layout.edges) {
      if ((levelOf.get(edge.to) ?? 0) > (levelOf.get(edge.from) ?? 0) + 1) continue // 跨层边路径形状不同
      byTarget.set(edge.to, [...(byTarget.get(edge.to) ?? []), parse(edge.path).x2])
    }
    for (const [target, xs] of byTarget) {
      if (xs.length >= 2) expect(new Set(xs).size, `${target} 的入边锚点共点：${xs.join('、')}`).toBe(xs.length)
    }
    const chainLayout = layoutDag([task('a'), task('b', ['a'])])
    const chain = parse(chainLayout.edges[0]!.path)
    const nodeA = chainLayout.nodes.find(n => n.id === 'a')!
    expect(chain.x1).toBeCloseTo(nodeA.x + nodeA.width / 2, 1) // 单出边仍从底边中心出
  })

  // ── 跨层边（2026-09-28 第三轮用户反馈「线穿节点」立的钉）──
  /** 深链形状：T8 的根前置在第 0 行、T8 在第 2 行 ⇒ T1..T4→T8 是跨层边，会切过中间行。 */
  const deepChain = () => [
    task('t1'), task('t2'), task('t3'), task('t4'),
    task('t5', ['t4']), task('t6', ['t2', 't3']), task('t7', ['t1', 't4']),
    task('t8', ['t1', 't2', 't3', 't4', 't5', 't6', 't7']),
  ]

  /** 沿 path 采样（M + 任意段数的 C / L），返回曲线上的点。 */
  const sample = (path: string, steps = 40): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = []
    let current = { x: 0, y: 0 }
    for (const command of path.match(/[MCL][^MCL]*/g) ?? []) {
      const letter = command[0]
      const values = command.slice(1).match(/[\d.-]+/g)?.map(Number) ?? []
      if (letter === 'M') {
        current = { x: values[0]!, y: values[1]! }
        points.push({ ...current })
      } else if (letter === 'L') {
        const to = { x: values[0]!, y: values[1]! }
        for (let i = 1; i <= steps; i++) {
          points.push({ x: current.x + (to.x - current.x) * i / steps, y: current.y + (to.y - current.y) * i / steps })
        }
        current = to
      } else if (letter === 'C') {
        const p1 = { x: values[0]!, y: values[1]! }
        const p2 = { x: values[2]!, y: values[3]! }
        const to = { x: values[4]!, y: values[5]! }
        for (let i = 1; i <= steps; i++) {
          const t = i / steps
          const u = 1 - t
          points.push({
            x: u * u * u * current.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * to.x,
            y: u * u * u * current.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * to.y,
          })
        }
        current = to
      }
    }
    return points
  }

  it('任何边曲线不穿节点卡（跨层边走两侧边缘通道，不切中间行）——「线穿节点」事故钉', () => {
    const layout = layoutDag(deepChain())
    expect(layout.edges.length).toBeGreaterThanOrEqual(12) // 夹具含跨层边，否则断言空转
    const TOL = 2
    const offenders: string[] = []
    for (const edge of layout.edges) {
      for (const point of sample(edge.path)) {
        const hit = layout.nodes.find(node =>
          point.x > node.x + TOL && point.x < node.x + node.width - TOL
          && point.y > node.y + TOL && point.y < node.y + node.height - TOL)
        if (hit !== undefined) offenders.push(`${edge.from}→${edge.to} 穿过 ${hit.id} @ (${String(Math.round(point.x))},${String(Math.round(point.y))})`)
      }
    }
    expect(offenders, offenders.slice(0, 5).join('；')).toEqual([])
  })

  it('跨层边确实走边缘通道（路径经过画布左/右 margin，而非中间行）', () => {
    const layout = layoutDag(deepChain())
    const multiBand = layout.edges.filter(edge => {
      const from = layout.nodes.find(n => n.id === edge.from)!
      const to = layout.nodes.find(n => n.id === edge.to)!
      return to.level > from.level + 1
    })
    expect(multiBand.length).toBeGreaterThanOrEqual(3) // T1..T4→T8
    for (const edge of multiBand) {
      const xs = sample(edge.path, 24).map(point => point.x)
      expect(Math.min(...xs) < 16 || Math.max(...xs) > layout.width - 16,
        `${edge.from}→${edge.to} 未走边缘通道（x 范围 ${String(Math.round(Math.min(...xs)))}..${String(Math.round(Math.max(...xs)))}，画布宽 ${String(layout.width)}）`).toBe(true)
    }
  })
})

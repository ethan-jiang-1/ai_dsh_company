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

describe('layoutDag 边线车道分离 + 正交路由（2026-09-28 RFC：同带重合消除；同日追加直角走线）', () => {
  /** 解析 path `M x1 y1 L x1 lane L x2 lane L x2 y2`（V-H-V 正交走线）的关键字段。 */
  const parse = (path: string): { x1: number; y1: number; lane: number; x2: number; y2: number } => {
    const match = /^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/.exec(path)
    if (match === null) throw new Error(`path 形状意外：${path}`)
    return { x1: Number(match[1]), y1: Number(match[2]), lane: Number(match[4]), x2: Number(match[5]), y2: Number(match[8]) }
  }
  /** 现场形状（2026-09-28 试用反馈那场）：4 根 → 3 子，带 0→1 里 5 条边。 */
  const tangled = () => [
    task('t1'), task('t2'), task('t3'), task('t4'),
    task('t5', ['t4']), task('t6', ['t2', 't3']), task('t7', ['t1', 't4']),
  ]

  it('同层间带的边中段车道互斥（交叉允许、重合不允许）', () => {
    const layout = layoutDag(tangled())
    const byBand = new Map<string, number[]>()
    for (const edge of layout.edges) {
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

  it('车道都在带内（y1 < lane < y2）；单边带 lane = 中点（渲染向后兼容）', () => {
    for (const edge of layoutDag(tangled()).edges) {
      const { y1, lane, y2 } = parse(edge.path)
      expect(lane).toBeGreaterThan(y1)
      expect(lane).toBeLessThan(y2)
    }
    const chain = parse(layoutDag([task('a'), task('b', ['a'])]).edges[0]!.path)
    expect(chain.lane).toBeCloseTo((chain.y1 + chain.y2) / 2, 5)
  })

  it('正交走线是纯 V-H-V（垂直下探—水平轨—垂直入靶，三段各自对齐）', () => {
    for (const edge of layoutDag(tangled()).edges) {
      const m = /^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/.exec(edge.path)
      expect(m, edge.path).not.toBeNull()
      expect(Number(m![3])).toBe(Number(m![1])) // 第一段垂直：x 不变
      expect(Number(m![6])).toBe(Number(m![4])) // 水平轨两端同一 lane
      expect(Number(m![7])).toBe(Number(m![5])) // 第三段垂直：x 不变
      expect(Number(m![8])).toBe(parse(edge.path).y2)
    }
  })

  it('同靶多入边锚点散开（末段垂直线不共线）；单入单出保持中心锚点', () => {
    const layout = layoutDag(tangled())
    const byTarget = new Map<string, number[]>()
    for (const edge of layout.edges) {
      const target = edge.to
      byTarget.set(target, [...(byTarget.get(target) ?? []), parse(edge.path).x2])
    }
    for (const [target, xs] of byTarget) {
      if (xs.length >= 2) expect(new Set(xs).size, `${target} 的入边锚点共线：${xs.join('、')}`).toBe(xs.length)
    }
    const chain = parse(layoutDag([task('a'), task('b', ['a'])]).edges[0]!.path)
    const nodeA = layoutDag([task('a'), task('b', ['a'])]).nodes.find(n => n.id === 'a')!
    expect(chain.x1).toBeCloseTo(nodeA.x + nodeA.width / 2, 1) // 单出边仍从底边中心出
  })
})

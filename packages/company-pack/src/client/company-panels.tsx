/**
 * 公司视图的四个面板（条目 ① S1）：**纯展示**——数据在 `CompanyView` 折好，这里只画。
 *
 * 视觉纪律：颜色一律 `--dsw-*` 令牌；状态用官方 `StateDot`/`Tag`（platform module，零体积）；
 * DAG 是自绘 SVG（平台无 mermaid / 图表渲染器，研究 §1.5）。
 */
import { useEffect, useRef, useState } from 'react'
import { StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BoardColumn, TaskRow } from '../lib/board.ts'
import { UNASSIGNED_LABEL, driftLabel } from '../lib/board.ts'
import type { BudgetSummary } from '../lib/budget.ts'
import { formatTokens } from '../lib/budget.ts'
import type { DagLayout } from '../lib/dag.ts'
import type { ActivityEntry, PresenceRow } from '../lib/presence.ts'

/** 任务状态 → Tag 色调。 */
function taskTone(status: TaskRow['status']): 'success' | 'info' | 'outline' {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  return 'outline'
}

/** SVG 文本宽度估算：CJK 记 1em、其余记 0.55em（卡内手动排版用，不引测量 API）。 */
function textWidth(text: string, fontSize: number): number {
  let width = 0
  for (const ch of text) width += fontSize * (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 1 : 0.55)
  return width
}

/** 按宽度截断（超宽尾部加省略号；单字超宽也保证推进，不死循环）。 */
function truncateToWidth(text: string, maxWidth: number, fontSize: number): string {
  let width = 0
  for (let index = 0; index < text.length; index++) {
    width += textWidth(text[index]!, fontSize)
    if (width > maxWidth) return text.slice(0, Math.max(1, index)) + '…'
  }
  return text
}

/** 标题折行成 ≤2 行（第二行超宽尾加省略号）——SVG text 不自动换行，手动排。 */
export function wrapTitle(subject: string, maxWidth: number, fontSize = 11): readonly [string, string | null] {
  const chars = [...subject]
  let first = ''
  let index = 0
  while (index < chars.length && textWidth(first + chars[index]!, fontSize) <= maxWidth) {
    first += chars[index]!
    index++
  }
  if (index >= chars.length) return [first, null]
  if (first === '') {
    first = chars[index]!
    index++
  }
  const ellipsisWidth = textWidth('…', fontSize)
  let second = ''
  while (index < chars.length && textWidth(second + chars[index]!, fontSize) <= maxWidth - ellipsisWidth) {
    second += chars[index]!
    index++
  }
  return [first, second + (index < chars.length ? '…' : '')]
}

/** 节点状态徽章的数据面（文案 + class；class 决定 SVG text 的 fill）。 */
function statusBadge(node: DagLayout['nodes'][number]): { text: string; className: string } {
  if (node.waitingOn > 0) return { text: `等 ${String(node.waitingOn)} 项`, className: 'wk-dag-wait' }
  if (node.status === 'completed') return { text: '已完成', className: 'wk-dag-done' }
  if (node.status === 'in_progress') return { text: '进行中', className: 'wk-dag-ready' }
  return { text: '可开工', className: 'wk-dag-ready' }
}

/** 成员状态 → StateDot 语义（团队内忙闲，D-c 文案在 `presence.ts`）。 */
function memberDot(status: PresenceRow['status']): 'done' | 'ongoing' | 'warning' | 'error' | 'idle' {
  switch (status) {
    case 'running': return 'ongoing'
    case 'provisioning': return 'warning'
    case 'failed': return 'error'
    case 'idle': return 'done'
    default: return 'idle'
  }
}

/**
 * 空态 / 加载态的统一呈现（条目「视觉打磨」③）：**一处定义**，四个面板与页签体共用，
 * 避免"（空）""还没有…""当前没有…"各写各的。
 * @param props.text - 文案（句末统一带句号；加载态用省略号）。
 * @param props.kind - `empty`（默认）或 `loading`。
 * @returns 提示行。
 */
export function StateNote({ text, kind = 'empty' }: { readonly text: string; readonly kind?: 'empty' | 'loading' }) {
  return <div className={kind === 'loading' ? 'wk-meta wk-loading' : 'wk-meta wk-empty'}>{text}</div>
}

/** 统一的加载态文案（读权威团队态期间）。 */
export const LOADING_NOTE = '读取团队状态…'

/**
 * 看板：三列（待办 / 进行中 / 完成），卡上带 owner、依赖徽章与就绪状态。
 * @param props.columns - 读模型折好的列。
 * @returns 看板。
 */
export function BoardPanel({ columns }: { readonly columns: readonly BoardColumn[] }) {
  return (
    <div className="wk-board" role="list" aria-label="任务看板">
      {columns.map(column => (
        <section className="wk-column" key={column.status} role="listitem" aria-label={`${column.label}列`}>
          <div className="wk-column-head">
            <span>{column.label}</span>
            <span className="wk-column-count">{column.cards.length}</span>
          </div>
          {column.cards.length === 0
            ? <StateNote text="这一列暂时是空的。" />
            : column.cards.map(card => (
              <article className="wk-card" key={card.id}>
                <div className="wk-card-subject">{card.subject}</div>
                <div className="wk-card-foot">
                  <Tag tone={taskTone(column.status)}>{card.ownerLabel}</Tag>
                  {/* 「依赖已就绪 / 等 …」只在**待办**卡上有意义：它是"这活现在能不能开工"的答案。
                      已完成/进行中的卡挂这枚徽章只会制造噪声——2026-10-19 真投影实测：147 枚徽章里
                      129 枚挂在已完成的卡上、2 枚挂在进行中的卡上，全是「等 …」的死信息（BUG-027）。
                      门槛看 `column.status` 而不是 `card.ready`：后者对非 pending 恒 false，单看它会
                      把 pending 的「等 …」也一起吞掉。 */}
                  {column.status === 'pending' && card.blockedBy.length > 0 && (
                    <Tag tone={card.ready ? 'success' : 'warning'}>
                      {card.ready ? '依赖已就绪' : `等 ${card.blockedBy.join('、')}`}
                    </Tag>
                  )}
                  {/* 声明 vs 板面：任务文本里写了"依赖 T1,T2"而板面没有这条边 ⇒ 上面那句
                      "依赖已就绪"是**假信号**（2026-10-13 真事故：静默缺边）。这条 tag 拆穿它。 */}
                  {card.drift !== null && <Tag tone="warning">⚠ {driftLabel(card.drift)}</Tag>}
                  <span className="wk-card-id">{card.id}@{card.revision}</span>
                </div>
              </article>
            ))}
        </section>
      ))}
    </div>
  )
}

/** 画布缩放下限（占布局宽的比例）：再缩 11px 标题就不到 8px，宁可回退横向滚动。 */
const DAG_MIN_SCALE = 0.75

/**
 * 画布缩放系数：fit 容器宽优先，0.75 下限（再缩 11px 标题就 <8px，回退横向滚动）。
 * 纯函数（keyless 可测）；graphWidth 非正时给 1（不缩放，防除零）。
 */
export function fitScale(availableWidth: number, graphWidth: number): number {
  if (!(graphWidth > 0) || !(availableWidth > 0)) return 1
  return Math.max(DAG_MIN_SCALE, Math.min(1, availableWidth / graphWidth))
}

/**
 * 依赖图：自绘 SVG（节点左侧状态点 + 依赖连线；blocker 已完成 = 实线）。
 * 画布自适应栏宽（2026-09-28 两轮试用反馈定稿）：
 * - **transform: scale() 缩放**（非 CSS 宽度缩放）：Safari/WebKit 里 foreignObject 内的
 *   HTML **不跟 SVG 的 CSS 宽度缩放走**——纯 SVG 元素（卡、线）缩了，节点文字留在原位
 *   堆向左上角（用户实测）；transform 是绘制级缩放，整面（含 foreignObject）一起缩。
 * - 缩放系数 = `fitScale(容器宽, 布局宽)`，ResizeObserver 跟随容器；触底 0.75 后内盒比
 *   容器宽 ⇒ 由 `.wk-pane-body` 横向滚动接管。SSR/首帧 scale=1（测量后再缩）。
 * @param props.layout - `layoutDag` 算好的节点/边与画布尺寸。
 * @returns SVG（空图给空态文案）。
 */
export function DagPanel({ layout }: { readonly layout: DagLayout }) {
  const fitRef = useRef<HTMLDivElement | null>(null)
  const [availableWidth, setAvailableWidth] = useState(0)
  useEffect(() => {
    const element = fitRef.current
    if (element === null) return
    const measure = (): void => {
      setAvailableWidth(previous => element.clientWidth === previous ? previous : element.clientWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => { observer.disconnect() }
  }, [])
  if (layout.nodes.length === 0) return <StateNote text="这场动议还没有任务依赖图。" />
  const scale = availableWidth === 0 ? 1 : fitScale(availableWidth, layout.width)
  return (
    <div className="wk-dag-fit" ref={fitRef}>
      <div style={{ width: `${String(Math.round(layout.width * scale))}px`, height: `${String(Math.round(layout.height * scale))}px` }}>
        <svg
          className="wk-dag-svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`}
          style={{ transform: `scale(${String(scale)})`, transformOrigin: 'top left' }}
          role="img"
          aria-label="任务依赖图"
        >
      <defs>
        {/* 箭头 = **双 marker 显式上色**（CSS 里 .wk-arrow-tip-*）。不用 SVG2 `context-stroke`：
            Chrome 124+/Firefox 支持，Safari 无信号——不支持时 marker 会 fallback 成黑，
            深色主题下箭头直接看不见。 */}
        <marker id="wk-arrow-wait" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path className="wk-arrow-tip-wait" d="M 0 0 L 8 4 L 0 8 z" />
        </marker>
        <marker id="wk-arrow-done" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path className="wk-arrow-tip-done" d="M 0 0 L 8 4 L 0 8 z" />
        </marker>
      </defs>
      {layout.edges.map(edge => (
        <path
          key={`${edge.from}->${edge.to}`}
          className="wk-edge"
          data-done={edge.done}
          d={edge.path}
          markerEnd={`url(#wk-arrow-${edge.done ? 'done' : 'wait'})`}
          /* pathLength=1：把 dash 单位归一化 ⇒ dashoffset 1→0 的"画线"与真实长度无关。
             颜色/线宽/dash 全在 CSS（.wk-edge[data-done]）——含浅色对比度修正。 */
          pathLength={1}
        />
      ))}
      {layout.nodes.map(node => {
        // 两层 g 分家（2026-09-25 实验现场红证）：外层只管**定位**（transform 属性）；
        // 内层 wk-node 只管**入场动画**——动画关键帧里的 CSS transform 会覆盖 SVG transform
        // 属性，合在一层 = 动画结束态 translateY(0) 把定位吃掉 ⇒ 所有节点堆到 (0,0) 叠成一摞。
        // 内容 = **纯 SVG 元素**（2026-09-28 第三轮试用反馈定稿）：foreignObject 里的 HTML 在
        // Safari/WebKit 下不跟缩放/易错位（「文字堆左上角」事故根因），文字改 <text> 手动
        // 排版（wrapTitle 截两行）、状态点改 <circle>，与卡片/连线同一条坐标管线，任何浏览器
        // 都不可能错位。
        const [titleLine1, titleLine2] = wrapTitle(node.subject, node.width - 18 - 13)
        const badge = statusBadge(node)
        const owner = node.ownerLabel === null ? null : truncateToWidth(node.ownerLabel, 90, 10)
        const ownerWidth = owner === null ? 0 : Math.round(textWidth(owner, 10) + 10)
        return (
          <g key={node.id} transform={`translate(${String(node.x)} ${String(node.y)})`}>
            <g className="wk-node" data-status={node.status}>
              <rect
                className="wk-dag-card"
                width={node.width}
                height={node.height}
                rx={8}
                fill="var(--dsw-alias-bg-layer-1)"
                stroke="var(--dsw-alias-border-l2)"
              />
              <g className="wk-dag-node" transform={`translate(9 7)`}>
                <title>{`${node.id}：${node.subject}`}</title>
                <circle className="wk-dag-dot" data-status={node.status} cx={4} cy={9} r={4} />
                <text className="wk-dag-node-title" x={13} y={16}>{titleLine1}</text>
                {titleLine2 !== null && <text className="wk-dag-node-title" x={13} y={29}>{titleLine2}</text>}
                <g className="wk-dag-meta" transform={`translate(13 0)`}>
                  {owner !== null && (
                    <>
                      <rect className="wk-dag-owner-pill" x={0} y={36} width={ownerWidth} height={12} rx={4} />
                      <text className="wk-dag-owner" x={5} y={45.5}>{owner}</text>
                    </>
                  )}
                  <text className={`wk-dag-status ${badge.className}`} x={owner === null ? 0 : ownerWidth + 6} y={45.5}>{badge.text}</text>
                </g>
              </g>
            </g>
          </g>
        )
      })}
        </svg>
      </div>
    </div>
  )
}

/**
 * 在场 + 协作动态：成员行（状态点 + 当前任务）+ 变化流。
 * @param props.rows - 在场板行。
 * @param props.activity - 动态（打开期间的变化；流式升级见 S1 后续步）。
 * @returns 在场面板。
 */
export function PresencePanel({ rows, activity }: {
  readonly rows: readonly PresenceRow[]
  readonly activity: readonly ActivityEntry[]
}) {
  return (
    <div>
      {rows.length === 0
        ? <StateNote text="当前没有团队动议。" />
        : rows.map(row => (
          <div className="wk-row" key={row.id}>
            <span className="wk-row-name">
              <StateDot state={memberDot(row.status)} />
              {row.displayName}
              {row.role === 'lead' ? <Tag tone="neutral">Lead</Tag> : null}
            </span>
            <Tag tone={row.status === 'failed' ? 'danger' : row.status === 'running' ? 'info' : 'outline'}>
              {row.statusLabel}
            </Tag>
            <span className="wk-row-task" title={row.currentTask ?? ''}>{row.currentTask ?? '—'}</span>
          </div>
        ))}
      <div className="wk-section-title">协作动态</div>
      {activity.length === 0
        ? <StateNote text="暂无动态（打开期间的变化会出现在这里）。" />
        : (
          <ul className="wk-activity">
            {activity.map(entry => (
              /* key 用内容而非下标：列表倒序重建时下标会整体位移，用下标会让**旧条目重放动画** */
              <li key={`${String(entry.time)}-${entry.kind}-${entry.text}`}>{entry.text}</li>
            ))}
          </ul>
        )}
    </div>
  )
}

/** 数字滚动时长（ms）。 */
const COUNT_UP_MS = 320

/**
 * 令牌总数滚动到目标值（rAF 插值）。
 * **尊重 `prefers-reduced-motion`**：命中时直接落终值，不做插值（官方惯例）。
 * @param target - 目标值。
 * @returns 当前显示值。
 */
function useCountUp(target: number): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setValue(target)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      fromRef.current = target
      return
    }
    const from = fromRef.current
    if (from === target) {
      setValue(target)
      return
    }
    let frame = 0
    const started = performance.now()
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - started) / COUNT_UP_MS)
      setValue(Math.round(from + (target - from) * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      fromRef.current = target
    }
  }, [target])
  return value
}

/**
 * 用量：总令牌 + 四路占比条 + 会话统计（**只做令牌不做美元**，研究 §1.7）。
 * @param props.summary - `budgetSummary` 折好的摘要。
 * @returns 用量面板。
 */
export function BudgetPanel({ summary }: { readonly summary: BudgetSummary }) {
  const total = useCountUp(summary.totalTokens)
  return (
    <div>
      <div className="wk-usage-total">{formatTokens(total)} <span className="wk-meta">tokens</span></div>
      <div className="wk-meta">
        轮次 {summary.turns ?? '—'} · 步数 {summary.steps ?? '—'}
        {summary.toolShare === null ? '' : ` · 工具耗时占比 ${String(Math.round(summary.toolShare * 100))}%`}
      </div>
      {summary.rows.map(row => (
        <div className="wk-usage-row" key={row.label}>
          <div className="wk-usage-head">
            <span>{row.label}</span>
            <span>{formatTokens(row.tokens)}（{String(Math.round(row.share * 100))}%）</span>
          </div>
          <div className="wk-bar">
            <div className="wk-bar-fill" style={{ width: `${String(Math.round(row.share * 100))}%` }} />
          </div>
        </div>
      ))}
      <StateNote text="只显示令牌（wire 上没有金额字段，不编单价）。" />
    </div>
  )
}

/** 未分配文案的再导出（面板内已用，避免调用方各自拼字符串）。 */
export { UNASSIGNED_LABEL }

/**
 * 公司视图的四个面板（条目 ① S1）：**纯展示**——数据在 `CompanyView` 折好，这里只画。
 *
 * 视觉纪律：颜色一律 `--dsw-*` 令牌；状态用官方 `StateDot`/`Tag`（platform module，零体积）；
 * DAG 是自绘 SVG（平台无 mermaid / 图表渲染器，研究 §1.5）。
 */
import { useEffect, useRef, useState } from 'react'
import { StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BoardColumn, TaskRow } from '../lib/board.ts'
import { UNASSIGNED_LABEL } from '../lib/board.ts'
import type { BudgetSummary } from '../lib/budget.ts'
import { formatTokens } from '../lib/budget.ts'
import type { DagLayout } from '../lib/dag.ts'
import type { ActivityEntry, PresenceRow } from '../lib/presence.ts'

/** 任务状态 → StateDot 语义。 */
function taskDot(status: TaskRow['status']): 'done' | 'ongoing' | 'idle' {
  if (status === 'completed') return 'done'
  if (status === 'in_progress') return 'ongoing'
  return 'idle'
}

/** 任务状态 → Tag 色调。 */
function taskTone(status: TaskRow['status']): 'success' | 'info' | 'outline' {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  return 'outline'
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
            ? <div className="wk-meta">（空）</div>
            : column.cards.map(card => (
              <article className="wk-card" key={card.id}>
                <div className="wk-card-subject">{card.subject}</div>
                <div className="wk-card-foot">
                  <Tag tone={taskTone(column.status)}>{card.ownerLabel}</Tag>
                  {card.blockedBy.length > 0 && (
                    <Tag tone={card.ready ? 'success' : 'warning'}>
                      {card.ready ? '依赖已就绪' : `等 ${card.blockedBy.join('、')}`}
                    </Tag>
                  )}
                  <span className="wk-card-id">{card.id}@{card.revision}</span>
                </div>
              </article>
            ))}
        </section>
      ))}
    </div>
  )
}

/**
 * 依赖图：自绘 SVG（节点左侧状态点 + 依赖连线；blocker 已完成 = 实线）。
 * @param props.layout - `layoutDag` 算好的节点/边与画布尺寸。
 * @returns SVG（空图给空态文案）。
 */
export function DagPanel({ layout }: { readonly layout: DagLayout }) {
  if (layout.nodes.length === 0) return <div className="wk-meta">这场动议还没有任务依赖图。</div>
  return (
    <svg
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`}
      role="img"
      aria-label="任务依赖图"
    >
      {layout.edges.map(edge => (
        <path
          key={`${edge.from}->${edge.to}`}
          className="wk-edge"
          data-done={edge.done}
          d={edge.path}
          /* pathLength=1：把 dash 单位归一化 ⇒ dashoffset 1→0 的"画线"与真实长度无关 */
          pathLength={1}
          fill="none"
          stroke={edge.done ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-border-l3)'}
          strokeWidth={1.5}
          strokeDasharray={edge.done ? 1 : '0.02 0.015'}
        />
      ))}
      {layout.nodes.map(node => (
        <g key={node.id} className="wk-node" transform={`translate(${String(node.x)} ${String(node.y)})`}>
          <rect
            width={node.width}
            height={node.height}
            rx={8}
            fill="var(--dsw-alias-bg-layer-1)"
            stroke="var(--dsw-alias-border-l2)"
          />
          <foreignObject x={8} y={7} width={node.width - 16} height={node.height - 14}>
            <div className="wk-dag-node" {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}>
              <StateDot state={taskDot(node.status)} size={8} />
              <span className="wk-dag-node-title" title={`${node.id}：${node.subject}`}>{node.subject}</span>
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
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
        ? <div className="wk-meta">当前没有团队动议。</div>
        : rows.map(row => (
          <div className="wk-row" key={row.id}>
            <span className="wk-row-name">
              <StateDot state={memberDot(row.status)} />
              {row.role === 'lead' ? '★ ' : ''}{row.displayName}
            </span>
            <Tag tone={row.status === 'failed' ? 'danger' : row.status === 'running' ? 'info' : 'outline'}>
              {row.statusLabel}
            </Tag>
            <span className="wk-row-task" title={row.currentTask ?? ''}>{row.currentTask ?? '—'}</span>
          </div>
        ))}
      <div className="wk-section-title">协作动态</div>
      {activity.length === 0
        ? <div className="wk-meta">暂无动态（打开期间的变化会出现在这里）。</div>
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
      <div className="wk-meta">只显示令牌（wire 上没有金额字段，不编单价）。</div>
    </div>
  )
}

/** 未分配文案的再导出（面板内已用，避免调用方各自拼字符串）。 */
export { UNASSIGNED_LABEL }

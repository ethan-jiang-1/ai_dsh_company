/**
 * 培养面板的状态/动作缝（2026-10-28 R4-E4 自 `CultivationBoard` 483 行的组件体抽出）。
 *
 * 组件只负责“把状态排成四块可见面”；状态机、双击护栏、动作回执、列表折叠、时间标签都在这里。
 * 测试仍从组件外向里断言；本 hook 不 import React 组件（只借 `Button` 渲染折叠控件）。
 */
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRef, useState, type ReactNode } from 'react'
import {
  CULTIVATION_ROLES,
  recordInbox,
  recordStampOf,
  timeLabel,
  type CultivationRecord,
} from '../lib/cultivation.ts'
import {
  CULTIVATION_COPY,
  rejectLine,
  renderThrown,
  type ActionOutcome,
  type CultivationActions,
} from './cultivation-actions.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'

/** 正文折叠阈值：超过这么多行就先只展前几行（长正文不该把别的待办顶走）。 */
export const BODY_PREVIEW_LINES = 4

/** 三个列表的默认可见条数（超过就给「显示全部（共 N 条）」）。 */
const LIST_CAPS = { inbox: 10, mine: 5, adopted: 5 } as const

/** 状态 hook 所需的最小 props（组件把完整 props 传进来即可，结构相容）。 */
export interface CultivationBoardStateProps {
  readonly viewerRole: string | null
  readonly viewerLabel: string | null
  readonly records: readonly CultivationRecord[] | null
  readonly brokenRecords?: readonly string[] | undefined
  readonly unexpandedRecords?: number | undefined
  readonly actions?: CultivationActions | undefined
  readonly openContext?: ((context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false, readonly problem: string }>) | undefined
  readonly onRefresh?: (() => void) | undefined
}

export type CultivationBoardState = ReturnType<typeof useCultivationBoard>

/** 培养面板的全部可变状态与动作。 */
export function useCultivationBoard(props: CultivationBoardStateProps) {
  // 会话 preset 不在五角色名册（Standard / PTC / 自建 mode）⇒ 与“未选角色”同处理：
  // 否则面板会把它当成一个角色（实测显示“我的分身：ptc”、还开创作入口——提了也会被 host 拒）。
  const viewer = props.viewerRole !== null && (CULTIVATION_ROLES as readonly string[]).includes(props.viewerRole)
    ? props.viewerRole
    : null
  const actions = props.actions
  const inbox = recordInbox(props.records ?? [], viewer ?? '')
  /** 正在执行的记录 id（飞行中禁按钮，防重复点击）。 */
  const [pendingId, setPendingId] = useState<string | null>(null)
  /** 每条记录的回执/失败原话（key = 记录 id；不吞失败原因）。 */
  const [outcomes, setOutcomes] = useState<Readonly<Record<string, ActionOutcome>>>({})
  /** 正在写理由的记录 id。 */
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  /** 每条记录背景卡的展开状态（每个记录独立）。 */
  const [expandedContexts, setExpandedContexts] = useState<Readonly<Record<string, boolean>>>({})
  /** 背景原文打开中的记录 id / 失败原话。 */
  const [openingContextId, setOpeningContextId] = useState<string | null>(null)
  const [contextOutcomes, setContextOutcomes] = useState<Readonly<Record<string, string>>>({})

  const openContextOf = async (recordId: string, context: CultivationContext): Promise<void> => {
    if (props.openContext === undefined) return
    setOpeningContextId(recordId)
    setContextOutcomes(previous => ({ ...previous, [recordId]: '' }))
    const result = await props.openContext(context)
    setOpeningContextId(null)
    if (!result.ok) setContextOutcomes(previous => ({ ...previous, [recordId]: result.problem }))
  }
  const [reason, setReason] = useState('')
  const [reasonProblem, setReasonProblem] = useState<string | null>(null)
  /** 正在确认撤回的方法 slug（两步：先讲后果再确认）。 */
  const [revokingSlug, setRevokingSlug] = useState<string | null>(null)
  /** 刚创作提交、待高亮的记录 id。 */
  const [highlightId, setHighlightId] = useState<string | null>(null)
  /** 哪些列表被展开（默认按 {@link LIST_CAPS} 截断）。 */
  const [expandedLists, setExpandedLists] = useState<Readonly<Record<string, boolean>>>({})
  /** 哪些记录的长正文被展开（默认折叠前 {@link BODY_PREVIEW_LINES} 行）。 */
  const [expandedBodies, setExpandedBodies] = useState<Readonly<Record<string, boolean>>>({})
  /** 同一行**在飞的**动作 key（双击护栏：`disabled` 要等重渲染，同一 tick 的第二次点击挡不住）。 */
  const inFlight = useRef<string | null>(null)
  /** 时间标签的锚点：挂载时取一次（轮询重渲染不跳动；跨小时误差可接受，30s 轮询会带新 now）。 */
  const now = Date.now()
  /** 列表折叠：默认只给最近的 `LIST_CAPS[key]` 条，超出部分用「显示全部（共 N 条）」打开。 */
  const capList = <T,>(key: keyof typeof LIST_CAPS, list: readonly T[]): readonly T[] =>
    expandedLists[key] === true ? list : list.slice(0, LIST_CAPS[key])
  /** 折叠控件的渲染（未超阈值就不给）。 */
  const capControl = (key: keyof typeof LIST_CAPS, total: number): ReactNode =>
    total <= LIST_CAPS[key]
      ? null
      : (
        <div className="wk-cultivation-actions">
          <Button size="sm" onClick={() => { setExpandedLists(previous => ({ ...previous, [key]: previous[key] !== true })) }}>
            {expandedLists[key] === true ? CULTIVATION_COPY.listShowLess : CULTIVATION_COPY.listShowAll(total)}
          </Button>
        </div>
      )
  /** 记录的时间标签（id 形状不符给 null——不猜）。 */
  const stampOf = (id: string): string | null => {
    const at = recordStampOf(id)
    return at === null ? null : timeLabel(at, now)
  }

  const run = async (key: string, line: string, after?: () => void): Promise<void> => {
    if (actions === undefined) return
    // 双击护栏：同一 tick 的两次点击会发两条命令。
    if (inFlight.current === key) return
    inFlight.current = key
    setPendingId(key)
    setReasonProblem(null)
    let result: ActionOutcome
    try {
      result = await actions.run(line)
    } catch (error) {
      // 契约上 `run` 永不抛；真抛了也必须把 pending 收回来，否则按钮永久停在「处理中…」。
      result = { ok: false, text: CULTIVATION_COPY.unexpected(renderThrown(error)) }
    } finally {
      inFlight.current = null
      setPendingId(null)
    }
    setOutcomes(previous => ({ ...previous, [key]: result }))
    if (result.ok) {
      after?.()
      props.onRefresh?.()
    }
  }

  const confirmReject = async (id: string): Promise<void> => {
    const draft = rejectLine(id, reason)
    if (!draft.ok) {
      setReasonProblem(draft.problem.message)
      return
    }
    await run(id, draft.line, () => { setRejectingId(null); setReason('') })
  }

  const outcomeOf = (id: string): ActionOutcome | undefined => outcomes[id]

  return {
    viewer,
    actions,
    inbox,
    pendingId,
    outcomes,
    rejectingId,
    expandedContexts,
    openingContextId,
    contextOutcomes,
    reason,
    reasonProblem,
    revokingSlug,
    highlightId,
    expandedLists,
    expandedBodies,
    now,
    openContextOf,
    openContext: props.openContext,
    openContextAvailable: props.openContext !== undefined,
    brokenRecords: props.brokenRecords,
    unexpandedRecords: props.unexpandedRecords,
    records: props.records,
    setPendingId,
    setRejectingId,
    setExpandedContexts,
    setReason,
    setReasonProblem,
    setRevokingSlug,
    setHighlightId,
    setExpandedBodies,
    capList,
    capControl,
    stampOf,
    run,
    confirmReject,
    outcomeOf,
  }
}

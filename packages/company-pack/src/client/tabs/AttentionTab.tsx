/**
 * 「待办」页签体（驾驶舱①切片一）：跨会话注意力聚合面板。
 *
 * - 上段**等你处理**：问询 / 审批挂起项（apply 世界的远端事件观察者登记，本地 2s 轮询快照）
 *   + 升级待处理（follow 流的[NEEDS-CLARIFICATION]消息，切片三甲）；每条带「去处理」跳会话按钮。
 * - 下段**刚完成**：present 完成通知（follow 流）。
 *
 * 显示名解析：问询 / 审批条目只带 sessionId，面板用 `useSessions` 的 `displayTitle` 解析
 * （durable title → 项目名 → 会话 id 的官方降级链），解析不到给 `会话 <短id>`。
 * 流断不致命但不静默（与在场页签同款 fail-loud：错误行内显示）。
 */
import { useEffect, useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  ASKS_CAP,
  attentionItemKey,
  attentionSummary,
  attentionTone,
  hasBoundary,
  mergeAttention,
  pendingAsks,
  streamAttention,
  type AttentionBoundaries,
  type AttentionEventLike,
  type AttentionItem,
  type LivePending,
} from '../../lib/presence/attention.ts'
import { shortSessionId } from '../../lib/shared/text.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import { HISTORY_PAGE_MESSAGES, historyCandidates, readPendingAcrossSessions, type CandidateSession, type PendingAcrossSessions, type SessionPageFace } from '../presence/attention-history.ts'
import type { FloatRectLike } from '../ui/float-geometry.ts'
import type { CompanyDataInjected } from '../data/use-company-data.ts'
import { zh, type CompanyKey, type CompanyT } from '../locales.ts'

/** 页签体注入面：follow 流 + 浮出 + 挂起项快照 + 会话跳转 + lead 归并。 */
export interface AttentionTabInjected {
  readonly follow: CompanyDataInjected['follow']
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab?: ((paneId: string) => void) | undefined
  /** apply 世界登记处的快照读（远端事件观察者写入）。 */
  readonly getPending: () => readonly LivePending[]
  /** 一键跳会话（`sessions.open`）。 */
  readonly openSession: (sessionId: SessionId) => void
  /** 子会话 → lead 归并（follow 与流折条目的归属）。 */
  readonly leadOf: (sessionId: SessionId) => SessionId
  /** 读别的会话的历史事件（跨会话重建的唯一通道；缺席 = 只覆盖本会话）。 */
  readonly pageHistory?: SessionPageFace | undefined
}

export type AttentionTabProps = PropsRuntime<'sidebar.right.pane.tab'> & AttentionTabInjected & { readonly t: CompanyT }

/** 流累计上限（防长会话撑爆内存与折算扫描）。 */
const MAX_EVENTS = 1_000

/** 跨会话重建最多扫这么多份兄弟会话（每份一次探游标 + 一页历史）。 */
const HISTORY_SCAN_CAP = 20

/** 跨会话重读周期（别与会话内 2s 的活体轮询同频：那是内存读，这是 N 次远程读）。 */
const HISTORY_REFRESH_MS = 15_000

export const ATTENTION_KEYS: Readonly<Record<AttentionItem['kind'], CompanyKey>> = {
  question: 'attention.kind.question',
  approval: 'attention.kind.approval',
  escalation: 'attention.kind.escalation',
  completion: 'attention.kind.completion',
}

/** 相对时间（刚刚 / N 分钟前 / 按公司语言 zh-CN 24h 或 en-US 渲染 HH:MM）。 */
function formatWhen(time: number, t: CompanyT): string {
  const delta = Date.now() - time
  if (delta < 60_000) return t('attention.justNow')
  if (delta < 3_600_000) return t('attention.minutesAgo', { minutes: Math.floor(delta / 60_000) })
  const isEn = t('meta.language') === 'en'
  return new Date(time).toLocaleTimeString(
    isEn ? 'en-US' : 'zh-CN',
    isEn ? { hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit', hour12: false },
  )
}

/** 条目稳定 key（时间 + 类别 + 归属 + 摘要）。 */
const itemKey = (item: AttentionItem): string =>
  // 同一条去重身份（BUG-299）：按摘要做 key 会让两条同摘要审批撞 key。
  attentionItemKey(item)

/**
 * 「待办」页签体。
 * @param props - 槽 props + 注入面。
 * @returns 注意力面板。
 */
const defaultAttentionT = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = zh[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

/** 将 {@link AttentionItem.whatToken} 按当前语言字典展开为文案；旧条目/无 token 退回 `what`。 */
export function formatAttentionWhat(item: Pick<AttentionItem, 'what' | 'whatToken'>, t: CompanyT): string {
  const tok = item.whatToken
  if (tok === undefined) return item.what
  switch (tok.kind) {
    case 'escalation-empty': return t('attention.escalationEmpty')
    case 'completion': return t('attention.completionSummary', {
      label: tok.label ?? t('attention.deliverableFallback'),
    })
    case 'approval-missing-tool': return t('attention.toolMissing')
    case 'approval': {
      const toolLabel = tok.toolName === 'request_signoff' ? t('attention.tool.requestSignoff') : tok.toolName
      return tok.reason === undefined
        ? toolLabel
        : t('attention.approvalWithReason', { tool: toolLabel, reason: tok.reason })
    }
    case 'question-missing': return t('attention.questionMissing')
    case 'question-multi': return t('attention.questionMulti', { first: tok.first, count: tok.count })
  }
}

export function AttentionTab(props: AttentionTabProps) {
  const { t = defaultAttentionT, getPending, follow, pageHistory, sessionId } = props
  const [live, setLive] = useState<readonly LivePending[]>([])
  const [events, setEvents] = useState<readonly AttentionEventLike[]>([])
  const [eventsSeen, setEventsSeen] = useState(0)
  const [streamError, setStreamError] = useState<string | null>(null)
  const byId = props.useSessions(state => state.byId)
  const leadId = props.leadOf(sessionId)

  // 挂起项：本地快照轮询（内存读，2s 即时感足够；观察者实时写入登记处）。
  useEffect(() => {
    const read = (): void => { setLive(getPending()) }
    read()
    const timer = setInterval(read, 2_000)
    return () => { clearInterval(timer) }
  }, [getPending])

  // follow 流：快照给历史，其后逐条实时；断流显式落错误行（不静默）。
  useEffect(() => {
    const controller = new AbortController()
    setEvents([])
    setEventsSeen(0)
    setStreamError(null)
    void (async () => {
      try {
        for await (const frame of follow(sessionId, controller.signal)) {
          if (controller.signal.aborted) return
          const incoming = frame.kind === 'history' ? frame.events.length : 1
          setEventsSeen(seen => seen + incoming)
          setEvents(prev => (frame.kind === 'history' ? frame.events : [...prev, frame.event]).slice(-MAX_EVENTS))
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setStreamError(cause instanceof Error ? cause.message : String(cause))
        }
      }
    })()
    return () => { controller.abort() }
  }, [follow, sessionId])

  // 跨会话重建（BUG-292）：活体登记只覆盖本页在场期，`session/follow` 对**未打开**的会话零 history 帧，
  // 所以走 `remote.session.page` 读同工作区 root 会话的首页历史，配对 asked/decided 只留「问了没答」。
  // 结果态（BUG-304/305）：`[]` 分不清「没有」与「读不到/窗口外」，所以连边界一起存。
  // 本会话事件窗口（BUG-317）：`events` 只留最近 MAX_EVENTS 条，所以必须另外记住「一共来过多少条」，
  // 否则更早的挂起审批被截掉后面板还会说「没有等你的事」。
  const [history, setHistory] = useState<PendingAcrossSessions>({ items: [], asksCapped: 0, scanned: 0, failed: 0, window: 'none' })
  // 候选挑选走纯函数（fail-closed，BUG-323）：cwd 未解析时**不扫**，而不是把「未知」当「都匹配」。
  const candidates = useMemo(
    () => historyCandidates(byId as unknown as Readonly<Record<string, CandidateSession>>, sessionId, HISTORY_SCAN_CAP),
    [byId, sessionId],
  )
  const historyKey = candidates.ok ? candidates.ids.join('\n') : ''

  useEffect(() => {
    const ids = historyKey === '' ? [] : historyKey.split('\n')
    if (ids.length === 0 || pageHistory === undefined) { setHistory({ items: [], asksCapped: 0, scanned: 0, failed: 0, window: 'none' }); return }
    const controller = new AbortController()
    const read = async (): Promise<void> => {
      try {
        const rebuilt = await readPendingAcrossSessions(pageHistory, ids, controller.signal)
        if (!controller.signal.aborted) setHistory(rebuilt)
      } catch {
        // 整体失败（罕见）：保留上一轮结果，不让面板闪成空。
      }
    }
    void read()
    // 别的会话里新挂起的审批不会像活体那样推过来（观察者只覆盖本页在场期），所以按慢周期重读。
    const timer = setInterval(() => { void read() }, HISTORY_REFRESH_MS)
    return () => { controller.abort(); clearInterval(timer) }
  }, [historyKey, pageHistory])

  const eventsTruncated = eventsSeen > MAX_EVENTS
  // 本会话的「待你处理」结果算一次：items 与 capped 都从它来（BUG-327：过去 capped 被丢）。
  const ownAsks = useMemo(() => pendingAsks(events, leadId), [events, leadId])
  // **单一**边界对象（BUG-327/328/330）：一处算、一处渲染、一处决定空态。
  const boundaries: AttentionBoundaries = useMemo(() => ({
    eventsTruncated,
    candidates: candidates.ok ? { total: candidates.total, capped: candidates.capped } : null,
    asksCapped: ownAsks.capped + history.asksCapped,
    window: history.window,
    failed: history.failed,
  }), [eventsTruncated, candidates, ownAsks, history])
  const items = useMemo(
    () => mergeAttention(live, [...ownAsks.items, ...history.items, ...streamAttention(events, leadId, 'CEO')]),
    [live, ownAsks, events, leadId, history],
  )
  const waiting = items.filter(item => item.kind !== 'completion')
  const completions = items.filter(item => item.kind === 'completion')

  /** 问询/审批的 who 是 sessionId 占位 → displayTitle 解析；流折条目自带 who。 */
  const whoOf = (item: AttentionItem): string => {
    if (item.kind === 'completion' || item.kind === 'escalation') return item.who
    const summary = byId[item.jumpTo as SessionId]
    return summary?.displayTitle ?? t('attention.session', { id: shortSessionId(item.jumpTo) })
  }

  return (
    <PanelFrame
      title={t('attention.title')}
      tone="attention"
      tabProps={props satisfies PanelFrameProps}
      refreshLabel={t('attention.refresh')}
    >
      {streamError !== null && <div className="wk-error">{t('attention.streamError', { message: streamError })}</div>}
      {/* 边界必须可见（BUG-304/305）：全失败 ≠ 没有；窗口截断 ≠ 完整。 */}
      {/* 边界只从**一个**对象渲染（BUG-327/328/330）：每一维都在，组合起来就不会漏。 */}
      {boundaries.candidates === null && <div className="wk-meta">{t('attention.historyWorkspaceUnknown')}</div>}
      {boundaries.eventsTruncated && <div className="wk-meta">{t('attention.eventsWindow', { count: MAX_EVENTS })}</div>}
      {boundaries.candidates !== null && boundaries.candidates.capped > 0 && (
        <div className="wk-meta">{t('attention.candidatesCapped', { count: boundaries.candidates.capped })}</div>
      )}
      {boundaries.asksCapped > 0 && (
        <div className="wk-meta">{t('attention.asksCapped', { count: boundaries.asksCapped, limit: ASKS_CAP })}</div>
      )}
      {boundaries.failed > 0 && <div className="wk-error">{t('attention.historyFailed', { count: boundaries.failed })}</div>}
      {boundaries.window === 'some' && <div className="wk-meta">{t('attention.historyWindow', { count: HISTORY_PAGE_MESSAGES })}</div>}
      <div className="wk-activity-block">
        <strong>{t('attention.waiting')}</strong>
        {waiting.length === 0
          // 只要**任一**边界存在就不能说「没有等你的事」（BUG-305/317/318/320/323/328）；
          // 但也不留空让用户误以为区域坏了——渲染带边界限定的占位说明（BUG-388）。
          ? (hasBoundary(boundaries)
            ? <div className="wk-meta" data-attention-empty-bounded="">{t('attention.emptyWaitingBounded')}</div>
            : <div className="wk-meta">{t('attention.emptyWaiting')}</div>)
          : (
            <ul className="wk-activity" aria-label={t('attention.waitingList')}>
              {waiting.map(item => {
                const fullWhat = formatAttentionWhat(item, t)
                const summaryWhat = attentionSummary(fullWhat)
                return (
                <li key={itemKey(item)}>
                  <Tag tone={attentionTone(item.kind)}>{t(ATTENTION_KEYS[item.kind])}</Tag>
                  {' '}<span title={item.detail ?? fullWhat}>{t('attention.itemLine', { who: whoOf(item), what: summaryWhat })}</span>
                  <span className="wk-meta"> · {formatWhen(item.time, t)}</span>{' '}
                  <Button
                    size="sm"
                    variant="ghost"
                    title={t('attention.handleTitle')}
                    onClick={() => { props.openSession(item.jumpTo as SessionId) }}
                  >
                    {t('attention.handle')}
                  </Button>
                </li>
                )
              })}
            </ul>
          )}
      </div>
      <div className="wk-activity-block">
        <strong>{t('attention.done')}</strong>
        {completions.length === 0
          ? <div className="wk-meta">{t('attention.emptyDone')}</div>
          : (
            <ul className="wk-activity" aria-label={t('attention.doneList')}>
              {completions.map(item => (
                <li key={itemKey(item)}>
                  <Tag tone={attentionTone(item.kind)}>{t(ATTENTION_KEYS[item.kind])}</Tag>
                  {' '}{whoOf(item)} · {attentionSummary(formatAttentionWhat(item, t))}
                  <span className="wk-meta"> · {formatWhen(item.time, t)}</span>
                </li>
              ))}
            </ul>
          )}
      </div>
    </PanelFrame>
  )
}

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
  attentionTone,
  mergeAttention,
  streamAttention,
  type AttentionEventLike,
  type AttentionItem,
  type LivePending,
} from '../../lib/attention.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import type { FloatRectLike } from '../ui/float-geometry.ts'
import type { CompanyDataInjected } from '../data/use-company-data.ts'
import { zh, type CompanyKey, type CompanyT } from '../locales.ts'

/** 页签体注入面：follow 流 + 浮出 + 挂起项快照 + 会话跳转 + lead 归并。 */
export interface AttentionTabInjected {
  readonly follow: CompanyDataInjected['follow']
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** apply 世界登记处的快照读（远端事件观察者写入）。 */
  readonly getPending: () => readonly LivePending[]
  /** 一键跳会话（`sessions.open`）。 */
  readonly openSession: (sessionId: SessionId) => void
  /** 子会话 → lead 归并（follow 与流折条目的归属）。 */
  readonly leadOf: (sessionId: SessionId) => SessionId
}

export type AttentionTabProps = PropsRuntime<'sidebar.right.pane.tab'> & AttentionTabInjected & { readonly t: CompanyT }

/** 流累计上限（防长会话撑爆内存与折算扫描）。 */
const MAX_EVENTS = 1_000

const ATTENTION_KEYS: Readonly<Record<AttentionItem['kind'], CompanyKey>> = {
  question: 'attention.kind.question',
  approval: 'attention.kind.approval',
  escalation: 'attention.kind.escalation',
  completion: 'attention.kind.completion',
}

/** 相对时间（刚刚 / N 分钟前 / HH:MM）。 */
function formatWhen(time: number, t: CompanyT): string {
  const delta = Date.now() - time
  if (delta < 60_000) return t('attention.justNow')
  if (delta < 3_600_000) return t('attention.minutesAgo', { minutes: Math.floor(delta / 60_000) })
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** 条目稳定 key（时间 + 类别 + 归属 + 摘要）。 */
const itemKey = (item: AttentionItem): string =>
  `${item.time}-${item.kind}-${item.jumpTo}-${item.what}`

/**
 * 「待办」页签体。
 * @param props - 槽 props + 注入面。
 * @returns 注意力面板。
 */
const defaultAttentionT = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = zh[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

export function AttentionTab(props: AttentionTabProps) {
  const { t = defaultAttentionT } = props
  const [live, setLive] = useState<readonly LivePending[]>([])
  const [events, setEvents] = useState<readonly AttentionEventLike[]>([])
  const [streamError, setStreamError] = useState<string | null>(null)
  const byId = props.useSessions(state => state.byId)
  const leadId = props.leadOf(props.sessionId)

  // 挂起项：本地快照轮询（内存读，2s 即时感足够；观察者实时写入登记处）。
  useEffect(() => {
    const read = (): void => { setLive(props.getPending()) }
    read()
    const timer = setInterval(read, 2_000)
    return () => { clearInterval(timer) }
  }, [props.getPending])

  // follow 流：快照给历史，其后逐条实时；断流显式落错误行（不静默）。
  useEffect(() => {
    const controller = new AbortController()
    setEvents([])
    setStreamError(null)
    void (async () => {
      try {
        for await (const frame of props.follow(props.sessionId, controller.signal)) {
          if (controller.signal.aborted) return
          setEvents(prev => (frame.kind === 'history' ? frame.events : [...prev, frame.event]).slice(-MAX_EVENTS))
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setStreamError(cause instanceof Error ? cause.message : String(cause))
        }
      }
    })()
    return () => { controller.abort() }
  }, [props.follow, props.sessionId])

  const items = useMemo(
    () => mergeAttention(live, streamAttention(events, leadId, 'CEO')),
    [live, events, leadId],
  )
  const waiting = items.filter(item => item.kind !== 'completion')
  const completions = items.filter(item => item.kind === 'completion')

  /** 问询/审批的 who 是 sessionId 占位 → displayTitle 解析；流折条目自带 who。 */
  const whoOf = (item: AttentionItem): string => {
    if (item.kind === 'completion' || item.kind === 'escalation') return item.who
    const summary = byId[item.jumpTo as SessionId]
    return summary?.displayTitle ?? t('attention.session', { id: item.jumpTo.slice(0, 8) })
  }

  return (
    <PanelFrame
      title={t('attention.title')}
      tone="attention"
      tabProps={props satisfies PanelFrameProps}
      refreshLabel={t('attention.refresh')}
    >
      {streamError !== null && <div className="wk-error">{t('attention.streamError', { message: streamError })}</div>}
      <div className="wk-activity-block">
        <strong>{t('attention.waiting')}</strong>
        {waiting.length === 0
          ? <div className="wk-meta">{t('attention.emptyWaiting')}</div>
          : (
            <ul className="wk-activity" aria-label={t('attention.waitingList')}>
              {waiting.map(item => (
                <li key={itemKey(item)}>
                  <Tag tone={attentionTone(item.kind)}>{t(ATTENTION_KEYS[item.kind])}</Tag>
                  {' '}{whoOf(item)}：{item.what}
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
              ))}
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
                  {' '}{whoOf(item)} · {item.what}
                  <span className="wk-meta"> · {formatWhen(item.time, t)}</span>
                </li>
              ))}
            </ul>
          )}
      </div>
    </PanelFrame>
  )
}

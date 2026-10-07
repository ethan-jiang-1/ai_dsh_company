/**
 * 培养页签体（驾驶舱④切片四）：每角色的 journal 待审收件箱——人审提升的日常入口。
 *
 * 数据面两条：`remote.workspaceFiles`（list/read 经会话身份读当前工作区的 `kb/<role>/journal/`）
 * + **本会话事件流**（feedback 读模型半边，2026-10-03：`session/follow` 快照给历史、其后实时——
 * 人的赞/踩经出厂 message-feedback 落 `feedback/message-put|delete` 会话事件，折算见 lib
 * `feedbackItems`；注入缺席或流不可达时该块降级、journal 面不受影响）。
 * 「journal/ 里的条目 = 待审素材」的语义见 lib/cultivation.ts 头注。**v1 登记缺口**：「最近提升
 * skill」与「探针状态」住仓库侧（presets/ + checks|probes 产物），浏览器数据面够不到——等有 host 读面
 * 或收敛条目定标记约定再补。
 */
import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { CULTIVATION_ROLES, feedbackItems, inboxRows, type CultivationRow, type FeedbackItem } from '../lib/cultivation.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import type { FloatRectLike } from './float-geometry.ts'

/** 页签体注入面：文件读取闭包（绑定 `remote.workspaceFiles`）+ 事件流闭包（绑定 `session/follow`）+ 浮出。 */
export interface CultivationTabInjected {
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** 列某角色 journal 目录的 .md 文件名；不可达（目录缺）给 null。 */
  readonly listJournal: (sessionId: SessionId, role: string, signal: AbortSignal) => Promise<readonly string[] | null>
  /** 读工作区文本文件的首窗口；失败给 null（标题降级为文件名）。 */
  readonly readHead: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
  /** 本会话事件流（快照给历史 + 实时追加；与协作动态同一条 `session/follow`）；缺席 = 赞/踩块降级。 */
  readonly followEvents?: (sessionId: SessionId, signal: AbortSignal) => AsyncIterable<{ kind: 'history'; events: readonly unknown[] } | { kind: 'event'; event: unknown }>
}

export type CultivationTabProps = PropsRuntime<'sidebar.right.pane.tab'> & CultivationTabInjected

/** 刷新间隔（journal 不高频变化；30s 足够）。 */
const REFRESH_MS = 30_000

/**
 * 培养页签体。
 * @param props - 槽 props + 注入面。
 * @returns 待审收件箱面板。
 */
export function CultivationTab(props: CultivationTabProps) {
  const [rows, setRows] = useState<readonly CultivationRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<readonly FeedbackItem[] | null>(null)

  // 赞/踩块（feedback 读模型半边）：历史快照折当前态，其后实时追加重折。
  // 流断开：保持最后已知态（不闪空）；注入缺席/首连失败 = null（块内降级文案）。
  useEffect(() => {
    const followEvents = props.followEvents
    if (followEvents === undefined) return
    const controller = new AbortController()
    const consume = async (): Promise<void> => {
      const events: unknown[] = []
      try {
        for await (const frame of followEvents(props.sessionId, controller.signal)) {
          if (frame.kind === 'history') events.push(...frame.events)
          else events.push(frame.event)
          if (controller.signal.aborted) return
          setFeedback([...feedbackItems(events)])
        }
      } catch {
        // 流断开：已收到过帧则保持最后已知态；一帧未收（首连失败）保持 null——块内降级文案。
      }
    }
    void consume()
    return () => { controller.abort() }
  }, [props.sessionId, props.followEvents])

  useEffect(() => {
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      try {
        const listings: Record<string, readonly string[]> = {}
        const heads: Record<string, string> = {}
        for (const role of CULTIVATION_ROLES) {
          const names = await props.listJournal(props.sessionId, role, controller.signal)
          if (names === null) continue
          listings[role] = names
          for (const name of names.slice(0, 3)) {
            const text = await props.readHead(props.sessionId, `kb/${role}/journal/${name}`, controller.signal)
            if (text !== null) heads[`${role}/${name}`] = text
          }
        }
        if (controller.signal.aborted) return
        setRows([...inboxRows(listings, heads)])
        setError(null)
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }
    }
    void load()
    const timer = setInterval(() => { void load() }, REFRESH_MS)
    return () => { controller.abort(); clearInterval(timer) }
  }, [props.sessionId, props.listJournal, props.readHead])

  const total = rows === null ? 0 : rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <PanelFrame tone="growth" title="培养" tabProps={props satisfies PanelFrameProps}>
      {error !== null && <div className="wk-error">{error}</div>}
      <div className="wk-meta">各角色的 journal = 待审素材（人审后按「轮末收敛」压进 CHARTER 历史纪要）。</div>
      {rows === null
        ? <div className="wk-meta">读取中…</div>
        : (
          <div role="list" aria-label="培养待审收件箱" className="wk-list">
            {rows.map(row => (
              <div key={row.role} role="listitem" className="wk-row" aria-label={`${row.label} 待审 ${String(row.count)} 条`}>
                <span className="wk-row-name">
                  {row.label}
                  {row.count > 0 ? <Tag tone={row.count > 5 ? 'warning' : 'info'}>{`${String(row.count)} 待审`}</Tag> : <Tag tone="outline">无待审</Tag>}
                </span>
                <span className="wk-row-task">
                  {row.entries.length === 0
                    ? '—'
                    : row.entries.map(entry => entry.title).join('；')}
                  {row.count > row.entries.length ? ` …（共 ${String(row.count)} 条）` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      <div className="wk-activity-block" aria-label="人的赞踩">
        <strong>人的赞/踩（本会话）</strong>
        {props.followEvents === undefined || feedback === null
          ? <div className="wk-meta">事件流不可达——赞/踩块降级（journal 面不受影响）。</div>
          : feedback.length === 0
            ? <div className="wk-meta">还没有赞/踩——人点 👍/👎 会实时出现在这里。</div>
            : (
              <div role="list" aria-label="赞踩清单" className="wk-list">
                {feedback.map(item => (
                  <div key={item.messageId} role="listitem" className="wk-row" aria-label={item.rating === 'positive' ? '赞' : '踩'}>
                    <span className="wk-row-name">
                      {item.rating === 'positive' ? '👍 赞' : '👎 踩'}
                      {item.note !== undefined && item.note !== '' ? `：${item.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
      </div>
      <div className="wk-activity-block">
        <strong>怎么养</strong>
        <ul className="wk-activity">
          <li>读 journal 提炼教训 → 有证据才提升进 pack skill（D25；文本只写方法论，D17）。</li>
          <li>改完 preset 跑四道门禁：verify / test / preset-smoke / probe --full。</li>
          <li>审过的条目按「轮末收敛」压进 CHARTER「历史纪要」，journal 只留当前轮。</li>
        </ul>
      </div>
      {total === 0 && rows !== null && (
        <div className="wk-meta">全部角色的 journal 都空——收敛完成或尚未开工。</div>
      )}
    </PanelFrame>
  )
}

/**
 * 台账页签体（呈现叙事切片一）：动议台账面板——读 `kb/motion-ledger.md` 渲染每场动议的
 * 日期/类型/参与/墙钟/成品/结论。数据面 = `remote.workspaceFiles`（与培养页签同款）。
 * 素材与场景分镜（demo.md 场景 D/E + 快照）已由新动议条目交付；本页签是"公司累计干了什么、
 * 值不值"的常驻答案。
 */
import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { ledgerStats, parseMotionLedger, type MotionRow } from '../lib/ledger.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import type { FloatRectLike } from './float-geometry.ts'

/** 页签体注入面：台账文件读取闭包 + 浮出。 */
export interface LedgerTabInjected {
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** 读 `kb/motion-ledger.md` 全文；不可达给 null（面板显示读取失败，不静默）。 */
  readonly readLedger: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>
}

export type LedgerTabProps = PropsRuntime<'sidebar.right.pane.tab'> & LedgerTabInjected

/** 刷新间隔（台账随当轮收敛更新，低频）。 */
const REFRESH_MS = 30_000

/**
 * 台账页签体。
 * @param props - 槽 props + 注入面。
 * @returns 动议台账面板。
 */
export function LedgerTab(props: LedgerTabProps) {
  const [rows, setRows] = useState<readonly MotionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      const text = await props.readLedger(props.sessionId, controller.signal)
      if (controller.signal.aborted) return
      if (text === null) {
        setRows(null)
        setError('台账不可读（kb/motion-ledger.md 缺失？）')
        return
      }
      setRows([...parseMotionLedger(text)])
      setError(null)
    }
    void load()
    const timer = setInterval(() => { void load() }, REFRESH_MS)
    return () => { controller.abort(); clearInterval(timer) }
  }, [props.sessionId, props.readLedger])

  const stats = rows === null ? null : ledgerStats(rows)

  return (
    <PanelFrame tone="archive" title="台账" tabProps={props satisfies PanelFrameProps}>
      {error !== null && <div className="wk-error">{error}</div>}
      {stats !== null && (
        <div className="wk-meta" aria-label="台账统计">
          共 {String(stats.total)} 场动议 · 成品 {String(stats.finals)} · 墙钟未记 {String(stats.untimed)}
        </div>
      )}
      {rows === null
        ? (error === null && <div className="wk-meta">读取中…</div>)
        : (
          <div role="list" aria-label="动议台账" className="wk-list">
            {rows.map(row => (
              <div key={row.slug} role="listitem" className="wk-row" aria-label={`${row.slug}，${row.kind}，${row.date}`}>
                <span className="wk-row-name">
                  {row.final.includes('✅') ? <Tag tone="info">成品</Tag> : <Tag tone="outline">无成品</Tag>}
                  {row.slug}
                </span>
                <span className="wk-row-status">{row.date} · {row.kind} · {row.roles}</span>
                <span className="wk-row-task" title={row.summary}>{row.summary}</span>
              </div>
            ))}
          </div>
        )}
      <div className="wk-meta">维护：当轮收敛时随 CHARTER 历史纪要追加一行（kb/motion-ledger.md）。</div>
    </PanelFrame>
  )
}

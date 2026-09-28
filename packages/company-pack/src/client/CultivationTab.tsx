/**
 * 培养页签体（驾驶舱④切片四）：每角色的 journal 待审收件箱——人审提升的日常入口。
 *
 * 数据面 = `remote.workspaceFiles`（list/read 经会话身份读当前工作区的 `kb/<role>/journal/`）；
 * 「journal/ 里的条目 = 待审素材」的语义见 lib/cultivation.ts 头注。**v1 登记缺口**：「最近提升
 * skill」与「探针状态」住仓库侧（presets/ + scripts/ 产物），浏览器数据面够不到——等有 host 读面
 * 或收敛条目定标记约定再补。
 */
import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { CULTIVATION_ROLES, inboxRows, type CultivationRow } from '../lib/cultivation.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import type { FloatRectLike } from './float-geometry.ts'

/** 页签体注入面：文件读取闭包（绑定 `remote.workspaceFiles`）+ 浮出。 */
export interface CultivationTabInjected {
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** 列某角色 journal 目录的 .md 文件名；不可达（目录缺）给 null。 */
  readonly listJournal: (sessionId: SessionId, role: string, signal: AbortSignal) => Promise<readonly string[] | null>
  /** 读工作区文本文件的首窗口；失败给 null（标题降级为文件名）。 */
  readonly readHead: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
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

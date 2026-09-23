/** Company 驾驶舱页签（R5b）：组织在场板（行可点进成员空间）+ 协作动态流。纯 DOM，不依赖 ui-primitives。 */
import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { diffActivity, rowsFromTeamView, type ActivityEntry, type PresenceRow, type TeamViewLike } from '../lib/presence.ts'

/** 在场板一行可点的目标（D-d）：teammate 走 openSubagent，lead 走 open。 */
export interface MemberTarget {
  readonly id: string
  readonly role: 'lead' | 'teammate'
}

/** 组件 props：槽的运行时 props（含 sessionId）+ 本插件注入的 load / openMember。 */
export type CompanyPaneProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & {
    readonly load: (sessionId: SessionId) => Promise<RemoteResult<TeamView>>
    readonly openMember: (sessionId: SessionId, member: MemberTarget) => Promise<void>
  }

/** 动态流保留条数上限（防长会话把面板撑爆）。 */
const MAX_ACTIVITY = 50

/** 轮询间隔：与 R2 任务板同节奏（5s）。验收「接活 5s 内转执行中」与它对齐。 */
const POLL_MS = 5_000

/**
 * 驾驶舱主体：在场板（lead + 分身，行 = 显示名 / 团队内状态 / 当前任务）+ 动态流。
 * 数据 = 拉式 RPC（D-b）：挂载即拉一次，之后每 5s 轮询；卸载即停。
 * @param props - 槽运行时 props 与本插件注入的加载器 / 成员空间入口。
 * @returns 右栏页签主体。
 */
export function CompanyPane({ sessionId, load, openMember }: CompanyPaneProps) {
  const [rows, setRows] = useState<readonly PresenceRow[] | null>(null)
  const [activity, setActivity] = useState<readonly ActivityEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const busyRef = useRef(false)
  const prevRef = useRef<TeamViewLike | undefined>(undefined)

  /** 拉一次权威态并把差分记进动态流。 */
  const refresh = async (): Promise<void> => {
    if (busyRef.current) return
    busyRef.current = true
    setError(null)
    try {
      const result = await load(sessionId)
      if (result.ok) {
        const view: TeamViewLike = result.value
        const deltas = diffActivity(prevRef.current, view, Date.now())
        prevRef.current = view
        setRows(rowsFromTeamView(view))
        if (deltas.length > 0) {
          setActivity(previous => [...deltas.reverse(), ...previous].slice(0, MAX_ACTIVITY))
        }
      } else {
        setError(result.error.message)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      busyRef.current = false
    }
  }

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => { void refresh() }, POLL_MS)
    return () => { clearInterval(timer) }
  }, [sessionId])

  return (
    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', lineHeight: 1.5, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <strong>组织在场板</strong>
        <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>每 5 秒自动刷新</span>
      </div>
      {error !== null && <div style={{ color: '#e5534b' }}>{error}</div>}
      {rows === null
        ? error === null && <div style={{ opacity: 0.75 }}>读取团队状态…</div>
        : rows.length === 0
          ? <div style={{ opacity: 0.75 }}>当前没有团队动议</div>
          : (
            <>
              <div style={{ display: 'flex', gap: '0.4rem', opacity: 0.7, fontSize: '0.75rem', margin: '0.3rem 0 0.15rem' }}>
                <span style={{ flex: '0 0 9.5rem' }}>成员</span>
                <span style={{ flex: '0 0 3.5rem' }}>团队内状态</span>
                <span>当前任务</span>
              </div>
              <div role="list" aria-label="组织在场板" style={{ display: 'grid', gap: '0.25rem' }}>
                {rows.map(row => (
                  <button
                    key={row.id}
                    type="button"
                    role="listitem"
                    style={{
                      display: 'flex', gap: '0.4rem', textAlign: 'left', padding: '0.25rem 0.4rem',
                      border: '1px solid rgba(128,128,128,0.35)', borderRadius: '0.35rem', cursor: 'pointer',
                    }}
                    aria-label={`${row.displayName}，${row.statusLabel}，${row.currentTask === null ? '无进行中任务' : `任务：${row.currentTask}`}`}
                    title={row.role === 'lead' ? '进入 CEO（Lead）空间' : '进入该成员的空间'}
                    onClick={() => { void openMember(sessionId, { id: row.id, role: row.role }) }}
                  >
                    <span style={{ flex: '0 0 9.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.role === 'lead' ? '★ ' : ''}{row.displayName}
                    </span>
                    <span style={{ flex: '0 0 3.5rem' }}>{row.statusLabel}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.currentTask ?? '—'}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', margin: '0.25rem 0 0.5rem' }}>
                状态 = 该分身在本场团队动议中的忙闲
              </div>
            </>
          )}
      <div style={{ borderTop: '1px solid rgba(128,128,128,0.3)', marginTop: '0.35rem', paddingTop: '0.35rem' }}>
        <strong>协作动态</strong>
        {activity.length === 0
          ? <div style={{ opacity: 0.75 }}>暂无动态（打开期间的变化会出现在这里）</div>
          : (
            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
              {activity.map((entry, index) => (
                <li key={`${entry.time}-${index}`} style={{ margin: '0.1rem 0' }}>{entry.text}</li>
              ))}
            </ul>
          )}
      </div>
    </div>
  )
}

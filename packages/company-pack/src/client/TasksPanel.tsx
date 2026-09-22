/** 会话头部动作：本会话所属团队的任务板（只读；纯 DOM，不依赖 ui-primitives）。 */
import { useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** 组件 props：槽的运行时 props（含 sessionId）+ 本插件注入的 load。 */
export type TasksActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & { readonly load: (sessionId: SessionId) => Promise<RemoteResult<TeamView>> }

const STATUS_LABEL: Record<string, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '完成',
  deleted: '已删',
}

/**
 * 渲染"任务板"按钮与面板：成员状态 + 共享任务（含 owner/依赖/修订号）。
 * @param props - 槽运行时 props 与本插件注入的加载器。
 * @returns 头部按钮，点开为面板。
 */
export function TasksAction({ sessionId, load }: TasksActionProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<TeamView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const result = await load(sessionId)
      if (result.ok) setView(result.value)
      else setError(result.error.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }

  const live = view?.tasks.filter(task => task.status !== 'completed' && task.status !== 'deleted') ?? []

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-expanded={open}
        title="团队任务板"
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) void refresh()
        }}
      >
        🗂 任务板{live.length === 0 ? '' : ` (${String(live.length)})`}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="团队任务板"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 30,
            minWidth: '26rem',
            maxWidth: '38rem',
            maxHeight: '24rem',
            overflow: 'auto',
            padding: '0.6rem 0.75rem',
            border: '1px solid rgba(128,128,128,0.4)',
            borderRadius: '0.5rem',
            background: 'Canvas',
            color: 'CanvasText',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <strong>团队任务板</strong>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => { void refresh() }} disabled={loading}>
              {loading ? '刷新中…' : '刷新'}
            </button>
            <button type="button" onClick={() => { setOpen(false) }}>关闭</button>
          </div>
          {error !== null && <div style={{ color: '#e5534b' }}>{error}</div>}
          {view !== null && (
            <>
              <div style={{ opacity: 0.75, marginBottom: '0.3rem' }}>
                成员：{view.members.map(member => `${member.name}(${member.status})`).join('、') || '（无）'}
              </div>
              {view.tasks.length === 0
                ? <div style={{ opacity: 0.75 }}>还没有共享任务</div>
                : (
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr style={{ opacity: 0.7 }}>
                          <th style={{ textAlign: 'left', padding: '0.15rem 0.3rem' }}>id</th>
                          <th style={{ textAlign: 'left', padding: '0.15rem 0.3rem' }}>任务</th>
                          <th style={{ textAlign: 'left', padding: '0.15rem 0.3rem' }}>状态</th>
                          <th style={{ textAlign: 'left', padding: '0.15rem 0.3rem' }}>owner</th>
                          <th style={{ textAlign: 'left', padding: '0.15rem 0.3rem' }}>依赖</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.tasks.map(task => (
                          <tr key={task.id} style={{ verticalAlign: 'top' }}>
                            <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>{task.id}@{task.revision}</td>
                            <td style={{ padding: '0.15rem 0.3rem' }}>{task.subject}</td>
                            <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>
                              {STATUS_LABEL[task.status] ?? task.status}{task.ready ? '' : '（阻塞）'}
                            </td>
                            <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>{task.ownerName ?? '未分配'}</td>
                            <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>{task.blockedBy.join(',') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
            </>
          )}
        </div>
      )}
    </span>
  )
}

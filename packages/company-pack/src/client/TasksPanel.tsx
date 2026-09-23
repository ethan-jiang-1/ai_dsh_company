/** 会话头部动作：本会话所属团队的任务板（只读；S2 令牌化 + 官方 Button/图标）。 */
import { useEffect, useRef, useState } from 'react'
import { Button, IconChecklistOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
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
 * S2：emoji → 官方图标；原生 `<button>` → `Button`；颜色走 `--dsw-*` 令牌；
 * 弹窗加宽到 34rem 并给任务正文列最小宽度（原 26rem 会把长标题挤成竖排）。
 * @param props - 槽运行时 props 与本插件注入的加载器。
 * @returns 头部按钮，点开为面板。
 */
export function TasksAction({ sessionId, load }: TasksActionProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<TeamView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const busyRef = useRef(false)

  /**
   * 拉一次权威状态。silent = 后台轮询：不闪「刷新中…」，且与前一次未返回的拉取互斥。
   * @param silent - 是否为后台静默刷新。
   */
  const refresh = async (silent = false): Promise<void> => {
    if (busyRef.current) return
    busyRef.current = true
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await load(sessionId)
      if (result.ok) setView(result.value)
      else setError(result.error.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      busyRef.current = false
      if (!silent) setLoading(false)
    }
  }

  /** 活面板：打开期间每 5 秒拉一次权威状态，成员状态与任务修订双侧实时。 */
  useEffect(() => {
    if (!open) return
    void refresh(true)
    const timer = setInterval(() => { void refresh(true) }, 5000)
    return () => { clearInterval(timer) }
  }, [open])

  const live = view?.tasks.filter(task => task.status !== 'completed' && task.status !== 'deleted') ?? []

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button
        size="sm"
        variant="ghost"
        title="团队任务板"
        aria-expanded={open}
        icon={<IconChecklistOutline14 />}
        onClick={() => { setOpen(!open) }}
      >
        任务板{live.length === 0 ? '' : ` (${String(live.length)})`}
      </Button>
      {open && (
        <div className="wk-popover" role="dialog" aria-label="团队任务板">
          <div className="wk-popover-head">
            <strong>团队任务板</strong>
            <span className="wk-meta">每 5 秒自动刷新</span>
            <span style={{ flex: 1 }} />
            <Button size="sm" variant="outline" onClick={() => { void refresh() }} disabled={loading}>
              {loading ? '刷新中…' : '刷新'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setOpen(false) }}>关闭</Button>
          </div>
          {error !== null && <div className="wk-error">{error}</div>}
          {view !== null && (
            <>
              <div className="wk-meta" style={{ marginBottom: '0.3rem' }}>
                成员：{view.members.map(member => `${member.name}(${member.status})`).join('、') || '（无）'}
              </div>
              {view.tasks.length === 0
                ? <div className="wk-meta">还没有共享任务</div>
                : (
                    <table className="wk-table">
                      <thead>
                        <tr>
                          <th>id</th>
                          <th>任务</th>
                          <th>状态</th>
                          <th>owner</th>
                          <th>依赖</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.tasks.map(task => (
                          <tr key={task.id}>
                            <td data-col="id"><span className="wk-cell-id">{task.id}@{task.revision}</span></td>
                            <td data-col="subject">{task.subject}</td>
                            <td data-col="status">
                              {STATUS_LABEL[task.status] ?? task.status}{task.ready ? '' : '（阻塞）'}
                            </td>
                            <td data-col="owner">{task.ownerName ?? '未分配'}</td>
                            <td data-col="blocked">{task.blockedBy.join(',') || '—'}</td>
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

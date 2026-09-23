/**
 * 会话头部动作：任务板的**入口按钮**（条目 ② S3：点开 = 打开右栏平台页签，anchored 弹窗退役）
 * + 任务板表格视图（页签体共用）。
 */
import { useEffect, useRef, useState } from 'react'
import { Button, IconChecklistOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { TeamViewLike } from '../lib/presence.ts'

const STATUS_LABEL: Record<string, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '完成',
  deleted: '已删',
}

/**
 * 任务板表格视图（纯展示）：成员行 + 共享任务表（owner / 依赖 / 修订号）。
 * 「任务板」平台页签体（`company-tabs.tsx` 的 `TasksTab`）用它渲染。
 * @param props.view - 团队视图（可空：未加载时给空态）。
 * @returns 表格。
 */
export function TasksTableView({ view }: { readonly view: TeamViewLike | null }) {
  if (view === null) return <div className="wk-meta">读取团队状态…</div>
  return (
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
                    <td data-col="id"><span className="wk-cell-id">{task.id}@{task.revision ?? 0}</span></td>
                    <td data-col="subject">{task.subject}</td>
                    <td data-col="status">
                      {STATUS_LABEL[task.status] ?? task.status}{task.ready === false ? '（阻塞）' : ''}
                    </td>
                    <td data-col="owner">{task.ownerName ?? '未分配'}</td>
                    <td data-col="blocked">{(task.blockedBy ?? []).join(',') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
    </>
  )
}

/** 组件 props：槽的运行时 props + 注入面（计数拉取 + 打开平台页签）。 */
export type TasksActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & {
    /** 拉团队态（只用于按钮上的活动任务计数）。 */
    readonly load: (sessionId: SessionId) => Promise<RemoteResult<TeamView>>
    /** 打开右栏「任务板」平台页签（`ctx.sidebarRight.openTab('company-tasks')`）。 */
    readonly openTasks: () => void
  }

/**
 * 任务板入口按钮（条目 ② S3）：点击打开右栏平台页签——页签可被拖出成浮窗（可移动/可缩放），
 * 从根上消灭"两个 anchored 弹窗互盖、都不能移动"（原始投诉）。表格本体在「任务板」页签体里
 * （`company-tabs.tsx` 的 `TasksTab`，与本文件共用 `TasksTableView`）。
 * @param props - 槽运行时 props 与注入面。
 * @returns 头部按钮（带活动任务计数）。
 */
export function TasksAction({ sessionId, load, openTasks }: TasksActionProps) {
  const [live, setLive] = useState(0)
  const busyRef = useRef(false)

  /** 每 5 秒拉一次计数（失败不致命：按钮仍可打开页签）。 */
  useEffect(() => {
    let cancelled = false
    const refresh = async (): Promise<void> => {
      if (busyRef.current) return
      busyRef.current = true
      try {
        const result = await load(sessionId)
        if (!cancelled && result.ok) {
          setLive(result.value.tasks.filter(task => task.status !== 'completed' && task.status !== 'deleted').length)
        }
      } catch {
        /* 计数拉取失败：静默（页签体自己会 fail-loud 报错） */
      } finally {
        busyRef.current = false
      }
    }
    void refresh()
    const timer = setInterval(() => { void refresh() }, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [sessionId])

  return (
    <Button
      size="sm"
      variant="ghost"
      title="团队任务板（右栏页签，可拖出成浮窗）"
      icon={<IconChecklistOutline14 />}
      onClick={openTasks}
    >
      任务板{live === 0 ? '' : ` (${String(live)})`}
    </Button>
  )
}

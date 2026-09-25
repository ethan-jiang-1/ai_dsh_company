/**
 * 会话头部动作：任务板的**入口按钮**（条目 ② S3：点开 = 打开右栏平台页签，anchored 弹窗退役）
 * + 任务板表格视图（页签体共用）。
 */
import { Button, IconChecklistOutlineMedium } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { presenceStatusFromPhase, statusLabelFor, type TeamViewLike } from '../lib/presence.ts'
import { LOADING_NOTE, StateNote } from './company-panels.tsx'

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
  if (view === null) return <StateNote kind="loading" text={LOADING_NOTE} />
  return (
    <>
      <div className="wk-meta wk-mb-xs">
        成员：{view.members.map(member => `${member.name}(${statusLabelFor(presenceStatusFromPhase(member.phase))})`).join('、') || '（无）'}
      </div>
      {view.tasks.length === 0
        ? <StateNote text="还没有共享任务。" />
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

/** 组件 props：槽的运行时 props + 注入面（Lead 寻址 + 打开平台页签）。 */
export type TasksActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & {
    /** 团队态挂在 Lead 上：把任意会话归到它的 Lead（0.1.7 起纯函数，无 team RPC）。 */
    readonly leadOf: (sessionId: SessionId) => SessionId
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
export function TasksAction({ sessionId, leadOf, openTasks, useSessions }: TasksActionProps) {
  // 活动任务计数：直接读 Lead 的 `agentTeam` 投影（Host 投影帧保持最新，无需轮询）。
  const team = useSessions((state) => state.projectionsBySession[leadOf(sessionId)]?.values.agentTeam)
  const live = team === undefined
    ? 0
    : team.tasks.filter(task => task.status !== 'completed' && task.status !== 'deleted').length

  return (
    <Button
      size="sm"
      variant="ghost"
      title="团队任务板（右栏页签，可拖出成浮窗）"
      icon={<IconChecklistOutlineMedium />}
      onClick={openTasks}
    >
      任务板{live === 0 ? '' : ` (${String(live)})`}
    </Button>
  )
}

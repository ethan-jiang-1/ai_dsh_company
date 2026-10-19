/**
 * 会话头部动作：任务板的**入口按钮**（条目 ② S3：点开 = 打开右栏平台页签，anchored 弹窗退役）
 * + 任务板表格视图（页签体共用）。
 */
import { Button, IconChecklistOutlineMedium } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { presenceStatusFromPhase, statusLabelFor, type TeamViewLike } from '../lib/presence.ts'
import { tasksFromTeamView, type TaskRow } from '../lib/board.ts'
import { LOADING_NOTE, StateNote } from './company-panels.tsx'

const STATUS_LABEL: Record<string, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '完成',
}

/**
 * 依赖 cell 的一项：**人读优先**——`owner · subject` 为主体，`task-N` 降为灰字次要。
 * 为什么不全用 id：`task-N` 是机器键，人问的是「谁在等什么」；subject 放 title 是 hover-only，
 * 触屏/键盘读不到（台账 Human Exits 已踩过这个坑）。全量 subject 留在 DOM，CSS 只做 2 行钳制；
 * 找不到的依赖显式标「未找到」，不静默丢。
 * @param props.id - 依赖任务 id。
 * @param props.byId - 本板归一化任务索引（`tasksFromTeamView` 的产物）。
 * @returns 一项依赖标签。
 */
function DependencyLabel({ id, byId }: { readonly id: string; readonly byId: ReadonlyMap<string, TaskRow> }) {
  const dependency = byId.get(id)
  if (dependency === undefined) {
    return (
      <span className="wk-dep wk-dep-missing" title={`${id}（未找到）`}>
        <span className="wk-dep-subject">{id}（未找到）</span>
      </span>
    )
  }
  const owner = dependency.ownerName ?? '未分配'
  return (
    <span className="wk-dep" title={`${owner} · ${dependency.subject} · ${id}`} data-dep-id={id}>
      <span className="wk-dep-owner">{owner}</span>
      <span className="wk-dep-sep">·</span>
      <span className="wk-dep-subject">{dependency.subject}</span>
    </span>
  )
}

/**
 * 任务板表格视图（纯展示）：成员行 + 共享任务表（owner / 依赖 / 修订号）。
 * 「任务板」平台页签体（`company-tabs.tsx` 的 `TasksTab`）用它渲染。
 *
 * 行与看板同源：走 `tasksFromTeamView`（过滤 deleted、owner 显示名、revision 归一），
 * 不再直接吃 raw `view.tasks`——否则 deleted 会进表、deleted 的映射永远不命中。
 * @param props.view - 团队视图（可空：未加载时给空态）。
 * @returns 表格。
 */
export function TasksTableView({ view }: { readonly view: TeamViewLike | null }) {
  if (view === null) return <StateNote kind="loading" text={LOADING_NOTE} />
  const tasks = tasksFromTeamView(view)
  const byId = new Map(tasks.map(task => [task.id, task]))
  return (
    <>
      <div className="wk-meta wk-mb-xs">
        成员：{view.members.map(member => `${member.name}(${statusLabelFor(presenceStatusFromPhase(member.phase))})`).join('、') || '（无）'}
      </div>
      {tasks.length === 0
        ? <StateNote text="还没有共享任务。" />
        : (
            <table className="wk-table">
              <thead>
                <tr>
                  <th>任务</th>
                  <th>依赖</th>
                  <th>状态</th>
                  <th>owner</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td data-col="subject">
                      <span className="wk-cell-id">{task.id}@{task.revision}</span> {task.subject}
                    </td>
                    <td data-col="blocked">
                      {task.blockedBy.length === 0
                        ? '—'
                        : (
                            <span className="wk-deps">
                              {task.blockedBy.map(id => <DependencyLabel key={id} id={id} byId={byId} />)}
                            </span>
                          )}
                    </td>
                    <td data-col="status">
                      {/* 「（阻塞）」只在**待办**行上有意义：`ready` 的官方语义是
                          `status === 'pending' && taskReady(...)`（`task-view.ts:56`），
                          非 pending 时恒 false——单看 `ready === false` 会给**已完成/进行中**的行
                          也挂上「（阻塞）」。2026-10-19 真 wire 实测：298 行里 280 行挂了该标记，
                          其中 273 行是非 pending（活都干完了还标阻塞）。同 BUG-027 族的第二处。 */}
                      {STATUS_LABEL[task.status] ?? task.status}
                      {task.status === 'pending' && task.ready === false ? '（阻塞）' : ''}
                    </td>
                    <td data-col="owner">{task.ownerName ?? '未分配'}</td>
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

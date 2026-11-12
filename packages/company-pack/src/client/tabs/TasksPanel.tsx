/**
 * 会话头部动作：任务板的**入口按钮**（条目 ② S3：点开 = 打开右栏平台页签，anchored 弹窗退役）
 * + 任务板表格视图（页签体共用）。
 */
import { Button, IconChecklistOutlineMedium } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { presenceStatusFromPhase, type TeamViewLike } from '../../lib/presence.ts'
import { tasksFromTeamView, type TaskRow } from '../../lib/board.ts'
import { StateNote } from './company-panels.tsx'
import { zh, type CompanyKey, type CompanyT } from '../locales.ts'

const STATUS_KEYS: Record<string, CompanyKey> = {
  pending: 'tasks.status.pending',
  in_progress: 'tasks.status.in_progress',
  completed: 'tasks.status.completed',
}
const defaultT = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = zh[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

/**
 * 依赖 cell 的一项：**人读优先**——`owner · subject` 为主体，`task-N` 降为灰字次要。
 * 为什么不全用 id：`task-N` 是机器键，人问的是「谁在等什么」；subject 放 title 是 hover-only，
 * 触屏/键盘读不到（台账 Human Exits 已踩过这个坑）。全量 subject 留在 DOM，CSS 只做 2 行钳制；
 * 找不到的依赖显式标「未找到」，不静默丢。
 * @param props.id - 依赖任务 id。
 * @param props.byId - 本板归一化任务索引（`tasksFromTeamView` 的产物）。
 * @returns 一项依赖标签。
 */
function DependencyLabel({ id, byId, t }: { readonly id: string; readonly byId: ReadonlyMap<string, TaskRow>; readonly t: CompanyT }) {
  const dependency = byId.get(id)
  if (dependency === undefined) {
    return (
      <span className="wk-dep wk-dep-missing" title={t('tasks.missing', { id })}>
        <span className="wk-dep-subject">{t('tasks.missing', { id })}</span>
      </span>
    )
  }
  const owner = dependency.ownerName ?? t('tasks.unassigned')
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
export function TasksTableView({ view, roleLabel = name => name, t = defaultT }: { readonly view: TeamViewLike | null; readonly roleLabel?: (name: string) => string; readonly t?: CompanyT }) {
  if (view === null) return <StateNote kind="loading" text={t('tasks.loading')} />
  const tasks = tasksFromTeamView(view)
  const byId = new Map(tasks.map(task => [task.id, task]))
  return (
    <>
      <div className="wk-meta wk-mb-xs">
        {t('tasks.members', { members: view.members.map(member => `${roleLabel(member.name)}(${t(`presence.status.${presenceStatusFromPhase(member.phase)}` as CompanyKey)})`).join('、') || t('tasks.noMembers') })}
      </div>
      {tasks.length === 0
        ? <StateNote text={t('tasks.empty')} />
        : (
            <table className="wk-table">
              <thead>
                <tr>
                  <th>{t('tasks.col.task')}</th>
                  <th>{t('tasks.col.dependencies')}</th>
                  <th>{t('tasks.col.status')}</th>
                  <th>{t('tasks.col.owner')}</th>
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
                              {task.blockedBy.map(id => <DependencyLabel key={id} id={id} byId={byId} t={t} />)}
                            </span>
                          )}
                    </td>
                    <td data-col="status">
                      {/* 「（阻塞）」只在**待办**行上有意义：`ready` 的官方语义是
                          `status === 'pending' && taskReady(...)`（`task-view.ts:56`），
                          非 pending 时恒 false——单看 `ready === false` 会给**已完成/进行中**的行
                          也挂上「（阻塞）」。2026-10-19 真 wire 实测：298 行里 280 行挂了该标记，
                          其中 273 行是非 pending（活都干完了还标阻塞）。同 BUG-027 族的第二处。 */}
                      {STATUS_KEYS[task.status] === undefined ? task.status : t(STATUS_KEYS[task.status] as CompanyKey)}
                      {task.status === 'pending' && task.ready === false ? t('tasks.blocked') : ''}
                    </td>
                    <td data-col="owner">{task.ownerName ?? t('tasks.unassigned')}</td>
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
    readonly t?: CompanyT
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
export function TasksAction({ sessionId, leadOf, openTasks, useSessions, t = defaultT }: TasksActionProps) {
  // 活动任务计数：直接读 Lead 的 `agentTeam` 投影（Host 投影帧保持最新，无需轮询）。
  const team = useSessions((state) => state.projectionsBySession[leadOf(sessionId)]?.values.agentTeam)
  const live = team === undefined
    ? 0
    : team.tasks.filter(task => task.status !== 'completed' && task.status !== 'deleted').length

  return (
    <Button
      size="sm"
      variant="ghost"
      title={t('tasks.actionTitle')}
      icon={<IconChecklistOutlineMedium />}
      onClick={openTasks}
    >
      {t('tasks.action')}{live === 0 ? '' : ` (${String(live)})`}
    </Button>
  )
}

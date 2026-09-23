/**
 * 任务看板读模型（条目 ① S1）：列 = `status`，卡 = owner / 依赖 / 就绪 / 修订号。
 *
 * 纯函数、无 React、无 cordis——keyless 单测直接断言（同 `presence.ts` 的分工）。
 * 数据源 = 官方 Agent Teams 任务板（`agentTeams.view`）；**不自建任务存储**（D13）。
 * 看板答"活到哪一步"；依赖结构（谁卡着谁）由 `dag.ts` 答——分列会丢链，故两者并存（研究 §4）。
 */
import { displayNameFor, type TeamViewLike } from './presence.ts'

/** 官方 `TeamTaskStatus` 的本地窄化（`vendor/dsh/packages/experimental/agent-team/src/types.ts:71`）。 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted'

/** 看板列的状态（`deleted` 不设列——墓碑不上面）。 */
export type BoardStatus = Exclude<TaskStatus, 'deleted'>

/** 状态文案（列头与卡徽章共用；未知值不直显英文裸值）。 */
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '完成',
  deleted: '已删',
}

/** 列顺序 = 工作流顺序（空列保留：看板形状稳定，不因状态迁移而抖动）。 */
export const BOARD_STATUS_ORDER: readonly BoardStatus[] = ['pending', 'in_progress', 'completed']

/** 未分配文案。 */
export const UNASSIGNED_LABEL = '未分配'

const KNOWN_STATUS: readonly TaskStatus[] = ['pending', 'in_progress', 'completed', 'deleted']

/** 归一化任务行：两条数据路径的共同形状（`deleted` 已过滤，不出现）。 */
export interface TaskRow {
  readonly id: string
  readonly subject: string
  readonly status: BoardStatus
  /** 负责人显示名；未分配 = null。 */
  readonly ownerName: string | null
  readonly revision: number
  readonly blockedBy: readonly string[]
  /** 依赖全部完成（官方 `taskReady` 同义：`blockedBy.every(completed)`；悬空 id 视为未完成）。 */
  readonly ready: boolean
}

/** 一张卡（列的渲染单元；不含 React 概念）。 */
export interface BoardCard {
  readonly id: string
  readonly subject: string
  readonly ownerLabel: string
  readonly revision: number
  readonly blockedBy: readonly string[]
  readonly ready: boolean
}

/** 一列。 */
export interface BoardColumn {
  readonly status: BoardStatus
  readonly label: string
  readonly cards: readonly BoardCard[]
}

/** 官方状态字面量窄化；未知值按 `pending` 处理（不崩）。 */
export function toTaskStatus(value: string): TaskStatus {
  return KNOWN_STATUS.includes(value as TaskStatus) ? (value as TaskStatus) : 'pending'
}

/**
 * 依赖是否全部完成——官方 `taskReady` 的同义实现（`task-board.ts:255-257`）：
 * `blockedBy.every(id => status(id) === 'completed')`；**悬空 id 视为未完成**（与官方 `.find` 语义一致）。
 * @param blockedBy - 该任务的依赖 id 列表。
 * @param statusById - 当前全部任务的状态索引。
 * @returns 是否就绪。
 */
export function readyOf(blockedBy: readonly string[], statusById: ReadonlyMap<string, TaskStatus>): boolean {
  return blockedBy.every(id => statusById.get(id) === 'completed')
}

/**
 * live 路径：`agentTeams.view` → 归一化任务行（过滤 `deleted`）。
 * `ready` 优先取官方 view 的值；缺失时按 `blockedBy` 现算（同一语义）。
 * @param view - 官方 `TeamView` 的读取子集。
 * @returns 任务行（顺序 = wire 顺序）。
 */
export function tasksFromTeamView(view: TeamViewLike): TaskRow[] {
  const statusById = new Map<string, TaskStatus>()
  for (const task of view.tasks) statusById.set(task.id, toTaskStatus(task.status))

  const rows: TaskRow[] = []
  for (const task of view.tasks) {
    const status = toTaskStatus(task.status)
    if (status === 'deleted') continue
    const blockedBy = task.blockedBy ?? []
    const owner = task.ownerName
    rows.push({
      id: task.id,
      subject: task.subject,
      status,
      // ownerName 是**成员名**（`TeamTaskView` 不带 ownerId）；'lead' 按 CEO 映射，其余按 preset id 映射。
      ownerName: owner === undefined || owner === ''
        ? null
        : displayNameFor(owner, owner === 'lead' ? 'lead' : 'teammate'),
      revision: task.revision ?? 0,
      blockedBy,
      ready: task.ready ?? readyOf(blockedBy, statusById),
    })
  }
  return rows
}

/**
 * 归一化任务行 → 看板列（列顺序固定、空列保留；卡内顺序 = 输入序）。
 * @param tasks - 任务行。
 * @returns 三列（pending / in_progress / completed）。
 */
export function boardColumns(tasks: readonly TaskRow[]): BoardColumn[] {
  return BOARD_STATUS_ORDER.map(status => ({
    status,
    label: TASK_STATUS_LABEL[status],
    cards: tasks
      .filter(task => task.status === status)
      .map(task => ({
        id: task.id,
        subject: task.subject,
        ownerLabel: task.ownerName ?? UNASSIGNED_LABEL,
        revision: task.revision,
        blockedBy: task.blockedBy,
        ready: task.ready,
      })),
  }))
}

/**
 * 依赖边：blocker → blocked（DAG 与"谁卡着谁"共用）。
 * 悬空 id（指向不存在的任务）**不出边**——渲染层没有可连的节点。
 * @param tasks - 任务行。
 * @returns 边列表。
 */
export function dependencyEdges(tasks: readonly TaskRow[]): { from: string; to: string }[] {
  const known = new Set(tasks.map(task => task.id))
  const edges: { from: string; to: string }[] = []
  for (const task of tasks) {
    for (const blocker of task.blockedBy) {
      if (!known.has(blocker)) continue
      edges.push({ from: blocker, to: task.id })
    }
  }
  return edges
}

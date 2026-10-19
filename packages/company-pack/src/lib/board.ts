/**
 * 任务看板读模型（条目 ① S1）：列 = `status`，卡 = owner / 依赖 / 就绪 / 修订号。
 *
 * 纯函数、无 React、无 cordis——keyless 单测直接断言（同 `presence.ts` 的分工）。
 * 数据源 = 官方 Agent Teams 任务板（0.1.7 起 = Lead 会话的 `agentTeam` **投影**；旧 `agentTeams.view` RPC 已移除）；**不自建任务存储**（D13）。
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
  /**
   * 任务描述原文。**依赖意图可能只活在这里**——板面只认 `blockedBy`，而 CEO 的任务书/描述里
   * 用纸面号写"依赖 T1,T2"（2026-10-13 真事故：两处不一致，板面把该任务报成"依赖已就绪"）。
   */
  readonly description: string
  readonly status: BoardStatus
  /** 负责人显示名；未分配 = null。 */
  readonly ownerName: string | null
  readonly revision: number
  readonly blockedBy: readonly string[]
  /** 依赖全部完成（官方 `taskReady` 同义：`blockedBy.every(completed)`；悬空 id 视为未完成）。 */
  readonly ready: boolean
}

/**
 * 一条"声明了依赖、板面却没有这条边"的分叉（2026-10-13 立，起因 = 真事故）。
 * 为什么需要机器判据：声明活在自由文本里、板面只认 `blockedBy`，两者分叉时**没有任何信号**——
 * 看板照样报"依赖已就绪"、依赖图照样少画边，人看到的是假图（T3 那场：subject 写"依赖 T1,T2"、
 * 板面 `blockedBy` 一路 `[]`，静默到人工扫盘才发现）。
 */
export interface DependencyDrift {
  readonly taskId: string
  /** 文本里声明的纸面号（`依赖 T1、T2` ⇒ `['T1','T2']`）。 */
  readonly declared: readonly string[]
  /** 声明了、但 `blockedBy` 里没有对应板面 id —— **真缺陷形态**。 */
  readonly missing: readonly string[]
  /** 声明了、但文本里找不到"纸面号 → 板面 id"的映射（无法核对，也要报出来）。 */
  readonly unmapped: readonly string[]
}

/** 纸面号 → 板面 id：任务 subject 形如 `T1 · …`（派活行同款约定；认不出就不映射）。 */
export function paperToTaskId(tasks: readonly TaskRow[]): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (const task of tasks) {
    const matched = /^\s*T(\d+)\b/.exec(task.subject)
    if (matched !== null) map.set(`T${matched[1] ?? ''}`, task.id)
  }
  return map
}

/**
 * 从任务文本里抽"声明的依赖纸面号"。
 * 只认显式声明（`依赖 T1、T2` / `依赖：T1/T2` / `依赖 T1,T2,T3`）；**`不依赖 T1` 不算**
 * （前一字是 不/无/非/勿/未 时跳过），避免把"可先做不依赖它们的部分"这类句子当成声明。
 * @param text - subject + description 的合并文本。
 * @returns 去重后的纸面号（出现序）。
 */
export function declaredDependencyLabels(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(/依赖\s*[:：]?\s*((?:T\d+[\s、,，/]*)+)/g)) {
    const before = text.slice(0, match.index).trimEnd().slice(-1)
    // ⚠ before 为空串时 `'不无非勿未'.includes('')` 为真——会把行首的"依赖 T1"整条丢掉。
    if (before !== '' && '不无非勿未'.includes(before)) continue
    for (const token of match[1]?.match(/T\d+/g) ?? []) {
      if (!found.includes(token)) found.push(token)
    }
  }
  return found
}

/**
 * 声明 vs 板面：逐任务比对"文本里声明的依赖"与"`blockedBy` 里的板面边"。
 * @param tasks - 任务行（同一批；纸面号映射只在这批内解析）。
 * @returns 有分叉的任务（无分叉的不出现；顺序 = 输入序）。
 */
export function dependencyDrift(tasks: readonly TaskRow[]): DependencyDrift[] {
  const paperToId = paperToTaskId(tasks)
  const drifts: DependencyDrift[] = []
  for (const task of tasks) {
    const declared = declaredDependencyLabels(`${task.subject}\n${task.description}`)
    if (declared.length === 0) continue
    const missing: string[] = []
    const unmapped: string[] = []
    for (const label of declared) {
      const id = paperToId.get(label)
      if (id === undefined) unmapped.push(label)
      else if (!task.blockedBy.includes(id) && id !== task.id) missing.push(label)
    }
    if (missing.length > 0 || unmapped.length > 0) drifts.push({ taskId: task.id, declared, missing, unmapped })
  }
  return drifts
}

/**
 * 分叉的一句话文案（面板与审计共用；**文案的家 = 这里**）。
 * @param drift - 一条分叉。
 * @returns 中文警示语；无分叉时返回 null。
 */
export function driftLabel(drift: DependencyDrift): string | null {
  const parts: string[] = []
  if (drift.missing.length > 0) parts.push(`声明依赖未落板：${drift.missing.join('、')}`)
  if (drift.unmapped.length > 0) parts.push(`声明依赖无法核对：${drift.unmapped.join('、')}`)
  return parts.length === 0 ? null : parts.join('；')
}

/** 一张卡（列的渲染单元；不含 React 概念）。 */
export interface BoardCard {
  readonly id: string
  readonly subject: string
  readonly ownerLabel: string
  readonly revision: number
  readonly blockedBy: readonly string[]
  readonly ready: boolean
  /** 声明 vs 板面的分叉（无分叉 = null）；看板据此把"假就绪"标出来。 */
  readonly drift: DependencyDrift | null
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
 *
 * ⚠ **本函数 ≠ 官方的 `ready`**（2026-10-19 订正，起因 = BUG-027）：官方
 * `ready = task.status === 'pending' && taskReady(state, task)`（`task-view.ts:56`）——
 * 它是「依赖检查 **∧ 自己是 pending**」，本函数**只做前半**，**不看自己的 status**。
 * 一句话：`readyOf` 对一张已完成的卡也可能返回 `true`，那不是官方 `ready` 的意思。
 * 所以调用方必须自己补上 pending 这一半（`tasksFromTeamView` 就是这么用的），
 * 别把本函数当成 `ready` 的同义物。
 * @param blockedBy - 该任务的依赖 id 列表。
 * @param statusById - 当前全部任务的状态索引。
 * @returns 依赖是否全部完成（**不含**"自己是否 pending"）。
 */
export function readyOf(blockedBy: readonly string[], statusById: ReadonlyMap<string, TaskStatus>): boolean {
  return blockedBy.every(id => statusById.get(id) === 'completed')
}

/**
 * live 路径：`agentTeam` 投影 → 归一化任务行（过滤 `deleted`）。
 *
 * `ready` 与官方 `projectTaskView`（`task-view.ts:56`）**逐字同义**：
 * `status === 'pending' && taskReady(...)`。wire 字段 `ready` 已带这个语义，缺失时才现算——
 * **现算也必须补上 pending 这一半**，否则回落值比官方宽松（BUG-027 的教训：`??` 的右值
 * 必须与左值同义，不能只是"看起来差不多"）。
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
      description: task.description ?? '',
      status,
      // ownerName 是**成员名**（`TeamTaskView` 不带 ownerId）；'lead' 按 CEO 映射，其余按 preset id 映射。
      ownerName: owner === undefined || owner === ''
        ? null
        : displayNameFor(owner, owner === 'lead' ? 'lead' : 'teammate'),
      revision: task.revision ?? 0,
      blockedBy,
      // ⚠ 右侧必须带 `status === 'pending'`：`readyOf` 只查依赖，官方 `ready` 还要求自己是 pending。
      ready: task.ready ?? (status === 'pending' && readyOf(blockedBy, statusById)),
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
  const driftByTask = new Map(dependencyDrift(tasks).map(drift => [drift.taskId, drift]))
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
        drift: driftByTask.get(task.id) ?? null,
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

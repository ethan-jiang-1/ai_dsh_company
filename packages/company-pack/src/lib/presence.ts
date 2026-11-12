// 组织在场板读模型（R5b）：纯函数，host 折事件 / client 渲染快照共用（Q5–Q8 定案，见提案 §四个定案）。
//
// 本文件管**折算**：事件 / 快照 → 板（行与动态）；读取的 wire 结构与板形状类型也在这里。
// 状态与显示名词汇（`PresenceStatus` / `STATUS_LABEL` / `presenceStatusFromPhase` /
// `statusLabelFor` / `PRESET_DISPLAY_NAMES` / `displayNameFor`）住 ./presence-status.ts，
// 由本文件**再导出**——各 client importer 的取用面一个字节都不变（2026-10-16 第三轮结构收敛：
// facade 拆法，见 notes/implemented/2026-10-16-presence-status-seam.md）。根入口 0.8.0 起不再
// `export *`（公开面收窄为 apply/inject），这里的再导出只服务包内相对 import。
// 依赖方向单向：本文件 → presence-status.ts（后者零 import，是叶子）。
import {
  PRESET_DISPLAY_NAMES,
  STATUS_LABEL,
  displayNameFor,
  presenceStatusFromPhase,
  statusLabelFor,
  type PresenceStatus,
} from './presence-status.ts'
import { clip, firstText } from './text.ts'

// 词汇再导出（facade 的对外半边）：消费方继续从 `lib/presence.ts` 取这些名字。
export {
  PRESET_DISPLAY_NAMES,
  STATUS_LABEL,
  displayNameFor,
  presenceStatusFromPhase,
  statusLabelFor,
}
export type { PresenceStatus }

/** 在场板一行：D-a 主键 = team roster，一行一个成员（lead + teammate）。 */
export interface PresenceRow {
  /** 成员会话 id（= `TeamMemberView.id`；lead 行 = teamId）。 */
  readonly id: string
  /** 原始成员名（'lead' 或 spawn 时起的名，r2 实测 = preset id）。 */
  readonly name: string
  readonly displayName: string
  readonly role: 'lead' | 'teammate'
  readonly status: PresenceStatus
  readonly statusLabel: string
  /** 本人 in_progress 任务的 subject（多条用「；」连接）；无则 null。 */
  readonly currentTask: string | null
}

/** 协作动态的结构化文案 token（UI 走字典；text 保留给旧夹具/离线回放）。 */
export interface ActivityToken {
  readonly key: string
  readonly params?: Readonly<Record<string, string>>
}

/** 协作动态流一条（成员生命周期 / 任务迁移 / 消息投递）。 */
export interface ActivityEntry {
  readonly time: number
  readonly kind: 'member' | 'task' | 'message'
  readonly text: string
  readonly token?: ActivityToken
}

/** 成员状态 → 动态 token（上线/转状态/故障；文案由 client 字典渲染）。 */
function memberToken(name: string, status: PresenceStatus): ActivityToken {
  switch (status) {
    case 'running': return { key: 'presence.activity.memberRunning', params: { name } }
    case 'idle': return { key: 'presence.activity.memberIdle', params: { name } }
    case 'inactive': return { key: 'presence.activity.memberInactive', params: { name } }
    case 'provisioning': return { key: 'presence.activity.memberProvisioning', params: { name } }
    case 'failed': return { key: 'presence.activity.memberFailed', params: { name } }
    default: return { key: 'presence.activity.memberUnknown', params: { name } }
  }
}

/** 事件折算的完整板（回放 / 离线路径的输出）。 */
export interface PresenceBoardModel {
  readonly teamId: string | null
  readonly rows: readonly PresenceRow[]
  readonly activity: readonly ActivityEntry[]
}


// ---- wire 事实的宽松结构类型（只声明读到的字段；多出的字段忽略，少掉的按缺省处理） ----

/**
 * `agentTeam` 投影（0.1.7 起 client live 路径的输入；旧 `remote.agentTeams.view` 的 `TeamView` 已移除）的子集。
 *
 * ⚠ **成员项换了语义**：0.1.7 的 `TeamMemberProjection` 只带**持久生命周期** `phase`
 * （`provisioning` / `active` / `failed`），**不再带团队内忙闲**——官方消费方把"此刻在不在跑"
 * 从 Session 状态座位（`useSessionStatus`）另行叠。本读模型按最小改判处理：`phase` → 中文状态，
 * `active` 落「待命」（live turn 活动的叠加留作后续条目，见 teammember-live-activity）。
 */
export interface TeamViewLike {
  readonly members: readonly {
    id: string
    name: string
    role: 'lead' | 'teammate'
    /** 持久生命周期（`TeamMemberPhase`），非 live 忙闲。 */
    phase: string
  }[]
  readonly tasks: readonly {
    id: string
    subject: string
    /** 描述原文：依赖声明可能只活在这里（看板"声明 vs 板面"分叉判据要读它）。 */
    description?: string
    status: string
    ownerName?: string
    /** 以下四项供看板 / DAG 读模型用（`TeamTaskView` 有，事件路径的 `TeamTaskSnapshot` 无 `ready`）。 */
    revision?: number
    blockedBy?: readonly string[]
    ready?: boolean
  }[]
}

/**
 * 用事件流补任务板（2026-11-13，BUG-103）。
 *
 * 任务工具写的是 `team/task` 事件；`agentTeam` 投影在「工具已成功但浏览器拿到的是旧快照」
 * 时会是空 tasks（隔离 home 真页面复现）。任务板/看板/依赖图都读同一个 `team`，所以这里把
 * follow 流里的 `team/task` 折回视图：事件是最新的 durable 事实，投影只提供成员名与兜底。
 * @param view - 当前 `agentTeam` 投影（null = 还没加载）。
 * @param events - 同会话 follow 到的事件（历史 + 实时）。
 * @returns 合并后的视图；`view === null` 时仍返回 null。
 */
export function teamWithEventTasks(view: TeamViewLike | null, events: readonly TeamEventLike[]): TeamViewLike | null {
  // 没有投影时只有「事件里真有 team/member 或 team/task」才建最小视图；空流仍 null（加载态）。
  if (view === null && !events.some(event => event.type === 'team/task' || event.type === 'team/member')) return null
  const base: TeamViewLike = view ?? { members: [], tasks: [] }
  const members = new Map((base.members ?? []).map(member => [member.id, member]))
  const tasks = new Map((base.tasks ?? []).map(task => [task.id, task]))
  // member 事件也补投影：投影缺席时「在场」不能空行，而动态已说谁上线（BUG-118）。
  for (const event of events) {
    if (event.type !== 'team/member') continue
    const member = (event.data as { member: { readonly id: string, readonly name: string, readonly role: 'lead' | 'teammate', readonly phase: string } }).member
    members.set(member.id, { id: member.id, name: member.name, role: member.role ?? (member.name === 'lead' ? 'lead' : 'teammate'), phase: member.phase })
  }
  const nameById = new Map([...members.values()].map(member => [member.id, member.name]))
  for (const event of events) {
    if (event.type !== 'team/task') continue
    const task = (event.data as { task: { readonly id: string, readonly revision: number, readonly subject: string, readonly status: string, readonly ownerId?: string, readonly blockedBy?: readonly string[], readonly description?: string } }).task
    const previous = tasks.get(task.id)
    // 事件流的历史/实时顺序不等于投影新旧：旧 revision 不覆盖新投影（BUG-104）。
    if (previous !== undefined && typeof previous.revision === 'number' && task.revision < previous.revision) continue
    if (task.status === 'deleted') { tasks.delete(task.id); continue }
    // 事件是完整的 task snapshot：ownerId 缺席 = 明确无人认领（取消认领），不能保留旧 owner（BUG-112）。
    const ownerName = task.ownerId === undefined
      ? undefined
      : nameById.get(task.ownerId) ?? previous?.ownerName
    tasks.set(task.id, {
      id: task.id,
      subject: task.subject,
      ...(task.description === undefined ? {} : { description: task.description }),
      status: task.status,
      ...(ownerName === undefined ? {} : { ownerName }),
      revision: task.revision,
      ...(task.blockedBy === undefined ? {} : { blockedBy: task.blockedBy }),
    })
  }
  return { ...base, members: [...members.values()], tasks: [...tasks.values()] }
}

/** lead 会话日志里的 `team/*` 事件（host 折算路径与回放 fixtures 的输入）。 */
export type TeamEventLike =
  | {
    type: 'team/member'
    time: number
    data: {
      teamId: string
      member: {
        id: string
        name: string
        phase: 'provisioning' | 'active' | 'failed'
        error?: string
      }
    }
  }
  | {
    type: 'team/task'
    time: number
    data: {
      teamId: string
      task: {
        id: string
        revision: number
        subject: string
        status: 'pending' | 'in_progress' | 'completed' | 'deleted'
        ownerId?: string
      }
    }
  }
  | {
    type: 'team/message/queued'
    time: number
    data: {
      teamId: string
      message: {
        id: string
        senderId: string
        senderName: string
        targetId: string
        content: readonly { type: string; text?: string }[]
      }
    }
  }
  // 兜底成员；其他事件类型忽略不折。
  | { type: string; time: number; data: unknown }

type MemberEvent = Extract<TeamEventLike, { type: 'team/member' }>
type TaskEvent = Extract<TeamEventLike, { type: 'team/task' }>
type MessageEvent = Extract<TeamEventLike, { type: 'team/message/queued' }>

/** 字面量判别守卫（联合含 string 兜底时，用户谓词是唯一可靠窄化手段）。 */
const isMemberEvent = (event: TeamEventLike): event is MemberEvent => event.type === 'team/member'
const isTaskEvent = (event: TeamEventLike): event is TaskEvent => event.type === 'team/task'
const isMessageEvent = (event: TeamEventLike): event is MessageEvent => event.type === 'team/message/queued'

/**
 * live 路径：`TeamView` 快照 → 在场板行（D-a/D-c）。当前任务按 **ownerName** 关联——
 * `TeamTaskView` 不带 ownerId，只有 ownerName（vendor types.ts:85-97）。**这是正确的**：
 * ownerName 由 host 侧 `projectTaskView` 从 ownerId 解析（含 lead 特判），到 wire 时已经解好了。
 * ⚠ 别去 `session_projcache` 里找 ownerName——那里存的是 `TeamTaskSnapshot`（有 ownerId、无 ownerName），
 * 是投影的 **state**，不是本函数吃的 wire 视图（2026-10-19 BUG-026 误报的成因）。
 */
export function rowsFromTeamView(view: TeamViewLike): PresenceRow[] {
  return (view.members ?? []).map(member => ({
    id: member.id,
    name: member.name,
    displayName: displayNameFor(member.name, member.role),
    role: member.role,
    status: presenceStatusFromPhase(member.phase),
    statusLabel: statusLabelFor(presenceStatusFromPhase(member.phase)),
    currentTask: (view.tasks ?? [])
      .filter(task => task.status === 'in_progress' && task.ownerName === member.name)
      .map(task => task.subject)
      .join('；') || null,
  }))
}

/**
 * live 动态流：两次 `TeamView` 快照的差分 → 新动态（D-b 拉式轮询的伴生纯函数）。
 * 首次同步（prev 为 undefined）不产动态——板本身就是状态，动态只记**变化**。
 * 消息级动态（谁给谁发了什么）需要 host 侧事件读，v1 无通道（R5b 机制核实：Typert
 * 客户端 stub 生成是 vendor 构建管线的一部分，本 pack 无 codegen 接线）——留升级路径。
 */
export function diffActivity(prev: TeamViewLike | undefined, next: TeamViewLike, now: number): ActivityEntry[] {
  if (prev === undefined) return []
  const entries: ActivityEntry[] = []
  const prevMembers = new Map(prev.members.map(member => [member.id, member]))
  const prevTasks = new Map(prev.tasks.map(task => [task.id, task]))

  for (const member of next.members) {
    const before = prevMembers.get(member.id)
    const display = displayNameFor(member.name, member.role)
    if (before === undefined) {
      entries.push({ time: now, kind: 'member', text: `${display} 上线`, token: { key: 'presence.activity.memberOnline', params: { name: display } } })
    } else if (before.phase !== member.phase) {
      if (member.phase === 'failed') {
        entries.push({ time: now, kind: 'member', text: `${display} 故障`, token: memberToken(display, 'failed') })
      } else {
        entries.push({ time: now, kind: 'member', text: `${display} 转${statusLabelFor(presenceStatusFromPhase(member.phase))}`, token: memberToken(display, presenceStatusFromPhase(member.phase)) })
      }
    }
  }
  for (const task of next.tasks) {
    const before = prevTasks.get(task.id)
    if (before === undefined) {
      if (task.status !== 'deleted') {
        entries.push({ time: now, kind: 'task', text: `新任务 ${task.id}：${clip(task.subject, 32)}`, token: { key: 'presence.activity.taskNew', params: { id: task.id, subject: clip(task.subject, 32) } } })
      }
      continue
    }
    if (before.status === task.status) continue
    const owner = task.ownerName === undefined ? '未分配' : displayNameFor(task.ownerName, 'teammate')
    // 状态机有 4 个值：显式分派，别让「pending/未知」落进删除兜底（BUG-098）。
    if (task.status === 'in_progress') {
      entries.push({ time: now, kind: 'task', text: `${owner} 认领 ${task.id}`, token: { key: 'presence.activity.taskClaimed', params: { owner, id: task.id } } })
    } else if (task.status === 'completed') {
      entries.push({ time: now, kind: 'task', text: `${owner} 完成 ${task.id}`, token: { key: 'presence.activity.taskCompleted', params: { owner, id: task.id } } })
    } else if (task.status === 'pending') {
      entries.push({ time: now, kind: 'task', text: `${task.id} 退回待办`, token: { key: 'presence.activity.taskReopened', params: { id: task.id } } })
    } else if (task.status === 'deleted') {
      entries.push({ time: now, kind: 'task', text: `${task.id} 已删除`, token: { key: 'presence.activity.taskDeleted', params: { id: task.id } } })
    } else {
      entries.push({ time: now, kind: 'task', text: `${task.id} 状态未知（${String(task.status)}）`, token: { key: 'presence.activity.taskUnknown', params: { id: task.id, status: String(task.status) } } })
    }
  }
  return entries
}

/**
 * 回放 / 离线路径：折 lead 会话日志的 `team/*` 事件 → 完整板（验收判据 4 的读模型）。
 * 纯事件（无进程、无 sessionQuery）下成员显示「未上线」而不是行消失（D-b：durable 态重建）。
 * @param events - 团队事件（时间序）。
 * @param nameById - 可选的 id → 成员名补充表（**live 流必需**：`session/follow` 的快照只带
 *   最新一页，成员 provisioning 事件可能在页外，目标 id 会解析不出名字——用 `agentTeam` 投影
 *   的权威名册补上）。
 * @returns 板（teamId / 行 / 动态）。
 */
export function presenceFromEvents(
  events: readonly TeamEventLike[],
  nameById?: ReadonlyMap<string, string>,
): PresenceBoardModel {
  const members = new Map<string, { name: string; phase: string; error?: string | undefined }>()
  const tasks = new Map<string, { subject: string; status: string; ownerId?: string | undefined }>()
  const activity: ActivityEntry[] = []
  let teamId: string | null = null

  /** 会话 id → 显示名（成员按名册，lead/teamId → CEO；名册外的 id 查 `nameById` 补充表，再不行原样）。 */
  const displayOf = (id: string, fallbackName?: string): string => {
    if (teamId !== null && id === teamId) return PRESET_DISPLAY_NAMES.ceo
    const name = members.get(id)?.name ?? fallbackName ?? nameById?.get(id) ?? id
    return displayNameFor(name, 'teammate')
  }

  for (const event of events) {
    if (isMemberEvent(event)) {
      const { member } = event.data
      teamId ??= event.data.teamId
      const display = displayNameFor(member.name, 'teammate')
      if (member.phase === 'provisioning') {
        activity.push({ time: event.time, kind: 'member', text: `${display} 启动中`, token: memberToken(display, 'provisioning') })
      } else if (member.phase === 'active') {
        activity.push({ time: event.time, kind: 'member', text: `${display} 上线`, token: { key: 'presence.activity.memberOnline', params: { name: display } } })
      } else {
        activity.push({
          time: event.time,
          kind: 'member',
          text: `${display} 故障${member.error === undefined ? '' : `：${clip(member.error, 60)}`}`,
          token: member.error === undefined ? memberToken(display, 'failed') : { key: 'presence.activity.memberFailedDetail', params: { name: display, error: clip(member.error, 60) } },
        })
      }
      members.set(member.id, { name: member.name, phase: member.phase, error: member.error })
    } else if (isTaskEvent(event)) {
      const { task } = event.data
      teamId ??= event.data.teamId
      const previous = tasks.get(task.id)
      const status = task.status as string
      if (previous === undefined) {
        // 初次出现就是 deleted 不报「新任务」；与 live 差分同口径。
        if (status !== 'deleted') {
          activity.push({ time: event.time, kind: 'task', text: `新任务 ${task.id}：${clip(task.subject, 32)}`, token: { key: 'presence.activity.taskNew', params: { id: task.id, subject: clip(task.subject, 32) } } })
        }
      } else if (previous.status !== task.status) {
        const owner = task.ownerId === undefined ? '未分配' : displayOf(task.ownerId)
        if (status === 'in_progress') {
          activity.push({ time: event.time, kind: 'task', text: `${owner} 认领 ${task.id}`, token: { key: 'presence.activity.taskClaimed', params: { owner, id: task.id } } })
        } else if (status === 'completed') {
          activity.push({ time: event.time, kind: 'task', text: `${owner} 完成 ${task.id}`, token: { key: 'presence.activity.taskCompleted', params: { owner, id: task.id } } })
        } else if (status === 'pending') {
          activity.push({ time: event.time, kind: 'task', text: `${task.id} 退回待办`, token: { key: 'presence.activity.taskReopened', params: { id: task.id } } })
        } else if (status === 'deleted') {
          activity.push({ time: event.time, kind: 'task', text: `${task.id} 已删除`, token: { key: 'presence.activity.taskDeleted', params: { id: task.id } } })
        } else {
          activity.push({ time: event.time, kind: 'task', text: `${task.id} 状态未知（${status}）`, token: { key: 'presence.activity.taskUnknown', params: { id: task.id, status } } })
        }
      }
      tasks.set(task.id, { subject: task.subject, status: task.status, ownerId: task.ownerId })
    } else if (isMessageEvent(event)) {
      const { message } = event.data
      teamId ??= event.data.teamId
      const preview = clip(firstText(message.content), 60)
      activity.push({
        time: event.time,
        kind: 'message',
        text: `${displayOf(message.senderId, message.senderName)} → ${displayOf(message.targetId)}：${preview === '' ? '（空）' : preview}`,
      })
    }
    // 其他事件类型（team/message/delivered 等）忽略——投递回执不进动态流。
  }

  const rows: PresenceRow[] = []
  if (teamId !== null) {
    rows.push({
      id: teamId,
      name: 'lead',
      displayName: PRESET_DISPLAY_NAMES.ceo,
      role: 'lead',
      status: 'inactive',
      statusLabel: STATUS_LABEL.inactive,
      currentTask: null,
    })
  }
  for (const [id, member] of members) {
    const status: PresenceStatus
      = member.phase === 'provisioning' ? 'provisioning'
        : member.phase === 'failed' ? 'failed'
          : 'inactive'
    rows.push({
      id,
      name: member.name,
      displayName: displayNameFor(member.name, 'teammate'),
      role: 'teammate',
      status,
      statusLabel: STATUS_LABEL[status],
      currentTask: [...tasks.values()]
        .filter(task => task.status === 'in_progress' && task.ownerId === id)
        .map(task => task.subject)
        .join('；') || null,
    })
  }

  return { teamId, rows, activity }
}

/**
 * 折一串团队事件 → 动态流（**零重复**：就是 `presenceFromEvents` 的动态切片）。
 * 公司视图的 live 路径把快照历史 + 逐条实时事件攒进同一个数组后调用它——
 * 事件量在我们的规模（一场动议几百条）下重算成本可忽略，换来"只有一套折算语义"。
 * @param events - 团队事件（按时间序）。
 * @param nameById - 可选的 id → 成员名补充表（live 流用权威名册补快照页外的成员）。
 * @returns 动态（时间序）。
 */
export function activityFromEvents(
  events: readonly TeamEventLike[],
  nameById?: ReadonlyMap<string, string>,
): readonly ActivityEntry[] {
  return presenceFromEvents(events, nameById).activity
}

/** 公司视图消费的团队事件流帧：快照（历史）/ 单条（实时）。 */
export type TeamStreamFrame =
  | { readonly kind: 'history'; readonly events: readonly TeamEventLike[] }
  | { readonly kind: 'event'; readonly event: TeamEventLike }

/**
 * 权威名册 → id → 成员名表（喂 `presenceFromEvents` 的 `nameById`）。
 * 用途：`session/follow` 的快照只带最新一页，成员 provisioning 事件可能在页外，
 * 动态里的目标 id 会解析不出名字——用 `agentTeam` 投影的名册补上。
 * @param view - 官方 `TeamView` 的读取子集。
 * @returns id → 成员名。
 */
export function memberNames(view: TeamViewLike): ReadonlyMap<string, string> {
  return new Map((view.members ?? []).map(member => [member.id, member.name]))
}

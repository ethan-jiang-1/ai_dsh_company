/** 组织在场板读模型（R5b）：纯函数，host 折事件 / client 渲染快照共用（Q5–Q8 定案，见提案 §四个定案）。 */

/**
 * D-c：状态文案。`status` 是 agent driver 的**团队内**忙闲，不等于"这个人此刻在工作"——
 * 值一律走中文映射，未知值落「未知」，不直显英文裸值。
 */
export type PresenceStatus = 'running' | 'idle' | 'inactive' | 'provisioning' | 'failed' | 'unknown'

export const STATUS_LABEL: Record<PresenceStatus, string> = {
  running: '执行中',
  idle: '待命',
  inactive: '未上线',
  provisioning: '启动中',
  failed: '故障',
  unknown: '未知',
}

/** 状态 → 文案（未知值不抛）。 */
export function statusLabelFor(status: string): string {
  return STATUS_LABEL[status as PresenceStatus] ?? STATUS_LABEL.unknown
}

/** 五个 preset id（有限键，索引安全；与 `presets/<role>/preset.yml` 一一对应）。 */
const PRESET_KEYS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'] as const

type PresetRoleId = typeof PRESET_KEYS[number]

function isPresetRole(name: string): name is PresetRoleId {
  return (PRESET_KEYS as readonly string[]).includes(name)
}

/**
 * D-a：显示名映射。member.name 命中 preset id → 系列化显示名；`role === 'lead'` → CEO
 * （本组织 lead 恒为 CEO）；未命中原样显示（任意组队名不崩）。与各 `presets/<role>/preset.yml`
 * 的 `name` 同源——`tests/presence-board.spec.ts` 有防漂移断言。
 */
export const PRESET_DISPLAY_NAMES: Record<PresetRoleId, string> = {
  ceo: 'wochen CEO',
  'vp-eng': 'wochen VP-Eng',
  'vp-sales': 'wochen VP-Sales',
  coo: 'wochen COO',
  cfo: 'wochen CFO',
}

/** 成员名 → 显示名（lead 行特殊：name 恒为 'lead'，按角色映射）。 */
export function displayNameFor(name: string, role: 'lead' | 'teammate'): string {
  if (role === 'lead') return PRESET_DISPLAY_NAMES.ceo
  return isPresetRole(name) ? PRESET_DISPLAY_NAMES[name] : name
}

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

/** 协作动态流一条（成员生命周期 / 任务迁移 / 消息投递）。 */
export interface ActivityEntry {
  readonly time: number
  readonly kind: 'member' | 'task' | 'message'
  readonly text: string
}

/** 事件折算的完整板（回放 / 离线路径的输出）。 */
export interface PresenceBoardModel {
  readonly teamId: string | null
  readonly rows: readonly PresenceRow[]
  readonly activity: readonly ActivityEntry[]
}

// ---- wire 事实的宽松结构类型（只声明读到的字段；多出的字段忽略，少掉的按缺省处理） ----

/** `remote.agentTeams.view` 返回的 `TeamView` 子集（client live 路径的输入）。 */
export interface TeamViewLike {
  readonly members: readonly {
    id: string
    name: string
    role: 'lead' | 'teammate'
    status: string
  }[]
  readonly tasks: readonly {
    id: string
    subject: string
    status: string
    ownerName?: string
    /** 以下四项供看板 / DAG 读模型用（`TeamTaskView` 有，事件路径的 `TeamTaskSnapshot` 无 `ready`）。 */
    revision?: number
    blockedBy?: readonly string[]
    ready?: boolean
  }[]
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

/** 截断长文本（动态流一行别被任务全文撑爆）。 */
function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

/** 消息首段文本；取不到给空串（由调用方落「（空）」）。 */
function firstText(content: readonly { type: string; text?: string }[]): string {
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
      return block.text.trim().split('\n')[0]!
    }
  }
  return ''
}

/**
 * live 路径：`TeamView` 快照 → 在场板行（D-a/D-c）。当前任务按 **ownerName** 关联——
 * `TeamTaskView` 不带 ownerId，只有 ownerName（vendor types.ts:85-97）。
 */
export function rowsFromTeamView(view: TeamViewLike): PresenceRow[] {
  return view.members.map(member => ({
    id: member.id,
    name: member.name,
    displayName: displayNameFor(member.name, member.role),
    role: member.role,
    status: ((): PresenceStatus => {
      const known: PresenceStatus[] = ['running', 'idle', 'inactive', 'provisioning', 'failed']
      return known.includes(member.status as PresenceStatus) ? member.status as PresenceStatus : 'unknown'
    })(),
    statusLabel: statusLabelFor(member.status),
    currentTask: view.tasks
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
      entries.push({ time: now, kind: 'member', text: `${display} 上线` })
    } else if (before.status !== member.status) {
      if (member.status === 'failed') {
        entries.push({ time: now, kind: 'member', text: `${display} 故障` })
      } else {
        entries.push({ time: now, kind: 'member', text: `${display} 转${statusLabelFor(member.status)}` })
      }
    }
  }
  for (const task of next.tasks) {
    const before = prevTasks.get(task.id)
    if (before === undefined) {
      if (task.status !== 'deleted') {
        entries.push({ time: now, kind: 'task', text: `新任务 ${task.id}：${clip(task.subject, 32)}` })
      }
      continue
    }
    if (before.status === task.status) continue
    const owner = task.ownerName === undefined ? '未分配' : displayNameFor(task.ownerName, 'teammate')
    if (task.status === 'in_progress') {
      entries.push({ time: now, kind: 'task', text: `${owner} 认领 ${task.id}` })
    } else if (task.status === 'completed') {
      entries.push({ time: now, kind: 'task', text: `${owner} 完成 ${task.id}` })
    } else {
      entries.push({ time: now, kind: 'task', text: `${task.id} 已删除` })
    }
  }
  return entries
}

/**
 * 回放 / 离线路径：折 lead 会话日志的 `team/*` 事件 → 完整板（验收判据 4 的读模型）。
 * 纯事件（无进程、无 sessionQuery）下成员显示「未上线」而不是行消失（D-b：durable 态重建）。
 */
export function presenceFromEvents(events: readonly TeamEventLike[]): PresenceBoardModel {
  const members = new Map<string, { name: string; phase: string; error?: string | undefined }>()
  const tasks = new Map<string, { subject: string; status: string; ownerId?: string | undefined }>()
  const activity: ActivityEntry[] = []
  let teamId: string | null = null

  /** 会话 id → 显示名（成员按名册，lead/teamId → CEO；未知 id 原样）。 */
  const displayOf = (id: string, fallbackName?: string): string => {
    if (teamId !== null && id === teamId) return PRESET_DISPLAY_NAMES.ceo
    const name = members.get(id)?.name ?? fallbackName ?? id
    return displayNameFor(name, 'teammate')
  }

  for (const event of events) {
    if (isMemberEvent(event)) {
      const { member } = event.data
      teamId ??= event.data.teamId
      const display = displayNameFor(member.name, 'teammate')
      if (member.phase === 'provisioning') {
        activity.push({ time: event.time, kind: 'member', text: `${display} 启动中` })
      } else if (member.phase === 'active') {
        activity.push({ time: event.time, kind: 'member', text: `${display} 上线` })
      } else {
        activity.push({
          time: event.time,
          kind: 'member',
          text: `${display} 故障${member.error === undefined ? '' : `：${clip(member.error, 60)}`}`,
        })
      }
      members.set(member.id, { name: member.name, phase: member.phase, error: member.error })
    } else if (isTaskEvent(event)) {
      const { task } = event.data
      teamId ??= event.data.teamId
      const previous = tasks.get(task.id)
      if (previous === undefined) {
        activity.push({ time: event.time, kind: 'task', text: `新任务 ${task.id}：${clip(task.subject, 32)}` })
      } else if (previous.status !== task.status) {
        const owner = task.ownerId === undefined ? '未分配' : displayOf(task.ownerId)
        if (task.status === 'in_progress') {
          activity.push({ time: event.time, kind: 'task', text: `${owner} 认领 ${task.id}` })
        } else if (task.status === 'completed') {
          activity.push({ time: event.time, kind: 'task', text: `${owner} 完成 ${task.id}` })
        } else {
          activity.push({ time: event.time, kind: 'task', text: `${task.id} 已删除` })
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

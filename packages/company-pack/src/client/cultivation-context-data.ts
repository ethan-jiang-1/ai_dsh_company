/**
 * 培养背景的客户端数据面（2026-10-23 背景卡 D1=A / D2=A）。
 *
 * 三件事：
 * ① 会话候选：从客户端 `sessions.list` 快照投影（同 cwd、非空白；根会话用 agentPreset，
 *    子会话用 parent 的 `agentTeam.members[].name` 做**展示标签**，不 follow Lead、不激活）；
 * ② 成品候选：复用成品页签的 `parseCatalog`，不写第二份解析器；
 * ③ 预览读：`follow` 只取第一帧 + `return`（不拉第二帧 = 不触发 cold promote），
 *    轮次提取与 host 共用 `pickSessionTurn`。
 *
 * host 仍是记录证据的唯一来源：本模块只做预览，命令只带 ref。
 */
import { CULTIVATION_ROLES, roleLabel } from '../lib/cultivation.ts'
import {
  pickSessionTurn,
  type CultivationContextRef,
  type SessionEventLike,
  type SessionTurnPick,
  type SubagentMode,
} from '../lib/cultivation-context.ts'
import { parseCatalog } from './DeliverablesTab.tsx'

/** 客户端 sessions store 的行（`SessionListState.byId` 的读子集）。 */
export interface ContextSessionRowLike {
  readonly sessionId: string
  readonly title?: string
  readonly displayTitle: string
  readonly cwd?: string
  readonly parentId?: string
  readonly origin?: 'subagent'
  readonly running: boolean
  readonly blank: boolean
  readonly updatedAt: number
  readonly projectionValues?: Readonly<Record<string, unknown>>
}

export interface ContextSessionRow {
  readonly sessionId: string
  readonly title: string
  /** 展示标签：preset 角色 id 或成员名；无证据 = undefined（不出徽标）。 */
  readonly role?: string
  /** true = teammate 成员（标签按“成员 …（CEO 团队）”呈现）。 */
  readonly member: boolean
  readonly at: number
  readonly current: boolean
  readonly ref: CultivationContextRef
}

export interface ContextDeliverableRow {
  readonly slug: string
  readonly result: string
  readonly kickoff: string
  readonly path: string
  readonly summary: string
}

export type ContextSourceResult<T> =
  | { readonly ok: true; readonly value: readonly T[] }
  | { readonly ok: false; readonly problem: string }

export interface SessionPreviewResult {
  readonly ok: boolean
  readonly problem?: string
  readonly timeout?: boolean
  readonly turn?: SessionTurnPick
}

/** `follow` 流的最小结构面（客户端 `remote.session.follow`）。 */
export interface FollowLikeFrame {
  readonly type: string
  readonly records?: readonly { readonly event?: SessionEventLike }[]
}
export type FollowLike = (
  request: {
    readonly address: unknown
    readonly maxMessages: number
    readonly turnWindow: { readonly minMessages: number, readonly minTurns: number }
    readonly assistantStream?: boolean
  },
  signal: AbortSignal,
) => AsyncIterable<FollowLikeFrame>

export interface CultivationContextSources {
  readonly listSessions: (currentSessionId: string, targetRole?: string) => ContextSourceResult<ContextSessionRow>
  readonly listDeliverables: (sessionId: string, signal: AbortSignal) => Promise<ContextSourceResult<ContextDeliverableRow>>
  readonly readPreview: (row: ContextSessionRow, signal: AbortSignal) => Promise<SessionPreviewResult>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isMode = (value: unknown): value is SubagentMode =>
  value === 'one-shot' || value === 'continuable' || value === 'unknown'

function memberOf(row: ContextSessionRowLike, byId: ReadonlyMap<string, ContextSessionRowLike>): { role?: string, mode: SubagentMode } {
  if (row.parentId === undefined) return { mode: 'unknown' }
  const parent = byId.get(row.parentId)
  const team = parent?.projectionValues?.agentTeam
  const members = isRecord(team) && Array.isArray(team.members) ? team.members : []
  const member = members.find(value => isRecord(value) && value.id === row.sessionId)
  const role = isRecord(member) && typeof member.name === 'string' && member.name !== '' ? member.name : undefined
  const catalog = parent?.projectionValues?.subagentCatalog
  const entry = Array.isArray(catalog) ? catalog.find(value => isRecord(value) && value.id === row.sessionId) : undefined
  const mode = isRecord(entry) && isMode(entry.mode) ? entry.mode : 'unknown'
  return role === undefined ? { mode } : { role, mode }
}

/** 客户端 `SessionSummary` 的读子集（`sessions.list` 的 `byId` 值；字段名与 SessionSummary 对齐）。 */
export interface ClientSessionSummaryLike {
  readonly id: string
  readonly title?: string
  readonly displayTitle: string
  readonly cwd?: string
  readonly parentId?: string
  readonly origin?: 'subagent'
  readonly running: boolean
  readonly blank: boolean
  readonly updatedAt: number
  readonly projectionValues?: unknown
}

/** `sessions.list` 的 `byId` → 候选行（映射只此一处，两个壳共用）。 */
export function contextRowsFromStore(
  byId: Readonly<Record<string, ClientSessionSummaryLike>>,
): readonly ContextSessionRowLike[] {
  return Object.values(byId).map(row => ({
    sessionId: row.id,
    ...(row.title === undefined ? {} : { title: row.title }),
    displayTitle: row.displayTitle,
    ...(row.cwd === undefined ? {} : { cwd: row.cwd }),
    ...(row.parentId === undefined ? {} : { parentId: row.parentId }),
    ...(row.origin === undefined ? {} : { origin: row.origin }),
    running: row.running,
    blank: row.blank,
    updatedAt: row.updatedAt,
    ...(row.projectionValues === undefined
      ? {}
      : { projectionValues: row.projectionValues as Readonly<Record<string, unknown>> }),
  }))
}

/**
 * 会话候选投影（纯函数；不读正文）。
 * @param rows - 客户端 sessions store 的行。
 * @param currentSessionId - 当前会话（固定第一行、默认带背景）。
 * @param targetRole - 建议的目标角色（匹配的根会话排前；仅排序）。
 * @returns 同 cwd、非空白、最多 8 行。
 */
export function projectContextSessions(
  rows: readonly ContextSessionRowLike[],
  currentSessionId: string,
  targetRole?: string,
): readonly ContextSessionRow[] {
  const byId = new Map(rows.map(row => [row.sessionId, row]))
  const current = byId.get(currentSessionId)
  const cwd = current?.cwd
  const scope = rows.filter(row => row.blank !== true && (cwd === undefined || row.cwd === undefined || row.cwd === cwd))
  const projected: ContextSessionRow[] = []
  for (const row of scope) {
    const isChild = row.origin === 'subagent' || row.parentId !== undefined
    const info: { role?: string, mode?: SubagentMode } = isChild ? memberOf(row, byId) : {}
    const preset = row.projectionValues?.agentPreset
    const role = isChild
      ? info.role
      : typeof preset === 'string' && (CULTIVATION_ROLES as readonly string[]).includes(preset) ? preset : undefined
    const title = row.displayTitle !== '' ? row.displayTitle : row.title ?? row.sessionId
    const ref: CultivationContextRef = {
      kind: 'session',
      ref: row.sessionId,
      ...(title === '' ? {} : { label: title }),
      ...(role === undefined ? {} : { role }),
      ...(isChild && row.parentId !== undefined
        ? { parentSessionId: row.parentId, mode: (info.mode ?? 'unknown') as SubagentMode }
        : {}),
    }
    projected.push({
      sessionId: row.sessionId,
      title,
      ...(role === undefined ? {} : { role }),
      member: isChild,
      at: row.updatedAt,
      current: row.sessionId === currentSessionId,
      ref,
    })
  }
  projected.sort((left, right) => {
    if (left.current !== right.current) return left.current ? -1 : 1
    const leftMatch = targetRole !== undefined && left.role === targetRole && !left.member
    const rightMatch = targetRole !== undefined && right.role === targetRole && !right.member
    if (leftMatch !== rightMatch) return leftMatch ? -1 : 1
    return right.at - left.at
  })
  return projected.slice(0, 8)
}

/** 成品候选（复用成品页签的 parser；按 kickoff 倒序，最多 8 行）。 */
export function projectContextDeliverables(catalogText: string | null): ContextSourceResult<ContextDeliverableRow> {
  if (catalogText === null) return { ok: false, problem: '读不到成品目录（生成器未跑或索引缺失）——仍可选会话，或直接手写。' }
  const catalog = parseCatalog(catalogText)
  if (catalog === null) return { ok: false, problem: '成品目录形状不符（schema 1 / entries 缺失）。' }
  const rows = catalog.entries
    .map(entry => ({
      slug: entry.slug,
      result: entry.result,
      kickoff: entry.kickoff,
      path: entry.path,
      summary: entry.summary,
    }))
    .sort((left, right) => right.kickoff.localeCompare(left.kickoff))
    .slice(0, 8)
  return { ok: true, value: rows }
}

/**
 * 预览读：`follow` 只取快照第一帧，然后 `return`（break）；不拉第二帧。
 * @param follow - 客户端 raw session follow。
 * @param ref - 背景引用（根/子会话地址）。
 * @param signal - 调用方取消。
 * @param timeoutMs - 首帧截止（默认 8s；RFC 的 5–10s 档）。
 */
export async function readSessionPreview(
  follow: FollowLike,
  ref: Pick<CultivationContextRef, 'ref' | 'parentSessionId' | 'mode' | 'turn'>,
  signal: AbortSignal,
  timeoutMs = 8_000,
): Promise<SessionPreviewResult> {
  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = AbortSignal.any([signal, timeout])
  const address = ref.parentSessionId === undefined
    ? { kind: 'session', sessionId: ref.ref }
    : { kind: 'subagent', parentSessionId: ref.parentSessionId, childSessionId: ref.ref, mode: ref.mode ?? 'unknown' }
  try {
    for await (const frame of follow({
      address,
      maxMessages: 40,
      turnWindow: { minMessages: 8, minTurns: 3 },
      // 不传 assistantStream（schema 只接受 true/缺席；false 会被 wire boundary 拒）。
    }, combined)) {
      if (frame.type !== 'snapshot') continue
      const events = (frame.records ?? [])
        .map(record => record.event)
        .filter((event): event is SessionEventLike => event !== undefined)
      const turn = pickSessionTurn(events, ref.turn)
      return turn === null
        ? { ok: false, problem: '这段会话没有可用的文字背景（可能只有工具调用）；换一段，或不带背景提交。' }
        : { ok: true, turn }
    }
    return { ok: false, problem: '这段会话没有可用的文字背景。' }
  } catch (error) {
    if (!signal.aborted && timeout.aborted) {
      return { ok: false, problem: '这段背景读得太慢——已停止。可以不带走背景继续，或重试。', timeout: true }
    }
    return { ok: false, problem: `这段背景读不到：${error instanceof Error ? error.message : String(error)}。可以换一段，或不带背景提交。` }
  }
}

/**
 * 造背景源（两个壳共用一份语义）。
 * @param getSessions - 客户端 sessions store 的当前快照行。
 * @param follow - raw session follow（不是公司 adapter 的 Lead 归并 follow）。
 * @param readCatalog - 成品索引读取闭包（失败 null）。
 * @param timeoutMs - 预览首帧截止（测试可缩短）。
 */
export function makeCultivationContextSources(options: {
  readonly getSessions: () => readonly ContextSessionRowLike[]
  readonly follow: FollowLike
  readonly readCatalog: (sessionId: string, signal: AbortSignal) => Promise<string | null>
  readonly timeoutMs?: number
}): CultivationContextSources {
  return {
    listSessions: (currentSessionId, targetRole) =>
      ({ ok: true, value: projectContextSessions(options.getSessions(), currentSessionId, targetRole) }),
    listDeliverables: async (sessionId, signal) => {
      try {
        return projectContextDeliverables(await options.readCatalog(sessionId, signal))
      } catch (error) {
        return { ok: false, problem: `读不到成品目录：${error instanceof Error ? error.message : String(error)}。` }
      }
    },
    readPreview: async (row, signal) => readSessionPreview(options.follow, row.ref, signal, options.timeoutMs),
  }
}

/** 会话行的展示名（根 = 角色名；成员 = “成员 <name>（CEO 团队）”）。 */
export function contextSessionLabel(row: ContextSessionRow): string {
  if (row.role === undefined) return row.title
  return row.member ? `成员 ${row.role}（CEO 团队）` : roleLabel(row.role)
}

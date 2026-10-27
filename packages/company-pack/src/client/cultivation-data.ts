/**
 * 培养数据面（2026-10-13 培养卡）：`workspaceFiles` 闭包工厂 + 三个容器（公司页第四子页、
 * 侧栏页签、浮窗——同一领域视图不同壳）共用的加载 hook。
 *
 * 数据面 = `remote.workspaceFiles`（list/read 经会话身份读工作区；子代理会话归到 Lead）。
 * **不可达 ≠ 0**（V2）：单角色 journal 目录缺失/读取失败 → null → 行呈「不可达」；记录目录
 * 不可达 → records 保持 null → 面板呈「尚未读到」，都不折成 0 或空。
 * keyless 判据 = `tests/client/cultivation-board.spec.ts`（纯渲染）+ `tests/company/cultivation.spec.ts`
 * （读模型）。
 */
import { useCallback, useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { CULTIVATION_CHANGED_EVENT } from './cultivation-actions.ts'
import {
  CULTIVATION_ROLES,
  feedbackItems,
  inboxRows,
  parseRecord,
  type CultivationRecord,
  type CultivationRow,
  type FeedbackItem,
} from '../lib/cultivation.ts'

/** `workspaceFiles` remote 的最小结构面（本地声明——照 RoleBadge 惯例不为此引包）。 */
export interface WorkspaceFilesFace {
  list(sessionId: SessionId, path: string, signal: AbortSignal): Promise<
    | { readonly ok: true, readonly value: { readonly entries: readonly { readonly type: string, readonly name: string }[] } }
    | { readonly ok: false }
  >
  read(sessionId: SessionId, path: string, options: { readonly limit: number }, signal: AbortSignal): Promise<
    | { readonly ok: true, readonly value: { readonly text: string } }
    | { readonly ok: false }
  >
}

/** 远端命名空间的最小面（注册处注入 `scoped.remote`，本文件只取 workspaceFiles一格）。 */
export interface RemoteNamespaceFace {
  readonly workspaceFiles: WorkspaceFilesFace
}

/** 培养面板要读的四件：journal 清单/首段 + 记录清单/全文（全部失败给 null，见头注）。 */
export interface CultivationFiles {
  /** 列某角色 journal 目录的 .md 文件名；不可达给 null。 */
  readonly listJournal: (sessionId: SessionId, role: string, signal: AbortSignal) => Promise<readonly string[] | null>
  /** 读工作区文本文件首窗口；失败给 null。 */
  readonly readHead: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
  /** 列培养记录目录（cultivation/records）的 .md 文件名；不可达给 null。 */
  readonly listRecords: (sessionId: SessionId, signal: AbortSignal) => Promise<readonly string[] | null>
  /** 读记录头部（frontmatter + 少量正文）；摘要全扫用，失败给 null。 */
  readonly readRecordHead: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
  /** 读培养记录全文；失败给 null。 */
  readonly readRecord: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
}

/**
 * 「读一个工作区文本、失败即 null」的唯一闭包工厂（2026-10-23 架构评审候选 5）。
 *
 * 此前同一段 try/ok/catch 在三处各写一遍：本文件的 readText、client/index.ts 的 readLedger 与 readCatalog。
 * 读取经 Lead 的工作区身份（子代理会话归到 Lead），任何失败（不可读/异常）都退化成 null，
 * 由调用方决定文案——工厂不替调用方编错误话术。
 * @param remote - 注册处的 remote 命名空间（至少含 workspaceFiles）。
 * @param leadOf - 子会话归 Lead。
 * @returns `(path, limit) => (sessionId, signal) => Promise<string | null>`。
 */
export function makeWorkspaceTextReader(
  remote: RemoteNamespaceFace,
  leadOf: (sessionId: SessionId) => SessionId,
): (path: string, limit: number) => (sessionId: SessionId, signal: AbortSignal) => Promise<string | null> {
  return (path, limit) => async (sessionId, signal) => {
    try {
      const result = await remote.workspaceFiles.read(leadOf(sessionId), path, { limit }, signal)
      if (!result.ok) return null
      return result.value.text
    } catch {
      return null
    }
  }
}

/**
 * 造培养文件闭包（两个注册块——侧栏页签与公司整页——各造一份，同一工厂保证同语义）。
 * @param remote - 注册处的 remote 命名空间（至少含 workspaceFiles）。
 * @param leadOf - 子代理会话归到 Lead（读取经 Lead 的工作区身份）。
 */
export function makeCultivationFiles(remote: RemoteNamespaceFace, leadOf: (sessionId: SessionId) => SessionId): CultivationFiles {
  const listDir = async (sessionId: SessionId, dir: string, signal: AbortSignal): Promise<readonly string[] | null> => {
    try {
      const result = await remote.workspaceFiles.list(leadOf(sessionId), dir, signal)
      if (!result.ok) return null
      return result.value.entries
        .filter(entry => entry.type === 'file' && entry.name.endsWith('.md'))
        .map(entry => entry.name)
    } catch {
      return null
    }
  }
  const readText = makeWorkspaceTextReader(remote, leadOf)
  return {
    listJournal: (sessionId, role, signal) => listDir(sessionId, `kb/${role}/journal`, signal),
    readHead: (sessionId, path, signal) => readText(path, 240)(sessionId, signal),
    listRecords: (sessionId, signal) => listDir(sessionId, 'cultivation/records', signal),
    readRecordHead: (sessionId, path, signal) => readText(path, 60)(sessionId, signal),
    readRecord: (sessionId, path, signal) => readText(path, 2000)(sessionId, signal),
  }
}

/** journal 面板数据：行 + 首段预览（null = 首读未完成；行内 reach 表达单角色不可达）。 */
export interface CultivationPanelData {
  /** 五角色 journal 待审行（首读完成前 null；单角色不可达在行内）。 */
  readonly journalRows: readonly CultivationRow[] | null
  /** 培养记录（null = 目录不可达或首读未完成——不折成 0 条）。 */
  readonly records: readonly CultivationRecord[] | null
  /** 读不动的记录文件名（坏形状/读取失败；不静默丢掉，由面板明确提示）。 */
  readonly brokenRecords: readonly string[]
  /** 只读了摘要、未读全文的记录数（旧记录；用 archive 控制规模）。 */
  readonly unexpandedRecords: number
  /** 立即重读（动作/创作成功后台账已变，不等 30s 轮询）。 */
  readonly refresh: () => void
}

/** 刷新间隔（journal/记录都不高频变化；30s 足够）——**导出**：页签头文案要照它说真话（别再写死"5 秒"）。 */
export const CULTIVATION_REFRESH_MS = 30_000

/** 预览条数（与读模型 PREVIEW_LIMIT 同口径：只读每角色前 3 篇的首段）。 */
const HEAD_LIMIT = 3

/** 非 open 记录默认只给最近这么多条读全文；更早的只留摘要，避免面板全量读。 */
export const FULL_RECORD_LIMIT = 120

/**
 * 加载培养面板数据（journal 行 + 记录）。`enabled=false` 时不发任何请求（公司页只在
 * 培养子页激活时才读盘）。
 */
export function useCultivationPanelData(
  files: CultivationFiles,
  sessionId: SessionId,
  options: { readonly enabled?: boolean } = {},
): CultivationPanelData {
  const enabled = options.enabled ?? true
  const [journalRows, setJournalRows] = useState<readonly CultivationRow[] | null>(null)
  const [records, setRecords] = useState<readonly CultivationRecord[] | null>(null)
  const [brokenRecords, setBrokenRecords] = useState<readonly string[]>([])
  const [unexpandedRecords, setUnexpandedRecords] = useState(0)
  // 动作后立即重读的抓手（2026-10-17 GUI 行动面 S2）：bump 一次 = 重跑下面的读盘 effect。
  const [nonce, setNonce] = useState(0)
  const refresh = useCallback(() => { setNonce(value => value + 1) }, [])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      // journal 面：单角色失败 → null（行呈「不可达」）；整体异常保持上次态。
      const listings: Record<string, readonly string[] | null> = {}
      const heads: Record<string, string> = {}
      for (const role of CULTIVATION_ROLES) {
        const names = await files.listJournal(sessionId, role, controller.signal)
        listings[role] = names
        if (names !== null) {
          for (const name of names.slice(0, HEAD_LIMIT)) {
            const text = await files.readHead(sessionId, `kb/${role}/journal/${name}`, controller.signal)
            if (text !== null) heads[`${role}/${name}`] = text
          }
        }
      }
      // 记录面：清单不可达 → null；可读则逐条读全文（记录小，2000 字窗足够）。
      let nextRecords: readonly CultivationRecord[] | null = null
      const broken: string[] = []
      let unexpanded = 0
      const recordNames = await files.listRecords(sessionId, controller.signal)
      if (recordNames !== null) {
        const summaries: CultivationRecord[] = []
        for (const name of [...recordNames].sort().reverse()) {
          const id = name.replace(/\.md$/, '')
          const head = await files.readRecordHead(sessionId, `cultivation/records/${name}`, controller.signal)
          const summary = head === null ? null : parseRecord(id, head)
          if (summary === null) { broken.push(name); continue }
          summaries.push(summary)
        }
        // open 全部读全文（不能藏旧待办）；非 open 只给最近 FULL_RECORD_LIMIT 条。
        const full = new Set<string>(summaries.filter(record => record.status === 'open').map(record => record.id))
        let nonOpen = 0
        for (const record of summaries) {
          if (record.status === 'open') continue
          if (nonOpen < FULL_RECORD_LIMIT) { full.add(record.id); nonOpen += 1 }
        }
        for (let index = 0; index < summaries.length; index += 1) {
          const summary = summaries[index]!
          if (!full.has(summary.id)) continue
          const text = await files.readRecord(sessionId, `cultivation/records/${summary.id}.md`, controller.signal)
          const record = text === null ? null : parseRecord(summary.id, text)
          if (record !== null) summaries[index] = record
        }
        nextRecords = summaries
        unexpanded = summaries.filter(record => !full.has(record.id)).length
      }
      if (controller.signal.aborted) return
      setJournalRows([...inboxRows(listings, heads)])
      setRecords(nextRecords)
      setBrokenRecords(broken)
      setUnexpandedRecords(unexpanded)
    }
    void load()
    const timer = setInterval(() => { void load() }, CULTIVATION_REFRESH_MS)
    // 注意力回来就刷新（2026-10-18 走查抓到：只靠 30s 轮询时，外部刚提的记录最长要等 30s 才出现）。
    // 只读、幂等、跟着 effect 的 abort 走——不是第二个轮询源，是"人看向面板"这个事件的一次触发。
    const wake = (): void => { if (!controller.signal.aborted) void load() }
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', wake)
    // 兄弟实例的动作广播（同页多实例：侧栏页签 + 公司页 + 浮窗）⇒ 秒级同步，不等轮询
    window.addEventListener(CULTIVATION_CHANGED_EVENT, wake)
    return () => {
      controller.abort()
      clearInterval(timer)
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener(CULTIVATION_CHANGED_EVENT, wake)
    }
  }, [enabled, sessionId, files, nonce])

  return { journalRows, records, brokenRecords, unexpandedRecords, refresh }
}

/** 事件流闭包的形状（`session/follow`：快照给历史、其后实时；侧栏与公司页共用）。 */
export type CultivationFollowEvents = (
  sessionId: SessionId,
  signal: AbortSignal,
) => AsyncIterable<{ readonly kind: 'history'; readonly events: readonly unknown[] } | { readonly kind: 'event'; readonly event: unknown }>

/**
 * 本会话赞/踩（feedback 读模型半边）：历史快照折当前态、实时追加重折；注入缺席或首连
 * 失败给 null（块内降级文案，不影响 journal/记录面）。
 */
export function useCultivationFeedback(
  followEvents: CultivationFollowEvents | undefined,
  sessionId: SessionId,
  enabled = true,
): readonly FeedbackItem[] | null {
  const [feedback, setFeedback] = useState<readonly FeedbackItem[] | null>(null)
  useEffect(() => {
    if (!enabled || followEvents === undefined) return
    const controller = new AbortController()
    const consume = async (): Promise<void> => {
      const events: unknown[] = []
      try {
        for await (const frame of followEvents(sessionId, controller.signal)) {
          if (frame.kind === 'history') events.push(...frame.events)
          else events.push(frame.event)
          if (controller.signal.aborted) return
          setFeedback([...feedbackItems(events)])
        }
      } catch {
        // 流断开：已收到过帧则保持最后已知态；一帧未收（首连失败）保持 null——块内降级。
      }
    }
    void consume()
    return () => { controller.abort() }
  }, [enabled, sessionId, followEvents])
  return feedback
}

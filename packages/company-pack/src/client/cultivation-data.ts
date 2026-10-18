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
  /** 读培养记录全文；失败给 null。 */
  readonly readRecord: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
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
  const readText = async (sessionId: SessionId, path: string, limit: number, signal: AbortSignal): Promise<string | null> => {
    try {
      const result = await remote.workspaceFiles.read(leadOf(sessionId), path, { limit }, signal)
      if (!result.ok) return null
      return result.value.text
    } catch {
      return null
    }
  }
  return {
    listJournal: (sessionId, role, signal) => listDir(sessionId, `kb/${role}/journal`, signal),
    readHead: (sessionId, path, signal) => readText(sessionId, path, 240, signal),
    listRecords: (sessionId, signal) => listDir(sessionId, 'cultivation/records', signal),
    readRecord: (sessionId, path, signal) => readText(sessionId, path, 2000, signal),
  }
}

/** journal 面板数据：行 + 首段预览（null = 首读未完成；行内 reach 表达单角色不可达）。 */
export interface CultivationPanelData {
  /** 五角色 journal 待审行（首读完成前 null；单角色不可达在行内）。 */
  readonly journalRows: readonly CultivationRow[] | null
  /** 培养记录（null = 目录不可达或首读未完成——不折成 0 条）。 */
  readonly records: readonly CultivationRecord[] | null
  /** 立即重读（动作/创作成功后台账已变，不等 30s 轮询）。 */
  readonly refresh: () => void
}

/** 刷新间隔（journal/记录都不高频变化；30s 足够）。 */
const REFRESH_MS = 30_000

/** 预览条数（与读模型 PREVIEW_LIMIT 同口径：只读每角色前 3 篇的首段）。 */
const HEAD_LIMIT = 3

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
      const recordNames = await files.listRecords(sessionId, controller.signal)
      if (recordNames !== null) {
        const parsed: CultivationRecord[] = []
        for (const name of [...recordNames].sort().reverse()) {
          const text = await files.readRecord(sessionId, `cultivation/records/${name}`, controller.signal)
          const record = text === null ? null : parseRecord(name.replace(/\.md$/, ''), text)
          if (record !== null) parsed.push(record)
        }
        nextRecords = parsed
      }
      if (controller.signal.aborted) return
      setJournalRows([...inboxRows(listings, heads)])
      setRecords(nextRecords)
    }
    void load()
    const timer = setInterval(() => { void load() }, REFRESH_MS)
    return () => { controller.abort(); clearInterval(timer) }
  }, [enabled, sessionId, files, nonce])

  return { journalRows, records, refresh }
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

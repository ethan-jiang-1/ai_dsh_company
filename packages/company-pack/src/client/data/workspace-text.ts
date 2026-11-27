// 静态页签的「读一段工作区文本」加载机（2026-10-23 架构评审候选 5）。
//
// 此前 LedgerTab 与 DeliverablesTab 各自手写同一套：AbortController、null → 错误文案、catch → 错误文案，
// 再加各自的刷新方式（30s 轮询 / 手动 tick）。两台机器只在「文案」和「刷新节奏」上不同，其余逐字同义。
// 这里收成一台：状态机三种（loading / unreadable / ready），刷新交给 refreshMs + reload。
import { useCallback, useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceTextRead } from '../cultivation/cultivation-data.ts'

/**
 * 读取闭包：**结果态**（内容 + 是否读到末尾 + 失败原因）。
 * BUG-298 事故：此前失败折成 null、截断当完整，三个消费方各自猜「读完没」，全都猜错。
 */
export type WorkspaceTextLoader = (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>

export type WorkspaceTextState =
  | { readonly status: 'loading' }
  | { readonly status: 'unreadable' }
  /** `truncated = !eof`：面板必须自己决定「说只读了前 N 行」还是「当作完整」，不许默认完整。 */
  | { readonly status: 'ready'; readonly text: string; readonly truncated: boolean }

export interface WorkspaceTextOptions {
  /** 给定则周期重读（毫秒）；缺省 = 只在挂载与 reload 时读。 */
  readonly refreshMs?: number
}

/**
 * 读一段工作区文本并维持状态机。
 * @param load - 读取闭包（失败 null）。
 * @param sessionId - 面板所在会话（闭包内部经 Lead 寻址）。
 * @param options - 可选周期刷新。
 * @returns 当前状态与手动重读入口（调用方自己决定空/错文案）。
 */
export function useWorkspaceText(
  load: WorkspaceTextLoader,
  sessionId: SessionId,
  options: WorkspaceTextOptions = {},
): { readonly state: WorkspaceTextState; readonly reload: () => void } {
  const [state, setState] = useState<WorkspaceTextState>({ status: 'loading' })
  const [syncedSessionId, setSyncedSessionId] = useState<SessionId>(sessionId)
  const [tick, setTick] = useState(0)
  const { refreshMs } = options
  if (syncedSessionId !== sessionId) {
    // BUG-394：会话/工作区切换立刻清回 loading，防止新盘加载窗口内残留展示上一盘正文。
    setSyncedSessionId(sessionId)
    setState({ status: 'loading' })
  }
  useEffect(() => {
    const controller = new AbortController()
    const run = async (): Promise<void> => {
      try {
        const result = await load(sessionId, controller.signal)
        if (controller.signal.aborted) return
        setState(result.ok
          ? { status: 'ready', text: result.text, truncated: !result.eof }
          : { status: 'unreadable' })
      } catch {
        // 读取闭包已把失败折成 null；抛到这里的是闭包之外的意外——按不可读处理，不静默成空白。
        if (!controller.signal.aborted) setState({ status: 'unreadable' })
      }
    }
    void run()
    const timer = refreshMs === undefined ? undefined : setInterval(() => { void run() }, refreshMs)
    return () => { controller.abort(); if (timer !== undefined) clearInterval(timer) }
  }, [load, sessionId, refreshMs, tick])
  const reload = useCallback(() => { setTick(value => value + 1) }, [])
  return { state: syncedSessionId !== sessionId ? { status: 'loading' } : state, reload }
}

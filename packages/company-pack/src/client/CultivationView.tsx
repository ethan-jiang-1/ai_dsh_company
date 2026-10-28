/**
 * 培养主视图（2026-10-28 培养第三 tab）：第三个 `conversation.view`，与 Chat / Trajectory 平级。
 *
 * 左：培养领域板（纠正 / 方法 / journal / 赞踩 / 怎么养），复用 `CultivationBoard`；
 * 右：培养专属面板（自有 composer；当前阶段命令面，独立培养会话下一阶段接入）。
 * 公司总览（看板 / 依赖 / 在场 / 交付）不在这里：通过 `openCompanyOverview` 打开无对话入口。
 *
 * 为什么不是公司子页：只有培养需要“记录 → 判断 → 方法”的专属对话；其他面板不需要。
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { roleLabel } from '../lib/cultivation.ts'
import { CultivationBoard } from './CultivationBoard.tsx'
import { CultivationChatPanel } from './CultivationChatPanel.tsx'
import type { CultivationActionsFactory } from './cultivation-actions.ts'
import type { CultivationContextSources } from './cultivation-context-data.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'
import {
  useCultivationFeedback,
  useCultivationPanelData,
  type CultivationFiles,
  type CultivationFollowEvents,
} from './cultivation-data.ts'
import { readPresetOf, type RoleBadgeInjected } from './RoleBadge.tsx'

/** 培养主视图注入面：与侧栏 CultivationTab 共用同一数据平面/动作面。 */
export interface CultivationViewInjected {
  readonly cultivationFiles: CultivationFiles
  readonly cultivationActions: CultivationActionsFactory
  readonly followEvents?: CultivationFollowEvents | undefined
  readonly sessions: ISessions
  readonly roleSource: RoleBadgeInjected['roleSource']
  readonly contextSources?: ((sessionId: SessionId) => CultivationContextSources) | undefined
  readonly openContext?: ((sessionId: SessionId, context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false, readonly problem: string }>) | undefined
  /** 打开无对话的公司总览（右栏看板/依赖/在场/交付）。 */
  readonly openCompanyOverview: () => void
}

export type CultivationViewProps = PropsRuntime<'conversation.view'>

/** 右栏宽度状态（拖动分界/键盘 Home 复位；按浏览器持久化）。 */
const CHAT_WIDTH_KEY = 'dsh-company-cultivation-chat-width'
const CHAT_MIN = 280
const CHAT_MAX = 720
const BOARD_MIN = 380
const CHAT_DEFAULT = 390

function clampChatWidth(value: number): number {
  return Math.max(CHAT_MIN, Math.min(CHAT_MAX, Math.round(value)))
}

function initialChatWidth(): number {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(CHAT_WIDTH_KEY)
    const parsed = raw === null ? Number.NaN : Number(raw)
    return Number.isFinite(parsed) ? clampChatWidth(parsed) : CHAT_DEFAULT
  } catch {
    return CHAT_DEFAULT
  }
}

/**
 * 造培养主视图。
 * @param injected - 培养数据/动作/背景源 + 公司总览入口。
 * @returns 可注册到 `conversation.view` 的组件。
 */
export function createCultivationView(injected: CultivationViewInjected) {
  return function CultivationView(props: CultivationViewProps) {
    const { sessionId } = props
    const subscribe = useMemo(() => injected.roleSource.subscribe.bind(injected.roleSource), [injected.roleSource])
    const getPreset = useCallback(() => readPresetOf(injected.roleSource, sessionId), [injected.roleSource, sessionId])
    const viewerRole = useSyncExternalStore(subscribe, getPreset, getPreset)
    const { journalRows, records, brokenRecords, unexpandedRecords, refresh } = useCultivationPanelData(injected.cultivationFiles, sessionId)
    const feedback = useCultivationFeedback(injected.followEvents, sessionId)
    const teammate = props.useSessions(state => state.byId[sessionId]?.origin === 'subagent')
    const sessionCwd = props.useSessions(state => state.byId[sessionId]?.cwd)
    const contextSources = useMemo(() => injected.contextSources?.(sessionId), [injected.contextSources, sessionId])
    const openContext = injected.openContext === undefined
      ? undefined
      : (context: CultivationContext) => injected.openContext!(sessionId, context)
    const actions = useMemo(() => injected.cultivationActions(sessionId), [injected.cultivationActions, sessionId])
    const splitRef = useRef<HTMLDivElement | null>(null)
    const [chatWidth, setChatWidth] = useState(initialChatWidth)
    const [dragging, setDragging] = useState(false)

    useEffect(() => {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(CHAT_WIDTH_KEY, String(chatWidth))
      } catch {
        // 私有模式/配额失败：本次会话仍可拖，不阻断。
      }
    }, [chatWidth])

    const beginResize = (event: ReactPointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0) return
      event.preventDefault()
      const split = splitRef.current
      if (split === null) return
      const max = Math.max(CHAT_MIN, Math.min(CHAT_MAX, split.clientWidth - BOARD_MIN))
      const startX = event.clientX
      const startWidth = chatWidth
      const onMove = (move: PointerEvent): void => {
        const next = clampChatWidth(startWidth + startX - move.clientX)
        setChatWidth(Math.min(next, max))
      }
      const onUp = (): void => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        setDragging(false)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      setDragging(true)
    }

    const onResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setChatWidth(value => clampChatWidth(value + 16))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setChatWidth(value => clampChatWidth(value - 16))
      } else if (event.key === 'Home') {
        event.preventDefault()
        setChatWidth(CHAT_DEFAULT)
      }
    }

    // 培养视图自有右栏 composer；隐藏 shell 的全局 composer（per-document，切走即恢复）。
    useEffect(() => {
      if (typeof document === 'undefined') return
      document.documentElement.dataset.dshCultivationView = '1'
      return () => { delete document.documentElement.dataset.dshCultivationView }
    }, [])

    return (
      <div className="wk-cult-view">
        <header className="wk-cult-view-head">
          <div>
            <div className="wk-cult-view-eyebrow">CULTIVATION · 培养</div>
            <div className="wk-cult-view-title">培养 · 方法工作台</div>
            <div className="wk-cult-view-sub">只有培养需要专属对话；左边是纠正/方法/journal，右边只谈培养。</div>
          </div>
          <button type="button" className="wk-cult-overview" onClick={injected.openCompanyOverview}>
            公司总览 ↗
          </button>
        </header>

        <div
          ref={splitRef}
          className={`wk-cult-view-split${dragging ? ' dragging' : ''}`}
          style={{ '--wk-cult-chat-width': `${chatWidth}px` } as CSSProperties}
        >
          <div className="wk-cult-view-board">
            <CultivationBoard
              viewerRole={viewerRole}
              viewerLabel={viewerRole === null ? null : roleLabel(viewerRole)}
              journalRows={journalRows}
              records={records}
              brokenRecords={brokenRecords}
              unexpandedRecords={unexpandedRecords}
              feedback={feedback}
              feedbackReachable={injected.followEvents !== undefined}
              actions={actions}
              onRefresh={refresh}
              contextSources={contextSources}
              currentSessionId={sessionId}
              teammate={teammate}
              openContext={openContext}
            />
          </div>
          <div
            className="wk-cult-resize"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整培养对话宽度"
            aria-valuemin={CHAT_MIN}
            aria-valuemax={CHAT_MAX}
            aria-valuenow={Math.round(chatWidth)}
            tabIndex={0}
            title="拖动调整左右宽度；键盘 ←/→，Home 复位"
            onPointerDown={beginResize}
            onKeyDown={onResizeKeyDown}
            onDoubleClick={() => setChatWidth(CHAT_DEFAULT)}
          />
          <CultivationChatPanel
            sessions={injected.sessions}
            mainSessionId={sessionId}
            cwd={sessionCwd}
            agentPreset={viewerRole}
            attachments={records ?? []}
          />
        </div>
      </div>
    )
  }
}

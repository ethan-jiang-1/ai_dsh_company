/**
 * 培养主视图（2026-10-28 培养 tab；2026-11-02 起主区 = Chat + 培养）：与 Chat 并列的 `conversation.view`。
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
import { roleLabel } from '../../lib/cultivation/cultivation.ts'
import type { CompanyT } from '../locales.ts'
import { setCultivationLanguage } from './cultivation-actions.ts'
import { roleText } from '../roles.ts'
import { CultivationBoard } from './CultivationBoard.tsx'
import { CultivationChatPanel } from './CultivationChatPanel.tsx'
import type { CultivationActionsFactory } from './cultivation-actions.ts'
import type { CultivationContextSources } from './cultivation-context-data.ts'
import type { CultivationContext } from '../../lib/cultivation/cultivation-context.ts'
import {
  useCultivationFeedback,
  useCultivationPanelData,
  workspaceLabelOf,
  type CultivationFiles,
  type CultivationFollowEvents,
} from './cultivation-data.ts'
import { readPresetOf, type RoleBadgeInjected } from '../ui/RoleBadge.tsx'

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

export type CultivationViewProps = PropsRuntime<'conversation.view'> & { readonly t: CompanyT }

/** 右栏宽度状态（拖动分界/键盘 Home 复位；按浏览器持久化）。 */
const CHAT_WIDTH_KEY = 'dsh-company-cultivation-chat-width'

/** 左板（培养板）可用的**最小**宽度——布局与判据的唯一来源（BUG-315）。 */
export const BOARD_MIN = 380
/** 右栏（培养对话）可用的**最小**宽度。 */
export const CHAT_MIN = 280
/** 右栏可拖到的最大宽度。 */
export const CHAT_MAX = 720
/** 分界条宽度（grid 的中间列）。 */
export const SPLIT_GAP = 6
const CHAT_DEFAULT = 390

/**
 * 两栏布局的**唯一**计算（BUG-315：常量声明了但没人执行——768px 下左板被压到 210、右栏 176）。
 *
 * 语义：容器放不下 `BOARD_MIN + CHAT_MIN + SPLIT_GAP` 时**上下堆叠**（各自拿满容器宽），
 * 而不是把两侧都压到声明的下限以下；放得下时右栏 = clamp(期望值, CHAT_MIN, 容器剩余)。
 * @param available - 容器（`wk-cult-view-split`）的可用宽度。
 * @param desiredChat - 用户拖出来的右栏期望宽度。
 * @returns 是否堆叠 + 右栏实际宽度。
 */
export function splitLayout(available: number, desiredChat: number): { readonly stacked: boolean, readonly chat: number } {
  if (!Number.isFinite(available) || available <= 0) return { stacked: false, chat: clampChatWidth(desiredChat) }
  if (available < BOARD_MIN + CHAT_MIN + SPLIT_GAP) return { stacked: true, chat: available }
  const room = available - BOARD_MIN - SPLIT_GAP
  return { stacked: false, chat: clampChatWidth(Math.min(desiredChat, room)) }
}

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
  const { roleSource, contextSources: makeContextSources, cultivationActions } = injected
  return function CultivationView(props: CultivationViewProps) {
    const { sessionId, t } = props
    setCultivationLanguage(t('meta.language') === 'en' ? 'en' : 'zh')
    const subscribe = useMemo(() => roleSource.subscribe.bind(roleSource), [])
    const getPreset = useCallback(() => readPresetOf(roleSource, sessionId), [sessionId])
    const viewerRole = useSyncExternalStore(subscribe, getPreset, getPreset)
    const { journalRows, records, recordsProblem, brokenRecords, unexpandedRecords, refresh } = useCultivationPanelData(injected.cultivationFiles, sessionId)
    const feedback = useCultivationFeedback(injected.followEvents, sessionId)
    const teammate = props.useSessions(state => state.byId[sessionId]?.origin === 'subagent')
    const sessionCwd = props.useSessions(state => state.byId[sessionId]?.cwd)
    const contextSources = useMemo(() => makeContextSources?.(sessionId), [sessionId])
    const openContext = injected.openContext === undefined
      ? undefined
      : (context: CultivationContext) => injected.openContext!(sessionId, context)
    const actions = useMemo(() => cultivationActions(sessionId), [sessionId])
    const splitRef = useRef<HTMLDivElement | null>(null)
    const [chatWidth, setChatWidth] = useState(initialChatWidth)
    const [dragging, setDragging] = useState(false)
    // 容器可用宽度：两栏/堆叠由 splitLayout 一处决定（BUG-315：声明了下限却没有消费点）。
    const [splitAvailable, setSplitAvailable] = useState(0)
    useEffect(() => {
      const split = splitRef.current
      if (split === null) return
      const measure = (): void => { setSplitAvailable(split.clientWidth) }
      measure()
      if (typeof ResizeObserver === 'undefined') return
      const observer = new ResizeObserver(measure)
      observer.observe(split)
      return () => { observer.disconnect() }
    }, [])
    const layout = splitLayout(splitAvailable, chatWidth)

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
      const max = Math.max(CHAT_MIN, Math.min(CHAT_MAX, split.clientWidth - BOARD_MIN - SPLIT_GAP))
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
            <div className="wk-cult-view-eyebrow">{t('cultivation.eyebrow')}</div>
            <div className="wk-cult-view-title">{t('cultivation.title')}</div>
            <div className="wk-cult-view-sub">{t('cultivation.sub')}</div>
          </div>
          <button type="button" className="wk-cult-overview" onClick={injected.openCompanyOverview}>
            {t('cultivation.overview')}
          </button>
        </header>

        <div
          ref={splitRef}
          className={`wk-cult-view-split${dragging ? ' dragging' : ''}`}
          data-stacked={layout.stacked ? 'true' : 'false'}
          style={{ '--wk-cult-chat-width': `${layout.chat}px` } as CSSProperties}
        >
          <div className="wk-cult-view-board">
            <CultivationBoard
              viewerRole={viewerRole}
              viewerLabel={viewerRole === null ? null : roleText(viewerRole, 'label', t, roleLabel(viewerRole))}
              workspaceLabel={workspaceLabelOf(sessionCwd)}
              recordsProblem={recordsProblem}
              roleLabel={role => roleText(role, 'label', t, roleLabel(role))}
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
            aria-label={t('cultivation.resizeAria')}
            aria-valuemin={CHAT_MIN}
            aria-valuemax={CHAT_MAX}
            aria-valuenow={Math.round(chatWidth)}
            tabIndex={0}
            title={t('cultivation.resizeTitle')}
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

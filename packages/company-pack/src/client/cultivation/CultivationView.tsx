/**
 * 培养主视图（2026-10-28 培养 tab；2026-11-02 起主区 = Chat + 培养）：与 Chat 并列的 `conversation.view`。
 *
 * 左：培养领域板（纠正 / 方法 / journal / 赞踩 / 怎么养），复用 `CultivationBoard`；
 * 右：会话内动作摘要（完整内嵌培养对话住全局「梦之队总部」`company-hq.tsx` 面板）。
 * 公司总览（看板 / 依赖 / 在场 / 交付）不在这里：通过 `openCompanyOverview` 打开无对话入口。
 *
 * 为什么不是公司子页：只有培养需要“记录 → 判断 → 方法”的专属对话；其他面板不需要。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { roleLabel } from '../../lib/cultivation/cultivation.ts'
import type { CompanyT } from '../locales.ts'
import { setCultivationLanguage } from './cultivation-actions.ts'
import { roleText } from '../roles.ts'
import { CultivationBoard } from './CultivationBoard.tsx'
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
import { readPresetFromSnapshot, type RoleBadgeInjected, type RoleBadgeSourceFace } from '../ui/RoleBadge.tsx'

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
  /** 打开全局总部里的培养工坊（原生内嵌对话）。 */
  readonly openHqCultivation?: (() => void) | undefined
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
const CHAT_HEIGHT_MIN = 180
const CHAT_HEIGHT_MAX = 560
const CHAT_HEIGHT_DEFAULT = 260

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

function clampChatHeight(value: number): number {
  return Math.max(CHAT_HEIGHT_MIN, Math.min(CHAT_HEIGHT_MAX, Math.round(value)))
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
  const { contextSources: makeContextSources, cultivationActions } = injected
  return function CultivationView(props: CultivationViewProps) {
    const { sessionId, t } = props
    const lang = t('meta.language') === 'en' ? 'en' : 'zh'
    setCultivationLanguage(lang)
    const viewerRole = props.useSessions(state => (
      readPresetFromSnapshot(state as unknown as RoleBadgeSourceFace, sessionId)
    ))
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
    const cleanupResizeRef = useRef<(() => void) | null>(null)
    const [chatWidth, setChatWidth] = useState(initialChatWidth)
    const [chatHeight, setChatHeight] = useState(CHAT_HEIGHT_DEFAULT)
    const [dragging, setDragging] = useState(false)
    // 容器可用宽度：两栏/堆叠由 splitLayout 一处决定（BUG-315：声明了下限却没有消费点）。
    const [splitAvailable, setSplitAvailable] = useState(0)
    useEffect(() => () => { cleanupResizeRef.current?.() }, [])
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
      cleanupResizeRef.current?.()
      const stacked = layout.stacked
      const max = Math.max(CHAT_MIN, Math.min(CHAT_MAX, split.clientWidth - BOARD_MIN - SPLIT_GAP))
      const startX = event.clientX
      const startY = event.clientY
      const startWidth = chatWidth
      const startHeight = chatHeight
      const onMove = (move: PointerEvent): void => {
        if (stacked) {
          setChatHeight(clampChatHeight(startHeight + startY - move.clientY))
          return
        }
        const next = clampChatWidth(startWidth + startX - move.clientX)
        setChatWidth(Math.min(next, max))
      }
      const stopResize = (): void => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', stopResize)
        document.removeEventListener('pointercancel', stopResize)
        window.removeEventListener('blur', stopResize)
        cleanupResizeRef.current = null
        setDragging(false)
      }
      cleanupResizeRef.current = stopResize
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', stopResize)
      document.addEventListener('pointercancel', stopResize)
      window.addEventListener('blur', stopResize)
      setDragging(true)
    }

    const onResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (layout.stacked) {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setChatHeight(value => clampChatHeight(value + 16))
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          setChatHeight(value => clampChatHeight(value - 16))
        } else if (event.key === 'Home') {
          event.preventDefault()
          setChatHeight(CHAT_HEIGHT_DEFAULT)
        }
        return
      }
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
          style={{
            '--wk-cult-chat-width': `${layout.chat}px`,
            '--wk-cult-chat-height': `${chatHeight}px`,
          } as CSSProperties}
        >
          <div className="wk-cult-view-board">
            <CultivationBoard
              language={lang}
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
            aria-orientation={layout.stacked ? 'horizontal' : 'vertical'}
            aria-label={t('cultivation.resizeAria')}
            aria-valuemin={layout.stacked ? CHAT_HEIGHT_MIN : CHAT_MIN}
            aria-valuemax={layout.stacked ? CHAT_HEIGHT_MAX : CHAT_MAX}
            aria-valuenow={Math.round(layout.stacked ? chatHeight : chatWidth)}
            tabIndex={0}
            title={t('cultivation.resizeTitle')}
            onPointerDown={beginResize}
            onKeyDown={onResizeKeyDown}
            onDoubleClick={() => {
              if (layout.stacked) setChatHeight(CHAT_HEIGHT_DEFAULT)
              else setChatWidth(CHAT_DEFAULT)
            }}
          />
          <aside className="wk-cult-workshop-card" data-company-cultivation-workshop="">
            <div className="wk-cult-workshop-title">{t('hq.tab.cultivation')}</div>
            <p className="wk-cult-workshop-hint">{t('hq.cultivationWorkshopHint')}</p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => { (injected.openHqCultivation ?? injected.openCompanyOverview)() }}
            >
              {t('hq.cultivationOpenWorkshop')}
            </Button>
          </aside>
        </div>
      </div>
    )
  }
}

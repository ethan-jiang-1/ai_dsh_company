/**
 * Wave S4 Turn 级公司协同摘要条：
 * 1) 经 `ctx.uiConversation.events.register` 注册 `companyTurnSummaryDefinition`（绝不占用 `'chat'` 分组 L3 禁区）；
 * 2) 经 `conversation.chat.turnTail` list 槽在回合结尾呈现结构化标签（双签 / 委派）与跳转动作。
 */
import type { ReactNode } from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  ConversationMatch,
  ConversationNodeDefinition,
  TurnLocation,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { DELEGATION_TOOL_KEYS } from '../wiring/delegation-keys.ts'
import { TEAM_TOOL_KEYS } from '../ui/TeamToolCard.tsx'
import { COMPANY_NS } from '../locales.ts'

export const COMPANY_TURN_SUMMARY_KIND = 'company-turn-summary' as const
export const COMPANY_TURN_TAIL_ID = 'company-turn-summary' as const

export interface CompanyTurnSummaryData {
  readonly turn: number
  readonly completedTools: readonly string[]
  readonly hasSignoff: boolean
  readonly hasDelegation: boolean
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationTurnDataMap {
    'company-turn-summary': CompanyTurnSummaryData
  }
}

interface CompanyTurnState {
  readonly turn: number
  readonly calls: ReadonlyMap<string, string>
  readonly completedTools: readonly string[]
  readonly hasSignoff: boolean
  readonly hasDelegation: boolean
}

const DELEGATION_SET = new Set<string>(DELEGATION_TOOL_KEYS)
const TEAM_SET = new Set<string>(TEAM_TOOL_KEYS)

/** 判别一条工具名是否属于梦之队公司协同工具（双签 / 委派 / 团队 / present / company_*）。 */
export function isCompanyTurnTool(name: string): boolean {
  if (name === 'request_signoff' || name === 'present') return true
  if (name.startsWith('company_')) return true
  return DELEGATION_SET.has(name) || TEAM_SET.has(name)
}

/** 回合级累积定义：`ctx.uiConversation.events.register`（严禁二次注册 `groups` `'chat'`）。 */
export const companyTurnSummaryDefinition: ConversationNodeDefinition<CompanyTurnState> = {
  kind: COMPANY_TURN_SUMMARY_KIND,
  match: (event) => {
    if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
    if (event.type === 'tool/call') {
      return isCompanyTurnTool(event.data.name)
        ? { id: String(event.data.turn), role: 'update' }
        : null
    }
    if (event.type === 'tool/result') {
      const surface = (event as { readonly surface?: unknown }).surface
      if (surface === 'replace') return null
      return { id: String(event.data.turn), role: 'update' }
    }
    return null
  },
  start: (_context, match: ConversationMatch) => {
    if (match.event.type !== 'turn/start') {
      throw new Error('company-turn-summary start requires turn/start')
    }
    return {
      turn: match.event.data.turn,
      calls: new Map<string, string>(),
      completedTools: [],
      hasSignoff: false,
      hasDelegation: false,
    }
  },
  update: (context, match: ConversationMatch) => {
    const state = context.state
    if (match.event.type === 'tool/call') {
      if (!isCompanyTurnTool(match.event.data.name)) return state
      const calls = new Map(state.calls)
      calls.set(String(match.event.data.callId), match.event.data.name)
      return { ...state, calls }
    }
    if (match.event.type !== 'tool/result') return state
    const callId = String(match.event.data.message.source.callId)
    const toolName = state.calls.get(callId)
    if (toolName === undefined) return state
    const completedTools = state.completedTools.includes(toolName)
      ? state.completedTools
      : [...state.completedTools, toolName]
    return {
      ...state,
      completedTools,
      hasSignoff: state.hasSignoff || toolName === 'request_signoff',
      hasDelegation: state.hasDelegation || DELEGATION_SET.has(toolName) || toolName === 'spawn_teammate',
    }
  },
  buildLocationData: (context, scope, previous) => {
    if (scope !== 'turn' || context.state === undefined) return null
    if (context.state.completedTools.length === 0) return null
    const value: CompanyTurnSummaryData = {
      turn: context.state.turn,
      completedTools: context.state.completedTools,
      hasSignoff: context.state.hasSignoff,
      hasDelegation: context.state.hasDelegation,
    }
    if (
      previous?.kind === 'turn'
      && previous.turn === context.state.turn
      && previous.key === COMPANY_TURN_SUMMARY_KIND
      && previous.value.completedTools === context.state.completedTools
      && previous.value.hasSignoff === context.state.hasSignoff
      && previous.value.hasDelegation === context.state.hasDelegation
    ) {
      return previous
    }
    return {
      kind: 'turn',
      turn: context.state.turn,
      key: COMPANY_TURN_SUMMARY_KIND,
      value,
    }
  },
}

/** 读取某个已结束回合上的公司协同摘要（非公司回合返回 `null`）。 */
export function selectCompanyTurnSummary(turn: TurnLocation): CompanyTurnSummaryData | null {
  const data = turn.data.get(COMPANY_TURN_SUMMARY_KIND)
  if (data === undefined || data.completedTools.length === 0) return null
  return data
}

export interface CompanyTurnTailInjected {
  readonly openOps: () => void
  readonly openArchive: () => void
}

export type CompanyTurnTailCardProps =
  PropsRuntime<'conversation.chat.turnTail'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<CompanyTurnTailInjected>

/** `conversation.chat.turnTail` 回合结尾紧凑收口卡（零公司动作返回 null）。 */
export function CompanyTurnTailCard({
  turn,
  openOps,
  openArchive,
  t,
}: CompanyTurnTailCardProps): ReactNode {
  const summary = selectCompanyTurnSummary(turn)
  if (summary === null) return null

  return (
    <div className="wk-turn-tail" data-company-turn-tail="">
      <div className="wk-turn-tail-meta">
        <span>{t('turnTail.summary', { count: summary.completedTools.length })}</span>
        {summary.hasSignoff ? <Tag tone="warning">{t('turnTail.signoff')}</Tag> : null}
        {summary.hasDelegation ? <Tag tone="info">{t('turnTail.delegation')}</Tag> : null}
      </div>
      <div className="wk-turn-tail-actions">
        <Button size="sm" variant="ghost" onClick={openOps}>
          {t('turnTail.openOps')}
        </Button>
        <Button size="sm" variant="ghost" onClick={openArchive}>
          {t('turnTail.openArchive')}
        </Button>
      </div>
    </div>
  )
}

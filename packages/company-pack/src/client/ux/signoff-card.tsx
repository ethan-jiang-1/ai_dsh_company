/**
 * `request_signoff` 双签体验升级：
 * 1) 对话流内 `tool.call.toolview`（key: `request_signoff`）：结构化展示签字红线、摘要与决策结局（L0）；
 * 2) 输入区 `conversation.composer` chain（priority: 0，鸭子类型精确识别）：仅接管 `request_signoff`
 *    审批条，提供一键「批准双签 / 拒绝」与 Enter/Esc 快捷键；非双签审批（如 `bash`）返回 `null`
 *    100% 透传给上游 `ui-approval`（priority: 1）（E2 已实证通过）。
 */
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-approval/client'
import { parseSignoffReason } from '../../lib/accounting/signoff.ts'
import { cardStateOf, parseArgsObject, resultTextOf, textOf, type CardState } from '../../lib/presence/tool-card.ts'
import type { COMPANY_NS, CompanyKey, CompanyT } from '../locales.ts'

export const SIGNOFF_TOOL_KEY = 'request_signoff' as const

export interface SignoffPendingInteraction {
  readonly kind: 'approval'
  readonly key?: string
  readonly toolName: 'request_signoff'
  readonly reason?: string
  readonly displayReason?: { readonly zh: string; readonly en: string }
  readonly answerable?: boolean
  readonly answer: (outcome: 'allowed-once' | 'rejected') => Promise<void>
}

/** 纯鸭子类型判别：不引入 `ui-approval` 私有类实例检查，只接管 `request_signoff`。 */
export function isSignoffPendingInteraction(pending: unknown): pending is SignoffPendingInteraction {
  if (pending === null || typeof pending !== 'object') return false
  const record = pending as Record<string, unknown>
  return record.kind === 'approval'
    && record.toolName === SIGNOFF_TOOL_KEY
    && typeof record.answer === 'function'
}

interface SignoffDecisionInfo {
  readonly decision: string
  readonly note: string
}

function parseDecisionResult(raw: string | null): SignoffDecisionInfo | null {
  if (raw === null || raw.trim() === '') return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed !== null && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (typeof obj.decision === 'string') {
        return {
          decision: obj.decision,
          note: typeof obj.note === 'string' ? obj.note : '',
        }
      }
    }
  } catch {
    return { decision: '', note: raw }
  }
  return { decision: '', note: raw }
}

const DECISION_TAG: Record<string, { readonly key: CompanyKey; readonly tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  'allowed-once': { key: 'signoff.decision.allowed', tone: 'success' },
  rejected: { key: 'signoff.decision.rejected', tone: 'danger' },
  cancelled: { key: 'signoff.decision.cancelled', tone: 'warning' },
  unavailable: { key: 'signoff.decision.unavailable', tone: 'neutral' },
}

const STATE_TONE: Record<CardState, 'info' | 'success' | 'danger' | 'neutral'> = {
  running: 'info',
  ok: 'success',
  error: 'danger',
  stopped: 'neutral',
}

/** 对话流内的 `request_signoff` 工具调用卡（L0）。 */
export function SignoffToolView({ block, t }: ToolCallViewProps & { readonly t: CompanyT }): ReactNode {
  const settled = 'kind' in block
  const call = settled ? block.call : block
  const argsRaw = (call !== undefined && call !== null && 'argsRaw' in call ? call.argsRaw : undefined) ?? ''
  const args = parseArgsObject(argsRaw)
  const line = textOf(args, 'line')
  const summary = textOf(args, 'summary')
  const detail = textOf(args, 'detail')
  const state = cardStateOf(block)
  const parsedResult = parseDecisionResult(resultTextOf(block))
  const decisionMeta = parsedResult !== null && parsedResult.decision in DECISION_TAG
    ? DECISION_TAG[parsedResult.decision]
    : undefined

  return (
    <div className="wk-signoff-tool" data-company-signoff-tool="" data-state={state}>
      <div className="wk-signoff-head">
        <span className="wk-signoff-title">{t('signoff.title')}</span>
        {decisionMeta !== undefined ? (
          <Tag tone={decisionMeta.tone}>{t(decisionMeta.key)}</Tag>
        ) : (
          <Tag tone={STATE_TONE[state]}>{t('signoff.pendingTag')}</Tag>
        )}
      </div>
      {line !== '' ? (
        <div className="wk-signoff-row">
          <span className="wk-signoff-label">{t('signoff.lineLabel')}</span>
          <span className="wk-signoff-value">{line}</span>
        </div>
      ) : null}
      {summary !== '' ? (
        <div className="wk-signoff-row">
          <span className="wk-signoff-label">{t('signoff.summaryLabel')}</span>
          <span className="wk-signoff-value">{summary}</span>
        </div>
      ) : null}
      {detail !== '' ? (
        <div className="wk-signoff-detail">{detail}</div>
      ) : null}
      {parsedResult !== null && parsedResult.note !== '' ? (
        <div className="wk-signoff-note">{parsedResult.note}</div>
      ) : null}
    </div>
  )
}

export type SignoffComposerProps =
  PropsRuntime<'conversation.composer'>
  & { readonly matched: SignoffPendingInteraction }
  & PropsLocale<typeof COMPANY_NS>

/** 输入区 Chain 替换卡：仅当 `pendingInteraction` 为 `request_signoff` 时接管（L1 priority 0）。 */
export function SignoffComposerCard({ matched, t }: SignoffComposerProps): ReactNode {
  const [submitting, setSubmitting] = useState<'allowed-once' | 'rejected' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const parsed = parseSignoffReason(matched.reason)
  const busy = submitting !== null

  useEffect(() => {
    setSubmitting(null)
    setErrorMessage(null)
  }, [matched.key, matched.answer])

  const submitDecision = async (outcome: 'allowed-once' | 'rejected'): Promise<void> => {
    if (busy || matched.answerable === false) return
    setSubmitting(outcome)
    setErrorMessage(null)
    try {
      await matched.answer(outcome)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setSubmitting(null)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (busy) return
    if (event.key === 'Enter') {
      event.preventDefault()
      void submitDecision('allowed-once')
    } else if (event.key === 'Escape') {
      event.preventDefault()
      void submitDecision('rejected')
    }
  }

  return (
    <div
      className="wk-signoff-composer"
      role="group"
      aria-label={t('signoff.title')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-company-signoff-composer=""
      data-approval-key={matched.key ?? ''}
      aria-busy={busy ? 'true' : 'false'}
    >
      <div className="wk-signoff-head">
        <span className="wk-signoff-title">{t('signoff.title')}</span>
        <Tag tone="warning">{t('signoff.pendingTag')}</Tag>
      </div>
      {parsed.line !== '' ? (
        <div className="wk-signoff-row">
          <span className="wk-signoff-label">{t('signoff.lineLabel')}</span>
          <span className="wk-signoff-value">{parsed.line}</span>
        </div>
      ) : null}
      {parsed.summary !== '' ? (
        <div className="wk-signoff-row">
          <span className="wk-signoff-label">{t('signoff.summaryLabel')}</span>
          <span className="wk-signoff-value">{parsed.summary}</span>
        </div>
      ) : null}
      {parsed.detail !== '' ? (
        <div className="wk-signoff-row">
          <span className="wk-signoff-label">{t('signoff.detailLabel')}</span>
          <span className="wk-signoff-value">{parsed.detail}</span>
        </div>
      ) : null}
      <p className="wk-signoff-hint">{t('signoff.hint')}</p>
      {errorMessage !== null ? (
        <p className="wk-signoff-error" role="alert">{t('signoff.errorRetry', { message: errorMessage })}</p>
      ) : null}
      <div className="wk-signoff-actions">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => { void submitDecision('rejected') }}>
          {submitting === 'rejected' ? t('signoff.submitting') : t('signoff.reject')}
        </Button>
        <Button size="sm" variant="primary" disabled={busy} onClick={() => { void submitDecision('allowed-once') }}>
          {submitting === 'allowed-once' ? t('signoff.submitting') : t('signoff.approve')}
        </Button>
      </div>
    </div>
  )
}

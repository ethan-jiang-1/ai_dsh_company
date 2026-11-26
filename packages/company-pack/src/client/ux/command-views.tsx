/**
 * `/req` / `/prd` / `/delivery` 结构化命令结果卡（`conversation.chat.commandview` keyed 槽，L0）。
 * 通过纯解析器从现有 Host 命令回执提取状态与要点列表，保留原文折叠开关，不破坏 Host 契约。
 */
import { useState, type ReactNode } from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { COMPANY_NS, CompanyKey } from '../locales.ts'

export const COMPANY_COMMAND_VIEW_KEYS = ['req', 'prd', 'delivery'] as const
export type CompanyCommandName = (typeof COMPANY_COMMAND_VIEW_KEYS)[number]

export interface ParsedCheckCommand {
  readonly status: 'success' | 'error' | 'pending'
  readonly headline: string
  readonly bullets: readonly string[]
  readonly rawText: string
}

/** 将 Host 返回的纯文本/多行回执解析为结构化摘要与条目列表。 */
export function parseCheckCommandOutput(
  outcome: { readonly kind: 'success' | 'error'; readonly text?: string } | null | undefined,
): ParsedCheckCommand {
  if (outcome == null) {
    return { status: 'pending', headline: '', bullets: [], rawText: '' }
  }
  const rawText = (outcome.text ?? '').trim()
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '')
  const headline = lines[0] ?? ''
  const bullets = lines.slice(1).map(line => (line.startsWith('- ') ? line.slice(2).trim() : line))
  return {
    status: outcome.kind,
    headline,
    bullets,
    rawText,
  }
}

const COMMAND_TITLE_KEYS: Record<CompanyCommandName, CompanyKey> = {
  req: 'cmdCard.reqTitle',
  prd: 'cmdCard.prdTitle',
  delivery: 'cmdCard.deliveryTitle',
}

export interface CommandViewInjected {
  readonly openDeliverables?: (() => void) | undefined
}

export type CompanyCommandViewProps =
  PropsRuntime<'conversation.chat.commandview'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<CommandViewInjected>

/** 渲染 `/req` / `/prd` / `/delivery` 命令的结构化核验卡。 */
export function CompanyCommandView({ node, t, openDeliverables }: CompanyCommandViewProps): ReactNode {
  const [showRaw, setShowRaw] = useState(false)
  const cmdName = node.name as CompanyCommandName | null
  const titleKey = cmdName !== null && cmdName in COMMAND_TITLE_KEYS ? COMMAND_TITLE_KEYS[cmdName] : 'cmdCard.reqTitle'
  const parsed = parseCheckCommandOutput(node.outcome)
  const tagTone = parsed.status === 'success' ? 'success' : parsed.status === 'error' ? 'danger' : 'neutral'
  const tagKey: CompanyKey = parsed.status === 'success'
    ? 'cmdCard.status.ok'
    : parsed.status === 'error'
      ? 'cmdCard.status.error'
      : 'cmdCard.status.pending'

  return (
    <div className="wk-cmd-card" data-company-commandview={node.name ?? ''} data-status={parsed.status}>
      <div className="wk-cmd-card-head">
        <span className="wk-cmd-card-title">{t(titleKey)}</span>
        <Tag tone={tagTone}>{t(tagKey)}</Tag>
      </div>
      {parsed.headline !== '' ? <div className="wk-cmd-card-summary">{parsed.headline}</div> : null}
      {parsed.bullets.length > 0 ? (
        <ul className="wk-cmd-card-list">
          {parsed.bullets.map((item, idx) => (
            <li key={`${String(idx)}-${item.slice(0, 16)}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {showRaw && parsed.rawText !== '' ? (
        <pre className="wk-cmd-card-raw">{parsed.rawText}</pre>
      ) : null}
      <div className="wk-cmd-card-actions">
        {parsed.rawText !== '' ? (
          <Button size="sm" variant="ghost" onClick={() => setShowRaw(v => !v)}>
            {showRaw ? t('cmdCard.hideRaw') : t('cmdCard.toggleRaw')}
          </Button>
        ) : null}
        {openDeliverables !== undefined ? (
          <Button size="sm" variant="outline" onClick={openDeliverables}>
            {t('cmdCard.openDeliverables')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

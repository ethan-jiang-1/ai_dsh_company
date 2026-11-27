/**
 * 消息级与文档级上下文动作（L0 增量）：
 * 1) `conversation.chat.assistant-actions`：每条高管回复下的「纠正 / 沉淀方法」快捷触发；
 * 2) `sidebar.right.tab.document.actions`：仅对 `.dsh-company/deliverables/.../final.md` 终稿注入动作，
 *    普通 Markdown（如 README.md / drafts）返回 `null`，绝不劫持原生文档预览。
 */
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import type { COMPANY_NS } from '../locales.ts'

const DELIVERABLE_FINAL_RE = /(?:^|[\\/])\.dsh-company[\\/](?:deliverables|deliverables-archive)[\\/][^\\/]+[\\/]final\.md$/i

/** 严格匹配公司正式交付终稿路径；普通工作区 Markdown 与草稿目录一律返回 false。 */
export function isDeliverableFinalMarkdown(absolutePath: string | undefined): boolean {
  if (absolutePath === undefined || absolutePath.trim() === '') return false
  return DELIVERABLE_FINAL_RE.test(absolutePath.trim())
}

export interface ContextualOpenInjected {
  readonly openCultivation: (context?: { readonly messageId?: string; readonly filePath?: string }) => void
}

export type AssistantCultivateActionProps =
  PropsRuntime<'conversation.chat.assistant-actions'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<ContextualOpenInjected>

/** 高管消息末尾「纠正 / 沉淀方法」按钮。 */
export function AssistantCultivateAction({ messageId, t, openCultivation }: AssistantCultivateActionProps): ReactNode {
  return (
    <span className="wk-ux-action-wrap" data-company-assistant-action="cultivate">
      <Button
        size="sm"
        variant="ghost"
        title={t('assistantAction.cultivateTooltip')}
        onClick={() => openCultivation({ messageId })}
      >
        {t('assistantAction.cultivate')}
      </Button>
    </span>
  )
}

export interface DeliverableDocActionsInjected {
  readonly openDeliverables: (filePath?: string) => void
  readonly openCultivation: (context?: { readonly filePath?: string }) => void
}

export type DeliverableFinalDocActionsProps =
  PropsRuntime<'sidebar.right.tab.document.actions'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<DeliverableDocActionsInjected>

/** 右栏文档预览头部动作：仅命中公司交付终稿 `final.md` 时显示。 */
export function DeliverableFinalDocActions({
  absolutePath,
  t,
  openDeliverables,
  openCultivation,
}: DeliverableFinalDocActionsProps): ReactNode {
  if (!isDeliverableFinalMarkdown(absolutePath)) return null
  return (
    <span className="wk-doc-actions" data-company-doc-actions="final">
      <Button
        size="sm"
        variant="outline"
        title={t('docAction.compareDraftsTooltip')}
        onClick={() => openDeliverables(absolutePath)}
      >
        {t('docAction.compareDrafts')}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        title={t('docAction.startCultivationTooltip')}
        onClick={() => openCultivation({ filePath: absolutePath })}
      >
        {t('docAction.startCultivation')}
      </Button>
    </span>
  )
}

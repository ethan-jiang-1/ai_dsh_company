/**
 * Wave S1 轻量化环境扩展槽组件（全 L0）：
 * - `HeaderAttentionUtility` (`conversation.session.header.utilities`, order: 20)
 * - `SidebarFooterCompanyAction` (`sidebar.footer.action`, order: 20)
 * - `HeroMotionOptions` (`conversation.hero.options`, order: 20)
 * - `MotionCommandDock` (`conversation.input.dock`, order: 20)
 * - `ComposerStatusPill` (`conversation.composer.dock`, order: 20)
 */
import type { ReactNode } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import { Button, Pill, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { LivePending } from '../../lib/presence/attention.ts'
import { ROLE_COPY, type RoleId } from '../../lib/shared/role-copy.ts'
import type { COMPANY_NS, CompanyKey } from '../locales.ts'
import { roleText } from '../roles.ts'
import { isEmbeddedWorkshopSession } from './workshop-sessions.ts'

export interface AttentionObservableInjected {
  readonly hooks: { readonly attentionItems: ObservableSnapshot<readonly LivePending[]> }
}

export interface TabOpenerInjected {
  readonly openTab: (tabId: 'company-attention' | 'company-board') => void
}

export type HeaderAttentionUtilityProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<AttentionObservableInjected & TabOpenerInjected>

/** 活跃会话顶栏待办角标（order >= 10，避让 upstream open-in-app=-10 与 schedule=0）。 */
export function HeaderAttentionUtility({ useAttentionItems, openTab, t }: HeaderAttentionUtilityProps): ReactNode {
  const pendingCount = useAttentionItems((items: readonly LivePending[]) => items.length)
  return (
    <span className="wk-ux-header-badge" data-company-header-attention="">
      <Button
        size="sm"
        variant={pendingCount > 0 ? 'outline' : 'ghost'}
        title={t('header.attentionTooltip')}
        onClick={() => openTab('company-attention')}
      >
        {pendingCount > 0 ? (
          <Tag tone="warning">{t('header.attentionBadge', { count: pendingCount })}</Tag>
        ) : (
          <span>{t('header.attentionClear')}</span>
        )}
      </Button>
    </span>
  )
}

export type SidebarFooterCompanyActionProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<AttentionObservableInjected & TabOpenerInjected>

/** 左侧栏底部公司快捷状态按钮（宽栏展示文案+徽标，窄栏收为紧凑 Tag）。 */
export function SidebarFooterCompanyAction({ wide, useAttentionItems, openTab, t }: SidebarFooterCompanyActionProps): ReactNode {
  const pendingCount = useAttentionItems((items: readonly LivePending[]) => items.length)
  return (
    <span className="wk-ux-footer-action" data-company-footer-action="">
      <Button
        size="sm"
        variant="ghost"
        title={t('footer.hqTooltip')}
        onClick={() => openTab(pendingCount > 0 ? 'company-attention' : 'company-board')}
      >
        {wide ? (
          <>
            <span>{t('footer.hqLabel')}</span>
            {pendingCount > 0 ? <Tag tone="warning">{t('footer.hqBadge', { count: pendingCount })}</Tag> : null}
          </>
        ) : (
          <Tag tone={pendingCount > 0 ? 'warning' : 'neutral'}>{pendingCount > 0 ? String(pendingCount) : 'HQ'}</Tag>
        )}
      </Button>
    </span>
  )
}

export interface DraftNotifyInjected {
  readonly notifyDraft: (label: string) => void
}

const HERO_TEMPLATES: ReadonlyArray<{ readonly id: string; readonly labelKey: CompanyKey; readonly promptKey: CompanyKey }> = [
  { id: 'prd', labelKey: 'hero.template.prd', promptKey: 'hero.template.prdPrompt' },
  { id: 'review', labelKey: 'hero.template.review', promptKey: 'hero.template.reviewPrompt' },
  { id: 'brief', labelKey: 'hero.template.brief', promptKey: 'hero.template.briefPrompt' },
]

export type HeroMotionOptionsProps =
  PropsRuntime<'conversation.hero.options'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<DraftNotifyInjected>

/** 新会话 Hero 态的 3 个高频动议模板速启胶囊。 */
export function HeroMotionOptions({ sessionId, inputActions, notifyDraft, t }: HeroMotionOptionsProps): ReactNode {
  if (isEmbeddedWorkshopSession(sessionId)) return null
  return (
    <div className="wk-hero-options" data-company-hero-options="">
      <span className="wk-hero-options-label">{t('hero.quickLabel')}</span>
      {HERO_TEMPLATES.map(item => (
        <Pill
          key={item.id}
          onClick={() => {
            const label = t(item.labelKey)
            inputActions.setDraft(t(item.promptKey))
            notifyDraft(label)
          }}
        >
          {t(item.labelKey)}
        </Pill>
      ))}
    </div>
  )
}

export interface MotionDockInjected extends AttentionObservableInjected, TabOpenerInjected {
  readonly onDraftCommand: (cmd: string) => void
}

export type MotionCommandDockProps =
  PropsRuntime<'conversation.input.dock'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<MotionDockInjected>

function readCompanyRole(raw: unknown): RoleId | null {
  return typeof raw === 'string' && raw in ROLE_COPY ? (raw as RoleId) : null
}

/** 输入框上方「动议指挥带」：仅对公司角色会话显示快速命令与看板入口。 */
export function MotionCommandDock({
  sessionId,
  inputActions,
  useSessions,
  useAttentionItems,
  openTab,
  onDraftCommand,
  t,
}: MotionCommandDockProps): ReactNode {
  const presetRaw = useSessions(s => s.projectionsBySession[sessionId]?.values.agentPreset)
  const roleId = readCompanyRole(presetRaw)
  const pendingCount = useAttentionItems((items: readonly LivePending[]) => items.length)
  if (isEmbeddedWorkshopSession(sessionId) || roleId === null) return null

  const draftCommand = (cmd: string): void => {
    inputActions.setDraft(cmd)
    onDraftCommand(cmd)
  }

  return (
    <div className="wk-motion-dock" data-company-motion-dock="">
      <span className="wk-motion-dock-label">{t('dock.stageLabel')}</span>
      <Button size="sm" variant="ghost" onClick={() => draftCommand('/req check ')}>
        {t('dock.action.req')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => draftCommand('/prd check ')}>
        {t('dock.action.prd')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => draftCommand('/delivery check ')}>
        {t('dock.action.delivery')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => openTab('company-board')}>
        {t('dock.action.board')}
      </Button>
      {pendingCount > 0 ? (
        <Button size="sm" variant="outline" onClick={() => openTab('company-attention')}>
          <Tag tone="warning">{t('dock.action.attention', { count: pendingCount })}</Tag>
        </Button>
      ) : null}
    </div>
  )
}

export type ComposerStatusPillProps =
  PropsRuntime<'conversation.composer.dock'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<AttentionObservableInjected & TabOpenerInjected>

/** 活跃会话输入框下方脚手栏状态胶囊：显示当前角色与待批计数。 */
export function ComposerStatusPill({
  sessionId,
  useSessions,
  useAttentionItems,
  openTab,
  t,
}: ComposerStatusPillProps): ReactNode {
  const presetRaw = useSessions(s => s.projectionsBySession[sessionId]?.values.agentPreset)
  const roleId = readCompanyRole(presetRaw)
  const pendingCount = useAttentionItems((items: readonly LivePending[]) => items.length)
  if (roleId === null) return null

  const roleLabel = roleText(roleId, 'short', t)
  return (
    <span className="wk-composer-status" data-company-composer-dock="">
      <Pill onClick={() => openTab(pendingCount > 0 ? 'company-attention' : 'company-board')}>
        <span>{t('composerDock.activeRole', { role: roleLabel })}</span>
        {pendingCount > 0 ? (
          <Tag tone="warning">{t('composerDock.pending', { count: pendingCount })}</Tag>
        ) : (
          <Tag tone="quiet">{t('composerDock.idle')}</Tag>
        )}
      </Pill>
    </span>
  )
}

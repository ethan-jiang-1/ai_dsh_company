/**
 * Wave S1 总装配：按独立 `ctx.inject` 边界注册所有零破坏增量扩展槽。
 * 任何外围服务（如 sidebarRight / layout）缺失均不影响基础功能挂载。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { LivePending } from '../../lib/presence/attention.ts'
import { COMPANY_NS } from '../locales.ts'
import type { HubSubViewStore } from '../tabs/hub-subview-store.ts'
import type { AttentionRegistry } from '../wiring/attention-registry.ts'
import {
  ComposerStatusPill,
  HeaderAttentionUtility,
  HeroMotionOptions,
  MotionCommandDock,
  SidebarFooterCompanyAction,
} from './ambient-chrome.tsx'
import { COMPANY_COMMAND_VIEW_KEYS, CompanyCommandView } from './command-views.tsx'
import { createCompanyToastSource, CompanyToastOverlay } from './company-toast.tsx'
import { AssistantCultivateAction, DeliverableFinalDocActions } from './contextual-actions.tsx'
import {
  isSignoffPendingInteraction,
  SIGNOFF_TOOL_KEY,
  SignoffComposerCard,
  SignoffToolView,
  type SignoffDisplayReason,
} from './signoff-card.tsx'

import type { HqSection } from './company-hq.tsx'

export const S1_CLIENT_SURFACE_IDS = {
  toastOverlay: 'company-toast',
  headerAttention: 'company-attention',
  footerStatus: 'company-footer-status',
  heroMotions: 'company-hero-motions',
  motionDock: 'company-motion-dock',
  composerDock: 'company-status-pill',
  assistantCultivate: 'company-cultivate',
  docFinalActions: 'company-final-actions',
} as const

export const S1_TOOL_KEYS = {
  signoff: SIGNOFF_TOOL_KEY,
  commands: COMPANY_COMMAND_VIEW_KEYS,
} as const

export interface WaveS1Deps {
  readonly attention: AttentionRegistry
  readonly hubStore?: HubSubViewStore
  readonly openHq?: (section?: HqSection) => void
}

/** 将 AttentionRegistry 包装为纯 ObservableSnapshot 供各槽 `hooks` 隔层消费。 */
export function asAttentionObservable(attention: AttentionRegistry): ObservableSnapshot<readonly LivePending[]> {
  return {
    getSnapshot: () => attention.snapshot(),
    subscribe: listener => attention.subscribe(listener),
  }
}

/** 挂载 Wave S1 全部原生 L0/L1 槽贡献。 */
export function registerWaveS1Ux(ctx: ClientContext, deps: WaveS1Deps): void {
  const t = ctx.locale.bind(COMPANY_NS)
  const toastSource = createCompanyToastSource()
  const attentionObservable = asAttentionObservable(deps.attention)

  // 1. `shell.overlay` 全局 Toast（无强会话依赖，单独 slots 注入）
  ctx.inject(['slots'], (scoped) => {
    scoped.slots.inject('shell.overlay', () =>
      scoped.slots.register({
        name: 'shell.overlay',
        id: S1_CLIENT_SURFACE_IDS.toastOverlay,
        locale: COMPANY_NS,
        inject: () => ({
          hooks: { toastState: toastSource.store },
          dismiss: toastSource.dismiss,
        }),
      }, CompanyToastOverlay),
    )

    // 2. `request_signoff` 对话流卡（L0） + 底部 `conversation.composer` Chain（L1 priority 0）
    scoped.slots.inject('tool.call.toolview', () =>
      scoped.slots.register({
        name: 'tool.call.toolview',
        key: SIGNOFF_TOOL_KEY,
        priority: -1,
        locale: COMPANY_NS,
      }, SignoffToolView),
    )
    scoped.slots.inject('conversation.composer', () =>
      scoped.slots.register({
        name: 'conversation.composer',
        priority: 0,
        locale: COMPANY_NS,
        select: ({ pendingInteraction }) => (
          isSignoffPendingInteraction(pendingInteraction) ? pendingInteraction : null
        ),
        inject: () => ({
          resolveReason: typeof ctx.locale?.resolveText === 'function'
            ? (reason: SignoffDisplayReason) => ctx.locale.resolveText(reason)
            : undefined,
        }),
      }, SignoffComposerCard),
    )
  })

  // 3. 需要 rightSidebar / sessions 的会话与上下文增强槽
  ctx.inject(['slots', 'sidebarRight', 'sessions'], (scoped) => {
    const safeOpenTab = (tabId: 'company-attention' | 'company-board' | 'company-cultivation' | 'company-deliverables'): void => {
      try {
        if (tabId === 'company-attention') {
          deps.hubStore?.select('team', 'attention')
          scoped.sidebarRight.openTab('company-team')
        } else if (tabId === 'company-board') {
          deps.hubStore?.select('ops', 'board')
          scoped.sidebarRight.openTab('company-ops')
        } else if (tabId === 'company-cultivation') {
          deps.hubStore?.select('archive', 'cultivation')
          scoped.sidebarRight.openTab('company-archive')
        } else {
          deps.hubStore?.select('archive', 'deliverables')
          scoped.sidebarRight.openTab('company-archive')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        toastSource.notify(message)
      }
    }

    const formatContextRef = (context?: { readonly messageId?: string; readonly filePath?: string }): string | null => {
      if (context?.messageId !== undefined && context.messageId.trim() !== '') {
        return context.messageId.trim()
      }
      if (context?.filePath !== undefined && context.filePath.trim() !== '') {
        const parts = context.filePath.trim().split(/[\\/]/)
        return parts.at(-1) ?? context.filePath.trim()
      }
      return null
    }

    const openCultivation = (context?: { readonly messageId?: string; readonly filePath?: string }): void => {
      if (deps.openHq !== undefined) {
        deps.openHq('cultivation')
      } else {
        safeOpenTab('company-cultivation')
      }
      const ref = formatContextRef(context)
      toastSource.notify(
        ref === null ? t('toast.cultivationDraftReady') : t('toast.cultivationDraftContext', { ref }),
        'success',
      )
    }

    const openDeliverables = (): void => {
      safeOpenTab('company-deliverables')
      toastSource.notify(t('toast.reviewOpened'), 'success')
    }

    scoped.slots.inject('conversation.session.header.utilities', () =>
      scoped.slots.register({
        name: 'conversation.session.header.utilities',
        id: S1_CLIENT_SURFACE_IDS.headerAttention,
        order: 20,
        locale: COMPANY_NS,
        inject: () => ({
          hooks: { attentionItems: attentionObservable },
          openTab: (tabId: 'company-attention' | 'company-board') => { safeOpenTab(tabId) },
        }),
      }, HeaderAttentionUtility),
    )

    scoped.slots.inject('sidebar.footer.action', () =>
      scoped.slots.register({
        name: 'sidebar.footer.action',
        id: S1_CLIENT_SURFACE_IDS.footerStatus,
        order: 20,
        locale: COMPANY_NS,
        inject: () => ({
          hooks: { attentionItems: attentionObservable },
          openTab: (tabId: 'company-attention' | 'company-board') => { safeOpenTab(tabId) },
        }),
      }, SidebarFooterCompanyAction),
    )

    scoped.slots.inject('conversation.hero.options', () =>
      scoped.slots.register({
        name: 'conversation.hero.options',
        id: S1_CLIENT_SURFACE_IDS.heroMotions,
        order: 20,
        locale: COMPANY_NS,
        inject: () => ({
          notifyDraft: (label: string) => {
            toastSource.notify(t('toast.templateApplied', { label }), 'success')
          },
        }),
      }, HeroMotionOptions),
    )

    scoped.slots.inject('conversation.input.dock', () =>
      scoped.slots.register({
        name: 'conversation.input.dock',
        id: S1_CLIENT_SURFACE_IDS.motionDock,
        order: 20,
        locale: COMPANY_NS,
        inject: (sessionId: SessionId) => ({
          hooks: { attentionItems: attentionObservable },
          openTab: (tabId: 'company-attention' | 'company-board') => { safeOpenTab(tabId) },
          onDraftCommand: (cmd: string) => {
            const binding = scoped.sessions.binding(sessionId)
            if (binding !== undefined) {
              toastSource.notify(t('toast.commandSent', { cmd: cmd.trim() }), 'success')
            }
          },
        }),
      }, MotionCommandDock),
    )

    scoped.slots.inject('conversation.composer.dock', () =>
      scoped.slots.register({
        name: 'conversation.composer.dock',
        id: S1_CLIENT_SURFACE_IDS.composerDock,
        order: 20,
        locale: COMPANY_NS,
        inject: () => ({
          hooks: { attentionItems: attentionObservable },
          openTab: (tabId: 'company-attention' | 'company-board') => { safeOpenTab(tabId) },
        }),
      }, ComposerStatusPill),
    )

    for (const cmdKey of COMPANY_COMMAND_VIEW_KEYS) {
      scoped.slots.inject('conversation.chat.commandview', () =>
        scoped.slots.register({
          name: 'conversation.chat.commandview',
          key: cmdKey,
          locale: COMPANY_NS,
          inject: () => ({ openDeliverables }),
        }, CompanyCommandView),
      )
    }

    scoped.slots.inject('conversation.chat.assistant-actions', () =>
      scoped.slots.register({
        name: 'conversation.chat.assistant-actions',
        id: S1_CLIENT_SURFACE_IDS.assistantCultivate,
        order: 20,
        locale: COMPANY_NS,
        inject: () => ({ openCultivation }),
      }, AssistantCultivateAction),
    )

    scoped.slots.inject('sidebar.right.tab.document.actions', () =>
      scoped.slots.register({
        name: 'sidebar.right.tab.document.actions',
        id: S1_CLIENT_SURFACE_IDS.docFinalActions,
        order: 20,
        locale: COMPANY_NS,
        inject: () => ({ openDeliverables, openCultivation }),
      }, DeliverableFinalDocActions),
    )
  })
}

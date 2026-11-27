/**
 * Wave S4 总装配：`ctx.uiConversation.events.register` + `conversation.chat.turnTail` 列表条目。
 * 严格避免占用 `'chat'` 对话分组 L3 禁区。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { COMPANY_NS } from '../locales.ts'
import type { HubSubViewStore } from '../tabs/hub-subview-store.ts'
import { openOnSessionSurface, trackReturnToMain } from '../wiring/sidebar-right-guard.ts'
import {
  COMPANY_TURN_TAIL_ID,
  CompanyTurnTailCard,
  companyTurnSummaryDefinition,
} from './company-turn-tail.tsx'

export interface WaveS4Deps {
  readonly hubStore: HubSubViewStore
}

/** 挂载 Wave S4 回合级公司收口摘要。 */
export function registerWaveS4Ux(ctx: ClientContext, deps: WaveS4Deps): void {
  const returnToMain = trackReturnToMain(ctx)
  ctx.inject(['uiConversation', 'slots', 'sidebarRight'], (scoped) => {
    scoped.effect(
      () => scoped.uiConversation.events.register(companyTurnSummaryDefinition),
      'company-pack: turn summary definition',
    )

    scoped.slots.inject('conversation.chat.turnTail', () =>
      scoped.slots.register({
        name: 'conversation.chat.turnTail',
        id: COMPANY_TURN_TAIL_ID,
        order: 25,
        locale: COMPANY_NS,
        inject: () => ({
          openOps: () => {
            openOnSessionSurface(scoped.sidebarRight, returnToMain, () => {
              deps.hubStore.select('ops', 'board')
              scoped.sidebarRight.openTab('company-ops')
            })
          },
          openArchive: () => {
            openOnSessionSurface(scoped.sidebarRight, returnToMain, () => {
              deps.hubStore.select('archive', 'deliverables')
              scoped.sidebarRight.openTab('company-archive')
            })
          },
        }),
      }, CompanyTurnTailCard),
    )
  })
}

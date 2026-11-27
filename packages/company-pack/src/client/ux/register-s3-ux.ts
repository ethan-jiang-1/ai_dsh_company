/**
 * Wave S3 总装配：注册左侧全局导航项 `sidebar.panellist`、全局 `main` 面板
 * (`dsh-company-pack/hq`) 以及内嵌培养对话子槽 `company.hq.cultivation.conversation`。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-files/remote'
import type {} from '@deepseek-ai/dsh-commands/remote'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { createCompanyDataPlane, WORKSPACE_TEXT_PATHS } from '../data/company-data-plane.ts'
import { CATALOG_READ_LIMIT, LEDGER_READ_LIMIT } from '../data/read-limits.ts'
import { COMPANY_NS } from '../locales.ts'
import { createStartupHandlers } from '../startup/startup-handlers.ts'
import type { StartupStore } from '../startup/startup-store.ts'
import { sessionFileAddress } from '../../lib/deliverables/deliverables-address.ts'
import { asSessionPageFace } from '../presence/attention-history.ts'
import type { AttentionRegistry } from '../wiring/attention-registry.ts'
import { makeContextWiring, type ContextWiringScoped } from '../wiring/context-wiring.ts'
import { openOnSessionSurface } from '../wiring/sidebar-right-guard.ts'
import { asAttentionObservable } from './register-s1-ux.ts'
import {
  COMPANY_HQ_CULTIVATION_SLOT,
  COMPANY_HQ_PANEL_ID,
  CompanyHqIcon,
  CompanyHqPage,
  createHqSectionStore,
  HqCultivationConversationSlot,
  type HqSection,
} from './company-hq.tsx'

export interface WaveS3Deps {
  readonly attention: AttentionRegistry
  readonly startupStore: StartupStore
}

export interface WaveS3Handle {
  openHq(section?: HqSection): void
}

/** 挂载 Wave S3 全局「梦之队总部」面板与内嵌培养工坊。 */
export function registerWaveS3Ux(ctx: ClientContext, deps: WaveS3Deps): WaveS3Handle {
  const t = ctx.locale.bind(COMPANY_NS)
  const hqSectionStore = createHqSectionStore()
  const attentionObservable = asAttentionObservable(deps.attention)
  let openPanelImpl: ((section?: HqSection) => void) | undefined

  ctx.inject(
    ['slots', 'layout', 'sessions', 'uiWorkspace', 'remote.session', 'remote.workspaceFiles', 'remote.commands', 'sidebarRight'],
    (scoped) => {
      const { leadOf, follow, cultivationFiles, cultivationActions, rawFollow, readWorkspaceText } = createCompanyDataPlane(scoped)
      const readLedger = readWorkspaceText(WORKSPACE_TEXT_PATHS.ledger, LEDGER_READ_LIMIT)
      const readCatalog = readWorkspaceText(WORKSPACE_TEXT_PATHS.catalog, CATALOG_READ_LIMIT)
      const returnToChat = (): void => { scoped.layout.selectPanel(null) }
      const contextWiring = makeContextWiring(scoped as unknown as ContextWiringScoped, leadOf, rawFollow, readCatalog, returnToChat)
      const { loadStartup, saveStartup, resetStartup } = createStartupHandlers({
        remote: scoped.remote,
        leadOf,
        readWorkspaceText,
        startupStore: deps.startupStore,
      })

      openPanelImpl = (section?: HqSection) => {
        if (section !== undefined) hqSectionStore.select(section)
        scoped.layout.selectPanel(COMPANY_HQ_PANEL_ID)
      }

      scoped.slots.inject('sidebar.panellist', () =>
        scoped.slots.register({
          name: 'sidebar.panellist',
          id: COMPANY_HQ_PANEL_ID,
          order: 20,
          locale: COMPANY_NS,
          label: () => t('hq.panel'),
        }, CompanyHqIcon),
      )

      scoped.slots.inject('main', () =>
        scoped.slots.register({
          name: 'main',
          key: COMPANY_HQ_PANEL_ID,
          locale: COMPANY_NS,
          children: {
            [COMPANY_HQ_CULTIVATION_SLOT]: { kind: 'single', scope: 'session' },
          },
          inject: () => ({
            hooks: {
              hqSection: hqSectionStore.store,
              attentionItems: attentionObservable,
            },
            selectSection: (next: HqSection) => { hqSectionStore.select(next) },
            returnToChat,
            openSession: (sessionId: SessionId) => {
              scoped.uiWorkspace.openSession(sessionId)
              scoped.layout.selectPanel(null)
            },
            sessions: scoped.sessions,
            cultivationFiles,
            cultivationActions,
            followEvents: follow,
            readLedger,
            readCatalog,
            contextSources: contextWiring.contextSources,
            openContext: contextWiring.openContext,
            openFinal: (sessionId: SessionId, path: string) => {
              openOnSessionSurface(scoped.sidebarRight, returnToChat, () => {
                scoped.sidebarRight.openResource(sessionFileAddress(sessionId, path))
              })
            },
            pageHistory: typeof scoped.remote.session.page === 'function'
              ? asSessionPageFace(scoped.remote.session.page)
              : undefined,
            startupStore: deps.startupStore,
            loadStartup,
            saveStartup,
            resetStartup,
          }),
        }, CompanyHqPage),
      )

      scoped.slots.inject(COMPANY_HQ_CULTIVATION_SLOT, () =>
        scoped.slots.register({
          name: COMPANY_HQ_CULTIVATION_SLOT,
        }, HqCultivationConversationSlot),
      )
    },
  )

  return {
    openHq(section?: HqSection) {
      openPanelImpl?.(section)
    },
  }
}

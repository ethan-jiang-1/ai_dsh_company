/** Company tab type and keyed renderer registrations. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { AttentionTab } from './AttentionTab.tsx'
import type { AttentionRegistry } from '../wiring/attention-registry.ts'
import type { FloatRectLike } from '../ui/float-geometry.ts'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from './company-tabs.tsx'
import type { CultivationActionsFactory } from '../cultivation/cultivation-actions.ts'
import type { CultivationFiles } from '../cultivation/cultivation-data.ts'
import type { CultivationContextSources } from '../cultivation/cultivation-context-data.ts'
import type { CultivationContext } from '../../lib/cultivation-context.ts'
import { CultivationTab } from './CultivationTab.tsx'
import { DeliverablesTab } from './DeliverablesTab.tsx'
import { LedgerTab } from './LedgerTab.tsx'
import { sessionFileAddress } from '../../lib/deliverables-address.ts'
import { TAB_IDENTITY, type FaceKey } from '../ui/tab-icons.tsx'
import { tabCopyFor } from './tab-copy.ts'
import { COMPANY_NS, type CompanyT } from '../locales.ts'
import type { TeamStreamFrame } from '../../lib/presence.ts'
import type { RoleBadgeInjected } from '../ui/RoleBadge.tsx'

type CompanyTabContext = Pick<ClientContext, 'effect' | 'sidebarRightTabs' | 'slots' | 'sidebarRight' | 'uiWorkspace'>
type Dispose = () => void

/** Inputs shared by Company tab renderers and their registration-time inject factories. */
export interface CompanyTabRegistrationData {
  /** One apply-local pending-item registry shared with the request observers. */
  readonly attention: AttentionRegistry
  /** Resolve a child session to its direct Lead session. */
  readonly leadOf: (sessionId: SessionId) => SessionId
  /** Follow the Lead's durable event stream as history and live event frames. */
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncIterable<TeamStreamFrame>
  /** Float one platform tab. */
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  /** Dock one floating pane. */
  readonly unfloatTab: (paneId: string) => void
  /** Open the selected member's session. */
  readonly openMember: (sessionId: SessionId, member: { readonly id: string; readonly role: 'lead' | 'teammate' }) => Promise<void>
  /** Company workspace files read by cultivation views. */
  readonly cultivationFiles: CultivationFiles
  /** 人侧动作面（GUI 版 /cultivation；工厂见 `cultivation-actions.ts`）。 */
  readonly cultivationActions: CultivationActionsFactory
  /** Session list used as the role-projection source. */
  readonly roleSource: RoleBadgeInjected['roleSource']
  /** Read the current motion ledger for a session. */
  readonly readLedger: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>
  /** Read the generated deliverables index for a session. */
  readonly readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>
  /** 背景候选/预览源（按面板所在会话取）。 */
  readonly contextSources: (sessionId: SessionId) => CultivationContextSources
  /** 打开背景原文：容器做可达性预检 + 导航；失败给可读原因。 */
  readonly openContext: (sessionId: SessionId, context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false, readonly problem: string }>
  /** 当前语言的 translator（由 apply 绑定 `company` 字典）。 */
  readonly t: CompanyT
}

interface TabRegistration {
  readonly id: string
  readonly kind: string
  /** 身份行的键（tone/glyph/组件唯一家 = tab-icons 的 TAB_IDENTITY；label/tooltip/description 的 key 与值住 tab-copy.ts / locales.ts）。 */
  readonly face: FaceKey
  readonly order: number
  readonly registerBody: (scoped: CompanyTabContext, id: string, data: CompanyTabRegistrationData) => Dispose
}

/** Each tab's identity, type metadata, and three keyed renderers live in one catalog. */
const TAB_REGISTRATIONS = [
  {
    id: 'dsh-company-pack/attention', kind: 'company-attention', face: 'attention',
    order: 50,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS, inject: () => ({
        follow: data.follow,
        floatTab: data.floatTab,
        unfloatTab: data.unfloatTab,
        getPending: () => data.attention.list(),
        openSession: (sessionId: SessionId) => { scoped.uiWorkspace.openSession(sessionId) },
        leadOf: data.leadOf,
      }),
    }, AttentionTab),
  },
  {
    id: 'dsh-company-pack/board', kind: 'company-board', face: 'board',
    order: 51,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, BoardTab),
  },
  {
    id: 'dsh-company-pack/dag', kind: 'company-dag', face: 'dag',
    order: 52,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, DagTab),
  },
  {
    id: 'dsh-company-pack/presence', kind: 'company-presence', face: 'presence',
    order: 53,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, openMember: data.openMember, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, PresenceTab),
  },
  {
    id: 'dsh-company-pack/budget', kind: 'company-budget', face: 'budget',
    order: 54,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, BudgetTab),
  },
  {
    id: 'dsh-company-pack/tasks', kind: 'company-tasks', face: 'tasks',
    order: 55,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, TasksTab),
  },
  {
    id: 'dsh-company-pack/cultivation', kind: 'company-cultivation', face: 'cultivation',
    order: 56,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({
        floatTab: data.floatTab,
        unfloatTab: data.unfloatTab,
        cultivationFiles: data.cultivationFiles,
        cultivationActions: data.cultivationActions,
        followEvents: data.follow,
        roleSource: data.roleSource,
        contextSources: data.contextSources,
        openContext: data.openContext,
      }),
    }, CultivationTab),
  },
  {
    id: 'dsh-company-pack/ledger', kind: 'company-ledger', face: 'ledger',
    order: 57,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({ floatTab: data.floatTab, unfloatTab: data.unfloatTab, readLedger: data.readLedger }),
    }, LedgerTab),
  },
  {
    id: 'dsh-company-pack/deliverables', kind: 'company-deliverables', face: 'catalog',
    order: 58,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({
        floatTab: data.floatTab,
        unfloatTab: data.unfloatTab,
        readCatalog: data.readCatalog,
        openFinal: (sessionId: SessionId, path: string) => {
          scoped.sidebarRight.openResource(sessionFileAddress(sessionId, path))
        },
      }),
    }, DeliverablesTab),
  },
] satisfies readonly TabRegistration[]

/**
 * Register the Company tab types and their body, title, and guide entries.
 *
 * Cordis owns the independent slot declaration waits, fiber lifetime, disposal,
 * and reinstallation. The fixed tab catalog keeps the four contributions aligned.
 * @param scoped - injected Client context that owns the tab and slot registrations.
 * @param data - apply-local callbacks and data sources consumed by tab bodies.
 */
export function registerCompanyTabs(scoped: CompanyTabContext, data: CompanyTabRegistrationData): void {
  const t = data.t
  // ⚠ 文案必须在 thunk 里按当前语言取：注册时捕获字符串会让切换语言后页签条/guide 停在旧语言
  // （标题组件自己拿 t，会跟着变；registry 的 title/guide 是 thunk，必须每次重取）。
  const copyOf = (face: FaceKey) => tabCopyFor(face, t)
  for (const tab of TAB_REGISTRATIONS) {
    const face = TAB_IDENTITY[tab.face]
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: tab.id,
      kind: tab.kind,
      priority: 'extension',
      title: () => copyOf(tab.face).label,
      guide: [{ id: tab.id, order: tab.order, title: () => copyOf(tab.face).label, description: () => copyOf(tab.face).description, icon: face.Icon }],
    }), `company-pack: ${tab.kind} tab type`)
  }

  scoped.slots.inject('sidebar.right.pane.tab', () =>
    TAB_REGISTRATIONS.map(tab => tab.registerBody(scoped, tab.id, data)))

  scoped.slots.inject('sidebar.right.pane.tab.title', () =>
    TAB_REGISTRATIONS.map(tab => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: tab.id, locale: COMPANY_NS }, TAB_IDENTITY[tab.face].Title)))

  const openTab = (kind: string): void => { scoped.sidebarRight.openTab(kind) }
  scoped.slots.inject('sidebar.right.tab.guide.entry', () =>
    TAB_REGISTRATIONS.map(tab => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: tab.id, locale: COMPANY_NS, inject: () => ({ openTab }) }, TAB_IDENTITY[tab.face].Entry)))
}

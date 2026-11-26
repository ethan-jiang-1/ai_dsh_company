/** Company tab type and keyed renderer registrations. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { WorkspaceTextRead } from '../cultivation/cultivation-data.ts'
import type { AttentionRegistry } from '../wiring/attention-registry.ts'
import type { SessionPageFace } from '../presence/attention-history.ts'
import type { FloatRectLike } from '../ui/float-geometry.ts'
import type { CultivationActionsFactory } from '../cultivation/cultivation-actions.ts'
import type { CultivationFiles } from '../cultivation/cultivation-data.ts'
import type { CultivationContextSources } from '../cultivation/cultivation-context-data.ts'
import type { CultivationContext } from '../../lib/cultivation/cultivation-context.ts'
import type { SaveResult } from '../startup/StrategyPanel.tsx'
import type { StartupStore } from '../startup/startup-store.ts'
import type { StartupField } from '../../lib/startup/startup-settings.ts'
import { sessionFileAddress } from '../../lib/deliverables/deliverables-address.ts'
import { ArchiveHubTab, OpsHubTab, TeamHubTab } from './company-hub-tabs.tsx'
import { createHubSubViewStore, type HubId, type HubSubViewState, type HubSubViewStore } from './hub-subview-store.ts'
import { TAB_IDENTITY, type FaceKey } from '../ui/tab-icons.tsx'
import { tabCopyFor } from './tab-copy.ts'
import { COMPANY_NS, type CompanyT } from '../locales.ts'
import type { TeamStreamFrame } from '../../lib/presence/presence.ts'
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
  /** Compatibility docking callback. */
  readonly unfloatTab?: (paneId: string) => void
  /** Open the selected member's session. */
  readonly openMember: (sessionId: SessionId, member: { readonly id: string; readonly role: 'lead' | 'teammate' }) => Promise<void>
  /** Open teammate subagent chat in a split right-sidebar pane. */
  readonly openMemberAside?: (sessionId: SessionId, memberId: string) => void
  /** Company workspace files read by cultivation views. */
  readonly cultivationFiles: CultivationFiles
  /** 人侧动作面（GUI 版 /cultivation；工厂见 `cultivation-actions.ts`）。 */
  readonly cultivationActions: CultivationActionsFactory
  /** Session list used as the role-projection source. */
  readonly roleSource: RoleBadgeInjected['roleSource']
  /** Read the current motion ledger for a session. */
  readonly readLedger: (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>
  /** Read the generated deliverables index for a session. */
  readonly readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>
  /** 背景候选/预览源（按面板所在会话取）。 */
  readonly contextSources: (sessionId: SessionId) => CultivationContextSources
  /** 打开背景原文：容器做可达性预检 + 导航；失败给可读原因。 */
  readonly openContext: (sessionId: SessionId, context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false, readonly problem: string }>
  /** 当前语言的 translator（由 apply 绑定 `company` 字典）。 */
  readonly t: CompanyT
  /** 启动策略共享仓（面板与 composer 按钮共用）。 */
  readonly startupStore: StartupStore
  /** 读盘刷新启动策略。 */
  readonly loadStartup: (sessionId: SessionId, signal: AbortSignal) => Promise<void>
  /** 保存一个启动策略字段。 */
  readonly saveStartup: (sessionId: SessionId, field: StartupField, value: string | null) => Promise<SaveResult>
  /** 全部恢复自动。 */
  readonly resetStartup: (sessionId: SessionId) => Promise<SaveResult>
  /** 读一个会话的历史事件（跨会话重建挂起项的唯一通道；见 presence/attention-history.ts）。 */
  readonly pageHistory: SessionPageFace
  /** 三合一右栏集成页签共享子视图状态仓。 */
  readonly hubStore?: HubSubViewStore
  /** 双分栏/清净布局快捷预设。 */
  readonly openSplit?: (preset: 'ops' | 'review' | 'quiet') => void
}

interface TabRegistration {
  readonly id: string
  readonly kind: string
  /** 身份行的键（tone/glyph/组件唯一家 = tab-icons 的 TAB_IDENTITY；label/tooltip/description 的 key 与值住 tab-copy.ts / locales.ts）。 */
  readonly face: FaceKey
  readonly order: number
  readonly registerBody: (
    scoped: CompanyTabContext,
    id: string,
    data: CompanyTabRegistrationData,
    hubStore: HubSubViewStore,
  ) => Dispose
}

/** Shared hub props injected across all three cohesive Company tabs. */
function baseHubInject(data: CompanyTabRegistrationData, hubStore: HubSubViewStore) {
  return {
    hooks: { hubState: hubStore.store },
    selectSection: <K extends HubId>(hub: K, section: HubSubViewState[K]) => { hubStore.select(hub, section) },
    ...(data.openSplit === undefined ? {} : { openSplit: data.openSplit }),
    t: data.t,
    follow: data.follow,
    floatTab: data.floatTab,
    unfloatTab: data.unfloatTab,
  }
}

/** 3 个聚合页签声明：保留单行 `id / kind / face` 结构供 tab-catalog 门禁解析。 */
const TAB_REGISTRATIONS = [
  {
    id: 'dsh-company-pack/ops', kind: 'company-ops', face: 'ops',
    order: 20,
    registerBody: (scoped, id, data, hubStore) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({
        ...baseHubInject(data, hubStore),
        leadOf: data.leadOf,
        startupStore: data.startupStore,
        loadStartup: data.loadStartup,
        saveStartup: data.saveStartup,
        resetStartup: data.resetStartup,
      }),
    }, OpsHubTab),
  },
  {
    id: 'dsh-company-pack/team', kind: 'company-team', face: 'team',
    order: 30,
    registerBody: (scoped, id, data, hubStore) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({
        ...baseHubInject(data, hubStore),
        attention: data.attention,
        pageHistory: data.pageHistory,
        leadOf: data.leadOf,
        openSession: (sessionId: SessionId) => { scoped.uiWorkspace.openSession(sessionId) },
        openMember: data.openMember,
        openMemberAside: data.openMemberAside,
      }),
    }, TeamHubTab),
  },
  {
    id: 'dsh-company-pack/archive', kind: 'company-archive', face: 'archive',
    order: 40,
    registerBody: (scoped, id, data, hubStore) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, locale: COMPANY_NS,
      inject: () => ({
        ...baseHubInject(data, hubStore),
        cultivationFiles: data.cultivationFiles,
        cultivationActions: data.cultivationActions,
        roleSource: data.roleSource,
        readLedger: data.readLedger,
        readCatalog: data.readCatalog,
        contextSources: data.contextSources,
        openContext: data.openContext,
        openFinal: (sessionId: SessionId, path: string) => {
          scoped.sidebarRight.openResource(sessionFileAddress(sessionId, path))
        },
      }),
    }, ArchiveHubTab),
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
  const hubStore = data.hubStore ?? createHubSubViewStore()
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
    TAB_REGISTRATIONS.map(tab => tab.registerBody(scoped, tab.id, data, hubStore)))

  scoped.slots.inject('sidebar.right.pane.tab.title', () =>
    TAB_REGISTRATIONS.map(tab => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: tab.id, locale: COMPANY_NS }, TAB_IDENTITY[tab.face].Title)))

  const openTab = (kind: string): void => { scoped.sidebarRight.openTab(kind) }
  scoped.slots.inject('sidebar.right.tab.guide.entry', () =>
    TAB_REGISTRATIONS.map(tab => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: tab.id, locale: COMPANY_NS, inject: () => ({ openTab }) }, TAB_IDENTITY[tab.face].Entry)))
}

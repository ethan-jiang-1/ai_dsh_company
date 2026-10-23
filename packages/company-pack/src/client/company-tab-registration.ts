/** Company tab type and keyed renderer registrations. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { AttentionTab } from './AttentionTab.tsx'
import type { AttentionRegistry } from './attention-registry.ts'
import type { FloatRectLike } from './float-geometry.ts'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from './company-tabs.tsx'
import type { CultivationActionsFactory } from './cultivation-actions.ts'
import type { CultivationFiles } from './cultivation-data.ts'
import type { CultivationContextSources } from './cultivation-context-data.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'
import { CultivationTab } from './CultivationTab.tsx'
import { DeliverablesTab } from './DeliverablesTab.tsx'
import { LedgerTab } from './LedgerTab.tsx'
import { sessionFileAddress } from '../lib/deliverables-address.ts'
import { TAB_IDENTITY, type FaceKey } from './tab-icons.tsx'
import type { TeamStreamFrame } from '../lib/presence.ts'
import type { RoleBadgeInjected } from './RoleBadge.tsx'

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
}

interface TabRegistration {
  readonly id: string
  readonly kind: string
  /** 身份行的键（label/tooltip/tone/glyph 与三种渲染的唯一家 = tab-icons 的 TAB_IDENTITY）。 */
  readonly face: FaceKey
  readonly description: string
  readonly order: number
  readonly registerBody: (scoped: CompanyTabContext, id: string, data: CompanyTabRegistrationData) => Dispose
}

/** Each tab's identity, type metadata, and three keyed renderers live in one catalog. */
const TAB_REGISTRATIONS = [
  {
    id: 'dsh-company-pack/attention', kind: 'company-attention', face: 'attention',
    description: '人的待办收件箱：待批审批 / 待答问询 / 升级 + 完成通知', order: 50,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id, inject: () => ({
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
    description: '任务看板：活到哪一步（owner / 依赖 / 修订号）', order: 51,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, BoardTab),
  },
  {
    id: 'dsh-company-pack/dag', kind: 'company-dag', face: 'dag',
    description: '任务依赖图：谁依赖谁、关键路径', order: 52,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, DagTab),
  },
  {
    id: 'dsh-company-pack/presence', kind: 'company-presence', face: 'presence',
    description: '组织在场板：谁在忙、忙什么；点行进成员空间', order: 53,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, openMember: data.openMember, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, PresenceTab),
  },
  {
    id: 'dsh-company-pack/budget', kind: 'company-budget', face: 'budget',
    description: '令牌用量与占比（只做令牌，不做美元）', order: 54,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, BudgetTab),
  },
  {
    id: 'dsh-company-pack/tasks', kind: 'company-tasks', face: 'tasks',
    description: '共享任务表：状态 / owner / 依赖 / 修订号', order: 55,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, TasksTab),
  },
  {
    id: 'dsh-company-pack/cultivation', kind: 'company-cultivation', face: 'cultivation',
    description: '养自己的角色分身：待处理建议 / 已采纳方法 / journal 待审 / 赞踩', order: 56,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
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
    description: '动议台账：公司累计干了什么（日期/类型/参与/成品/结论）', order: 57,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ floatTab: data.floatTab, unfloatTab: data.unfloatTab, readLedger: data.readLedger }),
    }, LedgerTab),
  },
  {
    id: 'dsh-company-pack/deliverables', kind: 'company-deliverables', face: 'catalog',
    description: '公司成品目录：按 final.md 列成品（日期/类型/结果/结论）', order: 58,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
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
  for (const tab of TAB_REGISTRATIONS) {
    const face = TAB_IDENTITY[tab.face]
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: tab.id,
      kind: tab.kind,
      priority: 'extension',
      title: () => face.label,
      guide: [{ id: tab.id, order: tab.order, title: () => face.label, description: () => tab.description, icon: face.Icon }],
    }), `company-pack: ${tab.kind} tab type`)
  }

  scoped.slots.inject('sidebar.right.pane.tab', () =>
    TAB_REGISTRATIONS.map(tab => tab.registerBody(scoped, tab.id, data)))

  scoped.slots.inject('sidebar.right.pane.tab.title', () =>
    TAB_REGISTRATIONS.map(tab => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: tab.id }, TAB_IDENTITY[tab.face].Title)))

  const openTab = (kind: string): void => { scoped.sidebarRight.openTab(kind) }
  scoped.slots.inject('sidebar.right.tab.guide.entry', () =>
    TAB_REGISTRATIONS.map(tab => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: tab.id, inject: () => ({ openTab }) }, TAB_IDENTITY[tab.face].Entry)))
}

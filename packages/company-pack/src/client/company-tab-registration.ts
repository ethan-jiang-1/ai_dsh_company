/** Company tab type and keyed renderer registrations. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { ReactNode } from 'react'
import { AttentionTab } from './AttentionTab.tsx'
import type { AttentionRegistry } from './attention-registry.ts'
import type { FloatRectLike } from './float-geometry.ts'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from './company-tabs.tsx'
import type { CultivationFiles } from './cultivation-data.ts'
import { CultivationTab } from './CultivationTab.tsx'
import { LedgerTab } from './LedgerTab.tsx'
import {
  AttentionTabTitle, BoardTabTitle, BudgetTabTitle, CultivationTabTitle,
  DagTabTitle, LedgerTabTitle, PresenceTabTitle, TasksTabTitle,
  AttentionGuideEntry, BoardGuideEntry, BudgetGuideEntry, CultivationGuideEntry,
  DagGuideEntry, LedgerGuideEntry, PresenceGuideEntry, TasksGuideEntry,
  AttentionGuideIcon, BoardGuideIcon, BudgetGuideIcon, CultivationGuideIcon,
  DagGuideIcon, LedgerGuideIcon, PresenceGuideIcon, TasksGuideIcon,
} from './tab-icons.tsx'
import type { TeamStreamFrame } from '../lib/presence.ts'
import type { RoleBadgeInjected } from './RoleBadge.tsx'

type CompanyTabContext = Pick<ClientContext, 'effect' | 'sidebarRightTabs' | 'slots' | 'sidebarRight' | 'uiWorkspace'>
type GuideIcon = (props: { readonly size?: number | undefined; readonly className?: string | undefined }) => ReactNode
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
  /** Session list used as the role-projection source. */
  readonly roleSource: RoleBadgeInjected['roleSource']
  /** Read the current motion ledger for a session. */
  readonly readLedger: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>
}

interface TabRegistration {
  readonly id: string
  readonly kind: string
  readonly title: string
  readonly description: string
  readonly order: number
  readonly icon: GuideIcon
  readonly registerBody: (scoped: CompanyTabContext, id: string, data: CompanyTabRegistrationData) => Dispose
  readonly registerTitle: (scoped: CompanyTabContext, id: string) => Dispose
  readonly registerGuide: (scoped: CompanyTabContext, id: string, openTab: (kind: string) => void) => Dispose
}

/** Each tab's identity, type metadata, and three keyed renderers live in one catalog. */
const TAB_REGISTRATIONS = [
  {
    id: 'dsh-company-pack/attention', kind: 'company-attention', title: '待办',
    description: '人的待办收件箱：待批审批 / 待答问询 / 升级 + 完成通知', order: 50,
    icon: AttentionGuideIcon,
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
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, AttentionTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, AttentionGuideEntry),
  },
  {
    id: 'dsh-company-pack/board', kind: 'company-board', title: '看板',
    description: '任务看板：活到哪一步（owner / 依赖 / 修订号）', order: 51,
    icon: BoardGuideIcon,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, BoardTab),
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, BoardTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, BoardGuideEntry),
  },
  {
    id: 'dsh-company-pack/dag', kind: 'company-dag', title: '依赖图',
    description: '任务依赖图：谁依赖谁、关键路径', order: 52,
    icon: DagGuideIcon,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, DagTab),
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, DagTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, DagGuideEntry),
  },
  {
    id: 'dsh-company-pack/presence', kind: 'company-presence', title: '在场',
    description: '组织在场板：谁在忙、忙什么；点行进成员空间', order: 53,
    icon: PresenceGuideIcon,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, openMember: data.openMember, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, PresenceTab),
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, PresenceTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, PresenceGuideEntry),
  },
  {
    id: 'dsh-company-pack/budget', kind: 'company-budget', title: '用量',
    description: '令牌用量与占比（只做令牌，不做美元）', order: 54,
    icon: BudgetGuideIcon,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, BudgetTab),
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, BudgetTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, BudgetGuideEntry),
  },
  {
    id: 'dsh-company-pack/tasks', kind: 'company-tasks', title: '任务板',
    description: '共享任务表：状态 / owner / 依赖 / 修订号', order: 55,
    icon: TasksGuideIcon,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }),
    }, TasksTab),
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, TasksTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, TasksGuideEntry),
  },
  {
    id: 'dsh-company-pack/cultivation', kind: 'company-cultivation', title: '培养',
    description: '养自己的角色分身：待处理建议 / 已采纳方法 / journal 待审 / 赞踩', order: 56,
    icon: CultivationGuideIcon,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({
        floatTab: data.floatTab,
        unfloatTab: data.unfloatTab,
        cultivationFiles: data.cultivationFiles,
        followEvents: data.follow,
        roleSource: data.roleSource,
      }),
    }, CultivationTab),
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, CultivationTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, CultivationGuideEntry),
  },
  {
    id: 'dsh-company-pack/ledger', kind: 'company-ledger', title: '台账',
    description: '动议台账：公司累计干了什么（日期/类型/参与/成品/结论）', order: 57,
    icon: LedgerGuideIcon,
    registerBody: (scoped, id, data) => scoped.slots.register({
      name: 'sidebar.right.pane.tab', key: id,
      inject: () => ({ floatTab: data.floatTab, unfloatTab: data.unfloatTab, readLedger: data.readLedger }),
    }, LedgerTab),
    registerTitle: (scoped, id) => scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: id }, LedgerTabTitle),
    registerGuide: (scoped, id, openTab) => scoped.slots.register({ name: 'sidebar.right.tab.guide.entry', key: id, inject: () => ({ openTab }) }, LedgerGuideEntry),
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
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: tab.id,
      kind: tab.kind,
      priority: 'extension',
      title: () => tab.title,
      guide: [{ id: tab.id, order: tab.order, title: () => tab.title, description: () => tab.description, icon: tab.icon }],
    }), `company-pack: ${tab.kind} tab type`)
  }

  scoped.slots.inject('sidebar.right.pane.tab', () =>
    TAB_REGISTRATIONS.map(tab => tab.registerBody(scoped, tab.id, data)))

  scoped.slots.inject('sidebar.right.pane.tab.title', () =>
    TAB_REGISTRATIONS.map(tab => tab.registerTitle(scoped, tab.id)))

  const openTab = (kind: string): void => { scoped.sidebarRight.openTab(kind) }
  scoped.slots.inject('sidebar.right.tab.guide.entry', () =>
    TAB_REGISTRATIONS.map(tab => tab.registerGuide(scoped, tab.id, openTab)))
}

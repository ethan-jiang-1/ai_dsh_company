/** 浏览器半：部署品牌（侧栏）+ 团队任务板（会话头部）+ 公司驾驶舱页签（右栏，R5b）。 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ReactNode } from 'react'
import type { PaneId, TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-files/remote'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { FloatRectLike } from './float-geometry.ts'
import { WocheBrandName } from './Brand.tsx'
import { AttentionTab } from './AttentionTab.tsx'
import { createAttentionRegistry } from './attention-registry.ts'
import { createCompanyView } from './CompanyView.tsx'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from './company-tabs.tsx'
import { CultivationTab } from './CultivationTab.tsx'
import { LedgerTab } from './LedgerTab.tsx'
import {
  AttentionTabTitle, BoardTabTitle, BudgetTabTitle, CultivationTabTitle,
  DagTabTitle, LedgerTabTitle, PresenceTabTitle, TasksTabTitle,
  AttentionGuideIcon, BoardGuideIcon, BudgetGuideIcon, CultivationGuideIcon,
  DagGuideIcon, LedgerGuideIcon, PresenceGuideIcon, TasksGuideIcon,
  AttentionGuideEntry, BoardGuideEntry, BudgetGuideEntry, CultivationGuideEntry,
  DagGuideEntry, LedgerGuideEntry, PresenceGuideEntry, TasksGuideEntry,
} from './tab-icons.tsx'
import { DELEGATION_TOOL_KEYS } from './delegation-keys.ts'
import { DelegationCard } from './DelegationCard.tsx'
import { installStyles } from './styles.ts'
import { ROLE_SHORT, RoleBadge, readPresetOf, sessionTitleOf } from './RoleBadge.tsx'
import { TasksAction } from './TasksPanel.tsx'
import { TEAM_TOOL_KEYS, TeamToolCard } from './TeamToolCard.tsx'

/** Required services: the slot registry plus the remote namespace we read. */
export const inject = ['slots', 'remote', 'sessions']

/** 公司整页视图的 cell id（`conversation.view` list 槽的 id；与官方 chat / trajectory 并列）。 */
const COMPANY_VIEW_ID = 'dsh-company-pack/company'

/**
 * 本包 client 面登记四处：委派工具卡（R3）、部署品牌、会话头部任务板、公司驾驶舱页签（R5b）。
 *
 * 谁挂 remote：官方 `client-ui-agent-team` 行（本包 cordis.patch.yml 插入的 `ui-agent-team`）
 * 自己 `$mount` 生成的 Team Remote——本入口**不再重复挂**。同一描述符挂第二次会在 client
 * api 抛 "already mounted"，把整个 Web UI 砖在 BootPage 错误屏（postmortem 0003）。
 * 90ce2f1 "官方模块在本构建形态挂不上"的前提已证伪：`dsh.client.inject` 是 informational
 * only（不排序、不 gate 加载），`ui-primitives` 是 shell 预置的 baseline 模块
 * （vendor `packages/client/web/src/platform.ts` 的 `PLATFORM_MODULES`）。
 * 任务板与品牌槽读 Lead 的 `agentTeam` 投影（0.1.7 起 team 态不走 RPC）：fiber 等官方挂载完成才注册；
 * 官方缺席时本贡献保持 PENDING（板不出现），不会崩。
 * **委派工具卡只依赖 `slots`**（它渲染的是 call/result 切片，不读团队状态），所以单独 inject——
 * 别让它被 team remote 的缺席拖住。
 * **驾驶舱页签（R5b）**另需 `sidebarRightTabs` 服务（`ui-sidebar-right` 的 tab 注册面）；
 * 行数据与任务板同走 slot props 的 `useSessions` 座位读 `agentTeam` 投影（升 0.1.7 时由 `remote.agentTeams.view` 改判）。
 * @param ctx - Client root context.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  // CSS 与 fiber 同寿命；重新挂载读取新样式，卸载仅清理本次节点。
  ctx.effect(installStyles)

  // 角色身份 UX · C 段：窗口标题带角色 + 整窗角色色条（2026-09-26 立，提案 §五 C）。
  // vendor 的 DocumentTitle 只在 activePanelId===null 时显示会话标题（用户真实用法下不可靠，
  // 实测"压根儿找不到变化"）⇒ 本效果无条件接管标题：始终「【角色】会话标题」；
  // 并把当前角色写到 :root[data-wk-role] 供 CSS 顶部色条使用。
  // 数据 = 上游 agentPreset 投影（A 段已验）+ 会话列表标题；订阅快照，无轮询。
  ctx.inject(['sessions'], (scoped) => {
    scoped.effect(() => {
      const list = scoped.sessions.list
      const update = (): void => {
        const state = list.getSnapshot()
        const current = Object.values(state.byId).find(s => (s.retainedBy.mainView ?? 0) > 0)
        const preset = current === undefined ? null : readPresetOf(list, current.id)
        const short = preset === null ? undefined : ROLE_SHORT[preset]
        const rawTitle = current === undefined ? undefined : sessionTitleOf(current)
        if (rawTitle !== undefined && rawTitle !== '') {
          document.title = short === undefined ? rawTitle : `【${short}】${rawTitle}`
        }
        const root = document.documentElement
        if (short === undefined) delete root.dataset.wkRole
        else root.dataset.wkRole = preset ?? ''
      }
      update()
      return list.subscribe(update)
    })
  })

  // 驾驶舱①·「待办」：挂起项登记处（apply 闭包内创建——client 纪律禁模块级单例）。
  // 观察者写入 / 页签读取共享同一实例。
  const attention = createAttentionRegistry()

  // 驾驶舱①·远端事件观察者（跨会话、实时）：user-questions/request（待答问询）与
  // approval/request（待批审批；切片二落地前不会触发，管线先行）。⚠ 只登记、**永远委托**
  // （next()）——本监听者是观察者不是应答者，真应答走官方 ui-user-questions / ui-approval
  // 的 waterfall；this = 事件归属 owner ctx，scopeOf → 发起会话（同款 ui-approval 手法）。
  ctx.inject(['sessions', 'remote'], (scoped) => {
    scoped.remote.$on('user-questions/request', function (request, next) {
      const sessionId = scoped.sessions.scopeOf(this)
      if (sessionId === undefined) return next()
      const first = request.questions[0]
      const done = attention.begin({
        kind: 'question',
        sessionId,
        what: typeof first?.question === 'string' && first.question.trim() !== ''
          ? first.question.trim()
          : '（问询内容缺失）',
        since: Date.now(),
      })
      return (async () => { try { return await next() } finally { done() } })()
    })
    scoped.remote.$on('approval/request', function (request, next) {
      const sessionId = scoped.sessions.scopeOf(this)
      if (sessionId === undefined) return next()
      const done = attention.begin({
        kind: 'approval',
        sessionId,
        what: typeof request.reason === 'string' && request.reason.trim() !== ''
          ? `${request.toolName}：${request.reason.trim()}`
          : request.toolName,
        since: Date.now(),
      })
      return (async () => { try { return await next() } finally { done() } })()
    })
  })

  // 委派工具卡（R3）+ 团队工具卡（S2）：把 CEO 的命名委托与团队动作渲染成公司语义的卡。
  // keyed slot 的 key 域是**开放**的（槽合同原话："a typo simply never renders"），
  // 所以 key 必须与 preset 里的 toolName / 官方工具名逐字一致——拼错不报错、只是永远不渲染。
  ctx.inject(['slots'], (scoped) => {
    // rc.2 起**一键一 inject**（官方内置 toolview 全是这个形状：`readToolview`/`presentRow`…）。
    // 旧写法（一个 inject 回调里返回 disposer 数组）在 rc.2 下不再生效 ⇒ 委派卡/团队卡退化成通用行。
    // priority -1：keyed 槽 lowest renders——rc.2 的 vendor details-toolview 也在 spawn_teammate/
    // send_message/list_agents 等键上注册（priority 0），同键同优先级会 throw；我们 richer 的卡
    // 必须压过通用明细行 ⇒ 显式 -1（2026-09-25 UX 实验现场抓到，dag-probe 控制台红证）。
    for (const key of DELEGATION_TOOL_KEYS) {
      scoped.slots.inject('tool.call.toolview', () =>
        scoped.slots.register({ name: 'tool.call.toolview', key, priority: -1 }, DelegationCard))
    }
    for (const key of TEAM_TOOL_KEYS) {
      scoped.slots.inject('tool.call.toolview', () =>
        scoped.slots.register({ name: 'tool.call.toolview', key, priority: -1 }, TeamToolCard))
    }
  })

  ctx.inject(['sessions', 'sidebarRight', 'slots'], (scoped) => {
    scoped.slots.inject('sidebar.brand.name', () =>
      scoped.slots.register({ name: 'sidebar.brand.name' }, WocheBrandName))

    // 角色身份 UX · B 段：侧栏会话行首的角色徽标（官方 ambient 行装饰位，仅 idle 行渲染）。
    // root 作用域只给 sessionId（槽合同原话"nothing else"）⇒ 数据经 inject 面注入
    // 会话列表快照；徽标内部用 useSyncExternalStore 订阅上游 agentPreset 投影。
    // 无角色/未知 preset 优雅降级为不渲染（RoleBadge 返回 null）。
    scoped.slots.inject('sidebar.session.row.leading', () =>
      scoped.slots.register({
        name: 'sidebar.session.row.leading',
        id: 'company-role-badge',
        order: 0,
        inject: () => ({ roleSource: sessions.list }),
      }, RoleBadge))

    const sessions = scoped.sessions
    /** 子代理会话归到它的 Lead：团队状态挂在 Lead 上。 */
    const leadSessionId = (sessionId: SessionId): SessionId => {
      const address = sessions.subagentAddress(sessionId)
      return address?.parentSessionId ?? sessionId
    }
    // 条目 ② S3：头部按钮从 anchored 弹窗改为打开右栏平台页签（与官方 Agent Team 弹窗不再互盖）。
    scoped.slots.inject('conversation.session.header.actions', () =>
      scoped.slots.register({
        name: 'conversation.session.header.actions',
        id: 'company-tasks',
        order: 21,
        inject: () => ({
          leadOf: leadSessionId,
          openTasks: () => { scoped.sidebarRight.openTab('company-tasks') },
        }),
      }, TasksAction))
  })

  // 公司页签（条目 ② S1b）：五个**平台页签**——看板 / 依赖图 / 在场 / 用量 / 任务板。
  // 只有平台级 tab 才能被 `ctx.sidebarRight.float(tabId)` 拖出成浮窗（可移动/可缩放/最小 220×140/
  // 点击置顶），也才能被 split 并看（A1 决定）。原「公司驾驶舱」页签（R5b）与新的「在场」重复，
  // 按"一处事实一个家"合并：驾驶舱内容升级为「在场」页签（行可点 + 流式动态），旧 tab 退役。
  // ⚠ remote 按命名空间 inject：`remote.session`（follow 流）
  //    + `remote.workspaceFiles`（培养面板读 kb/<role>/journal/）。
  ctx.inject(['sessions', 'uiWorkspace', 'remote.session', 'remote.workspaceFiles', 'slots', 'sidebarRight', 'sidebarRightTabs'], (scoped) => {
    const sessions = scoped.sessions
    /** 子代理会话归到它的 Lead：团队状态挂在 Lead 上。 */
    const leadOf = (sessionId: SessionId): SessionId => {
      const address = sessions.subagentAddress(sessionId)
      return address?.parentSessionId ?? sessionId
    }
    /** 平台浮出（S2）：把页签拽出成浮窗；rect = 记忆摆位（浮窗几何记忆 RFC，缺省 = 平台级联位）；收回由浮窗自带的 dock 按钮负责（平台能力，不自造）。 */
    const floatTab = (tabId: TabId, rect?: FloatRectLike): void => { scoped.sidebarRight.float(tabId, rect) }
    const unfloatTab = (paneId: string): void => { scoped.sidebarRight.dock(paneId as PaneId) }
    // 协作动态的流式源：`session/follow` 是 WebSocket 流，快照给历史、其后给实时；
    // 只取团队事件（wire 形状 → 领域形状的最小投影），assistant-stream 帧与视图无关。
    const follow = async function* (sessionId: SessionId, signal: AbortSignal) {
      const address = { kind: 'session' as const, sessionId: leadOf(sessionId) }
      for await (const frame of scoped.remote.session.follow({ address }, signal)) {
        if (frame.type === 'snapshot') {
          yield { kind: 'history' as const, events: frame.records.map(record => record.event) }
        } else if (frame.type === 'event') {
          yield { kind: 'event' as const, event: frame.event }
        }
      }
    }
    /** D-d 成员空间入口（rc.2：导航统一走 `uiWorkspace.openSession`；`sessions.open/openSubagent` 已移除）。 */
    const openMember = async (
      sessionId: SessionId,
      member: { readonly id: string; readonly role: 'lead' | 'teammate' },
    ): Promise<void> => {
      const lead = leadOf(sessionId)
      if (member.role === 'lead') {
        scoped.uiWorkspace.openSession(lead)
        return
      }
      // 官方同款守卫：主视图没保留这个会话时不导航（避免把视图拽到不可见会话）。
      if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0) return
      await sessions.refresh()
      scoped.uiWorkspace.openSession({ parentSessionId: lead, childSessionId: member.id as SessionId, mode: 'continuable' })
    }

    /**
     * 注册一个公司页签**类型**（tab registry 静态半边；keyed 槽体在下面一起登记）。
     * @param id - tab 类型 id（= keyed 槽的 key）。
     * @param kind - `openTab` 用的 kind。
     * @param title - 页签与 guide 的标题。
     * @param description - guide 描述。
     * @param order - guide 排序。
     * @param icon - guide 条目 icon（右栏 Start 页那排胶囊；不填则出厂立方体占位——
     *   RFC icon × 语义色向：与页签 chip / 浮窗头同一 glyph 同一 tone）。
     */
    const registerType = (
      id: string, kind: string, title: string, description: string, order: number,
      icon: (props: { readonly size?: number | undefined; readonly className?: string | undefined }) => ReactNode,
    ): void => {
      scoped.effect(() => scoped.sidebarRightTabs.register({
        id,
        kind,
        priority: 'extension',
        title: () => title,
        guide: [{ id, order, title: () => title, description: () => description, icon }],
      }), `company-pack: ${kind} tab type`)
    }

    registerType('dsh-company-pack/attention', 'company-attention', '待办',
      '人的待办收件箱：待批审批 / 待答问询 / 升级 + 完成通知', 50, AttentionGuideIcon)
    registerType('dsh-company-pack/board', 'company-board', '看板',
      '任务看板：活到哪一步（owner / 依赖 / 修订号）', 51, BoardGuideIcon)
    registerType('dsh-company-pack/dag', 'company-dag', '依赖图',
      '任务依赖图：谁依赖谁、关键路径', 52, DagGuideIcon)
    registerType('dsh-company-pack/presence', 'company-presence', '在场',
      '组织在场板：谁在忙、忙什么；点行进成员空间', 53, PresenceGuideIcon)
    registerType('dsh-company-pack/budget', 'company-budget', '用量',
      '令牌用量与占比（只做令牌，不做美元）', 54, BudgetGuideIcon)
    registerType('dsh-company-pack/tasks', 'company-tasks', '任务板',
      '共享任务表：状态 / owner / 依赖 / 修订号', 55, TasksGuideIcon)
    registerType('dsh-company-pack/cultivation', 'company-cultivation', '培养',
      '养 Agent：journal 待审收件箱 + 提升流程', 56, CultivationGuideIcon)
    registerType('dsh-company-pack/ledger', 'company-ledger', '台账',
      '动议台账：公司累计干了什么（日期/类型/参与/成品/结论）', 57, LedgerGuideIcon)

    // 培养面板的文件读取闭包（驾驶舱④）：经会话身份读当前工作区；失败降级 null（面板如实显示）。
    const listJournal = async (sessionId: SessionId, role: string, signal: AbortSignal): Promise<readonly string[] | null> => {
      try {
        const result = await scoped.remote.workspaceFiles.list(leadOf(sessionId), `kb/${role}/journal`, signal)
        if (!result.ok) return null
        return result.value.entries
          .filter(entry => entry.type === 'file' && entry.name.endsWith('.md'))
          .map(entry => entry.name)
      } catch { return null }
    }
    const readHead = async (sessionId: SessionId, path: string, signal: AbortSignal): Promise<string | null> => {
      try {
        const result = await scoped.remote.workspaceFiles.read(leadOf(sessionId), path, { limit: 240 }, signal)
        if (!result.ok) return null
        return result.value.text
      } catch { return null }
    }
    const readLedger = async (sessionId: SessionId, signal: AbortSignal): Promise<string | null> => {
      try {
        const result = await scoped.remote.workspaceFiles.read(leadOf(sessionId), 'kb/motion-ledger.md', { limit: 240 }, signal)
        if (!result.ok) return null
        return result.value.text
      } catch { return null }
    }

    // keyed 槽体：与上面的类型共享同一 id；回调返回 disposer 数组（同工具卡那段写法）。
    // 「待办」的注入面另有挂起项快照（apply 登记处）与 sessions.open 跳转。
    scoped.slots.inject('sidebar.right.pane.tab', () => [      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/attention', inject: () => ({
          follow,
          floatTab,
          unfloatTab,
          getPending: () => attention.list(),
          openSession: (sessionId: SessionId) => { scoped.uiWorkspace.openSession(sessionId) },
          leadOf,
        }) },
        AttentionTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/board', inject: () => ({ leadOf, follow, floatTab, unfloatTab }) },
        BoardTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/dag', inject: () => ({ leadOf, follow, floatTab, unfloatTab }) },
        DagTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/presence', inject: () => ({ leadOf, follow, openMember, floatTab, unfloatTab }) },
        PresenceTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/budget', inject: () => ({ leadOf, follow, floatTab, unfloatTab }) },
        BudgetTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/tasks', inject: () => ({ leadOf, follow, floatTab, unfloatTab }) },
        TasksTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/cultivation', inject: () => ({ floatTab, unfloatTab, listJournal, readHead }) },
        CultivationTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/ledger', inject: () => ({ floatTab, unfloatTab, readLedger }) },
        LedgerTab),
    ])

    // 页签标题槽（RFC 2026-09-27 icon × 语义色向）：keyed 槽 sidebar.right.pane.tab.title
    // （vendor 契约注册可选、fallback 纯文本）——**一处注册两处生效**：页签条 chip 与
    // 浮窗头（FloatHeader 同一 renderer）都走这里。组件 = tab-icons.tsx 的 icon+文字。
    scoped.slots.inject('sidebar.right.pane.tab.title', () => [
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/attention' },
        AttentionTabTitle),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/board' },
        BoardTabTitle),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/dag' },
        DagTabTitle),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/presence' },
        PresenceTabTitle),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/budget' },
        BudgetTabTitle),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/tasks' },
        TasksTabTitle),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/cultivation' },
        CultivationTabTitle),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab.title', key: 'dsh-company-pack/ledger' },
        LedgerTabTitle),
    ])

    // guide 条目槽（Start 页胶囊接管；用户令 2026-09-27：挂 hover tooltip）：vendor guide
    // 只在条目 ≤4 时显示描述（MAX_DESCRIBED_ENTRIES=4），我们 8 条全被折叠成纯标题 ⇒
    // 走 keyed 槽 sidebar.right.tab.guide.entry 接管胶囊（vendor Tooltip + 点击 openTab）。
    scoped.slots.inject('sidebar.right.tab.guide.entry', () => [
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/attention', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        AttentionGuideEntry),
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/board', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        BoardGuideEntry),
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/dag', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        DagGuideEntry),
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/presence', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        PresenceGuideEntry),
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/budget', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        BudgetGuideEntry),
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/tasks', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        TasksGuideEntry),
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/cultivation', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        CultivationGuideEntry),
      scoped.slots.register(
        { name: 'sidebar.right.tab.guide.entry', key: 'dsh-company-pack/ledger', inject: () => ({ openTab: (kind: string) => { scoped.sidebarRight.openTab(kind) } }) },
        LedgerGuideEntry),
    ])
  })

  // 公司整页视图（条目 ① S1）：`conversation.view` 的第三个页签（Chat / Trajectory / 公司）。
  // 该槽**没有 inject 面**（catalog registerOptions 只有 id/order/label）且 team 投影是 host-only
  // ⇒ 数据面用注册处闭包注入（见 CompanyView 头注）；跨插件值导入仍被禁。
  // ⚠ remote 按命名空间 inject：`remote.session`（follow 流）。
  ctx.inject(['sessions', 'remote.session', 'sidebarRight', 'slots'], (scoped) => {
    const sessions = scoped.sessions
    /** 子代理会话归到它的 Lead：团队状态挂在 Lead 上。 */
    const leadOf = (sessionId: SessionId): SessionId => {
      const address = sessions.subagentAddress(sessionId)
      return address?.parentSessionId ?? sessionId
    }
    // 条目 ② S4：从公司视图直接浮出某个面板 = 打开对应平台页签 + `float`。
    // ⚠ openTab 的落位对 `active()` 的可见性有延迟（实测：同步读拿不到刚开的页签，float 静默
    // no-op）⇒ 推迟到宏任务并重试；带 kind 守卫防浮错别人的页签。重试耗尽 = 优雅降级
    //（页签已打开，用户可在页签头的「浮出」一键拽出）。
    const floatPanel = (kind: string): void => {
      scoped.sidebarRight.openTab(kind)
      const tryFloat = (attempt: number): void => {
        const active = scoped.sidebarRight.active()
        if (active !== undefined && active.kind === kind) {
          scoped.sidebarRight.float(active.id)
          return
        }
        if (attempt < 10) setTimeout(() => { tryFloat(attempt + 1) }, 50)
      }
      setTimeout(() => { tryFloat(0) }, 0)
    }
    const CompanyView = createCompanyView({
      leadOf,
      // 协作动态的流式源（S1 收尾）：`session/follow` 是 WebSocket 流，快照给历史、其后给实时。
      // 只取团队事件（wire 形状 → 领域形状的最小投影）；assistant-stream 帧与视图无关，丢弃。
      follow: async function* (sessionId: SessionId, signal: AbortSignal) {
        const address = { kind: 'session' as const, sessionId: leadOf(sessionId) }
        for await (const frame of scoped.remote.session.follow({ address }, signal)) {
          if (frame.type === 'snapshot') {
            yield { kind: 'history' as const, events: frame.records.map(record => record.event) }
          } else if (frame.type === 'event') {
            yield { kind: 'event' as const, event: frame.event }
          }
        }
      },
      floatPanel,
    })
    scoped.slots.inject('conversation.view', () => scoped.slots.register({
      name: 'conversation.view',
      id: COMPANY_VIEW_ID,
      order: 20,
      label: () => '公司',
    }, CompanyView))
  })
}

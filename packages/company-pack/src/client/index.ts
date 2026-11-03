/** 浏览器半：部署品牌（侧栏）+ 团队任务板（会话头部）+ 公司驾驶舱页签（右栏，R5b）。 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { PaneId, TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-files/remote'
import type {} from '@deepseek-ai/dsh-commands/remote'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { FloatRectLike } from './ui/float-geometry.ts'
import { DreamTeamBrandName } from './ui/Brand.tsx'
import { startInstanceGuard } from './wiring/instance-guard.ts'
import { createAttentionRegistry } from './wiring/attention-registry.ts'
import { installAttentionObservers } from './wiring/attention-observers.ts'
import { createCultivationView } from './cultivation/CultivationView.tsx'
import { createCompanyDataPlane, WORKSPACE_TEXT_PATHS } from './data/company-data-plane.ts'
import { makeContextWiring, type ContextWiringScoped } from './wiring/context-wiring.ts'
import { makeOpenMember } from './wiring/member-navigation.ts'
import { titleUpdateFor } from './wiring/title-state.ts'
import { createLeadLookup } from './wiring/company-session-adapters.ts'
import { registerCompanyTabs } from './tabs/company-tab-registration.ts'
import { DELEGATION_TOOL_KEYS } from './wiring/delegation-keys.ts'
import { DelegationCard } from './ui/DelegationCard.tsx'
import { installStyles } from './ui/styles.ts'
import { createErrorRelay, installErrorCapture, type ClientErrorEntry, type ErrorCaptureTarget } from './wiring/error-ring.ts'
import { ROLE_SHORT, RoleBadge, readPresetOf, sessionTitleOf } from './ui/RoleBadge.tsx'
import { TasksAction } from './tabs/TasksPanel.tsx'
import { TEAM_TOOL_KEYS, TeamToolCard } from './ui/TeamToolCard.tsx'

/** Required services: the slot registry plus the remote namespace we read. */
export const inject = ['slots', 'remote', 'sessions']

/** 培养主视图的 cell id（`conversation.view` list 槽的 id；与官方 chat 并列）。 */
const CULTIVATION_VIEW_ID = 'dsh-company-pack/cultivation'

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

  // 浏览器侧错误环（R3-03）：error / unhandledrejection / console.error 进 `window.__DSH_COMPANY_ERRORS__`，
  // 由真页面探针（cdp-probe / ui-scene-smoke）读进 verdict 与证据目录；有当前会话时再经
  // /company-diagnostics 追加到 $DSH_HOME/logs/company-client-errors.log（agent 可 read；仍不写会话事件）。
  const errorReporter: { current?: (entry: ClientErrorEntry) => void } = {}
  ctx.effect(() => installErrorCapture(window as unknown as ErrorCaptureTarget, undefined, entry => { errorReporter.current?.(entry) }))

  // 多实例探活横幅（卡②，2026-10-10 拍板：警告横幅）：同一浏览器多实例并存 = 静默互踩
  // （E2 实证）⇒ localStorage 心跳互见即挂横幅。纯 DOM、无服务依赖，apply 即启。
  // 探活的清理函数挂 fiber（effect 惯例）：卸载/重载时移除心跳、横幅与定时器，不泄漏。
  ctx.effect(() => startInstanceGuard(document))

  registerTitle(ctx)

  // 浏览器错误 → host 诊断文件：条目进有界队列，有当前会话就按 1s 节流送、没有就等会话出现再送
  // （2026-11-03 第六轮 D6：旧实现「无会话 / 节流窗口内」直接丢条目，首屏错误永远没有盘上证据）。
  ctx.inject(['sessions', 'remote.commands'], (scoped) => {
    const list = scoped.sessions.list
    let reporterWarned = false
    const relay = createErrorRelay({
      currentSessionId: () => Object.values(list.getSnapshot().byId).find(s => (s.retainedBy.mainView ?? 0) > 0)?.id,
      send: (sessionId, entry) => scoped.remote.commands.execute(sessionId, `/company-diagnostics client-error ${encodeURIComponent(JSON.stringify(entry))}`, []),
      // 落盘失败不再静默：只喊一次（console.warn 不进错误环，避免自激），开发者能在页面上看到。
      onSendError: (error) => {
        if (reporterWarned) return
        reporterWarned = true
        console.warn(`company diagnostics 写入失败（错误仍在 __DSH_COMPANY_ERRORS__）：${String((error as Error)?.message ?? error)}`)
      },
    })
    // 会话出现/切换时补送队列里排着的条目（首屏报错 → 开会话后仍能落盘）。
    const unsubscribe = list.subscribe(() => relay.flush())
    ctx.effect(() => () => { unsubscribe(); relay.dispose() })
    errorReporter.current = (entry) => relay.push(entry)
  })

  // 驾驶舱①·「待办」：挂起项登记处（apply 闭包内创建——client 纪律禁模块级单例）。
  // 观察者写入 / 页签读取共享同一实例。
  const attention = createAttentionRegistry()

  // 驾驶舱①·远端事件观察者（跨会话、实时）：user-questions/request（待答问询）与
  // approval/request（待批审批；切片二落地前不会触发，管线先行）。⚠ 只登记、**永远委托**
  // （next()）——本监听者是观察者不是应答者，真应答走官方 ui-user-questions / ui-approval
  // 的 waterfall；this = 事件归属 owner ctx，scopeOf → 发起会话（同款 ui-approval 手法）。
  installAttentionObservers(ctx, attention)

  registerToolCards(ctx)

  registerSidebarIdentity(ctx)

  registerCompanyTabsWiring(ctx, attention)

  registerCultivationViewWiring(ctx)

}

function registerCompanyTabsWiring(ctx: ClientContext, attention: ReturnType<typeof createAttentionRegistry>): void {
  // Company workspace files are read through this injected session Remote; the
  // tab-registration module keeps the four matching contribution surfaces local.
  // ⚠ `remote.commands` = 人侧动作面（2026-10-17 培养 GUI 卡）：面板按钮/创作表单经它发
  //   `/cultivation …`（平台原生命令执行面，host 照旧记 source: user、角色闸在 host）。
  //   与 remote.session / remote.workspaceFiles 同款：按命名空间 inject，vendor 装配。
  ctx.inject(['sessions', 'uiWorkspace', 'remote.session', 'remote.workspaceFiles', 'remote.commands', 'slots', 'sidebarRight', 'sidebarRightTabs'], (scoped) => {
    const sessions = scoped.sessions
    const { leadOf, follow, cultivationFiles, cultivationActions, rawFollow, readWorkspaceText } = createCompanyDataPlane(scoped)
    const floatTab = (tabId: TabId, rect?: FloatRectLike): void => { scoped.sidebarRight.float(tabId, rect) }
    const unfloatTab = (paneId: string): void => { scoped.sidebarRight.dock(paneId as PaneId) }
    const openMember = makeOpenMember({ sessions, uiWorkspace: scoped.uiWorkspace, leadOf })
    // 动作面按会话取（命令作用在面板所在会话；跨角色会被 host 角色闸拒，错误原话回到面板行内）。
    // 读取闭包唯一实现 = data plane 的 readWorkspaceText（Lead 寻址 + 失败 null 都在工厂里）。
    const readLedger = readWorkspaceText(WORKSPACE_TEXT_PATHS.ledger, 240)
    const readCatalog = readWorkspaceText(WORKSPACE_TEXT_PATHS.catalog, 2000)
    const contextWiring = makeContextWiring(scoped as unknown as ContextWiringScoped, leadOf, rawFollow, readCatalog)

    registerCompanyTabs(scoped, {
      attention,
      leadOf,
      follow,
      floatTab,
      unfloatTab,
      openMember,
      cultivationFiles,
      cultivationActions,
      roleSource: sessions.list,
      readLedger,
      readCatalog,
      contextSources: contextWiring.contextSources,
      openContext: contextWiring.openContext,
    })
  })
}

function registerCultivationViewWiring(ctx: ClientContext): void {
  // 培养主视图（2026-10-28；2026-11-02 起主区就剩 Chat + 培养——Trajectory 已从 company profile 禁用）。
  // 公司总览不再占第三个 tab：它的看板/依赖/在场/交付已经住在右栏页签，按钮直接打开。
  // 该槽没有 inject 面 ⇒ 数据面用注册处闭包注入；右侧培养面板自有 composer（命令面）。
  ctx.inject(['sessions', 'uiWorkspace', 'remote.session', 'remote.workspaceFiles', 'remote.commands', 'sidebarRight', 'slots'], (scoped) => {
    const sessions = scoped.sessions
    const { leadOf, follow, cultivationFiles, cultivationActions, rawFollow, readWorkspaceText } = createCompanyDataPlane(scoped)
    const readCatalog = readWorkspaceText(WORKSPACE_TEXT_PATHS.catalog, 2000)
    const contextWiring = makeContextWiring(scoped as unknown as ContextWiringScoped, leadOf, rawFollow, readCatalog)
    const openCompanyOverview = (): void => { scoped.sidebarRight.openTab('company-board') }
    const CultivationView = createCultivationView({
      sessions,
      cultivationFiles,
      cultivationActions,
      followEvents: follow,
      roleSource: sessions.list,
      contextSources: contextWiring.contextSources,
      openContext: contextWiring.openContext,
      openCompanyOverview,
    })
    scoped.slots.inject('conversation.view', () => scoped.slots.register({
      name: 'conversation.view',
      id: CULTIVATION_VIEW_ID,
      order: 20,
      label: () => '培养',
    }, CultivationView))
  })
}

function registerTitle(ctx: ClientContext): void {
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
        const result = titleUpdateFor({ current, preset, roleShort: ROLE_SHORT, titleOf: sessionTitleOf })
        if (result.title !== undefined) document.title = result.title
        const root = document.documentElement
        if (result.role === undefined) delete root.dataset.wkRole
        else root.dataset.wkRole = result.role
      }
      update()
      return list.subscribe(update)
    })
  })
}

function registerToolCards(ctx: ClientContext): void {
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
}

function registerSidebarIdentity(ctx: ClientContext): void {
  ctx.inject(['sessions', 'sidebarRight', 'slots'], (scoped) => {
    scoped.slots.inject('sidebar.brand.name', () =>
      scoped.slots.register({ name: 'sidebar.brand.name' }, DreamTeamBrandName))

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
    const leadSessionId = createLeadLookup(sessions)
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
}

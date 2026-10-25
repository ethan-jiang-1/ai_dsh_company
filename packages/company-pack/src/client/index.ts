/** 浏览器半：部署品牌（侧栏）+ 团队任务板（会话头部）+ 公司驾驶舱页签（右栏，R5b）。 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { PaneId, TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
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
import type { FloatRectLike } from './float-geometry.ts'
import { DreamTeamBrandName } from './Brand.tsx'
import { startInstanceGuard } from './instance-guard.ts'
import { createAttentionRegistry } from './attention-registry.ts'
import { createCompanyView } from './CompanyView.tsx'
import { createCompanyDataPlane, WORKSPACE_TEXT_PATHS } from './company-data-plane.ts'
import { contextRowsFromStore, makeCultivationContextSources, type CultivationContextSources, type FollowLike } from './cultivation-context-data.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'
import { sessionFileAddress } from '../lib/deliverables-address.ts'
import { createLeadLookup } from './company-session-adapters.ts'
import { registerCompanyTabs } from './company-tab-registration.ts'
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
/** 背景读/开的最小结构面（两个注入块共用；预检与导航都在容器，领域视图不碰 RPC）。 */
interface ContextWiringScoped {
  readonly sessions: ClientContext['sessions']
  readonly uiWorkspace: { openSession(target: unknown): void }
  readonly sidebarRight: { openResource(address: string): void }
  readonly remote: {
    readonly workspaceFiles: {
      stat(agentId: SessionId, path: string, signal: AbortSignal): Promise<{ readonly ok: boolean }>
    }
  }
}

/** 造背景源与「打开原文」（会话查 list/subagentAddress；文件先 stat 再开 file resource）。 */
function makeContextWiring(
  scoped: ContextWiringScoped,
  leadOf: (sessionId: SessionId) => SessionId,
  rawFollow: FollowLike,
  readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>,
): {
  readonly contextSources: (sessionId: SessionId) => CultivationContextSources
  readonly openContext: (sessionId: SessionId, context: CultivationContext) => Promise<
    { readonly ok: true } | { readonly ok: false, readonly problem: string }
  >
} {
  const rows = (): ReturnType<typeof contextRowsFromStore> =>
    contextRowsFromStore(scoped.sessions.list.getSnapshot().byId as never)
  return {
    contextSources: () => makeCultivationContextSources({
      getSessions: rows,
      follow: rawFollow,
      readCatalog: (sessionId, signal) => readCatalog(sessionId as SessionId, signal),
    }),
    openContext: async (sessionId, context) => {
      try {
        if (context.kind === 'session') {
          const state = scoped.sessions.list.getSnapshot()
          const exists = state.byId[context.ref as SessionId] !== undefined
            || (context.parentSessionId !== undefined
              && scoped.sessions.subagentAddress(context.ref as SessionId) !== undefined)
          if (!exists) return { ok: false, problem: '这个会话现在打不开了（可能已删除）。' }
          const target = context.parentSessionId === undefined
            ? context.ref
            : { parentSessionId: context.parentSessionId, childSessionId: context.ref, mode: context.mode ?? 'unknown' }
          scoped.uiWorkspace.openSession(target)
          return { ok: true }
        }
        const lead = leadOf(sessionId)
        const stat = await scoped.remote.workspaceFiles.stat(lead, context.ref, new AbortController().signal)
        if (!stat.ok) return { ok: false, problem: '原文不在了（文件可能已归档/移动）。' }
        scoped.sidebarRight.openResource(sessionFileAddress(lead, context.ref))
        return { ok: true }
      } catch (error) {
        return { ok: false, problem: `打不开原文：${error instanceof Error ? error.message : String(error)}` }
      }
    },
  }
}

export async function apply(ctx: ClientContext): Promise<void> {
  // CSS 与 fiber 同寿命；重新挂载读取新样式，卸载仅清理本次节点。
  ctx.effect(installStyles)

  // 多实例探活横幅（卡②，2026-10-10 拍板：警告横幅）：同一浏览器多实例并存 = 静默互踩
  // （E2 实证）⇒ localStorage 心跳互见即挂横幅。纯 DOM、无服务依赖，apply 即启。
  // 探活的清理函数挂 fiber（effect 惯例）：卸载/重载时移除心跳、横幅与定时器，不泄漏。
  ctx.effect(() => startInstanceGuard(document))

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
    const openMember = async (
      sessionId: SessionId,
      member: { readonly id: string; readonly role: 'lead' | 'teammate' },
    ): Promise<void> => {
      const lead = leadOf(sessionId)
      if (member.role === 'lead') {
        scoped.uiWorkspace.openSession(lead)
        return
      }
      if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0) return
      await sessions.refresh()
      scoped.uiWorkspace.openSession({ parentSessionId: lead, childSessionId: member.id as SessionId, mode: 'continuable' })
    }
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

  // 公司整页视图（条目 ① S1）：`conversation.view` 的第三个页签（Chat / Trajectory / 公司）。
  // 该槽**没有 inject 面**（catalog registerOptions 只有 id/order/label）且 team 投影是 host-only
  // ⇒ 数据面用注册处闭包注入（见 CompanyView 头注）；跨插件值导入仍被禁。
  // ⚠ remote 按命名空间 inject：`remote.session`（follow 流）+ `remote.workspaceFiles`
  //   （2026-10-13 培养卡：第四子页培养的 journal/记录读取——与侧栏页签同一工厂语义）。
  ctx.inject(['sessions', 'uiWorkspace', 'remote.session', 'remote.workspaceFiles', 'remote.commands', 'sidebarRight', 'slots'], (scoped) => {
    const sessions = scoped.sessions
    const { leadOf, follow, cultivationFiles, cultivationActions, rawFollow, readWorkspaceText } = createCompanyDataPlane(scoped)
    const readCatalog = readWorkspaceText(WORKSPACE_TEXT_PATHS.catalog, 2000)
    const contextWiring = makeContextWiring(scoped as unknown as ContextWiringScoped, leadOf, rawFollow, readCatalog)
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
      follow,
      readCompany: readWorkspaceText('kb/company.md', 40),
      floatPanel,
      // 培养数据面（2026-10-13 培养卡）：同一 follow 流喂赞/踩块；文件闭包与 viewer 角色源
      // 与侧栏页签同一语义（领域视图两个壳一处事实）。
      cultivationFiles,
      cultivationActions,
      followEvents: follow,
      roleSource: sessions.list,
      contextSources: contextWiring.contextSources,
      openContext: contextWiring.openContext,
    })
    scoped.slots.inject('conversation.view', () => scoped.slots.register({
      name: 'conversation.view',
      id: COMPANY_VIEW_ID,
      order: 20,
      label: () => '公司',
    }, CompanyView))
  })
}

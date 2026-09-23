/** 浏览器半：部署品牌（侧栏）+ 团队任务板（会话头部）+ 公司驾驶舱页签（右栏，R5b）。 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/remote'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { WocheBrandName } from './Brand.tsx'
import { createCompanyView } from './CompanyView.tsx'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from './company-tabs.tsx'
import { DELEGATION_TOOL_KEYS } from './delegation-keys.ts'
import { DelegationCard } from './DelegationCard.tsx'
import { installStyles } from './styles.ts'
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
 * 任务板与品牌槽经 `remote.agentTeams` 服务读数据：fiber 等官方挂载完成才注册；
 * 官方缺席时本贡献保持 PENDING（板不出现），不会崩。
 * **委派工具卡只依赖 `slots`**（它渲染的是 call/result 切片，不读团队状态），所以单独 inject——
 * 别让它被 team remote 的缺席拖住。
 * **驾驶舱页签（R5b）**另需 `sidebarRightTabs` 服务（`ui-sidebar-right` 的 tab 注册面）；
 * 行数据与任务板同走 `remote.agentTeams.view` 拉式通道（Q5–Q8 定案 D-b）。
 * @param ctx - Client root context.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  // 本包 client 面的样式表：挂载时一次性注入（S0 决定 = 注入式，不走 CSS Modules；见 styles.ts 头注）。
  installStyles()

  // 委派工具卡（R3）+ 团队工具卡（S2）：把 CEO 的命名委托与团队动作渲染成公司语义的卡。
  // keyed slot 的 key 域是**开放**的（槽合同原话："a typo simply never renders"），
  // 所以 key 必须与 preset 里的 toolName / 官方工具名逐字一致——拼错不报错、只是永远不渲染。
  ctx.inject(['slots'], (scoped) => {
    // 回调必须**返回**注册效果（`SlotInjectionEffect` = 一个 disposer 或 disposer 的可迭代），
    // 所以这里 map 出 disposer 数组，而不是 for 循环里 register 完返回 void（tsc 会红）。
    scoped.slots.inject('tool.call.toolview', () => [
      ...DELEGATION_TOOL_KEYS.map(key =>
        scoped.slots.register({ name: 'tool.call.toolview', key }, DelegationCard)),
      ...TEAM_TOOL_KEYS.map(key =>
        scoped.slots.register({ name: 'tool.call.toolview', key }, TeamToolCard)),
    ])
  })

  ctx.inject(['sessions', 'remote.agentTeams', 'sidebarRight', 'slots'], (scoped) => {
    scoped.slots.inject('sidebar.brand.name', () =>
      scoped.slots.register({ name: 'sidebar.brand.name' }, WocheBrandName))

    const sessions = scoped.sessions
    /** 子代理会话归到它的 Lead：团队状态挂在 Lead 上。 */
    const leadSessionId = (sessionId: SessionId): SessionId => {
      const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address
      return address?.parentSessionId ?? sessionId
    }
    // 条目 ② S3：头部按钮从 anchored 弹窗改为打开右栏平台页签（与官方 Agent Team 弹窗不再互盖）。
    scoped.slots.inject('conversation.session.header.actions', () =>
      scoped.slots.register({
        name: 'conversation.session.header.actions',
        id: 'company-tasks',
        order: 21,
        inject: () => ({
          load: (sessionId: SessionId) => scoped.remote.agentTeams.view(leadSessionId(sessionId)),
          openTasks: () => { scoped.sidebarRight.openTab('company-tasks') },
        }),
      }, TasksAction))
  })

  // 公司页签（条目 ② S1b）：五个**平台页签**——看板 / 依赖图 / 在场 / 用量 / 任务板。
  // 只有平台级 tab 才能被 `ctx.sidebarRight.float(tabId)` 拖出成浮窗（可移动/可缩放/最小 220×140/
  // 点击置顶），也才能被 split 并看（A1 决定）。原「公司驾驶舱」页签（R5b）与新的「在场」重复，
  // 按"一处事实一个家"合并：驾驶舱内容升级为「在场」页签（行可点 + 流式动态），旧 tab 退役。
  // ⚠ remote 按命名空间 inject：`remote.agentTeams`（拉团队态）+ `remote.session`（follow 流）。
  ctx.inject(['sessions', 'remote.agentTeams', 'remote.session', 'slots', 'sidebarRight', 'sidebarRightTabs'], (scoped) => {
    const sessions = scoped.sessions
    /** 子代理会话归到它的 Lead：团队状态挂在 Lead 上。 */
    const leadOf = (sessionId: SessionId): SessionId => {
      const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address
      return address?.parentSessionId ?? sessionId
    }
    const load = (sessionId: SessionId) => scoped.remote.agentTeams.view(leadOf(sessionId))
    /** 平台浮出（S2）：把页签拽出成浮窗；收回由浮窗自带的 dock 按钮负责（平台能力，不自造）。 */
    const floatTab = (tabId: TabId): void => { scoped.sidebarRight.float(tabId) }
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
    /** D-d 成员空间入口：teammate = catalog 寻址（对非 team child 亦可达）；lead = 顶层 open。 */
    const openMember = async (
      sessionId: SessionId,
      member: { readonly id: string; readonly role: 'lead' | 'teammate' },
    ): Promise<void> => {
      const lead = leadOf(sessionId)
      if (member.role === 'lead') {
        sessions.open(lead)
        return
      }
      await sessions.refreshSubagents(lead)
      if (sessions.list.getSnapshot().current !== sessionId) return
      sessions.openSubagent({ parentSessionId: lead, childSessionId: member.id as SessionId, mode: 'continuable' })
    }

    /**
     * 注册一个公司页签**类型**（tab registry 静态半边；keyed 槽体在下面一起登记）。
     * @param id - tab 类型 id（= keyed 槽的 key）。
     * @param kind - `openTab` 用的 kind。
     * @param title - 页签与 guide 的标题。
     * @param description - guide 描述。
     * @param order - guide 排序。
     */
    const registerType = (id: string, kind: string, title: string, description: string, order: number): void => {
      scoped.effect(() => scoped.sidebarRightTabs.register({
        id,
        kind,
        priority: 'extension',
        title: () => title,
        guide: [{ order, title: () => title, description: () => description }],
      }), `company-pack: ${kind} tab type`)
    }

    registerType('dsh-company-pack/board', 'company-board', '看板',
      '任务看板：活到哪一步（owner / 依赖 / 修订号）', 51)
    registerType('dsh-company-pack/dag', 'company-dag', '依赖图',
      '任务依赖图：谁依赖谁、关键路径', 52)
    registerType('dsh-company-pack/presence', 'company-presence', '在场',
      '组织在场板：谁在忙、忙什么；点行进成员空间', 53)
    registerType('dsh-company-pack/budget', 'company-budget', '用量',
      '令牌用量与占比（只做令牌，不做美元）', 54)
    registerType('dsh-company-pack/tasks', 'company-tasks', '任务板',
      '共享任务表：状态 / owner / 依赖 / 修订号', 55)

    // keyed 槽体：与上面的类型共享同一 id；回调返回 disposer 数组（同工具卡那段写法）。
    scoped.slots.inject('sidebar.right.pane.tab', () => [
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/board', inject: () => ({ load, follow, floatTab }) },
        BoardTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/dag', inject: () => ({ load, follow, floatTab }) },
        DagTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/presence', inject: () => ({ load, follow, openMember, floatTab }) },
        PresenceTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/budget', inject: () => ({ load, follow, floatTab }) },
        BudgetTab),
      scoped.slots.register(
        { name: 'sidebar.right.pane.tab', key: 'dsh-company-pack/tasks', inject: () => ({ load, follow, floatTab }) },
        TasksTab),
    ])
  })

  // 公司整页视图（条目 ① S1）：`conversation.view` 的第三个页签（Chat / Trajectory / 公司）。
  // 该槽**没有 inject 面**（catalog registerOptions 只有 id/order/label）且 team 投影是 host-only
  // ⇒ 数据面用注册处闭包注入（见 CompanyView 头注）；跨插件值导入仍被禁。
  // ⚠ remote 按命名空间 inject：`remote.agentTeams`（拉团队态）+ `remote.session`（follow 流）。
  ctx.inject(['sessions', 'remote.agentTeams', 'remote.session', 'sidebarRight', 'slots'], (scoped) => {
    const sessions = scoped.sessions
    /** 子代理会话归到它的 Lead：团队状态挂在 Lead 上。 */
    const leadOf = (sessionId: SessionId): SessionId => {
      const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address
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
      load: (sessionId: SessionId) => scoped.remote.agentTeams.view(leadOf(sessionId)),
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

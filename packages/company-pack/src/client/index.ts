/** 浏览器半：部署品牌（侧栏）+ 团队任务板（会话头部）+ Company 驾驶舱页签（右栏，R5b）。 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
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
import { CompanyPane, type MemberTarget } from './CompanyPane.tsx'
import { DELEGATION_TOOL_KEYS } from './delegation-keys.ts'
import { DelegationCard } from './DelegationCard.tsx'
import { TasksAction } from './TasksPanel.tsx'

/** Required services: the slot registry plus the remote namespace we read. */
export const inject = ['slots', 'remote', 'sessions']

/** 本包驾驶舱 tab 的身份：tab 类型 id = keyed 槽 `sidebar.right.pane.tab` 的 key。 */
const COMPANY_TAB_ID = 'dsh-company-pack/cockpit'

/**
 * 本包 client 面登记四处：委派工具卡（R3）、部署品牌、会话头部任务板、Company 驾驶舱页签（R5b）。
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
  // 委派工具卡（R3）：把 CEO 的命名委托工具渲染成"给 VP 的 brief 卡"。
  // keyed slot 的 key 域是**开放**的（槽合同原话："a typo simply never renders"），
  // 所以 key 必须与 preset 里的 toolName 逐字一致——拼错不报错、只是永远不渲染。
  ctx.inject(['slots'], (scoped) => {
    // 回调必须**返回**注册效果（`SlotInjectionEffect` = 一个 disposer 或 disposer 的可迭代），
    // 所以这里 map 出 disposer 数组，而不是 for 循环里 register 完返回 void（tsc 会红）。
    scoped.slots.inject('tool.call.toolview', () =>
      DELEGATION_TOOL_KEYS.map(key =>
        scoped.slots.register({ name: 'tool.call.toolview', key }, DelegationCard)))
  })

  ctx.inject(['sessions', 'remote.agentTeams', 'slots'], (scoped) => {
    scoped.slots.inject('sidebar.brand.name', () =>
      scoped.slots.register({ name: 'sidebar.brand.name' }, WocheBrandName))

    const sessions = scoped.sessions
    /** 子代理会话归到它的 Lead：团队状态挂在 Lead 上。 */
    const leadSessionId = (sessionId: SessionId): SessionId => {
      const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address
      return address?.parentSessionId ?? sessionId
    }
    scoped.slots.inject('conversation.session.header.actions', () =>
      scoped.slots.register({
        name: 'conversation.session.header.actions',
        id: 'company-tasks',
        order: 21,
        inject: () => ({
          load: (sessionId: SessionId) => scoped.remote.agentTeams.view(leadSessionId(sessionId)),
        }),
      }, TasksAction))
  })

  // Company 驾驶舱页签（R5b）：右栏 page 型 tab（无地址，按 kind 打开；guide 页给入口胶囊）。
  // 数据面与任务板同一拉式通道（D-b）；行可点进成员空间（D-d，照官方 openTeammate 模式）。
  ctx.inject(['sessions', 'remote.agentTeams', 'slots', 'sidebarRightTabs'], (scoped) => {
    const sessions = scoped.sessions
    const leadSessionId = (sessionId: SessionId): SessionId => {
      const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address
      return address?.parentSessionId ?? sessionId
    }
    /** D-d 成员空间入口：teammate = catalog 寻址（对非 team child 亦可达）；lead = 顶层 open。 */
    const openMember = async (sessionId: SessionId, member: MemberTarget): Promise<void> => {
      const lead = leadSessionId(sessionId)
      if (member.role === 'lead') {
        sessions.open(lead)
        return
      }
      await sessions.refreshSubagents(lead)
      if (sessions.list.getSnapshot().current !== sessionId) return
      sessions.openSubagent({ parentSessionId: lead, childSessionId: member.id as SessionId, mode: 'continuable' })
    }

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: COMPANY_TAB_ID,
      kind: 'company',
      priority: 'extension',
      title: () => 'Company 驾驶舱',
      guide: [{
        order: 50,
        title: () => 'Company 驾驶舱',
        description: () => '组织在场板：谁在忙、忙什么；点行进成员空间',
      }],
    }), 'company-pack: cockpit tab type')

    scoped.slots.inject('sidebar.right.pane.tab', () =>
      scoped.slots.register({
        name: 'sidebar.right.pane.tab',
        key: COMPANY_TAB_ID,
        inject: () => ({
          load: (sessionId: SessionId) => scoped.remote.agentTeams.view(leadSessionId(sessionId)),
          openMember,
        }),
      }, CompanyPane))
  })
}

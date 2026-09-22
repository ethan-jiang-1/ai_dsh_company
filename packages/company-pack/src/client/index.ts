/** 浏览器半：部署品牌（侧栏）+ 团队任务板（会话头部）。 */
import agentTeamsRemote from '@deepseek-ai/dsh-experimental-agent-team/remote'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { WocheBrandName } from './Brand.tsx'
import { TasksAction } from './TasksPanel.tsx'

/** Required services: the slot registry plus the remote namespace we mount. */
export const inject = ['slots', 'remote', 'sessions']

/**
 * Mount the generated Team Remote contribution, then register this deployment's
 * brand and task-board occupants.
 *
 * 为什么自己挂 remote：官方的 `client-ui-agent-team` 在本构建形态下挂不上
 * （它的 `dsh.client.inject` 含 `@deepseek-ai/dsh-client-ui-primitives`，而该包没有
 * `dsh.client`、不在浏览器模块表里 → 模块加载失败），于是 `remote.agentTeams` 无人注册。
 * 这里直接挂同一份生成描述符，任务板就能读到权威的成员/任务状态。
 * @param ctx - Client root context.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  await ctx.remote.$mount(agentTeamsRemote)
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
}

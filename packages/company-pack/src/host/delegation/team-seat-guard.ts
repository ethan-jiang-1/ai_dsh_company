/**
 * support preset 的 team 座位守卫（BUG-072）。
 *
 * 引擎事实：vendor `agent-team` 把**任何没有 parentSession 的 root** 都当 Lead，`tool-agent-team`
 * 因此把九个团队工具装进它的工具面——与 preset 是不是公司角色无关。产品事实：worker family 与
 * 质量环能力档是 support 能力档，不是角色、不组队（persona / `teamLeadWhenRoot:false`）。
 *
 * 为什么不是删工具：团队工具由 vendor 按成员身份安装在 agent scope，host 没有按 preset 摘除的
 * seam；`tools.restrict` 只作用于 global 层，够不到 scope 注册。这里用 per-agent `tools.guard`
 * 留下工具、拒绝调用——**工具在 ≠ 这个座位有权**，与 header 的“本座位不可用”同一句话。
 *
 * guard 注册在 agent 自己的 tools layer（`scope.get('tools')` 是调用者 scope 的 facet）；重复的
 * `agent/created` 用 WeakSet 去重，service re-provide 的 callback 重跑由 fiber 负责（BUG-074）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { isSupportPreset } from '../../lib/delegation-surface.ts'
import { composedPresetOf } from '../prompt/handbook.ts'

/** 只取本模块用到的 tools.guard 面（不扩大 peer 依赖）。 */
interface GuardTools {
  guard(guard: (exec: { readonly name: string }) => string | undefined): () => void
}

interface AgentLike {
  readonly ctx: Context
}

/** 模型可见的拒绝理由：点名座位、给出替代路径、叫停重试。 */
export function supportTeamDenial(preset: string | undefined): string | undefined {
  if (!isSupportPreset(preset)) return undefined
  return `spawn_teammate is not available to this seat: preset "${String(preset)}" is a support capability seat, `
    + 'not a company role, so it does not lead a team. Do the work in this session or return the result; do not retry.'
}

/**
 * 给非角色 support preset 的 root 装一条拒绝 `spawn_teammate` 的 guard。
 * 六公司角色、命名 child、teammate 与未知 preset 都不受影响（未知 = 不猜，保持原行为）。
 * @param ctx - Host 上下文。
 */
export function registerTeamSeatGuard(ctx: Context): void {
  const installed = new WeakSet<object>()
  ctx.on('agent/created', (payload: { agent: AgentLike }) => {
    const { agent } = payload
    if (installed.has(agent)) return
    installed.add(agent)
    agent.ctx.inject(['tools'], (scope) => {
      const preset = composedPresetOf(scope) ?? composedPresetOf(agent.ctx)
      const denial = supportTeamDenial(preset)
      if (denial === undefined) return
      const tools = scope.get('tools') as GuardTools | undefined
      if (tools?.guard === undefined) return
      scope.effect(() => tools.guard(exec => exec.name === 'spawn_teammate' ? denial : undefined))
    })
  })
}

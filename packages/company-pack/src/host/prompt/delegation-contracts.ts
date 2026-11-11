/**
 * 能力域委派政策注入：capability header + 五段 section，只给这个 Agent 真有的通道。
 *
 * 为什么不是一份共享 skill：六个角色共用一份 policy 时，CEO 会读到 fork/workflow/retry，
 * COO 会读到 workflow，命名 child VP 会读到 team——但这些工具不在它们的工具面里。原生
 * 原则是“策略随工具走/按能力存在性注入”；共享 skill 只留 core（brief/effort/链/结果），
 * 通道细节由这里按 preset 能力 + 运行时座位注入。
 *
 * team 不按 preset 判：任何 root 都是 Lead（worker/support root 也有团队工具），
 * 权限信号 = `agentTeams.membership(agent)?.role === 'lead'`，fallback `header.parentSession`。
 * 工具在场不等于有权：teammate 工具面里也有 `spawn_teammate`，但只有 Lead 能执行。
 *
 * 内容源 = `content/contracts/delegation/<channel>.md`；workflow 引擎事实仍住
 * `content/contracts/workflow.md`（由 registerWorkflowContract 单独注入）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { delegationCapabilitiesOf } from '../../lib/delegation-capabilities.ts'
import { isSupportPreset } from '../../lib/delegation-surface.ts'
import { composedPresetOf } from './handbook.ts'

export const DELEGATION_HEADER_SECTION = 'company:delegation-capabilities'
export const DELEGATION_SECTION_PREFIX = 'company:delegation-'

const CHANNELS = ['spawn', 'fork', 'workflow', 'team', 'retry'] as const
type Channel = (typeof CHANNELS)[number]

const FILES: Readonly<Record<Channel, string>> = {
  spawn: 'spawn.md',
  fork: 'fork.md',
  workflow: 'workflow.md',
  team: 'team.md',
  retry: 'retry.md',
}

const LABELS: Readonly<Record<Channel, string>> = {
  spawn: 'spawn',
  fork: 'fork',
  workflow: 'workflow',
  team: 'team (Lead only)',
  retry: 'retry',
}

interface ToolsLike {
  get(name: string, scope?: object): unknown
}

interface AgentTeamsLike {
  tryMembership?(agent: unknown): { readonly role?: string } | undefined
}

interface AgentLike {
  readonly ctx: Context
  readonly session?: { readonly header?: { readonly parentSession?: string } }
}

interface SectionTexts {
  readonly header: string
  readonly channels: Readonly<Partial<Record<Channel, string>>>
}

/** 工具是否在这个 scope 的真实工具面里；scope 不可用/服务缺席时 false。 */
function hasTool(scope: Context, name: string): boolean {
  const tools = scope.get('tools') as ToolsLike | undefined
  if (tools === undefined) return false
  try {
    return tools.get(name, scopeOf(scope)) !== undefined
  } catch {
    return false
  }
}

/**
 * 运行时座位是不是 Team Lead。
 * 先用 agentTeams 的 membership（原生语义），服务缺席/非成员时用 parentSession 兜底。
 * @param agent - 正在创建的 Agent。
 * @returns 有团队工具且是 Lead 才 true 由调用方再与 `hasTool` 合判。
 */
export function isTeamLead(agent: AgentLike): boolean {
  const teams = agent.ctx.get('agentTeams') as AgentTeamsLike | undefined
  try {
    const membership = teams?.tryMembership?.(agent)
    if (membership?.role === 'lead') return true
    if (membership?.role === 'teammate') return false
  } catch { /* fall through to parentSession */ }
  return agent.session?.header?.parentSession === undefined
}

/**
 * 生成 capability header；没有可用通道返回 undefined（不注入空 header）。
 * @param available - 本 Agent 实际可用的通道。
 * @returns 模型可见的一行能力头。
 */
export function buildCapabilityHeader(available: Readonly<Record<Channel, boolean>>): string | undefined {
  const names = CHANNELS.filter(channel => available[channel]).map(channel => LABELS[channel])
  if (names.length === 0) return undefined
  return 'Company delegation · this session\n\n'
    + `Available channels: ${names.join(', ')}.\n`
    + 'Channels not listed are not available to this seat: do not call them, and do not ask downstream to try. '
    + 'A tool can still appear in your tool list when it is installed for the session but not enabled for your seat; calling it is refused. '
    + 'Dispatched children report back by completion notice: do not poll with bash/sleep, and do not use wait_agent for non-team subagent children. End the turn and let the notice start a new turn. '
    + 'The policy section for each available channel follows.'
}

/**
 * 读五段内容；任何一段缺失都跳过整组注入（打包错误 fail-safe，不注入半套政策）。
 * @param contentDir - pack 的 `content/`。
 * @returns 五段文本；缺失时 undefined。
 */
export function readDelegationSections(contentDir: string): SectionTexts | undefined {
  const channels: Partial<Record<Channel, string>> = {}
  for (const channel of CHANNELS) {
    try {
      channels[channel] = readFileSync(join(contentDir, 'contracts', 'delegation', FILES[channel]), 'utf8')
    } catch {
      return undefined
    }
  }
  return {
    header: '', // header 是生成的，不来自文件；保留字段让类型统一
    channels,
  }
}

/**
 * 注册 per-agent 的 capability header + channel sections。
 * @param ctx - Host 上下文。
 * @param contentDir - pack 的 `content/`。
 */
export function registerDelegationContracts(ctx: Context, contentDir: string): void {
  const texts = readDelegationSections(contentDir)
  if (texts === undefined) {
    ctx.logger?.warn?.('company-pack：delegation 政策段缺失，跳过注入（检查 content/contracts/delegation/ 五段）')
    return
  }
  // 只去重 `agent/created` 的重复投递：同一 Agent 建第二个 inject fiber 会重复 section。
  // 它**不挡** inject callback 的 re-run——required service re-provide 时 Cordis 复用同一 fiber
  // 重跑 callback（BUG-074 实测：WeakSet 在位、systemPrompt/tools 重挂仍会重装；`ctx.set` 换值
  // 不触发重跑，那不是 re-provide）。真正的重跑保护是 fiber 生命周期，不是这个 Agent 键。
  const installed = new WeakSet<object>()
  ctx.on('agent/created', ({ agent }: { agent: AgentLike }) => {
    if (installed.has(agent)) return
    installed.add(agent)
    agent.ctx.inject(['systemPrompt', 'tools'], (scope) => {
      const preset = composedPresetOf(scope) ?? composedPresetOf(agent.ctx)
      const caps = delegationCapabilitiesOf(preset)
      // 座位判据叠加在引擎 Lead 之上：support preset 作为 root 仍被 vendor 当 Lead（团队工具也装着），
      // 但产品侧不把 team 当它的可用通道——不列 header、不注入 team section（BUG-072）。
      const lead = isTeamLead(agent) && hasTool(scope, 'spawn_teammate') && !isSupportPreset(preset)
      const available: Record<Channel, boolean> = {
        // spawn 用能力表（CEO 的命名行不是 `subagent`，无法靠单名探测）；表由 parity spec 钉 YAML。
        spawn: caps?.spawn === true,
        fork: caps?.fork === true && hasTool(scope, 'subagent_fork'),
        workflow: caps?.workflow === true && hasTool(scope, 'workflow'),
        team: lead,
        // retry 是 host per-agent 安装的，agent/created 监听顺序可能晚于本注入；能力表已由 parity spec 钉住。
        retry: caps?.retry === true,
      }
      const header = buildCapabilityHeader(available)
      if (header === undefined) return
      const base = scope.systemPrompt.getSectionOrder('TOOL_SUBAGENT') - 10
      scope.systemPrompt.section({
        name: DELEGATION_HEADER_SECTION,
        order: base,
        text: header,
        interpolate: false,
      })
      CHANNELS.forEach((channel, index) => {
        if (!available[channel]) return
        const text = texts.channels[channel]
        if (text === undefined) return
        scope.systemPrompt.section({
          name: `${DELEGATION_SECTION_PREFIX}${channel}`,
          order: base + index + 1,
          text,
          interpolate: false,
        })
      })
    })
  })
}

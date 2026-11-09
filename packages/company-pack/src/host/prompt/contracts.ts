/**
 * 能力域合同注入：workflow 引擎事实只在**真的有 workflow 工具**的 agent 里可见。
 *
 * 为什么不是全局 section：workflow 合同只对 vp-eng（以及继承其组合的 fork/team 子代）
 * 有意义；全局注入会让 CEO/VP-Sales/leaf/worker 为无关规则付 token、被无关事实干扰。
 *
 * 为什么不是角色 skill：skill 按需加载，模型可能不读；引擎合同里最关键的 schema/截断/重启
 * 规则必须**必见**。这里用 per-agent systemPrompt.section，和 vendor `tool-workflow`
 * 自己注入 usage section 是同一种机制。
 *
 * 能力探测：优先看 agent 的工具面里是否真有 `workflow`（`tools.get('workflow', scope)`）；
 * 取不到 scope 时退回 preset id 白名单（`workflowPresets`）。两条路都失败就不注入，
 * 不静默塞给所有 agent。
 */
import type { Context } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { composedPresetOf } from '../prompt/handbook.ts'

export const WORKFLOW_CONTRACT_SECTION = 'company:workflow-contract'

interface ToolsLike {
  get(name: string, scope?: object): unknown
}

interface AgentLike {
  readonly ctx: Context
}

interface ContractOptions {
  /** 工具探测不可用时的 fallback：这些 preset 也注入。 */
  readonly workflowPresets?: readonly string[]
}

/** 读 pack 的 workflow 合同正文（content/contracts/workflow.md）。 */
export function readWorkflowContract(contentDir: string): string {
  return readFileSync(join(contentDir, 'contracts', 'workflow.md'), 'utf8')
}

/** 工具面里是否有 `workflow`；scope 不可用/服务缺席时返回 false，交给 fallback。 */
function hasWorkflowTool(scope: Context): boolean {
  const tools = (scope as unknown as { get?: (name: string) => unknown }).get?.('tools') as ToolsLike | undefined
  if (tools === undefined) return false
  try {
    return tools.get('workflow', scopeOf(scope)) !== undefined
  } catch {
    return false
  }
}

/**
 * 注册 per-agent workflow 合同 section。
 * @param ctx - Host 上下文。
 * @param contentDir - pack 的 `content/`。
 * @param options - `workflowPresets` fallback 白名单。
 */
export function registerWorkflowContract(
  ctx: Context,
  contentDir: string,
  options: ContractOptions = {},
): void {
  let text: string
  try {
    text = readWorkflowContract(contentDir)
  } catch (error) {
    ctx.logger?.warn?.(`company-pack：workflow 合同缺失，跳过注入：${(error as Error).message}`)
    return
  }
  const fallback = new Set(options.workflowPresets ?? [])
  const installed = new WeakSet<object>()
  ctx.on('agent/created', ({ agent }: { agent: AgentLike }) => {
    if (installed.has(agent)) return
    installed.add(agent)
    agent.ctx.inject(['systemPrompt', 'tools'], (scope) => {
      const preset = composedPresetOf(scope) ?? composedPresetOf(agent.ctx)
      if (!hasWorkflowTool(scope) && (preset === undefined || !fallback.has(preset))) return
      scope.systemPrompt.section({
        name: WORKFLOW_CONTRACT_SECTION,
        order: scope.systemPrompt.getSectionOrder('TOOL_WORKFLOW') + 1,
        text,
        interpolate: false,
      })
    })
  })
}

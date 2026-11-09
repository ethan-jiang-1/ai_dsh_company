/**
 * `subagent_retry` host 原语（P4）：同步等到子代终态，按 `subagentRetryDecision` 最多再派一次。
 *
 * 为什么是 host 工具而不是只写 policy：subagent 失败时父代理不一定能可靠地再派；这是
 * **有界、非静默**的确定性补丁。代价（显式登记）：
 * - 阻塞式：父 turn 会等到子代终态；只适合短任务。长/批量活仍用 workflow（可靠、可聚合）。
 * - 注册面与深度**只**来自 `SUBAGENT_RETRY_SURFACE`（= 各 preset 通用 `subagent` 行的
 *   `maxDepth`；模型 `retrySurface()` 同源）。本工具不另立一份深度预算——BUG-045 的教训：
 *   “普通 spawn 能到多深”与“retry 能到多深”必须是同一个数。CEO/leaf/worker 不挂。
 * - 调用者已在预算底部时不静默起 child：返回 `stopReason: depth-exceeded` + 诊断（attempts 0）。
 * - `delivery: 'caller'`：结果只回本次工具调用，不再发完成通知（避免双重投递）。
 * - 不是新引擎：只调官方 `ctx.subagents.startActivation`；不新增调度语义。
 *
 * 退役条件：上游给 `tool-subagent` 原生 bounded retry 配置后，本工具删除。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { composedPresetOf } from '../prompt/handbook.ts'
import { SUBAGENT_RETRY, subagentRetryDecision, type SubagentRetrySurface } from '../../lib/retry-policy.ts'

interface TextBlock {
  readonly type: string
  readonly text?: string
}

interface SubagentResultLike {
  readonly output?: readonly TextBlock[]
  readonly stopReason: string
  readonly diagnostic?: string
}

interface ActivationLike {
  readonly childId: string
  readonly result: Promise<SubagentResultLike>
}

interface SubagentsLike {
  startActivation(spec: {
    readonly provider: string
    readonly label: string
    readonly delivery: 'caller'
    readonly signal: AbortSignal
    readonly request: {
      readonly prompt: readonly { readonly type: 'text'; readonly text: string }[]
      readonly parent: unknown
      readonly agentPreset: string
      readonly maxDepth: number
    }
  }): Promise<ActivationLike>
}

interface ToolsLike {
  register(tool: unknown): () => void
}

interface AgentLike {
  readonly ctx: Context
  /** durable header：重启/续跑后仍带着委派深度。 */
  readonly session?: { readonly header?: { readonly delegationDepth?: number } }
  /** 运行时深度（引擎口径 = 与 header 取大）。 */
  readonly options?: { readonly subagentDepth?: number }
}

export interface SubagentRetryOptions {
  /** 注册面与逐 preset 深度预算；唯一来源，不设默认（缺表就不注册）。 */
  readonly surface: SubagentRetrySurface
  /** 默认 spawn。 */
  readonly provider?: string
  /** 最多尝试次数；默认 2（第一次 + 一次重试）。 */
  readonly maxAttempts?: number
}

/** 调用者的委派深度：header 与运行时取大（与 vendor `delegationDepthOf` 同口径）。 */
const depthOf = (agent: AgentLike): number => Math.max(
  agent.session?.header?.delegationDepth ?? 0,
  agent.options?.subagentDepth ?? 0,
)

const DEFAULT_PROVIDER = 'spawn'

const textOf = (output: readonly TextBlock[] | undefined): string =>
  (output ?? []).filter(block => block.type === 'text' && typeof block.text === 'string').map(block => block.text).join('\n')

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error)

/**
 * 给 surface 里列出的 preset 注册 `subagent_retry`；agent 作用域，dispose 时随 fiber 摘除。
 * @param ctx - Host 上下文。
 * @param options - `surface`（注册面 + 深度）/ 提供者 / 尝试上限。
 */
export function registerSubagentRetry(ctx: Context, options: SubagentRetryOptions): void {
  // 静态/单元测试的 mock context 可以没有 inject；此时不注册，不把 apply 打断。
  if (typeof (ctx as unknown as { inject?: unknown }).inject !== 'function') return
  const { surface } = options
  const provider = options.provider ?? DEFAULT_PROVIDER
  const maxAttempts = Math.min(SUBAGENT_RETRY.maxAttempts, Math.max(1, options.maxAttempts ?? SUBAGENT_RETRY.maxAttempts))
  const fibers = new Map<AgentLike, ReturnType<Context['inject']>>()

  const install = (agent: AgentLike, subagents: SubagentsLike): void => {
    if (fibers.has(agent)) return
    const preset = composedPresetOf(agent.ctx)
    if (preset === undefined) return
    const maxDepth = surface.presets[preset]
    if (maxDepth === undefined) return
    const fiber = agent.ctx.inject(['tools'], (scope) => {
      const tools = (scope as unknown as { tools?: ToolsLike }).tools
      if (tools === undefined) return
      scope.effect(() => {
        const tool = defineTool({
          name: 'subagent_retry',
          description: 'Retry-sensitive subagent: start a fresh worker, wait for its terminal result, and retry at most once '
            + 'when the failure is retryable (error/interrupted/lost) and the task is idempotent. '
            + 'Do NOT retry refusal/aborted/completed/max-tokens; do NOT use for non-idempotent writes. '
            + 'The child depth is capped by THIS preset\'s ordinary `subagent` row: when the caller is already at that '
            + 'budget it returns attempts: 0 / stopReason: depth-exceeded with a diagnostic instead of starting a child. '
            + 'Returns attempts/childIds/stopReason/exhausted. Blocking — use only for short tasks; long or batch work uses workflow.',
          parameters: {
            prompt: {
              type: 'string',
              required: true,
              description: 'The complete, self-contained task for the worker. It does not share this conversation\'s context.',
            },
            description: {
              type: 'string',
              required: true,
              description: 'One short task label; also the child label.',
            },
            idempotent: {
              type: 'boolean',
              required: true,
              description: 'True only when repeating the task cannot duplicate side effects (reads, checks, drafts with no external writes).',
            },
          },
          timeoutMs: 300_000,
          output: {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                attempts: { type: 'integer', required: true },
                childIds: { type: 'array', items: { type: 'string' }, required: true },
                stopReason: { type: 'string', required: true },
                exhausted: { type: 'boolean', required: true },
                output: { type: 'string', required: true },
                diagnostic: { type: 'string' },
              },
            },
            render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
          },
          async execute(args, exec) {
            if (exec.agent === undefined) {
              return { attempts: 0, childIds: [], stopReason: 'unavailable', exhausted: false, output: '', diagnostic: '需要发起会话（agent）上下文。' }
            }
            const callerDepth = depthOf(agent)
            const childDepth = callerDepth + 1
            if (childDepth > maxDepth) {
              return {
                attempts: 0,
                childIds: [],
                stopReason: 'depth-exceeded',
                exhausted: true,
                output: '',
                diagnostic: `subagent_retry 拒绝：调用者 preset ${preset} 在 depth ${String(callerDepth)}，`
                  + `子代会是 depth ${String(childDepth)}，超过该 preset 通用 subagent 行的 maxDepth ${String(maxDepth)}。`
                  + '请用普通 subagent 在预算内派活，或改用 workflow；retry 不是深度后门。',
              }
            }
            const childIds: string[] = []
            let attempt = 0
            let last: SubagentResultLike | undefined
            let diagnostic: string | undefined
            while (attempt < maxAttempts) {
              attempt += 1
              let activation: ActivationLike
              try {
                activation = await subagents.startActivation({
                  provider,
                  label: args.description,
                  delivery: 'caller',
                  signal: exec.signal,
                  request: {
                    prompt: [{ type: 'text', text: args.prompt }],
                    parent: exec.agent,
                    agentPreset: surface.childPreset,
                    maxDepth,
                  },
                })
              } catch (error) {
                diagnostic = messageOf(error)
                break
              }
              childIds.push(activation.childId)
              try {
                last = await activation.result
              } catch (error) {
                diagnostic = messageOf(error)
                break
              }
              if (last.stopReason === 'completed') break
              const decision = subagentRetryDecision(last.stopReason, attempt, args.idempotent)
              if (!decision.retry) break
            }
            const exhausted = last?.stopReason !== 'completed' && attempt >= maxAttempts
            return {
              attempts: attempt,
              childIds,
              stopReason: last?.stopReason ?? 'error',
              exhausted,
              output: textOf(last?.output),
              ...(diagnostic === undefined ? {} : { diagnostic }),
            }
          },
        })
        const unregister = tools.register(tool)
        return () => { unregister() }
      })
    })
    fibers.set(agent, fiber)
  }

  ctx.inject(['subagents'], (scope) => {
    const subagents = (scope as unknown as { subagents?: SubagentsLike }).subagents
    if (subagents === undefined) return
    // vendor 的 Agent 类型不带 subagentDepth 的本地增广（augmentation 在 subagent 包里）；
    // 这里只在边界做窄化，内部只用 session.header + options.subagentDepth 两个字段。
    ctx.on('agent/created', payload => { install(payload.agent as unknown as AgentLike, subagents) })
    ctx.on('agent/disposed', payload => {
      const agent = payload.agent as unknown as AgentLike
      const fiber = fibers.get(agent)
      if (fiber === undefined) return
      fibers.delete(agent)
      void fiber.dispose().catch(() => {})
    })
  })
}

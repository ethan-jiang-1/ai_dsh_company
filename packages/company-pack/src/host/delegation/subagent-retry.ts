/**
 * `subagent_retry` host 原语（P4）：同步等到子代终态，按 `subagentRetryDecision` 最多再派一次。
 *
 * 为什么是 host 工具而不是只写 policy：subagent 失败时父代理不一定能可靠地再派；这是
 * **有界、非静默**的确定性补丁。代价（显式登记）：
 * - 阻塞式：父 turn 会等到子代终态；只适合短任务。长/批量活仍用 workflow（可靠、可聚合）。
 * - 只在五个有 generic subagent 的 full role 里注册；CEO/leaf/worker 不挂。
 * - `delivery: 'caller'`：结果只回本次工具调用，不再发完成通知（避免双重投递）。
 * - 不是新引擎：只调官方 `ctx.subagents.startActivation`；不新增调度/深度语义。
 *
 * 退役条件：上游给 `tool-subagent` 原生 bounded retry 配置后，本工具删除。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { composedPresetOf } from '../prompt/handbook.ts'
import { SUBAGENT_RETRY, subagentRetryDecision } from '../../lib/retry-policy.ts'

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
}

export interface SubagentRetryOptions {
  /** 允许挂载本工具的 preset；默认五个有 generic subagent 的 full role。 */
  readonly allowedPresets?: readonly string[]
  /** 子代 preset；默认 worker。 */
  readonly agentPreset?: string
  /** 子代 maxDepth；默认 3（CEO→VP→workflow→worker 的预算）。 */
  readonly maxDepth?: number
  /** 默认 spawn。 */
  readonly provider?: string
  /** 最多尝试次数；默认 2（第一次 + 一次重试）。 */
  readonly maxAttempts?: number
}

const DEFAULT_PRESETS = ['vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo']
const DEFAULT_AGENT_PRESET = 'worker'
const DEFAULT_MAX_DEPTH = 3
const DEFAULT_PROVIDER = 'spawn'

const textOf = (output: readonly TextBlock[] | undefined): string =>
  (output ?? []).filter(block => block.type === 'text' && typeof block.text === 'string').map(block => block.text).join('\n')

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error)

/**
 * 给允许的 preset 注册 `subagent_retry`；agent 作用域，dispose 时随 fiber 摘除。
 * @param ctx - Host 上下文。
 * @param options - 白名单/子代 preset/深度/提供者/尝试上限。
 */
export function registerSubagentRetry(ctx: Context, options: SubagentRetryOptions = {}): void {
  // 静态/单元测试的 mock context 可以没有 inject；此时不注册，不把 apply 打断。
  if (typeof (ctx as unknown as { inject?: unknown }).inject !== 'function') return
  const allowed = new Set(options.allowedPresets ?? DEFAULT_PRESETS)
  const agentPreset = options.agentPreset ?? DEFAULT_AGENT_PRESET
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
  const provider = options.provider ?? DEFAULT_PROVIDER
  const maxAttempts = Math.min(SUBAGENT_RETRY.maxAttempts, Math.max(1, options.maxAttempts ?? SUBAGENT_RETRY.maxAttempts))
  const fibers = new Map<AgentLike, ReturnType<Context['inject']>>()

  const install = (agent: AgentLike, subagents: SubagentsLike): void => {
    if (fibers.has(agent)) return
    if (!allowed.has(composedPresetOf(agent.ctx) ?? '')) return
    const fiber = agent.ctx.inject(['tools'], (scope) => {
      const tools = (scope as unknown as { tools?: ToolsLike }).tools
      if (tools === undefined) return
      scope.effect(() => {
        const tool = defineTool({
          name: 'subagent_retry',
          description: 'Retry-sensitive subagent: start a fresh worker, wait for its terminal result, and retry at most once '
            + 'when the failure is retryable (error/interrupted/lost) and the task is idempotent. '
            + 'Do NOT retry refusal/aborted/completed/max-tokens; do NOT use for non-idempotent writes. '
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
                    agentPreset,
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
    ctx.on('agent/created', ({ agent }: { agent: AgentLike }) => { install(agent, subagents) })
    ctx.on('agent/disposed', ({ agent }: { agent: AgentLike }) => {
      const fiber = fibers.get(agent)
      if (fiber === undefined) return
      fibers.delete(agent)
      void fiber.dispose().catch(() => {})
    })
  })
}

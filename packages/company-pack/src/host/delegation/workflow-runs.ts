/**
 * `workflow_runs`：后台/前台 workflow run 的 durable 视图（BUG-044 修复）。
 *
 * 为什么存在：job 登记表是**进程内**的；宿主重启后 `job_list` 空、`job_output` unknown，
 * 父会话没有任何 durable 句柄可查。但父会话自己的日志里已有 `tool-workflow/run-start|
 * agent-start|run-end` 与工具回执——本工具把它们折叠成模型可读的 run 行：
 * 有 run-end 给终态；没有 run-end 且 job 注册表不认识该 jobId → **`lost`**（明确标注已丢失）；
 * 注册表认识 → `running`。children 一并列出，可 `send_to_subagent` 冷恢复取当前事实
 * （不恢复原 job 的结果——卡里写死了这个边界）。
 *
 * 层契约：只读 `session.ownEvents()`（永远可达）+ `ctx.get('jobs')`（仅作 liveness 装饰，
 * 不是持久事实的来源）；不依赖 isolate 组里的 `sessionQuery`。
 */
import type { Context } from '@deepseek-ai/cordis'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { defineTool } from '@deepseek-ai/dsh-tools'

type SessionEventLike = { type: string; data: unknown; seq?: number }

/** 一条模型可见 workflow run 行。 */
export interface WorkflowRunRow {
  runId: string
  name: string
  background: boolean
  jobId?: string
  status: 'completed' | 'cancelled' | 'error' | 'lost' | 'running'
  children: Array<{ label: string; childId: string }>
}

interface JobRegistryLike {
  list?(caller?: string): Array<{ id?: string }>
}

const TERMINAL = new Set(['completed', 'cancelled', 'error'])

/**
 * Fold the parent session's durable workflow records into run rows.
 * Pure so the spec can pin every status without a live runtime.
 * @param events - the calling session's own durable events.
 * @param jobKnown - whether the process-local job registry still knows a job id.
 * @returns one row per workflow run, in first-run-start order.
 */
export function workflowRunRows(
  events: readonly SessionEventLike[],
  jobKnown: (jobId: string) => boolean = () => false,
): WorkflowRunRow[] {
  const starts: Array<{ seq: number; runId: string; name: string }> = []
  const ends = new Map<string, string>()
  const children = new Map<string, Array<{ label: string; childId: string }>>()
  const calls: Array<{ seq: number; callId: string; name: string; background: boolean }> = []
  const results = new Map<string, { seq: number; text: string }>()
  for (const [index, event] of events.entries()) {
    const data = event.data as Record<string, unknown> | undefined
    const seq = typeof event.seq === 'number' ? event.seq : index
    if (event.type === 'tool-workflow/run-start' && typeof data?.runId === 'string') {
      starts.push({ seq, runId: data.runId, name: typeof data.name === 'string' ? data.name : '' })
    } else if (event.type === 'tool-workflow/run-end' && typeof data?.runId === 'string') {
      ends.set(data.runId, typeof data.stopReason === 'string' ? data.stopReason : 'error')
    } else if (event.type === 'tool-workflow/agent-start' && typeof data?.runId === 'string' && typeof data.childId === 'string') {
      const list = children.get(data.runId) ?? []
      list.push({ label: typeof data.label === 'string' ? data.label : '', childId: data.childId })
      children.set(data.runId, list)
    } else if (event.type === 'tool/call' && typeof data?.callId === 'string') {
      let args: unknown
      try { args = JSON.parse(String(data.arguments ?? '{}')) } catch { continue }
      const record = args as { script?: unknown; meta?: { name?: unknown }; run_in_background?: unknown }
      if (typeof record?.script !== 'string' || typeof record.meta?.name !== 'string') continue
      calls.push({ seq, callId: data.callId, name: record.meta.name, background: record.run_in_background === true })
    } else if (event.type === 'tool/result') {
      const message = data?.message as { toolCallId?: unknown; content?: Array<{ type?: string; text?: string }> } | undefined
      if (typeof message?.toolCallId !== 'string') continue
      const text = (message.content ?? []).filter(block => block?.type === 'text' && typeof block.text === 'string')
        .map(block => block.text).join('\n')
      results.set(message.toolCallId, { seq, text })
    }
  }

  const callsByName = new Map<string, typeof calls>()
  for (const call of calls) {
    const list = callsByName.get(call.name) ?? []
    list.push(call)
    callsByName.set(call.name, list)
  }
  // 「这次调用是否真的产生了 run」的独立证据：结果在 start 之后（还没回执），或结果文本
  // 是 workflow 的启动/完成文案。失败在 run-start 之前的同名调用不能抢走下一次 run（BUG-097）。
  const runEvidence = /started in the background as job \S+|as job \S+|workflow "[^"]+" completed|workflow (completed|finished|cancelled)/i
  const usedCalls = new Set<string>()
  const rows: Array<WorkflowRunRow & { order: number }> = []
  for (const start of starts) {
    const preceding = (callsByName.get(start.name) ?? []).filter(call => !usedCalls.has(call.callId) && call.seq < start.seq)
    const eligible = preceding.filter((call) => {
      const observed = results.get(call.callId)
      return observed === undefined || observed.seq > start.seq || runEvidence.test(observed.text)
    })
    // 同名并发：按 start 顺序取**最早未用**的前置 call（FIFO），否则 r1 会抢走最近的 c2（BUG-126）。
    // 失败前置 call 已在 eligible 里被证据规则排除；都没有时退回最早前置，仍给 lost 兜底。
    const call = eligible[0] ?? preceding[0]
    if (call === undefined) continue
    usedCalls.add(call.callId)
    const text = results.get(call.callId)?.text ?? ''
    const jobMatch = /started in the background as job (\S+?)\./.exec(text) ?? /as job (\S+)/.exec(text)
    const jobId = jobMatch?.[1]
    const background = call.background || jobId !== undefined
    const end = ends.get(start.runId)
    const status: WorkflowRunRow['status'] = end !== undefined && TERMINAL.has(end)
      ? end as WorkflowRunRow['status']
      : background && jobId !== undefined && jobKnown(jobId)
        ? 'running'
        : 'lost'
    rows.push({
      order: start.seq,
      runId: start.runId,
      name: start.name,
      background,
      ...jobId === undefined ? {} : { jobId },
      status,
      children: children.get(start.runId) ?? [],
    })
  }
  // 未被 call 配对上的 run-start 也不能藏：给 lost/终态，jobId 未知。
  for (const start of starts) {
    if (rows.some(row => row.runId === start.runId)) continue
    const end = ends.get(start.runId)
    rows.push({
      order: start.seq,
      runId: start.runId,
      name: start.name,
      background: false,
      status: end !== undefined && TERMINAL.has(end) ? end as WorkflowRunRow['status'] : 'lost',
      children: children.get(start.runId) ?? [],
    })
  }
  return rows.sort((a, b) => a.order - b.order).map(({ order: _order, ...row }) => row)
}

interface ToolScopeLike {
  readonly tools?: { register(tool: unknown): () => unknown; get?(name: string, scope?: object): unknown }
  effect(callback: () => () => unknown): void
}

interface AgentLike {
  readonly ctx: Context
}

/** 工具是否在这个 Agent scope 的真实工具面里。 */
function hasWorkflowTool(scope: Context): boolean {
  const tools = scope.get('tools') as ToolScopeLike['tools'] | undefined
  if (tools?.get === undefined) return false
  try {
    return tools.get('workflow', scopeOf(scope)) !== undefined
  } catch {
    try {
      return tools.get('workflow') !== undefined
    } catch {
      return false
    }
  }
}

/**
 * 构造 `workflow_runs` 工具定义（纯构造，不注册）。
 * 测试直接调用；host 在 per-agent 安装时注册。
 * @param ctx - Host 上下文（execute 里读 jobs 注册表）。
 * @returns 工具定义。
 */
export function createWorkflowRunsTool(ctx: Context): unknown {
  return defineTool({
    name: 'workflow_runs',
    description: 'List the workflow runs recorded in THIS session\'s durable log, including runs whose '
      + 'host process died. `status` is `completed`/`cancelled`/`error` when the run recorded an end; '
      + 'a background run with no end whose job id is unknown to the current process is `lost` (the '
      + 'original job result is NOT recoverable — `children` lists the child sessions so you can continue '
      + 'them with `send_to_subagent` for current facts). `running` means the live job registry still owns it.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          runs: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                runId: { type: 'string', required: true },
                name: { type: 'string', required: true },
                background: { type: 'boolean', required: true },
                jobId: { type: 'string' },
                status: { type: 'string', required: true },
                children: {
                  type: 'array',
                  required: true,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      label: { type: 'string', required: true },
                      childId: { type: 'string', required: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute(_args: never, exec: { agent?: { session: { id: string; ownEvents(): readonly SessionEventLike[] } } }) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('workflow_runs requires a calling agent')
      const jobs = ctx.get('jobs') as JobRegistryLike | undefined
      const jobKnown = (jobId: string): boolean => {
        try {
          return jobs?.list?.(agent.session.id)?.some(job => String(job?.id) === jobId) ?? false
        } catch {
          return false
        }
      }
      return { runs: workflowRunRows(agent.session.ownEvents(), jobKnown) }
    },
  })
}

/**
 * 注册 `workflow_runs`：**per-agent**，只在有 `workflow` 工具的会话里可见。
 *
 * 为什么不是全局：job 注册表是进程内的；CEO/COO/worker 没有 workflow，却曾能看到这个工具。
 * 能力域即作用域：没有 workflow 的会话不需要这个 durable 视图。
 * @param ctx - Host 上下文。
 */
export function registerWorkflowRuns(ctx: Context): void {
  // 只去重 `agent/created` 的重复投递；tools re-provide 时 callback 由 fiber 重跑（BUG-074）。
  const installed = new WeakSet<object>()
  const install = (agent: AgentLike): void => {
    if (installed.has(agent)) return
    installed.add(agent)
    agent.ctx.inject(['tools'], (scope) => {
      const scoped = scope as unknown as ToolScopeLike
      const tools = scope.get('tools') as ToolScopeLike['tools'] | undefined
      if (!hasWorkflowTool(scope) || tools === undefined) return
      scoped.effect(() => {
        const unregister = tools.register(createWorkflowRunsTool(ctx))
        return () => { unregister?.() }
      })
    })
  }
  ctx.on('agent/created', ({ agent }: { agent: AgentLike }) => { install(agent) })
}

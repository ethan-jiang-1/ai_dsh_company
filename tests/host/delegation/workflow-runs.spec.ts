/**
 * host 半 `workflow_runs` spec（BUG-044 修复的 keyless 锚点）。
 *
 * 证明什么：父会话自己的 durable `tool-workflow/*` 事件 + 工具回执能被折叠成
 *   completed/cancelled/running/lost 四态与 children；`lost` = 无 run-end 且 job 注册表不认识。
 * 不证明：真实装配里模型会不会用它（那是 C7 探针）；原 job 结果可恢复（明确不恢复）。
 */
import { describe, expect, it } from 'vitest'
import { createWorkflowRunsTool, registerWorkflowRuns, workflowRunRows } from '../../../packages/company-pack/src/host/delegation/workflow-runs.ts'

type ToolDefinition = {
  name: string
  description: string
  execute(args: never, exec: never): Promise<unknown>
}

const runStart = (seq: number, runId: string, name: string) => ({ type: 'tool-workflow/run-start', seq, data: { runId, name } })
const agentStart = (seq: number, runId: string, label: string, childId: string) => ({
  type: 'tool-workflow/agent-start', seq, data: { runId, seq: 1, label, childId },
})
const runEnd = (seq: number, runId: string, stopReason: string) => ({ type: 'tool-workflow/run-end', seq, data: { runId, stopReason } })
const call = (seq: number, callId: string, name: string, background: boolean) => ({
  type: 'tool/call',
  seq,
  data: {
    callId,
    name: 'workflow',
    arguments: JSON.stringify({
      meta: { name },
      script: 'return 1',
      ...background ? { run_in_background: true } : {},
    }),
  },
})
const result = (seq: number, callId: string, text: string) => ({
  type: 'tool/result',
  seq,
  data: { message: { toolCallId: callId, content: [{ type: 'text', text }] } },
})
const backgroundText = (name: string, jobId: string) => `workflow "${name}" started in the background as job ${jobId}. Its return value arrives with the completion notice; check on it with job_output, stop it with job_kill.`
const foregroundText = (name: string, agents: number) => `workflow "${name}" completed (${agents} agents).\nReturn value:\n{}`

function harness(events: unknown[], jobs?: unknown) {
  const tools = new Map<string, ToolDefinition>()
  const ctx = {
    get: (name: string) => (name === 'jobs' ? jobs : undefined),
  }
  const tool = createWorkflowRunsTool(ctx as never) as ToolDefinition
  tools.set(tool.name, tool)
  return { tools, agent: { session: { id: 'parent', ownEvents: () => events } } }
}

/** 真装配形状：只有工具面里有 workflow 的 Agent 才拿到 workflow_runs。 */
function installHarness(hasWorkflow: boolean) {
  const tools = new Map<string, ToolDefinition>()
  let listener: ((payload: { agent: unknown }) => void) | undefined
  const ctx = {
    on: (name: string, callback: (payload: { agent: unknown }) => void) => {
      if (name === 'agent/created') listener = callback
    },
  }
  const scope = {
    get: (name: string) => name === 'tools'
      ? {
          get: (toolName: string) => (hasWorkflow && toolName === 'workflow' ? { name: 'workflow' } : undefined),
          register: (definition: ToolDefinition) => { tools.set(definition.name, definition); return () => {} },
        }
      : undefined,
    effect: (callback: () => () => unknown) => { callback() },
  }
  const agent = {
    ctx: {
      inject: (_deps: readonly string[], callback: (value: unknown) => void) => { callback(scope) },
    },
  }
  registerWorkflowRuns(ctx as never)
  listener?.({ agent })
  return tools
}

describe('workflow run durable view', () => {
  it('marks a background run with no run-end and an unknown job as lost, with children', () => {
    const rows = workflowRunRows([
      call(0, 'c1', 'audit', true),
      runStart(1, 'r1', 'audit'),
      agentStart(2, 'r1', 'm01', 'child-1'),
      result(3, 'c1', backgroundText('audit', 'workflow-abc')),
    ])
    expect(rows).toEqual([{
      runId: 'r1',
      name: 'audit',
      background: true,
      jobId: 'workflow-abc',
      status: 'lost',
      children: [{ label: 'm01', childId: 'child-1' }],
    }])
  })

  it('reports running when the live job registry still owns the job', () => {
    const rows = workflowRunRows([
      call(0, 'c1', 'audit', true),
      runStart(1, 'r1', 'audit'),
      result(2, 'c1', backgroundText('audit', 'workflow-abc')),
    ], jobId => jobId === 'workflow-abc')
    expect(rows[0]?.status).toBe('running')
  })

  it('reports the recorded end for completed and cancelled runs (foreground or background)', () => {
    const completed = workflowRunRows([
      call(0, 'c1', 'audit', false),
      runStart(1, 'r1', 'audit'),
      runEnd(2, 'r1', 'completed'),
      result(3, 'c1', foregroundText('audit', 2)),
    ])
    expect(completed[0]).toMatchObject({ status: 'completed', background: false })
    expect(completed[0]?.jobId).toBeUndefined()

    const cancelled = workflowRunRows([
      call(0, 'c2', 'audit', true),
      runStart(1, 'r2', 'audit'),
      runEnd(2, 'r2', 'cancelled'),
      result(3, 'c2', backgroundText('audit', 'workflow-def')),
    ])
    expect(cancelled[0]).toMatchObject({ status: 'cancelled', background: true })
  })

  it('pairs repeated run names in order and never invents a run', () => {
    const rows = workflowRunRows([
      call(0, 'c1', 'audit', true),
      runStart(1, 'r1', 'audit'),
      result(2, 'c1', backgroundText('audit', 'workflow-1')),
      call(3, 'c2', 'audit', false),
      runStart(4, 'r2', 'audit'),
      runEnd(5, 'r2', 'completed'),
      result(6, 'c2', foregroundText('audit', 1)),
      runStart(7, 'r3', 'orphan'),
    ])
    expect(rows).toHaveLength(3)
    expect(rows.map(row => [row.runId, row.status])).toEqual([
      ['r1', 'lost'],
      ['r2', 'completed'],
      ['r3', 'lost'],
    ])
  })

  it('builds workflow_runs and reads the calling session own events', async () => {
    const events = [
      call(0, 'c1', 'audit', true),
      runStart(1, 'r1', 'audit'),
      result(2, 'c1', backgroundText('audit', 'workflow-abc')),
    ]
    const { tools, agent } = harness(events, { list: () => [] })
    const tool = tools.get('workflow_runs')
    expect(tool).toBeDefined()
    expect(tool?.description).toContain('lost')
    const output = await tool?.execute({} as never, { agent, signal: new AbortController().signal } as never) as {
      runs: Array<{ runId: string; status: string }>
    }
    expect(output.runs).toEqual([expect.objectContaining({ runId: 'r1', status: 'lost' })])
  })

  it('per-agent install: only a scope with the workflow tool gets workflow_runs', () => {
    expect(installHarness(true).has('workflow_runs')).toBe(true)
    expect(installHarness(false).has('workflow_runs')).toBe(false)
  })

  it('treats a missing job registry as unknown, not as running', () => {
    const { tools, agent } = harness([
      call(0, 'c1', 'audit', true),
      runStart(1, 'r1', 'audit'),
      result(2, 'c1', backgroundText('audit', 'workflow-abc')),
    ])
    const tool = tools.get('workflow_runs')
    return expect(tool?.execute({} as never, { agent, signal: new AbortController().signal } as never))
      .resolves.toEqual({ runs: [expect.objectContaining({ status: 'lost' })] })
  })
})

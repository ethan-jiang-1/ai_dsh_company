/** `subagent_retry` host 工具的 keyless 行为：有界重试 / 不重试分类 / start 失败不炸。 */
import { describe, expect, it } from 'vitest'
import { registerSubagentRetry } from '../../packages/company-pack/src/host/subagent-retry.ts'

interface FakeResult {
  output: Array<{ type: 'text'; text: string }>
  stopReason: string
}

interface Harness {
  readonly tool: { execute: (args: unknown, exec: unknown) => Promise<Record<string, unknown>> } | undefined
  readonly calls: Array<{ label: string; agentPreset: string; maxDepth: number; prompt: string }>
}

function harness(preset: string, results: Array<FakeResult | Error>): Harness {
  const calls: Harness['calls'] = []
  let captured: Harness['tool']
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const ctx = {
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
    subagents: undefined as unknown,
    inject: (_deps: readonly string[], callback: (value: unknown) => void) => {
      callback({ subagents })
      return { dispose: async () => {} }
    },
  }
  const presets = { composedPreset: () => preset }
  const tools = {
    register: (tool: Harness['tool']) => {
      captured = tool
      return () => {}
    },
  }
  const subagents = {
    startActivation: async (spec: { label: string; request: { agentPreset: string; maxDepth: number; prompt: Array<{ text: string }> } }) => {
      calls.push({
        label: spec.label,
        agentPreset: spec.request.agentPreset,
        maxDepth: spec.request.maxDepth,
        prompt: spec.request.prompt[0]?.text ?? '',
      })
      const next = results.shift()
      if (next === undefined) throw new Error('no fake result left')
      if (next instanceof Error) throw next
      return { childId: `child-${String(calls.length)}`, result: Promise.resolve(next) }
    },
  }
  ctx.subagents = subagents
  const scope = {
    tools,
    get: (name: string) => name === 'tools' ? tools : name === 'subagents' ? subagents : undefined,
    effect: (callback: () => () => void) => callback(),
  }
  const agent = {
    ctx: {
      get: (name: string) => name === 'agentPresets' ? presets : undefined,
      inject: (_deps: readonly string[], callback: (value: unknown) => void) => {
        callback(scope)
        return { dispose: async () => {} }
      },
    },
  }
  registerSubagentRetry(ctx as never, { allowedPresets: ['vp-eng'], agentPreset: 'worker', maxDepth: 3 })
  for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
  return { tool: captured, calls }
}

const completed = (text: string): FakeResult => ({ output: [{ type: 'text', text }], stopReason: 'completed' })
const failure = (stopReason: string): FakeResult => ({ output: [], stopReason })

const run = async (h: Harness, idempotent = true) => {
  if (h.tool === undefined) throw new Error('tool not registered')
  return h.tool.execute(
    { prompt: 'do one thing', description: 'probe', idempotent },
    { agent: {}, signal: new AbortController().signal },
  )
}

describe('subagent_retry', () => {
  it('只给 allowed preset 注册；默认子代 worker/maxDepth 3', async () => {
    const allowed = harness('vp-eng', [completed('ok')])
    expect(allowed.tool).toBeDefined()
    const result = await run(allowed)
    expect(result).toMatchObject({ attempts: 1, childIds: ['child-1'], stopReason: 'completed', exhausted: false, output: 'ok' })
    expect(allowed.calls[0]).toMatchObject({ agentPreset: 'worker', maxDepth: 3, prompt: 'do one thing' })

    const denied = harness('worker', [completed('ok')])
    expect(denied.tool).toBeUndefined()
  })

  it('error 第一次失败 → 幂等再派一次 → completed；childIds 记录两次', async () => {
    const h = harness('vp-eng', [failure('error'), completed('retry ok')])
    const result = await run(h, true)
    expect(result).toMatchObject({ attempts: 2, stopReason: 'completed', exhausted: false, output: 'retry ok' })
    expect(result.childIds).toEqual(['child-1', 'child-2'])
    expect(h.calls).toHaveLength(2)
  })

  it('error 两次 → exhausted，不第三次', async () => {
    const h = harness('vp-eng', [failure('error'), failure('error')])
    const result = await run(h, true)
    expect(result).toMatchObject({ attempts: 2, stopReason: 'error', exhausted: true })
    expect(h.calls).toHaveLength(2)
  })

  it('refusal / aborted / max-tokens 不自动重试', async () => {
    for (const stopReason of ['refusal', 'aborted', 'max-tokens']) {
      const h = harness('vp-eng', [failure(stopReason), completed('should not run')])
      const result = await run(h, true)
      expect(result).toMatchObject({ attempts: 1, stopReason, exhausted: false })
      expect(h.calls).toHaveLength(1)
    }
  })

  it('非幂等不重试', async () => {
    const h = harness('vp-eng', [failure('error'), completed('should not run')])
    const result = await run(h, false)
    expect(result).toMatchObject({ attempts: 1, stopReason: 'error', exhausted: false })
    expect(h.calls).toHaveLength(1)
  })

  it('startActivation 抛错 → 不重试、带 diagnostic、不炸', async () => {
    const h = harness('vp-eng', [new Error('spawn unavailable')])
    const result = await run(h, true)
    expect(result).toMatchObject({ attempts: 1, stopReason: 'error', exhausted: false, diagnostic: 'spawn unavailable' })
    expect(h.calls).toHaveLength(1)
  })
})

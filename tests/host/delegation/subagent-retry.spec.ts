/**
 * `subagent_retry` host 工具的 keyless 行为：按调用者 preset 的**行级深度预算**放行（BUG-045）、
 * 有界重试分类、越界可见拒绝、start 失败不炸。
 *
 * 预算来源唯一 = `SUBAGENT_RETRY_SURFACE`（pack 运行时表；与模型 `retrySurface()` 由
 * `tests/presets/delegation-retry.spec.ts` 钉同源）。这里只证 host 真的按表执行，不重抄一份预算。
 */
// 负例留证 2026-11-09：把 `SUBAGENT_RETRY_SURFACE.presets.cmo` 从 2 改回 3 ⇒「CMO 在 depth 2 拒绝」
// 与「运行时 subagentDepth 取大」两条红（child 被起了，`expected [...] to have a length of 0 but got 1`）；
// 还原 ⇒ 22 passed。BUG-045
// 负例留证 2026-11-10：把 `abortable(activation.result, exec.signal)` 改回裸 `await activation.result`
// ⇒「abort parent signal」用例在 1s 守卫上红（hung）；还原 ⇒ 绿。BUG-053
import { describe, expect, it } from 'vitest'
import { registerSubagentRetry } from '../../../packages/company-pack/src/host/delegation/subagent-retry.ts'
import { SUBAGENT_RETRY_SURFACE } from '../../../packages/company-pack/src/lib/retry-policy.ts'

interface FakeResult {
  output: Array<{ type: 'text'; text: string }>
  stopReason: string
}

interface Harness {
  readonly tool: { execute: (args: unknown, exec: unknown) => Promise<Record<string, unknown>> } | undefined
  readonly calls: Array<{ label: string; agentPreset: string; maxDepth: number; prompt: string }>
  readonly interrupts: Array<{ childId: string; authority: unknown }>
}

interface HarnessOptions {
  /** 调用者 preset（决定预算与是否注册）。 */
  readonly preset: string
  /** 调用者 durable header 里的 delegationDepth；缺省 = 根会话 0。 */
  readonly depth?: number
  /** 运行时 `AgentOptions.subagentDepth`（与 header 取大，模拟引擎口径）。 */
  readonly runtimeDepth?: number
  readonly results: Array<FakeResult | Error>
  /** 模拟永不 resolve 的 activation.result（取消探针）。 */
  readonly neverResolve?: boolean
}

function harness(options: HarnessOptions): Harness {
  const calls: Harness['calls'] = []
  const interrupts: Harness['interrupts'] = []
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
  const presets = { composedPreset: () => options.preset }
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
      if (options.neverResolve === true) {
        return { childId: `child-${String(calls.length)}`, result: new Promise<never>(() => {}) }
      }
      const next = options.results.shift()
      if (next === undefined) throw new Error('no fake result left')
      if (next instanceof Error) throw next
      return { childId: `child-${String(calls.length)}`, result: Promise.resolve(next) }
    },
    interrupt: (childId: string, authority: unknown) => { interrupts.push({ childId, authority }) },
  }
  ctx.subagents = subagents
  const scope = {
    tools,
    get: (name: string) => name === 'tools' ? tools : name === 'subagents' ? subagents : undefined,
    effect: (callback: () => () => void) => callback(),
  }
  const agent = {
    session: { header: { delegationDepth: options.depth ?? 0 } },
    options: options.runtimeDepth === undefined ? {} : { subagentDepth: options.runtimeDepth },
    ctx: {
      get: (name: string) => name === 'agentPresets' ? presets : undefined,
      inject: (_deps: readonly string[], callback: (value: unknown) => void) => {
        callback(scope)
        return { dispose: async () => {} }
      },
    },
  }
  registerSubagentRetry(ctx as never, { surface: SUBAGENT_RETRY_SURFACE })
  for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
  return { tool: captured, calls, interrupts }
}

const completed = (text: string): FakeResult => ({ output: [{ type: 'text', text }], stopReason: 'completed' })
const failure = (stopReason: string): FakeResult => ({ output: [], stopReason })

const run = async (h: Harness, idempotent = true, signal = new AbortController().signal) => {
  if (h.tool === undefined) throw new Error('tool not registered')
  return h.tool.execute(
    { prompt: 'do one thing', description: 'probe', idempotent },
    { agent: {}, signal },
  )
}

describe('subagent_retry：注册面与深度预算（BUG-045）', () => {
  it('按调用者 preset 注册：有 generic subagent 行的 full role 有工具，CEO/worker 没有', () => {
    for (const preset of ['vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo']) {
      expect(harness({ preset, results: [completed('ok')] }).tool, `${preset} 应注册`).toBeDefined()
    }
    for (const preset of ['ceo', 'worker', 'worker-orchestrator', 'worker-researcher']) {
      expect(harness({ preset, results: [completed('ok')] }).tool, `${preset} 不该注册`).toBeUndefined()
    }
  })

  it('CMO 在 depth 2 调用 → 预算 2，拒绝起 child（不静默绕过行级 maxDepth）', async () => {
    const h = harness({ preset: 'cmo', depth: 2, results: [completed('should not run')] })
    const result = await run(h)
    expect(h.calls).toHaveLength(0)
    expect(result).toMatchObject({ attempts: 0, childIds: [], stopReason: 'depth-exceeded', exhausted: true })
    expect(String(result.diagnostic)).toContain('cmo')
    expect(String(result.diagnostic)).toContain('2')
  })

  it('vp-sales 在 depth 2 调用 → 同款拒绝（预算 2，child 会是 3）', async () => {
    const h = harness({ preset: 'vp-sales', depth: 2, results: [completed('should not run')] })
    const result = await run(h)
    expect(h.calls).toHaveLength(0)
    expect(result.stopReason).toBe('depth-exceeded')
  })

  it('vp-eng 长链仍放行：depth 2 → child depth 3，maxDepth 3', async () => {
    const h = harness({ preset: 'vp-eng', depth: 2, results: [completed('long chain ok')] })
    const result = await run(h)
    expect(result).toMatchObject({ attempts: 1, stopReason: 'completed' })
    expect(h.calls[0]).toMatchObject({ agentPreset: 'worker', maxDepth: 3 })
  })

  it('vp-eng 到 depth 3 也拒绝（child 会是 4 > 3）', async () => {
    const h = harness({ preset: 'vp-eng', depth: 3, results: [completed('should not run')] })
    const result = await run(h)
    expect(h.calls).toHaveLength(0)
    expect(result.stopReason).toBe('depth-exceeded')
  })

  it('运行时 subagentDepth 与 header 取大（引擎口径），不放宽也不收紧', async () => {
    const h = harness({ preset: 'cmo', depth: 0, runtimeDepth: 2, results: [completed('should not run')] })
    const result = await run(h)
    expect(h.calls).toHaveLength(0)
    expect(result.stopReason).toBe('depth-exceeded')
  })

  it('每个 preset 的 host maxDepth 与运行时表一致', async () => {
    for (const [preset, maxDepth] of Object.entries(SUBAGENT_RETRY_SURFACE.presets)) {
      const h = harness({ preset, depth: 0, results: [completed('ok')] })
      await run(h)
      expect(h.calls[0], preset).toMatchObject({ maxDepth })
    }
  })
})

describe('subagent_retry：重试分类（既有语义不回归）', () => {
  it('completed → attempts 1', async () => {
    const h = harness({ preset: 'vp-eng', results: [completed('ok')] })
    const result = await run(h)
    expect(result).toMatchObject({ attempts: 1, childIds: ['child-1'], stopReason: 'completed', exhausted: false, output: 'ok' })
    expect(h.calls[0]).toMatchObject({ agentPreset: 'worker', maxDepth: 3, prompt: 'do one thing' })
  })

  it('error 第一次失败 → 幂等再派一次 → completed；childIds 记录两次', async () => {
    const h = harness({ preset: 'vp-eng', results: [failure('error'), completed('retry ok')] })
    const result = await run(h, true)
    expect(result).toMatchObject({ attempts: 2, stopReason: 'completed', exhausted: false, output: 'retry ok' })
    expect(result.childIds).toEqual(['child-1', 'child-2'])
    expect(h.calls).toHaveLength(2)
  })

  it('error 两次 → exhausted，不第三次', async () => {
    const h = harness({ preset: 'vp-eng', results: [failure('error'), failure('error')] })
    const result = await run(h, true)
    expect(result).toMatchObject({ attempts: 2, stopReason: 'error', exhausted: true })
    expect(h.calls).toHaveLength(2)
  })

  it('refusal / aborted / max-tokens 不自动重试', async () => {
    for (const stopReason of ['refusal', 'aborted', 'max-tokens']) {
      const h = harness({ preset: 'vp-eng', results: [failure(stopReason), completed('should not run')] })
      const result = await run(h, true)
      expect(result).toMatchObject({ attempts: 1, stopReason, exhausted: false })
      expect(h.calls).toHaveLength(1)
    }
  })

  it('非幂等不重试', async () => {
    const h = harness({ preset: 'vp-eng', results: [failure('error'), completed('should not run')] })
    const result = await run(h, false)
    expect(result).toMatchObject({ attempts: 1, stopReason: 'error', exhausted: false })
    expect(h.calls).toHaveLength(1)
  })

  it('startActivation 抛错 → 不重试、带 diagnostic、不炸', async () => {
    const h = harness({ preset: 'vp-eng', results: [new Error('spawn unavailable')] })
    const result = await run(h, true)
    expect(result).toMatchObject({ attempts: 1, stopReason: 'error', exhausted: false, diagnostic: 'spawn unavailable' })
    expect(h.calls).toHaveLength(1)
  })
})

describe('subagent_retry：取消收敛（BUG-053）', () => {
  it('parent signal abort：interrupt child 并返回 aborted，不悬挂', async () => {
    const h = harness({ preset: 'vp-eng', neverResolve: true, results: [] })
    const controller = new AbortController()
    const pending = run(h, true, controller.signal)
    for (let i = 0; i < 100 && h.calls.length === 0; i += 1) await new Promise(resolve => setTimeout(resolve, 2))
    expect(h.calls).toHaveLength(1)
    controller.abort(new Error('parent cancelled'))
    const result = await Promise.race([
      pending,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('hung')), 1000)),
    ])
    expect(result).toMatchObject({ attempts: 1, childIds: ['child-1'], stopReason: 'aborted', exhausted: false })
    expect(h.interrupts).toHaveLength(1)
    expect(h.interrupts[0]?.childId).toBe('child-1')
    expect(h.interrupts[0]?.authority).toMatchObject({ kind: 'ancestor' })
  })

  it('已经 abort 的 signal：不启动 child、直接返回 aborted', async () => {
    const h = harness({ preset: 'vp-eng', results: [completed('should not run')] })
    const controller = new AbortController()
    controller.abort(new Error('already'))
    const result = await run(h, true, controller.signal)
    expect(result).toMatchObject({ attempts: 0, childIds: [], stopReason: 'aborted' })
    expect(h.calls).toHaveLength(0)
  })
})

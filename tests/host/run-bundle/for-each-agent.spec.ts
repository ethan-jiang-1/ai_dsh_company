/**
 * Unit tests for `injectEachAgent` (`packages/company-pack/src/host/run-bundle/for-each-agent.ts`).
 *
 * Covers:
 * - Dual-owner teardown (`agent/disposed` AND plugin `ctx` disposal, idempotent in either order);
 * - Pre-existing live agents via `ctx.get('agents')?.list()` AND late-provided `agents` service;
 * - Duplicate `agent/created` deduplication (`fibers.has`);
 * - `options.filter` predicate skipping non-matching agents;
 * - Graceful recovery when `agent.ctx.inject` throws (closed scope) or `fiber.dispose()` throws/rejects.
 */
import { describe, expect, it } from 'vitest'
import { injectEachAgent } from '../../../packages/company-pack/src/host/run-bundle/for-each-agent.ts'
import {
  Context,
  createRealAgentHarness,
  emitAgentCreated,
  emitAgentDisposed,
  type RealAgentHarness,
} from '../../support/cordis-agent-harness.ts'

const wait = (): Promise<void> => new Promise(resolve => { setImmediate(resolve) })

describe('injectEachAgent · 双 owner 生命周期与边界分支', () => {
  it('agent/disposed 与 plugin dispose 任一先触发均幂等摘除注册，不重复报错', async () => {
    const host = new Context()
    const a1 = createRealAgentHarness({ id: 'a1', preset: 'ceo' })
    const a2 = createRealAgentHarness({ id: 'a2', preset: 'vp-eng' })

    const pluginFiber = host.plugin({
      apply(scoped: Context) {
        injectEachAgent<RealAgentHarness['agent']>(scoped, ['systemPrompt'], (scope, agent) => {
          scope.systemPrompt.section({
            name: `test:${agent.id}`,
            order: 1,
            text: 'hello',
          })
        })
      },
    })
    await pluginFiber

    emitAgentCreated(host, a1.agent)
    emitAgentCreated(host, a1.agent) // duplicate created ignored
    emitAgentCreated(host, a2.agent)
    await wait()

    expect(a1.sections.has('test:a1')).toBe(true)
    expect(a2.sections.has('test:a2')).toBe(true)

    // First: agent/disposed tears down a1 while plugin stays mounted
    emitAgentDisposed(host, a1.agent)
    emitAgentDisposed(host, a1.agent) // idempotent repeat
    await wait()
    expect(a1.sections.has('test:a1')).toBe(false)
    expect(a2.sections.has('test:a2')).toBe(true)

    // Second: plugin fiber dispose tears down remaining live agent a2
    await pluginFiber.dispose()
    await wait()
    expect(a2.sections.has('test:a2')).toBe(false)

    // Subsequent agent/created after plugin dispose is ignored
    const a3 = createRealAgentHarness({ id: 'a3', preset: 'coo' })
    emitAgentCreated(host, a3.agent)
    await wait()
    expect(a3.sections.size).toBe(0)

    await a1.disposeAgent()
    await a2.disposeAgent()
    await a3.disposeAgent()
    await host.fiber.dispose()
  })

  it('迟到 provide agents 服务时自动补挂在场会话，且 filter=false 会话被跳过', async () => {
    const host = new Context()
    const allowed = createRealAgentHarness({ id: 'allowed', preset: 'ceo' })
    const skipped = createRealAgentHarness({ id: 'skipped', preset: 'worker' })

    const stop = injectEachAgent<RealAgentHarness['agent']>(
      host,
      ['systemPrompt'],
      (scope, agent) => {
        scope.systemPrompt.section({ name: `late:${agent.id}`, order: 1, text: 'ok' })
      },
      { filter: agent => agent.id === 'allowed' },
    )

    host.provide('agents', { list: () => [allowed.agent, skipped.agent] } as never)
    await wait()

    expect(allowed.sections.has('late:allowed')).toBe(true)
    expect(skipped.sections.has('late:skipped')).toBe(false)

    stop()
    stop() // idempotent
    await wait()
    expect(allowed.sections.size).toBe(0)

    await allowed.disposeAgent()
    await skipped.disposeAgent()
    await host.fiber.dispose()
  })

  it('agent.ctx.inject 抛异常、fiber.dispose 同步抛错或异步 reject 均被安全隔离', async () => {
    const listeners = new Map<string, ((payload: unknown) => void)[]>()
    const stubCtx = {
      agents: {
        list: () => [
          {
            ctx: {
              inject: () => { throw new Error('scope closed') },
            },
          },
        ],
      },
      on: (name: string, fn: (payload: unknown) => void) => {
        listeners.set(name, [...(listeners.get(name) ?? []), fn])
        return () => {}
      },
    }

    const stop = injectEachAgent(stubCtx as never, ['tools'], () => {})
    const syncThrowAgent = {
      ctx: {
        inject: (_deps: readonly string[], cb: (s: unknown) => void) => {
          cb({})
          return { dispose: () => { throw new Error('sync boom') } }
        },
      },
    }
    const asyncRejectAgent = {
      ctx: {
        inject: (_deps: readonly string[], cb: (s: unknown) => void) => {
          cb({})
          return { dispose: () => Promise.reject(new Error('async boom')) }
        },
      },
    }

    for (const fn of listeners.get('agent/created') ?? []) {
      fn({ agent: syncThrowAgent })
      fn({ agent: asyncRejectAgent })
    }
    for (const fn of listeners.get('agent/disposed') ?? []) {
      fn({ agent: syncThrowAgent })
    }
    expect(() => { stop() }).not.toThrow()
    await wait()
  })
})

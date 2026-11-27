/**
 * Host `apply` 的生命周期判据（R4-05，2026-10-28 第四轮六维审计）。
 *
 * 为什么补：`host-composition` 只断注册面/dispose 摘工具；`ctx.inject` 的迟到服务与
 * `ctx.on(...)` 的卸载后事件仍没跑过。一个“apply 后 provide 服务不触发”或“dispose 后事件仍写”
 * 的回归，现有 959 例全绿。
 *
 * 不主张：真 profile 装配、真 workspace registry / sessionQuery（那归 preset-smoke / release-smoke）。
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply } from '../../../packages/company-pack/src/index.ts'
import { writeStartupSettings } from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { EMPTY_STARTUP_SETTINGS } from '../../../packages/company-pack/src/lib/startup/startup-settings.ts'
import {
  createRealAgentHarness,
  createRealHostHarness,
  emitAgentCreated,
  type Context,
} from '../../support/cordis-agent-harness.ts'
import { createTempEnv, type TempEnv } from '../../support/temp-env.ts'

let env: TempEnv

beforeEach(() => {
  env = createTempEnv('apply-lifecycle-')
  env.set({
    DSH_HOME: env.home,
    DSH_COMPANY_HOME: env.company,
    DSH_COMPANY_BOOTSTRAP: 'off',
    DSH_COMPANY_REBIND: undefined,
  })
  mkdirSync(env.home, { recursive: true })
  mkdirSync(env.company, { recursive: true })
})

afterEach(() => { env.cleanup() })

const wait = (): Promise<void> => new Promise(resolve => { setImmediate(resolve) })

function mount(initialAgents: readonly ReturnType<typeof createRealAgentHarness>['agent'][] = []) {
  const host = createRealHostHarness(initialAgents)
  return {
    ctx: host.ctx,
    warns: host.warns,
    toolRegistrations: () => host.hostTools.size,
    provideSubagents: () => { host.provideSubagents() },
  }
}

async function start(ctx: Context): Promise<{ scoped: Context; pluginFiber: ReturnType<Context['plugin']> }> {
  let scoped: Context | undefined
  const pluginFiber = ctx.plugin({
    inject: ['tools', 'approval', 'commands'],
    apply: (child: Context) => { scoped = child; return apply(child, {}) },
  })
  await pluginFiber
  await wait()
  if (scoped === undefined) throw new Error('plugin apply did not run')
  return { scoped, pluginFiber }
}

describe('Host apply 生命周期：迟到 inject、双 owner 卸载与热挂载（R4-05 / 维3）', () => {
  it('apply 后才 provide workspaceRegistry：迟到 inject 回调真跑，并点名失效路径', async () => {
    const { ctx, warns, toolRegistrations } = mount()
    const { scoped } = await start(ctx)
    expect(toolRegistrations()).toBe(3)
    scoped.provide('workspaceRegistry', { list: () => [{ path: '/definitely-missing-r4-9f3a' }] } as never)
    await wait()
    expect(warns.some(message => message.includes('路径已不存在'))).toBe(true)
    await ctx.fiber.dispose()
  })

  it('apply 注册的 company:language policy 在真 Cordis agent/created 时注入', async () => {
    const { ctx } = mount()
    const { scoped } = await start(ctx)
    const ceo = createRealAgentHarness({ preset: 'ceo', cwd: env.company })
    emitAgentCreated(scoped, ceo.agent)
    await wait()
    expect(ceo.sections.has('company:language')).toBe(true)
    expect(ceo.readSectionText('company:language')).toContain('公司工作语言')
    await ceo.disposeAgent(scoped)
    await ctx.fiber.dispose()
  })

  it('dispose 后 api-session/added 不再触发告警（事件监听已摘）', async () => {
    const { ctx, warns, toolRegistrations } = mount()
    const { scoped } = await start(ctx)
    expect(toolRegistrations()).toBe(3)
    scoped.emit('api-session/added', { sessionId: 'session-x', cwd: '/outside-r4', origin: 'human', running: true, projections: { values: {} } } as never)
    await wait()
    expect(warns.some(message => message.includes('不在 workspace'))).toBe(true)
    const before = warns.length
    await ctx.fiber.dispose()
    scoped.emit('api-session/added', { sessionId: 'session-y', cwd: '/outside-r4-2', origin: 'human', running: true, projections: { values: {} } } as never)
    await wait()
    expect(warns.length).toBe(before)
  })

  it('boot 无 workspace 仍注册 startup section，按会话 cwd 读策略', async () => {
    env.set({
      DSH_COMPANY_HOME: join(env.dir, 'missing-company'),
      DSH_COMPANY_BOOTSTRAP: 'off',
      DSH_COMPANY_REBIND: undefined,
    })
    const { ctx } = mount()
    const { scoped } = await start(ctx)
    const project = mkdtempSync(join(tmpdir(), 'startup-apply-'))
    const ceo = createRealAgentHarness({ preset: 'ceo', cwd: project })
    try {
      writeStartupSettings(project, {
        ...EMPTY_STARTUP_SETTINGS,
        productType: 'hardware-software',
        updatedAt: '2026-11-12T00:00:00.000Z',
      })
      emitAgentCreated(scoped, ceo.agent)
      await wait()
      expect(ceo.sections.has('company:startup-settings')).toBe(true)
      expect(ceo.readSectionText('company:startup-settings')).toContain('产品类型：hardware-software')
    } finally {
      await ceo.disposeAgent(scoped)
      await ctx.fiber.dispose()
      rmSync(project, { recursive: true, force: true })
    }
  })

  it('双 owner 卸载（维3）：plugin fiber dispose 时已打开会话上的全部 section / tool / guard 归零', async () => {
    const { ctx, provideSubagents } = mount()
    provideSubagents()
    const { scoped, pluginFiber } = await start(ctx)
    const vpEng = createRealAgentHarness({ id: 'session-vpeng', preset: 'vp-eng', cwd: env.company, teamRole: 'lead' })
    const worker = createRealAgentHarness({ id: 'session-worker', preset: 'worker', cwd: env.company })

    emitAgentCreated(scoped, vpEng.agent)
    emitAgentCreated(scoped, worker.agent)
    await wait()

    // 挂载期：9 个 per-agent 模块在对应角色与 support 会话上均真实生效
    expect([...vpEng.sections.keys()].sort()).toEqual([
      'company:delegation-capabilities',
      'company:delegation-fork',
      'company:delegation-retry',
      'company:delegation-spawn',
      'company:delegation-team',
      'company:delegation-team-spawn',
      'company:delegation-workflow',
      'company:handbook',
      'company:language',
      'company:startup-settings',
      'company:workflow-contract',
    ])
    expect([...vpEng.tools.keys()].sort()).toEqual(['list_subagents', 'send_to_subagent', 'subagent_retry', 'workflow_runs'])
    expect(worker.guards.size).toBe(1)
    expect(worker.sections.has('company:language')).toBe(true)

    // 插件热卸载（会话仍存活，未发 agent/disposed）：全部 per-agent 注入项、工具与守卫必须归零
    await pluginFiber.dispose()
    await wait()

    expect([...vpEng.sections.keys()]).toEqual([])
    expect([...vpEng.tools.keys()]).toEqual([])
    expect([...worker.sections.keys()]).toEqual([])
    expect(worker.guards.size).toBe(0)

    await vpEng.disposeAgent()
    await worker.disposeAgent()
    await ctx.fiber.dispose()
  })

  it('live 热启用（维3）：apply 前已在 agents 注册表存活的会话立即挂上，卸载后同样摘净', async () => {
    const existingCeo = createRealAgentHarness({ id: 'session-live-ceo', preset: 'ceo', cwd: env.company })
    const { ctx } = mount([existingCeo.agent])
    const { pluginFiber } = await start(ctx)

    expect(existingCeo.sections.has('company:handbook')).toBe(true)
    expect(existingCeo.sections.has('company:language')).toBe(true)
    expect(existingCeo.tools.has('list_subagents')).toBe(true)

    await pluginFiber.dispose()
    await wait()
    expect([...existingCeo.sections.keys()]).toEqual([])
    expect([...existingCeo.tools.keys()]).toEqual([])

    await existingCeo.disposeAgent()
    await ctx.fiber.dispose()
  })
})

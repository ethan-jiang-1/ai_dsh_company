/**
 * Host `apply` 的生命周期判据（R4-05，2026-10-28 第四轮六维审计）。
 *
 * 为什么补：`host-composition` 只断注册面/dispose 摘工具；`ctx.inject` 的迟到服务与
 * `ctx.on(...)` 的卸载后事件仍没跑过。一个“apply 后 provide 服务不触发”或“dispose 后事件仍写”
 * 的回归，现有 959 例全绿。
 *
 * 不主张：真 profile 装配、真 workspace registry / sessionQuery（那归 preset-smoke / release-smoke）。
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import { apply } from '../../packages/company-pack/src/index.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'

let dir: string
let env: TempEnv

beforeEach(() => {
  env = createTempEnv('apply-lifecycle-')
  dir = env.dir
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

function mount(): { ctx: Context; warns: string[]; toolRegistrations: () => number } {
  const ctx = new Context()
  const warns: string[] = []
  let registrations = 0
  ctx.provide('tools', { register: () => { registrations += 1; return ctx.effect(() => () => {}) } } as never)
  ctx.provide('commands', { register: () => ctx.effect(() => () => {}) } as never)
  ctx.provide('approval', { request: async () => 'rejected' } as never)
  // Cordis 的 logger 是内置 callable；测试直接挂 warn 收集器（生产由 logger facade 提供）。
  ;(ctx.logger as unknown as { warn: (...args: unknown[]) => void }).warn = (...args) => { warns.push(args.map(String).join(' ')) }
  return { ctx, warns, toolRegistrations: () => registrations }
}

async function start(ctx: Context): Promise<Context> {
  let scoped: Context | undefined
  await ctx.plugin({
    inject: ['tools', 'approval', 'commands'],
    apply: (child: Context) => { scoped = child; apply(child, {}) },
  })
  await wait()
  if (scoped === undefined) throw new Error('plugin apply did not run')
  return scoped
}

describe('Host apply 生命周期：迟到 inject 与卸载后事件（R4-05）', () => {
  it('apply 后才 provide workspaceRegistry：迟到 inject 回调真跑，并点名失效路径', async () => {
    const { ctx, warns, toolRegistrations } = mount()
    const scoped = await start(ctx)
    expect(toolRegistrations()).toBe(3)
    scoped.provide('workspaceRegistry', { list: () => [{ path: '/definitely-missing-r4-9f3a' }] } as never)
    await wait()
    expect(warns.some(message => message.includes('路径已不存在'))).toBe(true)
    await ctx.fiber.dispose()
  })

  it('dispose 后 api-session/added 不再触发告警（事件监听已摘）', async () => {
    const { ctx, warns, toolRegistrations } = mount()
    const scoped = await start(ctx)
    expect(toolRegistrations()).toBe(3)
    scoped.emit('api-session/added', { sessionId: 'session-x', cwd: '/outside-r4', origin: 'human', running: true, projections: { values: {} } })
    await wait()
    expect(warns.some(message => message.includes('不在公司盘'))).toBe(true)
    const before = warns.length
    await ctx.fiber.dispose()
    scoped.emit('api-session/added', { sessionId: 'session-y', cwd: '/outside-r4-2', origin: 'human', running: true, projections: { values: {} } })
    await wait()
    expect(warns.length).toBe(before)
  })
})

/**
 * Host 面的**真实 Cordis 组合**判据（R3-11，2026-10-27）。
 *
 * 为什么补：`apply()` 此前只用 stub ctx 调（catalog-wiring/apply-rebind），`host/index.ts` 的函数覆盖
 * 37.5%——`ctx.inject` 的等待、注册/卸载的 fiber 语义、`request_signoff` 的无会话守卫都没跑过。
 * 本档用真 `Context` + 假 services（tools/commands/approval/logger）跑真实入口，断言：
 * ① 注册面固定（模型可见工具与命令的名单漂移会红）；② dispose 后注册被摘掉；③ 无 agent 时签字工具
 * 给 `unavailable` 而不是抛错。
 *
 * 不主张：真 profile 装配、真审批应答、真会话日志（那些归 preset-smoke / 真模型档）。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import { apply } from '../../packages/company-pack/src/index.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'

let dir: string
let env: TempEnv

beforeEach(() => {
  env = createTempEnv('host-composition-')
  dir = env.dir
  env.set({
    DSH_HOME: env.home,
    DSH_COMPANY_HOME: env.company,
    DSH_COMPANY_BOOTSTRAP: 'off',   // 只验注册面：不铺骨架
    DSH_COMPANY_REBIND: undefined,
  })
  mkdirSync(env.home, { recursive: true })
  mkdirSync(env.company, { recursive: true })
})

afterEach(() => { env.cleanup() })

/** 真 Context + 只有本测试用到的四件服务。 */
function mount(): { ctx: Context; tools: Map<string, unknown>; commands: Map<string, unknown>; approval: { calls: number } } {
  const ctx = new Context()
  const tools = new Map<string, unknown>()
  const commands = new Map<string, unknown>()
  const approval = { calls: 0 }
  // 真服务用 cordis effect 挂 disposer；假的也照做，否则 dispose 语义测不出来。
  ctx.provide('tools', {
    register: (definition: { name: string }) => {
      tools.set(definition.name, definition)
      return ctx.effect(() => () => { tools.delete(definition.name) })
    },
  } as never)
  ctx.provide('commands', {
    register: (definition: { name: string }) => {
      commands.set(definition.name, definition)
      return ctx.effect(() => () => { commands.delete(definition.name) })
    },
  } as never)
  ctx.provide('approval', {
    request: async () => { approval.calls += 1; return 'rejected' },
  } as never)
  ctx.provide('logger', { warn: () => {}, info: () => {}, debug: () => {} } as never)
  return { ctx, tools, commands, approval }
}

const wait = (): Promise<void> => new Promise(resolve => { setImmediate(resolve) })

describe('Host 真实组合：注册面、dispose 与无会话守卫（R3-11）', () => {
  it('注册面固定：三个工具 + 三个命令（名单漂移即红）', async () => {
    const { ctx, tools, commands } = mount()
    ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
    await wait()
    expect([...tools.keys()].sort()).toEqual(['cultivation_propose', 'request_signoff', 'workspace_doors'])
    expect([...commands.keys()].sort()).toEqual(['company-diagnostics', 'cultivation', 'deliverables'])
    await ctx.fiber.dispose()
  })

  it('/company-diagnostics client-error 落 home logs 并脱敏 token', async () => {
    const { ctx, commands } = mount()
    ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
    await wait()
    const diagnostic = commands.get('company-diagnostics') as {
      handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string; readonly text: string }>
    }
    const payload = encodeURIComponent(JSON.stringify({
      kind: 'error',
      message: '页面 boom https://example.invalid/?token=SECRET',
      stack: 'Error: boom',
      at: 1,
      href: 'http://127.0.0.1:1/?token=SECRET',
    }))
    const result = await diagnostic.handler({ rawInput: `client-error ${payload}` })
    expect(result.kind).toBe('success')
    const logPath = join(env.home, 'logs', 'company-client-errors.log')
    expect(existsSync(logPath)).toBe(true)
    const log = readFileSync(logPath, 'utf8')
    expect(log).toContain('页面 boom')
    expect(log).not.toContain('SECRET')
    await ctx.fiber.dispose()
  })

  it('/company-diagnostics 超过 256 KiB 轮转为 .1（日志有界）', async () => {
    const { ctx, commands } = mount()
    ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
    await wait()
    const diagnostic = commands.get('company-diagnostics') as {
      handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string; readonly text: string }>
    }
    const logPath = join(env.home, 'logs', 'company-client-errors.log')
    mkdirSync(join(env.home, 'logs'), { recursive: true })
    writeFileSync(logPath, 'x'.repeat(256 * 1024))
    const payload = encodeURIComponent(JSON.stringify({ kind: 'error', message: 'rotation', at: 1 }))
    const result = await diagnostic.handler({ rawInput: `client-error ${payload}` })
    expect(result.kind).toBe('success')
    expect(existsSync(`${logPath}.1`)).toBe(true)
    expect(readFileSync(logPath, 'utf8')).toContain('rotation')
    await ctx.fiber.dispose()
  })

  it('dispose 摘掉全部注册（不留幽灵工具）', async () => {
    const { ctx, tools, commands } = mount()
    ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
    await wait()
    expect(tools.size).toBe(3)
    await ctx.fiber.dispose()
    expect(tools.size).toBe(0)
    expect(commands.size).toBe(0)
  })

  it('无 agent 上下文时 request_signoff 回 unavailable，不抛错也不发审批', async () => {
    const { ctx, tools, approval } = mount()
    ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
    await wait()
    const definition = tools.get('request_signoff') as {
      execute: (args: unknown, exec: unknown) => Promise<{ decision: string; note: string }>
    }
    const result = await definition.execute({ line: '毛利<30% 双签', summary: '定价让到 8 折' }, {})
    expect(result.decision).toBe('unavailable')
    expect(result.note).toContain('agent')
    expect(approval.calls).toBe(0)
    await ctx.fiber.dispose()
  })

  it('home 数据面白名单：client-errors 落 logs；公司盘不多写', async () => {
    env.set({ DSH_COMPANY_BOOTSTRAP: 'on' })
    const { ctx, commands } = mount()
    ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
    await wait()
    const diagnostic = commands.get('company-diagnostics') as {
      handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string; readonly text: string }>
    }
    const payload = encodeURIComponent(JSON.stringify({ kind: 'error', message: 'home-plane', at: 1 }))
    const result = await diagnostic.handler({ rawInput: `client-error ${payload}` })
    expect(result.kind).toBe('success')
    await ctx.fiber.dispose()
    expect(existsSync(join(env.home, 'logs', 'company-client-errors.log'))).toBe(true)
    expect(existsSync(join(env.company, 'cultivation', 'client-errors.log'))).toBe(false)
    const allowed = ['bundle.json', 'logs/', 'company-pack.lock', 'storages/', 'profiles/', 'sessions/', 'company-workspace/']
    const unexpected = walkFiles(env.home).filter(rel => !allowed.some(prefix => rel === prefix || rel.startsWith(prefix)))
    expect(unexpected).toEqual([])
  })

  it('工具与命令的 schema 形状可判（模型可见面的最小锚）', async () => {
    const { ctx, tools, commands } = mount()
    ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
    await wait()
    const signoff = tools.get('request_signoff') as {
      parameters: { type: string; required: readonly string[]; properties: Record<string, unknown> }
    }
    expect(signoff.parameters.type).toBe('object')
    expect(Object.keys(signoff.parameters.properties).sort()).toEqual(['detail', 'line', 'summary'])
    expect([...signoff.parameters.required].sort()).toEqual(['line', 'summary'])
    const deliverables = commands.get('deliverables') as { input: { hint: string } }
    expect(deliverables.input.hint).toContain('audit')
    await ctx.fiber.dispose()
  })
})

/** home 内全部文件（相对路径，POSIX 分隔）；用于数据面白名单。 */
function walkFiles(root: string, dir: string = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    const rel = relative(root, path).split(sep).join('/')
    return entry.isDirectory() ? walkFiles(root, path) : [rel]
  })
}

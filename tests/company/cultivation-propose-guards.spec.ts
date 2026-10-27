/**
 * `cultivation_propose` 的治理守卫（R3-12，2026-10-27）。
 *
 * 为什么补：这是"一个角色不能往另一个角色的记录里塞纠错"的唯一机制，但五条守卫此前**零用例**
 * （`host/cultivation.ts` 分支覆盖 68.6%）。守卫全都返回 `{recorded:false, note}` 而不是抛错，
 * 所以回归时只会静默放行——本档逐条断言：拒绝理由可读、且**没有落任何记录文件**。
 *
 * 真 Context + 假 tools/commands/approval/logger；公司盘 = 临时目录（bootstrap 关）。
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import { apply } from '../../packages/company-pack/src/index.ts'

const ORIGINAL_ENV = new Map<string, string | undefined>()
const KEYS = ['DSH_HOME', 'DSH_COMPANY_HOME', 'DSH_COMPANY_BOOTSTRAP', 'DSH_COMPANY_REBIND']
let dir: string

beforeEach(() => {
  for (const key of KEYS) ORIGINAL_ENV.set(key, process.env[key])
  dir = mkdtempSync(join(tmpdir(), 'propose-guards-'))
  process.env.DSH_HOME = join(dir, 'home')
  process.env.DSH_COMPANY_HOME = join(dir, 'company')
  process.env.DSH_COMPANY_BOOTSTRAP = 'off'
  delete process.env.DSH_COMPANY_REBIND
  mkdirSync(join(dir, 'home'), { recursive: true })
  mkdirSync(join(dir, 'company'), { recursive: true })
})

afterEach(() => {
  for (const key of KEYS) {
    const value = ORIGINAL_ENV.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  rmSync(dir, { recursive: true, force: true })
})

type Propose = (args: Record<string, unknown>, exec: Record<string, unknown>) => Promise<{ id: string; recorded: boolean; note: string }>

async function mount(opts: { readonly corruptBundle?: boolean } = {}): Promise<{ ctx: Context; propose: Propose }> {
  if (opts.corruptBundle === true) writeFileSync(join(dir, 'home', 'bundle.json'), '{ this is not json', 'utf8')
  const ctx = new Context()
  const tools = new Map<string, { execute: Propose }>()
  ctx.provide('tools', {
    register: (definition: { name: string; execute: Propose }) => {
      tools.set(definition.name, definition)
      return ctx.effect(() => () => { tools.delete(definition.name) })
    },
  } as never)
  ctx.provide('commands', { register: () => ctx.effect(() => () => {}) } as never)
  ctx.provide('approval', { request: async () => 'rejected' } as never)
  ctx.provide('logger', { warn: () => {}, info: () => {}, debug: () => {} } as never)
  ctx.plugin({ inject: ['tools', 'approval', 'commands'], apply: (scoped: Context) => { apply(scoped, {}) } })
  await new Promise(resolve => { setImmediate(resolve) })
  return { ctx, propose: tools.get('cultivation_propose')!.execute }
}

/** 公司角色会话的最小 agent 形状（sessionFaceOf 只读 header.agentPreset/cwd）。 */
const agent = (role: string, cwd = join(dir, 'company')): Record<string, unknown> => ({
  session: { header: { agentPreset: role, cwd } },
})
const baseArgs = { kind: 'correction', targetRole: 'ceo', expectation: '收口前列未决', body: '做法与证据' }
const recordsDir = (): string => join(dir, 'company', 'cultivation', 'records')
const recordCount = (): number => (existsSync(recordsDir()) ? readdirSync(recordsDir()).length : 0)

describe('cultivation_propose 守卫（R3-12）', () => {
  it('正常提案落一条记录（对照组，证明下面的拒绝不是因为整体坏掉）', async () => {
    const { ctx, propose } = await mount()
    const result = await propose(baseArgs, { agent: agent('ceo') })
    expect(result.recorded).toBe(true)
    expect(recordCount()).toBe(1)
    await ctx.fiber.dispose()
  })

  it('无会话上下文 → 拒绝且不落盘', async () => {
    const { ctx, propose } = await mount()
    const result = await propose(baseArgs, {})
    expect(result.recorded).toBe(false)
    expect(result.note).toContain('会话上下文')
    expect(recordCount()).toBe(0)
    await ctx.fiber.dispose()
  })

  it('目标角色不在名册 → 拒绝且理由点名名册', async () => {
    const { ctx, propose } = await mount()
    const result = await propose({ ...baseArgs, targetRole: 'cto' }, { agent: agent('ceo') })
    expect(result.recorded).toBe(false)
    expect(result.note).toContain('不在名册')
    expect(result.note).toContain('ceo')
    expect(recordCount()).toBe(0)
    await ctx.fiber.dispose()
  })

  it('纠正指向别的角色 → 拒绝（跨角色只能走 suggestion）', async () => {
    const { ctx, propose } = await mount()
    const result = await propose({ ...baseArgs, kind: 'correction', targetRole: 'vp-eng' }, { agent: agent('ceo') })
    expect(result.recorded).toBe(false)
    expect(result.note).toContain('纠正只指向自己的角色')
    expect(recordCount()).toBe(0)
    await ctx.fiber.dispose()
  })

  it('suggestion 指向自己 → 拒绝（给自己用 correction）', async () => {
    const { ctx, propose } = await mount()
    const result = await propose({ ...baseArgs, kind: 'suggestion', targetRole: 'ceo' }, { agent: agent('ceo') })
    expect(result.recorded).toBe(false)
    expect(result.note).toContain('给自己的角色用 correction')
    expect(recordCount()).toBe(0)
    await ctx.fiber.dispose()
  })

  it('非法 kind → 拒绝', async () => {
    const { ctx, propose } = await mount()
    const result = await propose({ ...baseArgs, kind: 'adopt' }, { agent: agent('ceo') })
    expect(result.recorded).toBe(false)
    expect(result.note).toContain('kind 只认')
    expect(recordCount()).toBe(0)
    await ctx.fiber.dispose()
  })

  it('会话 cwd 不在公司盘根 → 拒绝（作用域先于存储）', async () => {
    mkdirSync(join(dir, 'company', 'sub'), { recursive: true })
    const { ctx, propose } = await mount()
    const result = await propose(baseArgs, { agent: agent('ceo', join(dir, 'company', 'sub')) })
    expect(result.recorded).toBe(false)
    expect(result.note).toContain('公司盘根')
    expect(recordCount()).toBe(0)
    await ctx.fiber.dispose()
  })

  it('bundle.json 损坏 → dataBlocked，提案拒写且不落盘', async () => {
    const { ctx, propose } = await mount({ corruptBundle: true })
    const result = await propose(baseArgs, { agent: agent('ceo') })
    expect(result.recorded).toBe(false)
    expect(result.note).toContain('停写')
    expect(recordCount()).toBe(0)
    await ctx.fiber.dispose()
  })
})

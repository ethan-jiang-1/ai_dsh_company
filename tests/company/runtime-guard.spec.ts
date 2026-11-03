/**
 * 运行前提守卫（R5-07，2026-11-03 第五轮七维审计）。
 *
 * 为什么补：`host/runtime-guard.ts` 决定“公司数据可不可写”（无 workspace / manifest 坏 / lease 败），
 * 此前没有直接 spec，只经 `host-composition` 间接覆盖。写盘决策错了，所有面板/账本都会静默空。
 * 本档用临时 home/workspace 跑真实 `prepareCompanyRuntime`：正常、坏 manifest、被占 lease、落点不存在。
 * **不主张**真 profile 装配与 DSH 会话（归 release-smoke / preset-smoke）。
 */
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareCompanyRuntime } from '../../packages/company-pack/src/host/runtime-guard.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'

let env: TempEnv
let disposers: Array<() => void> = []

beforeEach(() => {
  env = createTempEnv('runtime-guard-')
  mkdirSync(env.home, { recursive: true })
  mkdirSync(env.company, { recursive: true })
  env.set({ DSH_HOME: env.home, DSH_COMPANY_HOME: env.company })
  disposers = []
})

afterEach(() => {
  for (const dispose of disposers) dispose()
  disposers = []
  env.cleanup()
})

function ctx() {
  const warn = vi.fn()
  const info = vi.fn()
  return {
    warn,
    info,
    value: {
      logger: { warn, info, debug: vi.fn() },
      effect: (callback: () => () => void) => {
        const dispose = callback()
        disposers.push(dispose)
        return () => {}
      },
    } as never,
  }
}

function lockWith(pid: number): void {
  writeFileSync(join(env.home, 'company-pack.lock'), JSON.stringify({
    schema: 1,
    pid,
    token: 'other-writer',
    startedAt: new Date().toISOString(),
  }))
}

describe('运行前提守卫：写盘决策（R5-07）', () => {
  it('干净 workspace + 无 manifest：可写，bundleState=missing', () => {
    const { value } = ctx()
    const runtime = prepareCompanyRuntime(value)
    expect(runtime.hasWorkspace).toBe(true)
    expect(runtime.dataBlocked).toBe(false)
    expect(runtime.bundleState?.status).toBe('missing')
    expect(runtime.workspace).toBe(realpathSync(env.company))
    // 2026-11-03 第六轮：文档承诺的「最近选择」tier 必须真的发生（此前生产只读不写）。
    const saved = JSON.parse(readFileSync(join(env.home, 'company/settings.json'), 'utf8')) as { workspace: string }
    expect(saved.workspace).toBe(realpathSync(env.company))
  })

  it('bundle.json 损坏：停写公司数据，但 workspace 仍解析出来（会话可用）', () => {
    mkdirSync(join(env.company, '.dsh-company'), { recursive: true })
    writeFileSync(join(env.company, '.dsh-company/bundle.json'), '{not-json')
    const { value, warn } = ctx()
    const runtime = prepareCompanyRuntime(value)
    expect(runtime.hasWorkspace).toBe(true)
    expect(runtime.dataBlocked).toBe(true)
    expect(runtime.bundleState?.status).toBe('corrupt')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('bundle.json 损坏'))
  })

  it('lease 被另一个 live writer 占着：停写，并点名 holder', () => {
    lockWith(process.ppid)
    const { value, warn } = ctx()
    const runtime = prepareCompanyRuntime(value)
    expect(runtime.hasWorkspace).toBe(true)
    expect(runtime.dataBlocked).toBe(true)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('公司数据已停写'))
  })

  it('DSH_COMPANY_HOME 指向不存在的目录：无 workspace、停写、不创建它', () => {
    const missing = join(env.dir, 'missing-workspace')
    env.set({ DSH_COMPANY_HOME: missing })
    const { value } = ctx()
    const runtime = prepareCompanyRuntime(value)
    expect(runtime.hasWorkspace).toBe(false)
    expect(runtime.dataBlocked).toBe(true)
    expect(runtime.workspace).toBe('')
    // 没有 workspace 就不写「最近选择」（零写在无 workspace 时仍成立）。
    expect(existsSync(join(env.home, 'company/settings.json'))).toBe(false)
    expect(existsSync(join(env.home, 'company-pack.lock')), '无 workspace 不取 lease（零写）').toBe(false)
  })
})

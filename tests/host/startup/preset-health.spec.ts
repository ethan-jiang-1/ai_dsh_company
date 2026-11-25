import { describe, expect, it } from 'vitest'
import {
  brokenPresetLines,
  createPresetHealth,
  presetHealthMessage,
} from '../../../packages/company-pack/src/host/startup/preset-health.ts'

/** 最小 ctx 替身：只需要软 inject + logger（真实 Cordis 由 preset-smoke 覆盖）。 */
function fakeCtx(registry: unknown): {
  ctx: unknown
  warnings: string[]
} {
  const warnings: string[] = []
  const ctx = {
    inject: (deps: readonly string[], callback: (scoped: unknown) => void) => {
      expect(deps).toEqual(['agentPresets'])
      callback({ agentPresets: registry })
      return undefined
    },
    logger: { warn: (message: string) => { warnings.push(message) } },
  }
  return { ctx, warnings }
}

describe('preset health', () => {
  it('只把 broken 非空的行转成「id: 原因」', () => {
    expect(brokenPresetLines([
      { id: 'ceo' },
      { id: 'vp-eng', broken: 'missing required config' },
      { id: 'coo', broken: '' },
    ])).toEqual(['vp-eng: missing required config'])
  })

  it('registry 就绪时 report 返回 broken 清单', async () => {
    const { ctx } = fakeCtx({ list: async () => [{ id: 'ceo' }, { id: 'vp-eng', broken: 'row config invalid' }] })
    const health = createPresetHealth(ctx as never)
    health.start()
    const report = await health.report()
    expect(report.ready).toBe(true)
    expect(report.broken).toEqual(['vp-eng: row config invalid'])
  })

  it('registry 缺席时 ready=false（命令不许谎报“全好”）', async () => {
    const health = createPresetHealth({} as never)
    health.start()
    expect(await health.report()).toEqual({ ready: false, broken: [] })
  })

  it('启动自检把 broken 写进 logger 与 stderr 文案', async () => {
    const { ctx, warnings } = fakeCtx({ list: async () => [{ id: 'cfo', broken: 'unknown plugin name' }] })
    createPresetHealth(ctx as never).start()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(warnings).toEqual([presetHealthMessage(['cfo: unknown plugin name'])])
    expect(warnings[0]).toContain('1 preset(s) failed to mount')
  })
})

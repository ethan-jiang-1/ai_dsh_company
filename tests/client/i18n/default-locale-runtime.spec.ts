/**
 * 缺省中文的运行时链路（Phase A1）。
 *
 * `default-locale.spec.ts` 证明 bundle patch 写了 preference=zh；这里证明
 * LocaleRuntime 在英文浏览器 provisional=en 的情况下，Host preference=zh 到达后会
 * 切到 zh。两段合起来才是「缺省中文」的快速回归（真浏览器首屏归 ui-scene-smoke）。
 */
import { Context } from '../../../vendor/dsh/vendor/cordis/src/index.ts'
import { LocaleRuntime } from '../../../vendor/dsh/packages/client/locale/src/client/index.ts'
import { describe, expect, it, onTestFinished } from 'vitest'

interface Snapshot {
  status: string
  value: { preference?: string } | undefined
  base: unknown
  user: unknown
  revision: number | undefined
  writable: boolean
}

function stubHost() {
  let snapshot: Snapshot = {
    status: 'loading', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false,
  }
  const listeners = new Set<() => void>()
  return {
    scope: {
      getSnapshot: () => snapshot,
      subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
      set: async () => true,
      unset: async () => true,
      mutate: async () => true,
    },
    publish(value: { preference?: string }) {
      snapshot = { ...snapshot, status: 'ready', value, revision: 0, writable: true }
      for (const fn of listeners) fn()
    },
  }
}

describe('缺省中文：Host preference 覆盖英文浏览器 provisional', () => {
  it('英文浏览器先 en；preference=zh 到达后切 zh', async () => {
    const ctx = new Context()
    onTestFinished(async () => { await ctx.fiber.dispose() })
    const host = stubHost()
    const locale = new LocaleRuntime(ctx, host.scope as never, { languages: ['en-US'], preference: null })
    expect(locale.getSnapshot().active).toBe('en')
    host.publish({ preference: 'zh' })
    expect(locale.getSnapshot().active).toBe('zh')
    expect(locale.getSnapshot().active).not.toBe('en')
  })

  it('没有 Host preference 时保持浏览器语言（不把 zh 硬塞给英文用户）', async () => {
    const ctx = new Context()
    onTestFinished(async () => { await ctx.fiber.dispose() })
    const host = stubHost()
    const locale = new LocaleRuntime(ctx, host.scope as never, { languages: ['en-US'], preference: null })
    host.publish({})
    expect(locale.getSnapshot().active).toBe('en')
  })
})

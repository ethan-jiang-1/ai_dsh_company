// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HEARTBEAT_KEY, shouldWarn, startInstanceGuard } from '../../packages/company-pack/src/client/instance-guard.ts'

// 负例留证 2026-10-10：卡② UX 依据 = 现场实测 3 个 web 实例并存 + E2 实证（多实例同文件
// ×20 = 20/20 静默互踩）——用户拍板「警告横幅」：第二实例照常启动但被明确告知。

const NOW = 1_000_000
const KEY = HEARTBEAT_KEY
const BANNER_ID = 'dsh-instance-guard-banner'

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  document.getElementById(BANNER_ID)?.remove()
})

describe('多实例探活（instance-guard）', () => {
  it('无心跳/空串/坏 JSON ⇒ 不警告', () => {
    expect(shouldWarn(null, NOW, 'self')).toBeNull()
    expect(shouldWarn('', NOW, 'self')).toBeNull()
    expect(shouldWarn('not-json{{', NOW, 'self')).toBeNull()
  })

  it('别人的新鲜心跳 ⇒ 警告（横幅文案含互踩提示与实例数）', () => {
    const raw = JSON.stringify({ 'tab-a': NOW - 5_000, 'tab-b': NOW - 8_000 })
    const msg = shouldWarn(raw, NOW, 'self')
    expect(msg).toContain('2')
    expect(msg).toContain('静默互踩')
  })

  it('自己与过期心跳（>20s）不算并存 ⇒ 不警告', () => {
    const raw = JSON.stringify({ self: NOW - 1_000, 'tab-stale': NOW - 60_000 })
    expect(shouldWarn(raw, NOW, 'self')).toBeNull()
  })

  it('探活横幅随他人心跳出现，disposer 移除心跳/横幅并停表', () => {
    vi.useFakeTimers()
    const dispose = startInstanceGuard(document)

    // 启动即写自己的心跳（fresh beat timer 由此接手续命）。
    const beats = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>
    expect(Object.keys(beats)).toHaveLength(1)
    const selfId = Object.keys(beats)[0]!

    // 模拟第二实例：写入别人的新鲜心跳，等 10s 判据定时器跑一轮 → 横幅出现。
    beats['tab-other'] = Date.now()
    localStorage.setItem(KEY, JSON.stringify(beats))
    vi.advanceTimersByTime(10_000)
    expect(document.getElementById(BANNER_ID)?.textContent).toContain('1')

    // disposer（挂 fiber 的 effect 返回值）：移除自己的心跳、横幅与两枚定时器。
    dispose()
    expect(document.getElementById(BANNER_ID)).toBeNull()
    const after = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>
    expect(Object.keys(after)).toEqual(['tab-other'])

    // 定时器已停：继续走 20s 不再续写心跳、不再挂横幅。
    vi.advanceTimersByTime(20_000)
    expect(document.getElementById(BANNER_ID)).toBeNull()
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>).toEqual(after)
    expect(selfId).toMatch(/^tab-/)
  })
})

// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HEARTBEAT_KEY, shouldWarn, startInstanceGuard } from '../../../packages/company-pack/src/client/wiring/instance-guard.ts'
import { en, zh } from '../../../packages/company-pack/src/client/locales.ts'
import { assertEnglishUiClean, translateWith } from '../../support/i18n-assertions.ts'

// 负例留证 2026-10-10：卡② UX 依据 = 现场实测 3 个 web 实例并存 + E2 实证（多实例同文件
// ×20 = 20/20 静默互踩）——用户拍板「警告横幅」：第二实例照常启动但被明确告知。
// 负例留证 2026-11-27：startInstanceGuard 未订阅 locale/change ⇒ 实时切换语言后横幅滞留旧语直到下轮 10s 轮询（BUG-397）；接入订阅后绿。BUG-397
// 负例留证 2026-11-27：instance-guard 横幅保留 z-index:9999 ⇒ 打开上游 Modal(1000) 时横幅压在弹窗之上并拦截点击（BUG-403）；降至 900 后绿。BUG-403

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

  it('en：多实例横幅使用传入的 translator，不残留中文', () => {
    const raw = JSON.stringify({ 'tab-a': NOW - 5_000 })
    const msg = shouldWarn(raw, NOW, 'self', translateWith(en))
    expect(msg).toContain('Detected 1 other observation window')
    assertEnglishUiClean(msg ?? '', 'instance-guard en')

    vi.useFakeTimers()
    localStorage.setItem(KEY, JSON.stringify({ 'tab-other': Date.now() }))
    const dispose = startInstanceGuard(document, translateWith(en))
    const banner = document.getElementById(BANNER_ID)?.textContent ?? ''
    expect(banner).toContain('Detected 1 other observation window')
    assertEnglishUiClean(banner, 'startInstanceGuard banner en')
    dispose()
  })
})

// 负例留证 2026-11-24：把新鲜度判据改回单边 `now - ts < STALE_MS` ⇒ 本组红（未来心跳永久告警/不被清理）。BUG-364
describe('心跳新鲜度双边窗口（BUG-364）', () => {
  it('未来时间戳的心跳不告警；真新鲜仍告警；过期不告警', () => {
    expect(shouldWarn(JSON.stringify({ other: NOW + 600_000 }), NOW, 'self')).toBeNull()
    expect(shouldWarn(JSON.stringify({ other: NOW - 19_000 }), NOW, 'self')).not.toBeNull()
    expect(shouldWarn(JSON.stringify({ other: NOW - 60_000 }), NOW, 'self')).toBeNull()
  })

  it('writeBeat 清理超前/过期邻居，保留新鲜邻居与 self', () => {
    const realNow = Date.now()
    localStorage.setItem(KEY, JSON.stringify({
      stale: realNow - 60_000,
      future: realNow + 600_000,
      fresh: realNow - 1_000,
    }))
    // startInstanceGuard 写入 self 并触发一次 check；立即停止，避免定时器泄漏。
    const stop = startInstanceGuard(document)
    const beats = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>
    stop()
    expect(beats).not.toHaveProperty('stale')
    expect(beats).not.toHaveProperty('future')
    expect(beats).toHaveProperty('fresh')
    expect(Object.keys(beats).some(key => key.startsWith('tab-'))).toBe(true)
  })

  it('BUG-397：locale/change 回调触发时多实例横幅即时重译，不滞留旧语言', () => {
    vi.useFakeTimers()
    localStorage.setItem(KEY, JSON.stringify({ 'tab-other': Date.now() }))
    let dict: typeof zh | typeof en = zh
    let onLocaleChange: (() => void) | undefined
    const offSpy = vi.fn()
    const dynamicT = ((key: keyof typeof zh, params?: Record<string, string | number>) => {
      const tpl = dict[key]
      return params === undefined ? tpl : tpl.replace(/\{(\w+)\}/g, (_m, n: string) => String(params[n] ?? ''))
    }) as ReturnType<typeof translateWith>
    const dispose = startInstanceGuard(document, dynamicT, (cb) => {
      onLocaleChange = cb
      return offSpy
    })
    expect(document.getElementById(BANNER_ID)?.textContent).toContain('静默互踩')

    dict = en
    onLocaleChange?.()
    const enBanner = document.getElementById(BANNER_ID)?.textContent ?? ''
    expect(enBanner).toContain('Detected 1 other observation window')
    assertEnglishUiClean(enBanner, 'BUG-397 instance-guard live locale switch')

    dispose()
    expect(offSpy).toHaveBeenCalledOnce()
  })

  it('BUG-403：多实例警告横幅 z-index 低于上游 Modal(1000) 避免遮挡弹窗指针', () => {
    vi.useFakeTimers()
    localStorage.setItem(KEY, JSON.stringify({ 'tab-other': Date.now() }))
    const dispose = startInstanceGuard(document, translateWith(zh))
    const banner = document.getElementById(BANNER_ID) as HTMLElement | null
    expect(banner).not.toBeNull()
    expect(Number(banner!.style.zIndex)).toBeLessThan(1000)
    dispose()
  })
})

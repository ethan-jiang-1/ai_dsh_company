/**
 * 浮窗几何记忆 keyless 回归（RFC proposed/2026-09-28-float-geometry-memory）：
 * clampRect 是还原路径的安全闸——存档可能来自上一窗口尺寸（甚至写坏的值），还原时必须
 * 钳进当前视口且不产生 NaN/负尺寸/零可见；存取层对损坏数据 fail-soft（回平台默认位）。
 * 真浮出/还原链路由 scripts/ 侧的真入口验收覆盖（RFC 验收节），本档只锁纯函数面。
 */
import { describe, expect, it } from 'vitest'
import { clampRect, loadFloatRect, MIN_VISIBLE, saveFloatRect, storageKey } from '../packages/company-pack/src/client/float-geometry.ts'

/** 内存 Storage 假实现（只用到 get/setItem）。 */
function fakeStorage(): Storage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: key => { map.delete(key) },
    clear: () => { map.clear() },
    key: () => null,
    get length() { return map.size },
  }
}

describe('clampRect：还原钳制', () => {
  it('视口内的矩形原样通过', () => {
    expect(clampRect({ x: 40, y: 60, width: 400, height: 300 }, 1680, 1000))
      .toEqual({ x: 40, y: 60, width: 400, height: 300 })
  })

  it('右/下越界钳回视口内（x/y ≥ 0 且不超过视口−宽高）', () => {
    const out = clampRect({ x: 1500, y: 900, width: 400, height: 300 }, 1680, 1000)
    expect(out.x).toBe(1680 - 400)
    expect(out.y).toBe(1000 - 300)
    expect(out.width).toBe(400)
    expect(out.height).toBe(300)
  })

  it('负坐标钳到 0', () => {
    const out = clampRect({ x: -80, y: -10, width: 400, height: 300 }, 1680, 1000)
    expect(out.x).toBe(0)
    expect(out.y).toBe(0)
  })

  it('宽高超视口收缩到视口（存档来自更大的屏）', () => {
    const out = clampRect({ x: 100, y: 100, width: 2200, height: 1300 }, 1680, 1000)
    expect(out.width).toBe(1680)
    expect(out.height).toBe(1000)
    expect(out.x).toBe(0)
    expect(out.y).toBe(0)
  })

  it('比最小可见面积还小的存档抬到下限（220×140，对齐 vendor 拖拽钳制）', () => {
    const out = clampRect({ x: 10, y: 10, width: 40, height: 20 }, 1680, 1000)
    expect(out.width).toBe(MIN_VISIBLE.width)
    expect(out.height).toBe(MIN_VISIBLE.height)
  })

  it('小视口：下限先被收缩、窗口贴满视口（不产生负坐标）', () => {
    const out = clampRect({ x: 5000, y: 5000, width: 800, height: 600 }, 300, 200)
    expect(out).toEqual({ x: 0, y: 0, width: 300, height: 200 })
  })

  it('损坏值（NaN/Infinity）不外泄：换 fallback 再钳', () => {
    const out = clampRect({ x: Number.NaN, y: Number.POSITIVE_INFINITY, width: 400, height: 300 }, 1680, 1000)
    expect(Number.isFinite(out.x)).toBe(true)
    expect(Number.isFinite(out.y)).toBe(true)
    expect(Number.isFinite(out.width)).toBe(true)
    expect(Number.isFinite(out.height)).toBe(true)
  })
})

describe('存取层：损坏数据 fail-soft', () => {
  it('roundtrip：save 后 load 还原同矩形', () => {
    const storage = fakeStorage()
    saveFloatRect(storage, 'dsh-company-pack/board', { x: 12, y: 34, width: 560, height: 400 })
    expect(loadFloatRect(storage, 'dsh-company-pack/board')).toEqual({ x: 12, y: 34, width: 560, height: 400 })
    expect(storage.map.get(storageKey('dsh-company-pack/board'))).toContain('"width":560')
  })

  it('无存档 ⇒ null', () => {
    expect(loadFloatRect(fakeStorage(), 'dsh-company-pack/dag')).toBeNull()
  })

  it('JSON 损坏 / 非对象 / 字段缺失 / 非有限数 ⇒ null（回平台默认位）', () => {
    const storage = fakeStorage()
    storage.map.set(storageKey('a'), '{not json')
    storage.map.set(storageKey('b'), '"string"')
    storage.map.set(storageKey('c'), JSON.stringify({ x: 1, y: 2 }))
    storage.map.set(storageKey('d'), JSON.stringify({ x: 1, y: 2, width: Number.NaN, height: 4 }))
    for (const key of ['a', 'b', 'c', 'd']) {
      expect(loadFloatRect(storage, key), key).toBeNull()
    }
  })
})

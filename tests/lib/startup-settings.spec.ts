/**
 * 启动策略纯模型的 keyless 判据（2026-11-12）。
 *
 * 判据：
 * ① 坏 JSON / 错版本 / 缺字段一律折成「全自动」，面板不炸；
 * ② 占位符 `<...>` 与空白视为未设（与 meta 字段同口径）；
 * ③ 序列化稳定（键序固定、末尾换行），写盘与测试同一口径；
 * ④ 行视图：`自动` 优先、已设但内容包没有的值标 invalid（不静默沿用）；
 * ⑤ 交付模式的隐式 `productized` 排序由 host 枚举负责，这里只证消费 shape。
 */
import { describe, expect, it } from 'vitest'
import {
  EMPTY_STARTUP_SETTINGS,
  clearStartupSettings,
  overrideCount,
  overriddenEntries,
  parseStartupOptions,
  parseStartupSettings,
  patchStartupSettings,
  serializeStartupOptions,
  serializeStartupSettings,
  startupRows,
} from '../../packages/company-pack/src/lib/startup-settings.ts'

const AT = '2026-11-12T00:00:00.000Z'

describe('parseStartupSettings', () => {
  it('缺失/空/坏 JSON/错版本 → 全自动', () => {
    for (const text of [undefined, null, '', '   ', '{', 'null', '[]', '{"v":2,"productType":"x"}']) {
      expect(parseStartupSettings(text)).toEqual(EMPTY_STARTUP_SETTINGS)
    }
  })

  it('合法字段被读入；占位符与空白视为未设', () => {
    const parsed = parseStartupSettings(JSON.stringify({
      v: 1, productType: 'hardware-software', deliveryMode: '<待定>', wiki: '  ', updatedAt: AT,
    }))
    expect(parsed.productType).toBe('hardware-software')
    expect(parsed.deliveryMode).toBeNull()
    expect(parsed.wiki).toBeNull()
    expect(parsed.updatedAt).toBe(AT)
  })

  it('多余键被忽略，不污染结果', () => {
    const parsed = parseStartupSettings(JSON.stringify({ v: 1, productType: 'a', bogus: 1 }))
    expect(parsed).toEqual({ v: 1, productType: 'a', deliveryMode: null, wiki: null, updatedAt: null })
  })
})

describe('serializeStartupSettings', () => {
  it('往返稳定且末尾有换行', () => {
    const start = { v: 1 as const, productType: 'a', deliveryMode: null, wiki: 'wiki/x', updatedAt: AT }
    const text = serializeStartupSettings(start)
    expect(text.endsWith('\n')).toBe(true)
    expect(parseStartupSettings(text)).toEqual(start)
    expect(serializeStartupSettings(parseStartupSettings(text))).toBe(text)
  })

  it('updatedAt 缺失时不写该键', () => {
    const text = serializeStartupSettings({ v: 1, productType: null, deliveryMode: null, wiki: null, updatedAt: null })
    expect(text).not.toContain('updatedAt')
  })
})

describe('patch / clear', () => {
  it('只改目标字段，其余不动，并记录时间', () => {
    const base = { v: 1 as const, productType: 'a', deliveryMode: 'b', wiki: null, updatedAt: null }
    expect(patchStartupSettings(base, 'deliveryMode', 'productized', AT)).toEqual({
      v: 1, productType: 'a', deliveryMode: 'productized', wiki: null, updatedAt: AT,
    })
  })

  it('null = 恢复自动', () => {
    const base = { v: 1 as const, productType: 'a', deliveryMode: null, wiki: null, updatedAt: null }
    expect(patchStartupSettings(base, 'productType', null, AT).productType).toBeNull()
  })

  it('clear 三项全空但保留时间', () => {
    expect(clearStartupSettings(AT)).toEqual({ ...EMPTY_STARTUP_SETTINGS, updatedAt: AT })
    expect(overrideCount(clearStartupSettings(AT))).toBe(0)
  })
})

describe('startupRows', () => {
  const options = { productTypes: ['business-software', 'hardware-software'], deliveryModes: ['productized', 'project-services'] }

  it('三项顺序固定，未设 = 自动', () => {
    const rows = startupRows(EMPTY_STARTUP_SETTINGS, options)
    expect(rows.map(row => row.field)).toEqual(['productType', 'deliveryMode', 'wiki'])
    expect(rows.every(row => row.isAuto)).toBe(true)
    expect(rows[0]?.options).toEqual(options.productTypes)
    expect(rows[2]?.options).toEqual([])
  })

  it('已设但内容包里没有 → invalid（不静默沿用）', () => {
    const rows = startupRows({ ...EMPTY_STARTUP_SETTINGS, productType: 'retired-type' }, options)
    expect(rows[0]?.invalid).toBe(true)
    expect(rows[1]?.invalid).toBe(false)
  })

  it('wiki 是自由指针，永不判失效', () => {
    const rows = startupRows({ ...EMPTY_STARTUP_SETTINGS, wiki: '/outside/wiki' }, options)
    expect(rows[2]?.invalid).toBe(false)
    expect(rows[2]?.value).toBe('/outside/wiki')
  })
})

describe('parseStartupOptions / serialize', () => {
  it('坏值折成空集合，重复项去重', () => {
    expect(parseStartupOptions('nope')).toEqual({ productTypes: [], deliveryModes: [] })
    expect(parseStartupOptions(JSON.stringify({ productTypes: ['a', 'a', ' '], deliveryModes: ['x'] })))
      .toEqual({ productTypes: ['a'], deliveryModes: ['x'] })
  })

  it('序列化可往返', () => {
    const options = { productTypes: ['a'], deliveryModes: ['productized', 'b'] }
    expect(parseStartupOptions(serializeStartupOptions(options))).toEqual(options)
  })

  it('overriddenEntries 只列已设项', () => {
    expect(overriddenEntries({ ...EMPTY_STARTUP_SETTINGS, deliveryMode: 'project-services' }))
      .toEqual([['deliveryMode', 'project-services']])
  })
})

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
  EMPTY_STARTUP_OPTIONS,
  EMPTY_WIKI_CHECK,
  STARTUP_OPTIONS_MAX_ENTRIES,
  STARTUP_OPTIONS_READ_LIMIT,
  STARTUP_SETTINGS_READ_LIMIT,
  EMPTY_STARTUP_SETTINGS,
  clearStartupSettings,
  overrideCount,
  overriddenEntries,
  parseStartupOptions,
  parseStartupOptionsState,
  parseStartupSettings,
  patchStartupSettings,
  serializeStartupOptions,
  serializeStartupSettings,
  startupRows,
  startupWorkspace,
} from '../../packages/company-pack/src/lib/startup-settings.ts'

const AT = '2026-11-12T00:00:00.000Z'

describe('startupWorkspace', () => {
  it('会话 cwd 优先（面板按 Lead 读，命令/注入必须读同一份）', () => {
    expect(startupWorkspace('/host/company-workspace', { session: { header: { cwd: '/tmp/other-project' } } }))
      .toBe('/tmp/other-project')
  })

  it('会话没有 cwd 才回退 boot workspace；都没有 → 空串', () => {
    expect(startupWorkspace('/host/company-workspace', {})).toBe('/host/company-workspace')
    expect(startupWorkspace('/host/company-workspace', { session: { header: {} } })).toBe('/host/company-workspace')
    expect(startupWorkspace('', {})).toBe('')
  })
})

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
  const options = {
    productTypes: ['business-software', 'hardware-software'],
    deliveryModes: ['productized', 'project-services'],
    wikiCheck: EMPTY_WIKI_CHECK,
    wikiTemplate: '/t',
  }

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

  it('wiki 未检查时不算失效（检查结果缺失 ≠ 指针坏了）', () => {
    const rows = startupRows({ ...EMPTY_STARTUP_SETTINGS, wiki: '/outside/wiki' }, options)
    expect(rows[2]?.invalid).toBe(false)
    expect(rows[2]?.value).toBe('/outside/wiki')
  })

  it('wiki 检查指向同一值且失败 → invalid（A3：路径腐化不静默）', () => {
    const broken = {
      ...options,
      wikiCheck: { value: '/outside/wiki', ok: false, problem: 'missing' as const, location: 'outside' as const, checkedAt: '2026-11-12T00:00:00.000Z' },
    }
    expect(startupRows({ ...EMPTY_STARTUP_SETTINGS, wiki: '/outside/wiki' }, broken)[2]?.invalid).toBe(true)
  })

  it('wiki 检查落后于设置（值不同）→ 不谎报失效', () => {
    const stale = {
      ...options,
      wikiCheck: { value: '/old', ok: false, problem: 'missing' as const, location: 'outside' as const, checkedAt: '2026-11-12T00:00:00.000Z' },
    }
    expect(startupRows({ ...EMPTY_STARTUP_SETTINGS, wiki: '/new' }, stale)[2]?.invalid).toBe(false)
  })
})

describe('浏览器读取上限（跨两端约束）', () => {
  it('最坏形状的 startup.json 行数 ≤ 读上限（否则 JSON 被截断 → 静默空集合）', () => {
    const worst = serializeStartupSettings({
      v: 1,
      productType: 'hardware-software',
      deliveryMode: 'managed-service',
      wiki: '/a/very/long/external/path/to/some/wiki/directory',
      updatedAt: '2026-11-12T00:00:00.000Z',
    })
    expect(worst.split('\n').length).toBeLessThanOrEqual(STARTUP_SETTINGS_READ_LIMIT)
  })

  it('最坏形状 = 预算上限条目数（不是当前内容快照）', () => {
    const half = Math.floor(STARTUP_OPTIONS_MAX_ENTRIES / 2)
    const worst = serializeStartupOptions({
      productTypes: Array.from({ length: half }, (_, i) => `type-${String(i)}`),
      deliveryModes: ['productized', ...Array.from({ length: STARTUP_OPTIONS_MAX_ENTRIES - half }, (_, i) => `mode-${String(i)}`)],
      wikiCheck: { value: '/a/very/long/external/path/to/some/wiki/directory', ok: false, problem: 'no-index', location: 'outside', checkedAt: '2026-11-12T00:00:00.000Z' },
      wikiTemplate: '/some/profile/node_modules/dsh-company-pack/content/wiki-template',
    })
    expect(worst.split('\n').length).toBeLessThanOrEqual(STARTUP_OPTIONS_READ_LIMIT)
  })

  it('截断到读上限 = unreadable，不是静默空集合', () => {
    const text = serializeStartupOptions({
      productTypes: Array.from({ length: 400 }, (_, i) => `type-${String(i)}`),
      deliveryModes: ['productized'],
      wikiCheck: EMPTY_WIKI_CHECK,
      wikiTemplate: null,
    })
    const truncated = text.split('\n').slice(0, STARTUP_OPTIONS_READ_LIMIT).join('\n')
    expect(parseStartupOptionsState(truncated).problem).toBe('unreadable')
    expect(parseStartupOptionsState(undefined).problem).toBeNull()
  })
})

describe('parseStartupOptions / serialize', () => {
  it('坏值折成空集合，重复项去重', () => {
    expect(parseStartupOptions('nope')).toEqual({ ...EMPTY_STARTUP_OPTIONS })
    expect(parseStartupOptions(JSON.stringify({ productTypes: ['a', 'a', ' '], deliveryModes: ['x'] })))
      .toEqual({ productTypes: ['a'], deliveryModes: ['x'], wikiCheck: EMPTY_WIKI_CHECK, wikiTemplate: null })
  })

  it('序列化可往返', () => {
    const options = { productTypes: ['a'], deliveryModes: ['productized', 'b'], wikiCheck: EMPTY_WIKI_CHECK, wikiTemplate: '/t' }
    expect(parseStartupOptions(serializeStartupOptions(options))).toEqual(options)
  })

  it('checkedAt 往返：面板靠它判断「上次检查」而不是把快照当当前值', () => {
    const options = {
      productTypes: [],
      deliveryModes: ['productized'],
      wikiCheck: { value: '/w', ok: true, problem: null, location: 'outside' as const, checkedAt: AT },
      wikiTemplate: null,
    }
    expect(parseStartupOptions(serializeStartupOptions(options)).wikiCheck).toEqual(options.wikiCheck)
    const older = parseStartupOptions(JSON.stringify({
      productTypes: [], deliveryModes: [], wikiCheck: { value: '/w', ok: true, problem: null, location: 'inside' },
    }))
    expect(older.wikiCheck.checkedAt).toBeNull()
  })

  it('overriddenEntries 只列已设项', () => {
    expect(overriddenEntries({ ...EMPTY_STARTUP_SETTINGS, deliveryMode: 'project-services' }))
      .toEqual([['deliveryMode', 'project-services']])
  })
})

import { describe, expect, it } from 'vitest'
import { globToRegExp, matchesAny, selectSurfaces } from '../../tools/lib/core/asset-lanes.mjs'

/**
 * lane 匹配是 pre-push 按面触发的唯一判据（数据 = tools/lib/core/asset-lanes.mjs 的 SURFACE_RULES）。
 * 这里只测纯逻辑：一条规则误命中会把无关检查塞进每次 push，误不命中则等于没有这条 lane。
 */
describe('lane 匹配纯逻辑（按面触发的判据）', () => {
  it('`**` 跨路径段，`*` 不跨段', () => {
    expect(matchesAny(['packages/company-pack/src/client/**'], 'packages/company-pack/src/client/tabs/a.tsx')).toBe(true)
    expect(matchesAny(['packages/company-pack/src/client/*.ts'], 'packages/company-pack/src/client/index.ts')).toBe(true)
    expect(matchesAny(['packages/company-pack/src/client/*.ts'], 'packages/company-pack/src/client/tabs/a.tsx')).toBe(false)
  })

  it('匹配是锚定的：前缀/后缀多余都不命中', () => {
    expect(matchesAny(['packages/company-pack/presets/**'], 'x/packages/company-pack/presets/ceo/x.md')).toBe(false)
    expect(matchesAny(['packages/company-pack/presets/**'], 'packages/company-pack/presets')).toBe(false)
  })

  it('`**/` 允许零段，也能吃掉多段', () => {
    expect(matchesAny(['snapshots/**/snapshot.yml'], 'snapshots/snapshot.yml')).toBe(true)
    expect(matchesAny(['snapshots/**/snapshot.yml'], 'snapshots/a/b/snapshot.yml')).toBe(true)
  })

  it('`?` 只吃一个非斜杠字符', () => {
    expect(globToRegExp('a?c').test('abc')).toBe(true)
    expect(globToRegExp('a?c').test('a/c')).toBe(false)
  })

  it('selectSurfaces 去重、保序，并带回命中路径', () => {
    const rules = [
      { globs: ['src/client/**'], assets: ['a', 'b'], why: 'client' },
      { globs: ['src/**'], assets: ['b', 'c'], why: 'broad' },
    ]
    const { assets, matches } = selectSurfaces(['src/client/x.ts', 'src/host/y.ts'], rules)
    expect(assets).toEqual(['a', 'b', 'c'])
    expect(matches.map(match => `${match.asset}:${match.path}`)).toEqual([
      'a:src/client/x.ts',
      'b:src/client/x.ts',
      'c:src/client/x.ts',
      'b:src/host/y.ts',
      'c:src/host/y.ts',
    ])
  })

  it('无命中返回空 assets/matches/covered，并把路径落 unseen（不触发 = 明确打印，不是猜）', () => {
    expect(selectSurfaces(['README.md'], [{ globs: ['src/**'], assets: ['a'], why: 'src' }])).toEqual({
      assets: [],
      matches: [],
      covered: [],
      unseen: ['README.md'],
    })
  })

  it('coveredBy 规则产出显式豁免，且不重复产出 asset', () => {
    const rules = [{ globs: ['docs/**'], coveredBy: ['verify'], why: 'docs' }]
    const { assets, matches, covered, unseen } = selectSurfaces(['docs/README.md'], rules)
    expect(assets).toEqual([])
    expect(matches).toEqual([])
    expect(covered).toEqual([{ glob: 'docs/**', path: 'docs/README.md', coveredBy: ['verify'], why: 'docs' }])
    expect(unseen).toEqual([])
  })

  it('同一条规则里的 asset 与 coveredBy 各走各的（资产仍去重）', () => {
    const rules = [{ globs: ['src/**'], assets: ['a'], coveredBy: ['verify'], why: 'both' }]
    const { assets, covered, unseen } = selectSurfaces(['src/x.ts'], rules)
    expect(assets).toEqual(['a'])
    expect(covered).toHaveLength(1)
    expect(unseen).toEqual([])
  })

  it('规则没写 why 时不造 why 字段（可选字段不虚构）', () => {
    const { matches, covered } = selectSurfaces(['src/x.ts'], [{ globs: ['src/**'], assets: ['a'], coveredBy: ['verify'] }])
    expect(matches[0]).toEqual({ asset: 'a', glob: 'src/**', path: 'src/x.ts' })
    expect(covered[0]).toEqual({ glob: 'src/**', path: 'src/x.ts', coveredBy: ['verify'] })
  })

  it('coveredBy 空数组不算豁免（不产出空 covered 行，路径落 unseen）', () => {
    const { covered, unseen } = selectSurfaces(['src/x.ts'], [{ globs: ['src/**'], coveredBy: [], why: 'empty' }])
    expect(covered).toEqual([])
    expect(unseen).toEqual(['src/x.ts'])
  })
})

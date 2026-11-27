import { describe, expect, it } from 'vitest'
import {
  SURFACE_LANE_ASSETS,
  VITEST_FULL_FALLBACK_RELATED,
  VITEST_FULL_FALLBACK_TARGETED,
  globToRegExp,
  matchesAny,
  planPrePush,
  planVitestRun,
  selectSurfaces,
} from '../../tools/lib/core/asset-lanes.mjs'

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

describe('planPrePush 按改动面精准选步', () => {
  it('docs-only 变更进入快速路径：不跑 tsc / lint / dup / vitest', () => {
    const plan = planPrePush(['docs/testing.md', 'notes/implemented/x.md', '_backlog/bugs/BUG-406.md', 'CHANGELOG.md'])
    expect(plan).toEqual({ docsOnly: true, steps: [], relatedFiles: [], targetedSpecs: [] })
  })

  it('src/host 与包入口改动触发 typecheck + lint + dup + smoke:fast + vitest related（包入口补 pack-exports）', () => {
    const plan = planPrePush(['packages/company-pack/src/index.ts', 'packages/company-pack/src/host/ledger/catalog.ts'])
    expect(plan.docsOnly).toBe(false)
    expect(plan.steps).toEqual(['typecheck', 'lint', 'dup', 'smoke:fast', 'test:spec'])
    expect(plan.relatedFiles).toEqual(['packages/company-pack/src/index.ts', 'packages/company-pack/src/host/ledger/catalog.ts'])
    expect(plan.targetedSpecs).toContain('tests/repo/pack/pack-exports.spec.ts')
  })

  it('presets / content / locale / pack 元数据各命中对应窄集', () => {
    expect(planPrePush(['packages/company-pack/presets/ceo/persona.md']).targetedSpecs).toEqual(['tests/presets'])
    const content = planPrePush(['packages/company-pack/content/AGENTS.md'])
    expect(content.steps).toContain('test:checks')
    expect(content.targetedSpecs).toEqual([
      'tests/content',
      'tests/host/prompt/handbook.spec.ts',
      'tests/host/run-bundle/bootstrap-content.spec.ts',
    ])
    expect(planPrePush(['packages/company-pack/locale/zh.json']).targetedSpecs).toEqual(['tests/client/i18n'])
    const meta = planPrePush(['packages/company-pack/package.json'])
    expect(meta.steps).toEqual(['typecheck', 'test:spec'])
    expect(meta.targetedSpecs).toEqual(['tests/repo/pack', 'tests/repo/release'])
  })

  it('tests / fixtures / checks / tools / probes / lint 配置 / 根配置各自命中最小必要步骤', () => {
    expect(planPrePush(['tests/checks/fix-evidence.test.mjs']).steps).toEqual(['test:checks'])
    const specPlan = planPrePush(['tests/tools/lane-match.spec.ts'])
    expect(specPlan.steps).toEqual(['typecheck', 'lint', 'test:spec'])
    expect(specPlan.targetedSpecs).toEqual(['tests/tools/lane-match.spec.ts'])
    expect(planPrePush(['tests/support/doc-grammar.ts']).relatedFiles).toEqual(['tests/support/doc-grammar.ts'])

    // 盲审 B1(R2)：tests/fixtures 里的 5 组实盘夹具定向映射到真实读取它们的消费者 spec。
    const mdFixture = planPrePush(['tests/fixtures/companies/acme-hardware-software/identity.md'])
    expect(mdFixture.docsOnly).toBe(false)
    expect(mdFixture.targetedSpecs).toEqual([
      'tests/repo/budget/fixture-provenance.spec.ts',
      'tests/host/run-bundle/company-fixture.spec.ts',
      'tests/host/run-bundle/bootstrap.spec.ts',
      'tests/client/ui/brand.spec.ts',
      'tests/presets/product-type-coverage.spec.ts',
    ])
    expect(planPrePush(['tests/fixtures/catalog.contract.json']).targetedSpecs).toEqual([
      'tests/repo/budget/fixture-provenance.spec.ts',
      'tests/client/data/catalog-contract.spec.ts',
    ])
    expect(planPrePush(['tests/fixtures/deliverables-r1/workspace.expected/deliverables/kb-rag-assessment.md']).targetedSpecs).toEqual([
      'tests/repo/budget/fixture-provenance.spec.ts',
      'tests/tools/deliverables-audit.spec.ts',
    ])
    expect(planPrePush(['tests/fixtures/methods/ceo/SKILL.md']).targetedSpecs).toEqual([
      'tests/repo/budget/fixture-provenance.spec.ts',
      'tests/tools/quality-loop.spec.ts',
    ])
    expect(planPrePush(['tests/fixtures/bundle-manifest-v1.json']).targetedSpecs).toEqual([
      'tests/repo/budget/fixture-provenance.spec.ts',
      'tests/host/run-bundle/bundle-manifest.spec.ts',
    ])
    expect(planPrePush(['tests/fixtures/future-new/sample.txt']).targetedSpecs).toContain('tests/host/run-bundle')
    expect(planPrePush(['tests/fixtures/README.md']).docsOnly).toBe(true)
    expect(planPrePush(['tests/support/bug-coverage-baseline.json']).targetedSpecs).toEqual(['tests/repo/budget/bug-coverage.spec.ts'])

    const toolsLib = planPrePush(['tools/lib/core/asset-lanes.mjs'])
    expect(toolsLib.steps).toEqual(['lint', 'dup', 'smoke:fast', 'test:checks', 'test:spec'])
    expect(toolsLib.relatedFiles).toEqual(['tools/lib/core/asset-lanes.mjs'])
    expect(toolsLib.targetedSpecs).toContain('tests/repo/structure/entry-import-graph.spec.ts')

    const baselineJson = planPrePush(['checks/lib/coverage-baseline.json'])
    expect(baselineJson.targetedSpecs).toContain('tests/tools/coverage-baseline.spec.ts')
    expect(planPrePush(['tools/lib/core/compat-tags.json']).targetedSpecs).toContain('tests/tools')

    const prepushScript = planPrePush(['checks/pre-push-surfaces.mjs'])
    expect(prepushScript.targetedSpecs).toContain('tests/repo/structure/entry-import-graph.spec.ts')
    expect(prepushScript.targetedSpecs).toContain('tests/repo/budget/asset-lanes.spec.ts')

    const probePlan = planPrePush(['probes/lib/x.mjs', 'probes/analyze/orient-probe.mjs'])
    expect(probePlan.relatedFiles).toEqual(['probes/lib/x.mjs'])
    expect(probePlan.targetedSpecs).toEqual(['tests/repo/structure/entry-import-graph.spec.ts'])

    expect(planPrePush(['.oxlintrc.json']).steps).toEqual(['lint', 'dup'])
    const rootCfg = planPrePush(['vitest.config.ts'])
    expect(rootCfg.steps).toEqual(['typecheck', 'test:spec'])
    expect(rootCfg.targetedSpecs).toEqual(['tests/repo'])
  })

  it('planVitestRun 最多生成一次 Vitest 调用，小改动去重合并，超阈值回退单次全测', () => {
    expect(SURFACE_LANE_ASSETS).toEqual(['client-load', 'preset', 'replay'])
    expect(planVitestRun()).toEqual({ mode: 'none', args: [] })
    expect(planVitestRun({ existingRelated: [], expandedTargeted: [] })).toEqual({ mode: 'none', args: [] })

    expect(planVitestRun({ expandedTargeted: ['tests/a.spec.ts', 'tests/a.spec.ts'] })).toEqual({
      mode: 'targeted',
      args: ['run', 'tests/a.spec.ts'],
    })
    const manyTargets = Array.from({ length: VITEST_FULL_FALLBACK_TARGETED }, (_, i) => `tests/t${String(i)}.spec.ts`)
    expect(planVitestRun({ expandedTargeted: manyTargets })).toEqual({ mode: 'full', args: ['run'] })

    expect(planVitestRun({ existingRelated: ['tools/lib/a.mjs', 'tools/lib/a.mjs'] })).toEqual({
      mode: 'related',
      args: ['related', '--run', '--passWithNoTests', 'tools/lib/a.mjs'],
    })
    const manyRelated = Array.from({ length: VITEST_FULL_FALLBACK_RELATED }, (_, i) => `tools/lib/r${String(i)}.mjs`)
    expect(planVitestRun({ existingRelated: manyRelated })).toEqual({ mode: 'full', args: ['run'] })

    expect(planVitestRun({
      existingRelated: ['tools/lib/a.mjs'],
      expandedTargeted: ['tests/a.spec.ts', 'tools/lib/a.mjs'],
    })).toEqual({
      mode: 'merged',
      args: ['related', '--run', '--passWithNoTests', 'tools/lib/a.mjs', 'tests/a.spec.ts'],
    })
    expect(planVitestRun({
      existingRelated: ['tools/lib/a.mjs'],
      expandedTargeted: manyTargets,
    })).toEqual({ mode: 'full', args: ['run'] })
  })
})

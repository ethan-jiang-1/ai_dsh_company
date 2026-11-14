import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { ASSETS, FAILURE_CLASSES, PROBES, allAssets, failureClassOf } from '../../tools/lib/asset-lanes.mjs'
import { buildCensus, countProjectSurface, renderCensus } from '../../tools/lib/test-census.mjs'
import { consumerCount } from '../../tools/lib/asset-consumers.mjs'

/**
 * 资产盘子与制度负债棘轮（W4 硬化）：
 * ① `tests/CENSUS.generated.md` 是生成物——与注册表/盘面不一致即红（防手抄漂移）；
 * ② 探针与冒烟双向对齐，且全量显式失败类（`未分类 === 0`）；
 * ③ 结构门禁总数与活跃探针总数实行只降不升硬顶（`policy §P2`）。
 */
const MAX_GATES = 75
const MAX_PROBES = 59

function probeFiles() {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path)
    return entry.name.endsWith('-probe.mjs') ? [entry.name.replace(/\.mjs$/, '')] : []
  })
  return walk(join(ROOT, 'probes')).sort()
}

describe('资产盘子与负债上限棘轮（census + P2 硬顶）', () => {
  it('tests/CENSUS.generated.md 与注册表/盘面一致（漂了就跑 --write）', () => {
    const { gateCount, specCount } = countProjectSurface(ROOT)
    const consumers = consumerCount(ROOT, [...ASSETS, ...PROBES])
    const expected = renderCensus(buildCensus({ smokes: ASSETS, probes: PROBES, gateCount, specCount, failureClassOf, consumers }))
    const current = readFileSync(join(ROOT, 'tests/CENSUS.generated.md'), 'utf8')
    expect(current, 'census 是生成物：运行 node tools/test-census.mjs --write').toBe(expected)
  })

  it('每个探针都登记且只登记一次', () => {
    const files = probeFiles()
    const registered = PROBES.map(probe => probe.name).sort()
    expect(files.filter((name: string) => !registered.includes(name)), '这些 probes/**/*.mjs 没进 tools/lib/asset-lanes.mjs（新探针也要登记）').toEqual([])
    expect(registered.filter((name: string) => !files.includes(name)), '注册表里的探针在盘上不存在——删探针要同 diff 退登记').toEqual([])
    expect(new Set(registered).size).toBe(registered.length)
  })

  it('门禁数与探针数只降不升（policy §P2 硬顶）', () => {
    const { gateCount } = countProjectSurface(ROOT)
    expect(gateCount, `结构门禁总数不得超过 ${String(MAX_GATES)}（新规则并入既有门禁或先合并旧门）`).toBeLessThanOrEqual(MAX_GATES)
    expect(PROBES.length, `活跃探针总数不得超过 ${String(MAX_PROBES)}（加一减一，禁止探针负债回潮）`).toBeLessThanOrEqual(MAX_PROBES)
  })

  it('失败类只用封闭词表，且冒烟与探针全量清零「未分类」', () => {
    for (const asset of [...ASSETS, ...PROBES]) {
      expect(FAILURE_CLASSES, `${asset.name} 的失败类不在词表`).toContain(failureClassOf(asset.name))
    }
    expect(failureClassOf('zz-unknown'), '未登记名字必须落「未分类」而不是猜').toBe('未分类')
    expect(allAssets().length).toBe(ASSETS.length + PROBES.length)
    const unclassified = allAssets().filter(asset => failureClassOf(asset.name) === '未分类').map(asset => asset.name)
    expect(unclassified, `冒烟（${String(ASSETS.length)}）与探针（${String(PROBES.length)}）均须登记真实失败类，禁止留「未分类」负债`).toEqual([])
  })

  it('buildCensus + renderCensus 保持未分类计数、缺省消费者与缺省 shape/manualReason 兜底分支', () => {
    const model = buildCensus({
      smokes: [{ name: 's1', kind: 'classic', lanes: [] }],
      probes: [{ name: 'p1', domain: 'team', lanes: [] }],
      gateCount: 1,
      specCount: 2,
      failureClassOf: name => (name === 's1' ? '纯逻辑' : '未分类'),
    })
    expect(model.noConsumer).toBe(2)
    const rendered = renderCensus(model)
    expect(rendered).toContain('| 未分类失败类 | 1 |')
    expect(rendered).toContain('手动（未写理由）')
  })
})

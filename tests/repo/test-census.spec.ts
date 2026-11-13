import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { ASSETS, FAILURE_CLASSES, PROBES, allAssets, failureClassOf } from '../../tools/lib/asset-lanes.mjs'
import { buildCensus, countProjectSurface, renderCensus } from '../../tools/lib/test-census.mjs'

/**
 * 资产盘子（研究 A 件）的两个机械面：
 * ① `tests/CENSUS.generated.md` 是**生成物**——与注册表/盘面不一致即红（防手抄漂移）；
 * ② 69 个探针也必须登记——它们是「存在但从没跑」的最大一块，登记不改变运行方式，只让删除/改名必须同 diff 退登记。
 */
function probeFiles() {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path)
    return entry.name.endsWith('.mjs') ? [entry.name.replace(/\.mjs$/, '')] : []
  })
  return walk(join(ROOT, 'probes')).sort()
}

describe('资产盘子（census 生成物）', () => {
  it('tests/CENSUS.generated.md 与注册表/盘面一致（漂了就跑 --write）', () => {
    const { gateCount, specCount } = countProjectSurface(ROOT)
    const expected = renderCensus(buildCensus({ smokes: ASSETS, probes: PROBES, gateCount, specCount, failureClassOf }))
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

  it('失败类只用封闭词表，且冒烟都有判定', () => {
    for (const asset of [...ASSETS, ...PROBES]) {
      expect(FAILURE_CLASSES, `${asset.name} 的失败类不在词表`).toContain(failureClassOf(asset.name))
    }
    expect(failureClassOf('zz-unknown'), '未登记名字必须落「未分类」而不是猜').toBe('未分类')
    expect(allAssets().length).toBe(ASSETS.length + PROBES.length)
    const unclassifiedSmokes = ASSETS.filter(asset => failureClassOf(asset.name) === '未分类').map(asset => asset.name)
    expect(unclassifiedSmokes, '冒烟是手判的 32 条：新冒烟必须登记失败类（未分类只允许探针暂用）').toEqual([])
  })
})

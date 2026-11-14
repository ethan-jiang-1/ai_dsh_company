/**
 * 资产盘子（census）的纯逻辑：建模 + 渲染。
 *
 * 为什么：盘子在文档里手抄必漂（本仓六份清单同一种病）。census 是**生成物**：
 * 数据来自注册表（tools/lib/asset-lanes.mjs）+ 盘上目录计数，渲染结果与提交的文件逐字比对，
 * 不一致即红。它不评价资产好坏，只让「有什么、在哪条 lane、抓哪类失败、多少未分类」一眼可见。
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/** 盘上计数：门禁目录的 .mjs 与 tests/ 下的 spec 文件（census 的「有什么」侧）。 */
export function countProjectSurface(repoRoot) {
  const gateCount = readdirSync(join(repoRoot, 'checks/gates'), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.mjs')).length
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(path)
    return entry.name.endsWith('.spec.ts') ? [path] : []
  })
  return { gateCount, specCount: walk(join(repoRoot, 'tests')).length }
}

const LANE_ORDER = ['fast', 'surface', 'weekly']

function laneLabel(asset) {
  if (asset.lanes.length === 0) return `手动（${asset.manualReason ?? '未写理由'}）`
  return LANE_ORDER.filter(lane => asset.lanes.includes(lane)).join(' + ')
}

/**
 * @param {{smokes: any[], probes: any[], gateCount: number, specCount: number, failureClassOf: (name: string) => string, consumers?: Record<string, number>}} input
 */
export function buildCensus({ smokes, probes, gateCount, specCount, failureClassOf, consumers = {} }) {
  const laneCounts = Object.fromEntries(LANE_ORDER.map(lane => [lane, smokes.filter(asset => asset.lanes.includes(lane)).length]))
  const classes = {}
  for (const asset of [...smokes, ...probes]) {
    const name = failureClassOf(asset.name)
    classes[name] = (classes[name] ?? 0) + 1
  }
  const noConsumer = [...smokes, ...probes].filter(asset => (consumers[asset.name] ?? 0) === 0).length
  return { smokes, probes, gateCount, specCount, laneCounts, classes, failureClassOf, consumers, noConsumer }
}

/** @param {ReturnType<typeof buildCensus>} model */
export function renderCensus(model) {
  const lines = []
  lines.push('# 测试资产盘子（生成物，勿手改）')
  lines.push('')
  lines.push('> 生成 = `node tools/test-census.mjs --write`；一致性门 = `tests/repo/test-census.spec.ts`（不一致即红）。')
  lines.push('> 数据源 = `tools/lib/asset-lanes.mjs`（登记 + lane）+ 盘上目录计数；失败类词表 = `tests/failure-classes.md`。')
  lines.push('')
  lines.push('## 汇总')
  lines.push('')
  lines.push('| 指标 | 数量 |')
  lines.push('|---|---|')
  lines.push(`| 冒烟 | ${model.smokes.length} |`)
  lines.push(`| 探针 | ${model.probes.length} |`)
  lines.push(`| 结构门禁 | ${model.gateCount} |`)
  lines.push(`| keyless spec 文件 | ${model.specCount} |`)
  lines.push(`| fast lane | ${model.laneCounts.fast} |`)
  lines.push(`| surface lane | ${model.laneCounts.surface} |`)
  lines.push(`| weekly lane | ${model.laneCounts.weekly} |`)
  lines.push(`| 未分类失败类 | ${model.classes['未分类'] ?? 0} |`)
  lines.push(`| 无消费者资产 | ${model.noConsumer} |`)
  lines.push('')
  lines.push('## 失败类分布')
  lines.push('')
  lines.push('| 失败类 | 资产数 |')
  lines.push('|---|---|')
  for (const [name, count] of Object.entries(model.classes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    lines.push(`| ${name} | ${count} |`)
  }
  lines.push('')
  lines.push('## 字段（v2）')
  lines.push('')
  lines.push('`shape` = example | generator | model | meta（当前默认 example）；`lastRed` = 最近一次真红日期（— = 未接运行日志，不伪造）；`replaceBy` / `retireWhen` = 替代资产 / 退役条件（— = 未排期）。`消费者` = tests/checks/tools/probes/run 里引用该资产名的文件数（引用计数，不是运行次数）。')
  lines.push('')
  lines.push('## 冒烟')
  lines.push('')
  lines.push('| 资产 | kind | lane | 失败类 | shape | 消费者 |')
  lines.push('|---|---|---|---|---|---|')
  for (const asset of model.smokes) {
    lines.push(`| ${asset.name} | ${asset.kind} | ${laneLabel(asset)} | ${model.failureClassOf(asset.name)} | ${asset.shape ?? 'example'} | ${model.consumers[asset.name] ?? 0} |`)
  }
  lines.push('')
  lines.push('## 探针（调试面，不进自动 lane）')
  lines.push('')
  lines.push('| 资产 | 域 | 失败类 | shape | 消费者 |')
  lines.push('|---|---|---|---|---|')
  for (const probe of model.probes) {
    lines.push(`| ${probe.name} | ${probe.domain} | ${model.failureClassOf(probe.name)} | ${probe.shape ?? 'example'} | ${model.consumers[probe.name] ?? 0} |`)
  }
  return `${lines.join('\n')}\n`
}

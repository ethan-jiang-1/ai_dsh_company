/**
 * 历史缺陷 → 具名守卫覆盖（生成物，2026-11-14）。
 *
 * 为什么：census 数「资产有多少」，guard-red-record 查「声称守卫 BUG 的 spec 有没有红配方」，
 * 但没有人回答「181 张已修卡里，哪些根本没有具名守卫」。没有这张账，资产杠杆只能靠感觉。
 *
 * 口径（保守下界）：只在 `tests/` 下的 `*.spec.ts` / `tests/checks/*.test.mjs` 的
 * `it/test/describe` 行里找 `BUG-<nnn>`。标题没写 BUG 的守卫不计入；所以「无守卫」是
 * **候选缺口**，不是「一定没测」。报告只做账，不自动判红。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { headingSections, parseFrontmatter } from './repo-markdown.mjs'

/** 读已修卡：id/opened/slug/title。 */
export function fixedBugs(root) {
  const dir = join(root, '_backlog/_archive/fixed_bugs')
  const bugs = []
  for (const name of readdirSync(dir)) {
    const match = /^BUG-(\d{3})-(.+)\.md$/.exec(name)
    if (match === null) continue
    const text = readFileSync(join(dir, name), 'utf8')
    const fm = parseFrontmatter(text)
    const rawOpened = fm.data?.opened
    const opened = typeof rawOpened === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawOpened) ? rawOpened : '—'
    const title = headingSections(text, { depth: 1 })[0]?.rawTitle || name
    bugs.push({ id: match[1], opened, slug: match[2], title, file: `_backlog/_archive/fixed_bugs/${name}` })
  }
  return bugs.sort((a, b) => a.id.localeCompare(b.id))
}

/** 收集 tests 下的 spec/checks 自测文件（相对路径）。 */
function testFiles(root) {
  const out = []
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'fixtures') continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) { walk(path); continue }
      if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.mjs')) out.push(path)
    }
  }
  walk(join(root, 'tests'))
  return out
}

/** 具名守卫：it/test/describe 行里的 BUG-nnn。 */
export function bugGuards(root) {
  const guards = new Map()
  for (const path of testFiles(root)) {
    const rel = relative(root, path)
    const lines = readFileSync(path, 'utf8').split('\n')
    lines.forEach((line, index) => {
      if (!/\b(?:it|test|describe)(?:\.each\([^)]*\))?\s*\(/.test(line)) return
      for (const match of line.matchAll(/BUG-(\d{3})/g)) {
        const id = match[1]
        if (!guards.has(id)) guards.set(id, [])
        guards.get(id).push(`${rel}:${String(index + 1)}`)
      }
    })
  }
  return guards
}

/** 覆盖报告模型。 */
export function coverageReport(root) {
  const bugs = fixedBugs(root)
  const guards = bugGuards(root)
  const rows = bugs.map(bug => ({ ...bug, guards: guards.get(bug.id) ?? [] }))
  const covered = rows.filter(row => row.guards.length > 0)
  const uncovered = rows.filter(row => row.guards.length === 0)
  return { rows, covered, uncovered, total: rows.length }
}

/** 渲染生成物。 */
export function renderCoverage(model) {
  const lines = []
  lines.push('# 历史缺陷 → 具名守卫覆盖（生成物，勿手改）')
  lines.push('')
  lines.push('> 生成 = `node tools/bug-coverage.mjs --write`；一致门 = `tests/repo/bug-coverage.spec.ts`。')
  lines.push('> 口径 = `it/test/describe` 标题里的 `BUG-<nnn>`；标题没写 BUG 的守卫不计入——「无守卫」是候选缺口，不是「一定没测」。')
  lines.push('')
  lines.push('## 汇总')
  lines.push('')
  lines.push('| 指标 | 数量 |')
  lines.push('|---|---|')
  lines.push(`| 已修卡 | ${model.total} |`)
  lines.push(`| 有具名守卫 | ${model.covered.length} |`)
  lines.push(`| 无具名守卫 | ${model.uncovered.length} |`)
  lines.push(`| 覆盖率 | ${model.total === 0 ? '—' : `${((model.covered.length / model.total) * 100).toFixed(1)}%`} |`)
  lines.push('')
  lines.push('## 无具名守卫（候选缺口，按 opened 倒序）')
  lines.push('')
  lines.push('| BUG | opened | slug |')
  lines.push('|---|---|---|')
  for (const bug of [...model.uncovered].sort((a, b) => b.opened.localeCompare(a.opened) || b.id.localeCompare(a.id))) {
    lines.push(`| ${bug.id} | ${bug.opened} | ${bug.slug} |`)
  }
  lines.push('')
  lines.push('## 有具名守卫')
  lines.push('')
  lines.push('| BUG | opened | 守卫 |')
  lines.push('|---|---|---|')
  for (const bug of model.covered) {
    lines.push(`| ${bug.id} | ${bug.opened} | ${bug.guards.join('；')} |`)
  }
  return `${lines.join('\n')}\n`
}

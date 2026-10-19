#!/usr/bin/env node
// 状态：常驻
// 何时跑：新增/归档成品、改 meta.md 后，或一轮收敛末尾；维护者跑（生成物，不手改）。
// 作用：扫描 `company-workspace/deliverables/` 与 `deliverables-archive/` 的 final.md + meta.md，
//   生成 `company-workspace/kb/deliverables-index.json`；公司页签「成品」只读这份索引。
// 口径：成品 = 有 final.md；present 背书不在本索引（仍归 checks/audit/deliverables-check.mjs）。
// 用法：node tools/deliverables-index.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { parseMeta } from './lib/deliverables.mjs'
import { buildDeliverablesCatalog, CATALOG_ROOTS } from './lib/deliverables-catalog.mjs'

const WORKSPACE = join(ROOT, 'company-workspace')
const OUT = join(WORKSPACE, 'kb', 'deliverables-index.json')

/**
 * 动议台账里的 slug 集合（只认表行首列；格式家 = kb/motion-ledger.md 头注）。
 * @param {string} text - 动议台账全文。
 * @returns {Set<string>} slug 集合。
 */
function ledgerSlugs(text) {
  const slugs = new Set()
  let headerSeen = false
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined).split('|').map(cell => cell.trim())
    if (!headerSeen) {
      if (cells[0] === 'slug') headerSeen = true
      continue
    }
    if (cells.every(cell => /^[-: ]*$/.test(cell))) continue
    if (cells[0] !== undefined && cells[0] !== '') slugs.add(cells[0])
  }
  return slugs
}

if (!existsSync(WORKSPACE)) {
  console.error(`company-workspace 不存在：${WORKSPACE}`)
  process.exit(2)
}

const entries = []
for (const root of CATALOG_ROOTS) {
  const dir = join(WORKSPACE, root)
  if (!existsSync(dir)) continue
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (!item.isDirectory()) continue
    const final = existsSync(join(dir, item.name, 'final.md'))
    const metaPath = join(dir, item.name, 'meta.md')
    const body = existsSync(metaPath) ? readFileSync(metaPath, 'utf8') : ''
    entries.push({ root, dir: item.name, fields: parseMeta(body).fields, final })
  }
}

const ledgerPath = join(WORKSPACE, 'kb', 'motion-ledger.md')
const catalog = buildDeliverablesCatalog({
  entries,
  ledgerSlugs: existsSync(ledgerPath) ? ledgerSlugs(readFileSync(ledgerPath, 'utf8')) : new Set(),
  generatedAt: new Date().toISOString(),
})

mkdirSync(join(WORKSPACE, 'kb'), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ path: relative(ROOT, OUT), ...catalog.counts }, null, 2))

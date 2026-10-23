#!/usr/bin/env node
// 状态：常驻
// 何时跑：新增/归档成品、改 meta.md 后，或一轮收敛末尾；维护者跑（生成物，不手改）。
// 作用：扫描 `company-workspace/deliverables/` 与 `deliverables-archive/` 的 final.md + meta.md，
//   生成 `company-workspace/kb/deliverables-index.json`；公司页签「成品」只读这份索引。
// 口径：成品 = 有 final.md；present 状态**复用** checks/audit/deliverables-check.mjs --json 的判据（不另写一套）；
//   审计不可得（未 source run/env.sh 等）时 presented=null，面板显示「未核」，不冒充已 present。
// 用法：node tools/deliverables-index.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { parseAuditVerdict } from './lib/audit-verdict.mjs'
import { parseMeta, slugFromDirName } from './lib/deliverables.mjs'
import { buildDeliverablesCatalog, CATALOG_ROOTS } from './lib/deliverables-catalog.mjs'

// 测试缝（2026-10-23）：converge 的端到端探针把工作区重定向到 runtime/ 下的临时目录。
// 默认值不变；只有显式设了 DELIVERABLES_WS_REL 才重定向（converge 会把它传给本生成器）。
const WORKSPACE = join(ROOT, process.env.DELIVERABLES_WS_REL ?? 'company-workspace')
const OUT = join(WORKSPACE, 'kb', 'deliverables-index.json')

/**
 * 跑审计档拿 present 背书集合（单一判据 = checks/audit/deliverables-check.mjs）。
 * 审计输出人类报告 + 最后一行 `JSON:{...}`；这里只取 presented。不可得 ⇒ null（未核，不冒充）。
 * @returns {Set<string>|null} Lead present 过的 slug；null = 审计不可得。
 */
function presentedSlugs() {
  const r = spawnSync(process.execPath, [join(ROOT, 'checks', 'audit', 'deliverables-check.mjs'), '--json'], { cwd: ROOT, encoding: 'utf8' })
  const payload = parseAuditVerdict(r.stdout ?? '')
  if (payload === null || payload.assessed === false) {
    console.warn('⚠ 成品 present 未核：deliverables-check --json 无可用判词（先 source run/env.sh）；索引继续生成，presented=null')
    return null
  }
  return new Set(Array.isArray(payload.presented) ? payload.presented : [])
}

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

const presentedSet = presentedSlugs()
const entries = []
for (const root of CATALOG_ROOTS) {
  const dir = join(WORKSPACE, root)
  if (!existsSync(dir)) continue
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (!item.isDirectory()) continue
    const final = existsSync(join(dir, item.name, 'final.md'))
    const metaPath = join(dir, item.name, 'meta.md')
    const body = existsSync(metaPath) ? readFileSync(metaPath, 'utf8') : ''
    const fields = parseMeta(body).fields
    const slug = fields.get('slug') ?? slugFromDirName(item.name)
    entries.push({ root, dir: item.name, fields, final, presented: presentedSet === null ? null : presentedSet.has(slug) })
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

#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 preset / 组合 / handbook / workflow 合同 / skill 目录后；或跑完一轮真模型会话要出「运行时面」
//   基线时。成本：keyless（只读盘 + zstd 解压），round-8 的 47 条观察秒级；不调模型。
// 用法：source run/env.sh && node checks/audit/surface-matrix-audit.mjs
//       [--home <DSH_HOME>] [--session <rootId>] [--since <ISO|epoch>] [--json-out <path>] [--md-out <path>]
// 判据（实现 = tools/lib/surface-matrix.mjs，spec 钉同源）：
//   model/YAML 声明 → 运行时 request/header + system/message + skill-catalog：
//   - named delegates / generic subagent / fork / workflow / subagent_retry / control（仅 child）
//   - handbook 在场 ⇔ preset ∉ handbookSkipPresets()
//   - workflow 合同在场 ⇔ workflow 工具在场
//   - skill catalog ⊇ preset skills + _shared 根 + <DSH_HOME>/company/methods/<preset>
//   - root/member 的团队工具是 Lead 面，不判越权；one-shot child/分支出现团队工具才报
// 不证明：模型行为、深度预算是否拒绝、UI、生命周期；缺 session 首帧显式 unknown，不默认 worker/0。
// 注意：历史日志必须 `--since` 到当前基线之后；否则旧状态（coo/cfo 缺行、worker control）会被误报。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { zstdText } from '../../tools/drivers/zstd.mjs'
import {
  buildSessionEvidence,
  parseSessionRecords,
  shortSessionId,
} from '../../tools/lib/session-evidence.mjs'
import {
  entryKind,
  matrixRows,
  observationOf,
  surfaceProblems,
} from '../../tools/lib/surface-matrix.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const args = process.argv.slice(2)
const valueOf = (name) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}
const flag = (name) => args.includes(`--${name}`)

const home = resolve(valueOf('home') ?? process.env.DSH_HOME ?? join(ROOT, 'runtime/harness-home'))
const sessionsRoot = join(home, 'sessions')
if (!existsSync(sessionsRoot)) {
  console.error(`surface-matrix-audit: 找不到 sessions 根：${sessionsRoot}`)
  process.exit(2)
}

/** `--since` 缺省 = 最近一次 HEAD 提交时间；拿不到就 0（全扫，但会提示）。 */
function defaultSince() {
  try {
    const epoch = Number(execFileSync('git', ['log', '-1', '--format=%ct'], { cwd: ROOT, encoding: 'utf8' }).trim())
    return Number.isFinite(epoch) ? epoch * 1000 : 0
  } catch {
    return 0
  }
}
const sinceRaw = valueOf('since')
const since = sinceRaw === undefined ? defaultSince() : (/^\d+$/.test(sinceRaw) ? Number(sinceRaw) * 1000 : Date.parse(sinceRaw))
if (!Number.isFinite(since)) {
  console.error('surface-matrix-audit: --since 需要 ISO 时间或 epoch 秒')
  process.exit(2)
}

/** 所有会话目录：兼容 `sessions/<slug>/<id>/` 与 `sessions/<id>/`。 */
function sessionDirs() {
  const found = []
  const addDir = (id, dir) => {
    if (!readdirSync(dir).some(name => name.endsWith('.jsonl.zstd'))) return
    const stats = statSync(dir)
    if (stats.mtimeMs < since) return
    found.push({ id, dir, mtimeMs: stats.mtimeMs })
  }
  for (const entry of readdirSync(sessionsRoot)) {
    const path = join(sessionsRoot, entry)
    let stats
    try {
      stats = statSync(path)
    } catch {
      continue
    }
    if (!stats.isDirectory()) continue
    if (readdirSync(path).some(name => name.endsWith('.jsonl.zstd'))) {
      addDir(entry, path)
      continue
    }
    for (const id of readdirSync(path)) {
      const dir = join(path, id)
      try {
        if (!statSync(dir).isDirectory()) continue
      } catch {
        continue
      }
      addDir(id, dir)
    }
  }
  return found
}

function readRecords(dir) {
  const file = readdirSync(dir).find(name => name.endsWith('.jsonl.zstd'))
  if (file === undefined) return undefined
  return parseSessionRecords(zstdText(join(dir, file)))
}

const dirs = sessionDirs()
const dirById = new Map(dirs.map(item => [item.id, item.dir]))
const evidenceById = new Map()
for (const item of dirs) {
  const records = readRecords(item.dir)
  if (records === undefined) continue
  evidenceById.set(item.id, buildSessionEvidence(records, { id: item.id }))
}

/** 父链接索引：一遍扫所有 evidence 的 children，把 child→link kind 钉住；没有才推断。 */
const linkIndex = new Map()
for (const evidence of evidenceById.values()) {
  for (const link of evidence.children) {
    const previous = linkIndex.get(link.id)
    const rank = { named: 1, workflow: 2, member: 3 }
    if (previous === undefined || rank[link.kind] > rank[previous.kind]) linkIndex.set(link.id, link)
  }
}

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text)
  if (match === null) return {}
  const out = {}
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (kv !== null) out[kv[1]] = kv[2].trim()
  }
  return out
}

function skillsIn(dir) {
  if (!existsSync(dir)) return []
  const names = []
  for (const name of readdirSync(dir)) {
    const file = join(dir, name, 'SKILL.md')
    if (!existsSync(file)) continue
    const meta = frontmatter(readFileSync(file, 'utf8'))
    if (meta['disable-model-invocation'] === 'true') continue
    names.push(meta.name ?? name)
  }
  return names.sort()
}

const expectedCache = new Map()
/** preset 的声明 skill 面 = preset skills/ + YAML 引用的 _shared 根 + 公司 methods/<preset>。 */
function expectedSkills(preset) {
  if (expectedCache.has(preset)) return expectedCache.get(preset)
  const names = []
  const yamlPath = join(ROOT, 'packages/company-pack/presets', preset, 'agent.cordis.yml')
  if (existsSync(yamlPath)) {
    const yaml = readFileSync(yamlPath, 'utf8')
    const roots = new Set([...yaml.matchAll(/presets\/([^'"\s]+?)\/skills\//g)].map(match => match[1]))
    for (const root of roots) {
      const dir = root.startsWith('_shared')
        ? join(ROOT, 'packages/company-pack/presets', root, 'skills')
        : join(ROOT, 'packages/company-pack/presets', preset, 'skills')
      names.push(...skillsIn(dir))
    }
  }
  names.push(...skillsIn(join(home, 'company/methods', preset)))
  const unique = [...new Set(names)].sort()
  expectedCache.set(preset, unique)
  return unique
}

const observations = []
const skipped = []
let noModelTurn = 0
const onlySession = valueOf('session')
const rootsToRead = onlySession === undefined ? [...evidenceById.keys()] : [onlySession]
if (onlySession !== undefined && !evidenceById.has(onlySession)) {
  console.error(`surface-matrix-audit: --session ${onlySession} 不在 --since 窗口/本 home 里`)
  process.exit(2)
}

function addTree(id, depth = 0, seen = new Set()) {
  if (seen.has(id) || depth > 8) return
  seen.add(id)
  const evidence = evidenceById.get(id)
  if (evidence === undefined) {
    observations.push({
      id,
      preset: 'unavailable',
      depth: 'unavailable',
      entry: 'unknown',
      tools: [],
      markers: { handbook: false, workflowContract: false },
      catalog: [],
      expectedSkills: [],
      source: 'missing',
    })
    return
  }
  if (evidence.surface.toolCount === 0) {
    noModelTurn += 1
    return
  }
  const link = linkIndex.get(id)
  const entry = entryKind(evidence, { linkKind: link?.kind })
  observations.push(observationOf(evidence, { entry, expectedSkills: expectedSkills(evidence.header.preset) }))
  for (const child of evidence.children) addTree(child.id, depth + 1, seen)
}

if (onlySession !== undefined) {
  addTree(onlySession)
} else {
  // 只判根/孤立的 child；child 由父树递归收，避免同一 child 判两遍。
  const roots = [...evidenceById.values()].filter(evidence => String(evidence.header.depth) === '0')
  for (const root of roots) addTree(root.id)
  const reached = new Set(observations.map(observation => observation.id))
  for (const evidence of evidenceById.values()) {
    if (reached.has(evidence.id)) continue
    if (evidence.surface.toolCount === 0) {
      noModelTurn += 1
      continue
    }
    // 父不在窗口内的孤立 child：按工具面/链接索引推断，标 inferred。
    const entry = entryKind(evidence, { linkKind: linkIndex.get(evidence.id)?.kind })
    observations.push(observationOf(evidence, { entry, expectedSkills: expectedSkills(evidence.header.preset) }))
  }
  if (since === 0) skipped.push('--since 未指定且拿不到 HEAD 时间：本次是全扫，旧日志可能误报')
}

const noHeader = observations.filter(observation => observation.entry === 'unknown').length
const problems = surfaceProblems(observations)
const rows = matrixRows(observations)
const payload = {
  home,
  since: since === 0 ? 0 : new Date(since).toISOString(),
  generatedAt: new Date().toISOString(),
  observations,
  rows,
  problems,
  skipped,
  noModelTurn,
}

console.log(`surface-matrix: home=${home} since=${payload.since === 0 ? '0（全扫）' : payload.since} observations=${String(observations.length)}（unknown=${String(noHeader)}，无模型轮=${String(noModelTurn)}）`)
if (skipped.length > 0) for (const line of skipped) console.log(`  ⚠ ${line}`)
console.log('\n| session | preset | entry | depth | tools | team | control | handbook | wf-contract | skills |')
console.log('|---|---|---|---:|---:|---:|---:|---|---|---:|')
for (const row of rows) {
  console.log(`| \`${shortSessionId(row.id)}\` | ${row.preset} | ${row.entry} | ${row.depth} | ${row.tools} | ${row.team} | ${row.control} | ${row.handbook ? '有' : '无'} | ${row.workflowContract ? '有' : '无'} | ${row.catalog} |`)
}
if (problems.length > 0) {
  console.log(`\n问题 ${String(problems.length)}：`)
  for (const problem of problems) console.log(`- ${problem}`)
} else {
  console.log('\nsurface-matrix: 0 问题（只证声明面 ↔ 运行时面，不是行为 PASS）')
}

const jsonOut = valueOf('json-out')
if (jsonOut !== undefined) {
  mkdirSync(dirname(resolve(jsonOut)), { recursive: true })
  writeFileSync(resolve(jsonOut), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}
const mdOut = valueOf('md-out')
if (mdOut !== undefined) {
  const lines = [
    `# 运行时面矩阵 · ${payload.generatedAt}`,
    '',
    `- home：\`${home}\``,
    `- since：${payload.since === 0 ? '0（全扫）' : payload.since}`,
    `- 观察：${String(observations.length)}（unknown=${String(noHeader)}）；问题：${String(problems.length)}`,
    '',
    '| session | preset | entry | depth | tools | team | control | handbook | wf-contract | skills |',
    '|---|---|---|---:|---:|---:|---:|---|---|---:|',
    ...rows.map(row => `| \`${shortSessionId(row.id)}\` | ${row.preset} | ${row.entry} | ${row.depth} | ${row.tools} | ${row.team} | ${row.control} | ${row.handbook ? '有' : '无'} | ${row.workflowContract ? '有' : '无'} | ${row.catalog} |`),
    '',
    problems.length > 0 ? problems.map(problem => `- ${problem}`).join('\n') : '0 问题（只证声明面 ↔ 运行时面）',
  ]
  mkdirSync(dirname(resolve(mdOut)), { recursive: true })
  writeFileSync(resolve(mdOut), `${lines.join('\n')}\n`, 'utf8')
}

if (problems.length > 0) process.exit(1)

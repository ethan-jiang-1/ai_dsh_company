#!/usr/bin/env node
// 状态：常驻
// 何时跑：跑过任何真模型会话后要收口证据、或要把一次 live run 变成可复判的 JSON/markdown 时。
//   成本：keyless（只读盘 + zstd 解压），秒级；不调模型、不碰网络。
// 用法：node tools/explore-evidence.mjs --session <rootId> [--home <DSH_HOME>] [--json-out <path>] [--md-out <path>] [--depth 4]
//       node tools/explore-evidence.mjs --latest [--home <DSH_HOME>]
// 判据：首帧 session（preset/depth）、request/header（工具面）、system/message（handbook/workflow 标记）、
//   skill-catalog、turn/end（终态）、tool/call+tool/result、子代链接、显式 write/edit。
//   缺首帧显式 `unavailable`，不默认 worker/0；`session/page` 读不到的 team member 直接读盘。
// 不证明：语义正确、模型判断、UI 渲染；最终正文只作诊断，不参与 PASS。
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { zstdText } from './drivers/zstd.mjs'
import {
  buildSessionEvidence,
  buildSessionTree,
  parseSessionRecords,
  renderSessionTreeMarkdown,
  shortSessionId,
} from './lib/session-evidence.mjs'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'

const args = process.argv.slice(2)
const valueOf = (name) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}
const flag = (name) => args.includes(`--${name}`)

const home = resolve(valueOf('home') ?? process.env.DSH_HOME ?? join(ROOT, 'runtime/harness-home'))
const sessionsRoot = join(home, 'sessions')
const depthLimit = Number(valueOf('depth') ?? '4')
if (!existsSync(sessionsRoot)) {
  console.error(`explore-evidence: 找不到 sessions 根：${sessionsRoot}（先确认 DSH_HOME 或 --home）`)
  process.exit(2)
}

/** 所有会话目录：兼容 `sessions/<slug>/<id>/` 与 `sessions/<id>/` 两种落盘形状。 */
function sessionDirs() {
  const found = []
  for (const entry of readdirSync(sessionsRoot)) {
    const path = join(sessionsRoot, entry)
    let stats
    try {
      stats = statSync(path)
    } catch {
      continue
    }
    if (!stats.isDirectory()) continue
    const hasLog = name => readdirSync(path).some(item => item.endsWith('.jsonl.zstd'))
    if (hasLog()) {
      found.push({ id: entry, dir: path, mtimeMs: stats.mtimeMs })
      continue
    }
    for (const id of readdirSync(path)) {
      const dir = join(path, id)
      try {
        if (!statSync(dir).isDirectory()) continue
      } catch {
        continue
      }
      if (!readdirSync(dir).some(name => name.endsWith('.jsonl.zstd'))) continue
      found.push({ id, dir, mtimeMs: statSync(dir).mtimeMs })
    }
  }
  return found
}

const dirs = sessionDirs()
const dirById = new Map(dirs.map(item => [item.id, item.dir]))

function recordsOf(id) {
  const dir = dirById.get(id)
  if (dir === undefined) return undefined
  const file = readdirSync(dir).find(name => name.endsWith('.jsonl.zstd'))
  if (file === undefined) return undefined
  return { records: parseSessionRecords(zstdText(join(dir, file))), file: join(dir, file) }
}

function evidenceOf(id) {
  const loaded = recordsOf(id)
  if (loaded === undefined) return { id, evidence: buildSessionEvidence([], { id }) }
  return { id, file: loaded.file, evidence: buildSessionEvidence(loaded.records, { id }) }
}

function latestRoot() {
  const roots = []
  for (const item of dirs) {
    const loaded = recordsOf(item.id)
    if (loaded === undefined) continue
    const evidence = buildSessionEvidence(loaded.records, { id: item.id })
    if (evidence.header.missing || String(evidence.header.depth) !== '0') continue
    roots.push({ id: item.id, createdAt: evidence.header.createdAt ?? 0, mtimeMs: item.mtimeMs })
  }
  roots.sort((a, b) => b.createdAt - a.createdAt || b.mtimeMs - a.mtimeMs)
  return roots[0]?.id
}

const rootId = valueOf('session') ?? (flag('latest') ? latestRoot() : undefined)
if (rootId === undefined) {
  console.error('explore-evidence: 需要 --session <rootId> 或 --latest（不给就列出最近 10 个根会话）')
  const roots = dirs
    .map(item => ({ item, loaded: recordsOf(item.id) }))
    .filter(({ loaded }) => loaded !== undefined)
    .map(({ item, loaded }) => ({ id: item.id, header: buildSessionEvidence(loaded.records, { id: item.id }).header }))
    .filter(({ header }) => String(header.depth) === '0')
    .slice(-10)
  for (const { id, header } of roots) console.log(`  ${id}  preset=${header.preset}`)
  process.exit(2)
}

const root = evidenceOf(rootId)
const children = []
const queue = [{ id: rootId, depth: 0 }]
const seen = new Set([rootId])
while (queue.length > 0) {
  const current = queue.shift()
  if (current.depth >= depthLimit) continue
  const { evidence } = current.id === rootId ? root : evidenceOf(current.id)
  for (const link of evidence.children) {
    if (seen.has(link.id)) continue
    seen.add(link.id)
    const child = evidenceOf(link.id)
    children.push({ link, ...child })
    queue.push({ id: link.id, depth: current.depth + 1 })
  }
}

const tree = buildSessionTree(root.evidence, children)
const payload = {
  home,
  generatedAt: new Date().toISOString(),
  root: { id: root.id, file: root.file, evidence: root.evidence },
  children: children.map((child) => ({ link: child.link, id: child.id, file: child.file, evidence: child.evidence })),
  matrix: renderSessionTreeMarkdown(tree),
}
const jsonOut = valueOf('json-out')
if (jsonOut !== undefined) {
  mkdirSync(dirname(resolve(jsonOut)), { recursive: true })
  writeFileSync(resolve(jsonOut), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}
const mdOut = valueOf('md-out')
if (mdOut !== undefined) {
  const lines = [
    `# 会话证据包 · ${rootId}`,
    '',
    `- home：\`${home}\``,
    `- 生成：${payload.generatedAt}`,
    `- 子代：${String(children.length)} 个（depth ≤ ${String(depthLimit)}）`,
    '',
    payload.matrix,
    '',
    '## 工具调用',
    '',
  ]
  const all = [root, ...children]
  for (const item of all) {
    const evidence = item.evidence
    if (evidence.calls.length === 0) continue
    lines.push(`### \`${shortSessionId(evidence.id)}\`（${evidence.header.preset}）`)
    for (const call of evidence.calls) {
      lines.push(`- turn ${String(call.turn)} \`${call.name}\`${call.isError ? ' **error**' : ''}${call.resultText === '' ? '' : `：${call.resultText.replace(/\s+/g, ' ').slice(0, 160)}`}`)
    }
    lines.push('')
  }
  lines.push('## 显式写盘', '')
  const writes = all.flatMap(item => (item === root ? item.evidence : item.evidence).writes)
  if (writes.length === 0) lines.push('（无 write/edit 调用）')
  for (const write of writes) lines.push(`- \`${write.tool}\` \`${write.path}\`${write.isError ? ' **error**' : ''}`)
  lines.push('')
  mkdirSync(dirname(resolve(mdOut)), { recursive: true })
  writeFileSync(resolve(mdOut), `${lines.join('\n')}\n`, 'utf8')
}

console.log(payload.matrix)
console.log(`\nexplore-evidence: root=${rootId} children=${String(children.length)}${jsonOut === undefined ? '' : ` json=${jsonOut}`}${mdOut === undefined ? '' : ` md=${mdOut}`}`)

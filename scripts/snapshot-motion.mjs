#!/usr/bin/env node
// 动议归档：会话日志 + workspace.actual 实测态；独立 oracle 仅从显式输入导入且永不覆盖。
//
// 形状沿用 R1（`snapshots/r1-motion/`）与 vendor `snapshots/AGENTS.md`：一场景一目录 + snapshot.yml；
// replay harness 已交付（scripts/replay-smoke.mjs）；本目录用途 = **基线对照**（行为变了就 diff）。
//
// 用法：source dev/env.sh && node scripts/snapshot-motion.mjs \
//         --session session-<lead-id> --out snapshots/r2-motion --motion "动议原文" [--cwd company-workspace]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { requireDevHome } from './lib/runtime-home.mjs'
import { captureWorkspace } from './lib/workspace-oracle.mjs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const { dump } = createRequire(new URL('../vendor/dsh/package.json', import.meta.url))('js-yaml')
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const SESSION = arg('session')
const OUT = resolve(ROOT, arg('out', 'snapshots/r2-motion'))
const MOTION = arg('motion', '（未注明）')
const CWD_REL = arg('cwd', 'company-workspace')
// 场景名（R3 起可配）：探针类场景不是"动议"，别让 snapshot.yml 顶着 r2 的名字。
const SCENARIO = arg('scenario', 'r2-five-role-motion')
// --workspace-expected / --workspace-before 指向独立编写的完整树；不接受 live cwd 或符号链接。
const EXPECTED_SOURCE = arg('workspace-expected')
const BEFORE_SOURCE = arg('workspace-before')
// 探针只跳过工作区采集，保留已有 oracle。
const NO_WORKSPACE = process.argv.includes('--no-workspace')
if (SESSION === undefined) {
  console.error('snapshot-motion: 需要 --session <session-id>')
  process.exit(2)
}
const home = requireDevHome('snapshot-motion')

const cwd = resolve(ROOT, CWD_REL)
const slug = `-${cwd.replaceAll('/', '-')}--`
const sessionsDir = join(home, 'sessions', slug)
if (!existsSync(sessionsDir)) throw new Error(`会话目录不存在：${sessionsDir}`)

/** 解压一个会话目录的 JSONL（zstd → 明文）。 */
function readSession(sessionId) {
  const dir = join(sessionsDir, sessionId)
  const zstd = readdirSync(dir).find(name => name.endsWith('.jsonl.zstd'))
  if (zstd === undefined) throw new Error(`${sessionId} 里没有 .jsonl.zstd`)
  return execFileSync('zstd', ['-dc', join(dir, zstd)], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8')
}

/** 会话头（第一行）里的元数据。 */
function headerOf(jsonl) {
  const first = jsonl.split('\n', 1)[0]
  return JSON.parse(first)
}

const leadJsonl = readSession(SESSION)
const lead = headerOf(leadJsonl)

// child 会话 id 的权威来源 = Lead 日志里的 `team/member` 事件（member.id；目录名不带 session- 前缀，
// header 里也没有 parentSessionId——header.agentPreset 仍是 Lead 的 preset，即 M4 共享组合的实证）。
const members = new Map()
for (const line of leadJsonl.split('\n')) {
  if (line === '') continue
  let event
  try { event = JSON.parse(line) } catch { continue }
  if (event.type !== 'team/member') continue
  const member = event.data?.member
  if (member?.id !== undefined && member?.name !== undefined) members.set(member.id, member.name)
}
const children = []
for (const [id, name] of members) {
  try { children.push({ id, name, jsonl: readSession(id) }) } catch { /* 未落盘：跳过 */ }
}

const workspace = captureWorkspace({
  cwd, out: OUT, noWorkspace: NO_WORKSPACE,
  expectedSource: EXPECTED_SOURCE === undefined ? undefined : resolve(ROOT, EXPECTED_SOURCE),
  beforeSource: BEFORE_SOURCE === undefined ? undefined : resolve(ROOT, BEFORE_SOURCE),
})

rmSync(join(OUT, 'sessions'), { recursive: true, force: true })
mkdirSync(join(OUT, 'sessions'), { recursive: true })
writeFileSync(join(OUT, 'sessions', 'lead.jsonl'), leadJsonl)
for (const child of children) writeFileSync(join(OUT, 'sessions', `${child.name}-${child.id}.jsonl`), child.jsonl)

const lines = (text) => text.split('\n').filter(line => line !== '').length
writeFileSync(join(OUT, 'snapshot.yml'), dump({
  scenario: SCENARIO,
  recordedAt: new Date().toISOString().slice(0, 10),
  profile: 'web',
  agentPreset: lead.agentPreset ?? 'ceo',
  cwd: CWD_REL,
  motion: MOTION,
  session: { lead: 'sessions/lead.jsonl', children: 'sessions/' },
  workspace,
}))
console.log(`snapshot-motion: ${OUT}`)
console.log(`  lead ${String(lines(leadJsonl))} 行；children ${String(children.length)} 个（${children.map(c => c.name).join(', ') || '无'}）`)

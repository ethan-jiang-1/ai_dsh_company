#!/usr/bin/env node
// 状态：常驻
// 何时跑：一场会话/动议跑完后要回答「刚才哪里不对」时；或用户报症状、你要先读日志再猜原因时。
// 作用：从 dev home 的会话日志里折出失败摘要——非 completed 的 turn、tool/result 错误、
//   被拒/非 allow 的审批、待答问询、present 调用、最后 assistant 正文；只读、无模型、无浏览器。
// 用法：source run/env.sh && node tools/diagnose.mjs [--session <slug>[/<id前缀>]] [--json]
//   不给 --session = 选最近更新的会话；日志优先走 pickSessionLog（zstd 多帧用 CLI 解）。
// 前置：dev home 有 sessions/；离开 dev home 时 fail-closed（requireDevHome）。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { requireDevHome } from './lib/runtime-home.mjs'
import { pickSessionLog } from './lib/session-log-generation.mjs'
import { zstdText } from './drivers/zstd.mjs'
import { redactTokenUrls, summarizeSessionEvents } from './lib/session-diagnose.mjs'

const args = process.argv.slice(2)
const arg = (name) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}
const JSON_OUT = args.includes('--json')

let home
try {
  home = requireDevHome('diagnose')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const sessionsRoot = join(home, 'sessions')
if (!existsSync(sessionsRoot)) {
  console.error(`diagnose: sessions 根不存在：${sessionsRoot}`)
  process.exit(2)
}

/** 一个会话目录的日志 mtime（没有 canonical 日志 = 0）。 */
function sessionStamp(dir) {
  const picked = pickSessionLog(dir)
  if (picked === undefined) return 0
  try { return statSync(join(dir, picked.name)).mtimeMs } catch { return 0 }
}

/** 找最近的会话目录。 */
function newestSession() {
  let best = null
  for (const slugEntry of readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!slugEntry.isDirectory()) continue
    const slugDir = join(sessionsRoot, slugEntry.name)
    for (const sessionEntry of readdirSync(slugDir, { withFileTypes: true })) {
      if (!sessionEntry.isDirectory() || !sessionEntry.name.startsWith('session-')) continue
      const dir = join(slugDir, sessionEntry.name)
      const stamp = sessionStamp(dir)
      if (stamp > 0 && (best === null || stamp > best.stamp)) best = { slug: slugEntry.name, id: sessionEntry.name, dir, stamp }
    }
  }
  return best
}

/** 按 `slug[/id前缀]` 找会话目录。 */
function selectedSession(selection) {
  const slash = selection.lastIndexOf('/')
  const slug = slash === -1 ? selection : selection.slice(0, slash)
  const prefix = slash === -1 ? '' : selection.slice(slash + 1)
  const slugDir = join(sessionsRoot, slug)
  if (!existsSync(slugDir)) throw new Error(`slug 不存在：${slug}`)
  const candidates = readdirSync(slugDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('session-'))
    .map(entry => ({ slug, id: entry.name, dir: join(slugDir, entry.name) }))
    .filter(entry => prefix === '' || entry.id.startsWith(`session-${prefix}`) || entry.id.replace(/^session-/, '').startsWith(prefix))
    .sort((left, right) => sessionStamp(right.dir) - sessionStamp(left.dir))
  if (candidates.length === 0) throw new Error(`slug ${slug} 下没有匹配 ${prefix === '' ? '任意' : prefix} 的会话`)
  return candidates[0]
}

let target
try {
  target = arg('session') === undefined ? newestSession() : selectedSession(arg('session'))
} catch (error) {
  console.error(`diagnose: ${error.message}`)
  process.exit(2)
}
if (target === null) {
  console.error('diagnose: 没有可读的会话日志（先跑一场会话）')
  process.exit(2)
}

const picked = pickSessionLog(target.dir)
if (picked === undefined) {
  console.error(`diagnose: 会话目录没有 canonical 日志：${target.dir}`)
  process.exit(2)
}
const logPath = join(target.dir, picked.name)
const text = picked.zstd ? zstdText(logPath) : readFileSync(logPath, 'utf8')
const records = []
let badLines = 0
for (const line of text.split('\n')) {
  if (line.trim() === '') continue
  try { records.push(JSON.parse(line)) } catch { badLines++ }
}
const summary = summarizeSessionEvents(records, { recent: 1 })
summary.log = logPath
summary.badLines = badLines

if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
}

const s = summary.session
console.log(`SESSION ${target.slug}/${target.id}`)
console.log(`PRESET ${s.preset === '' ? '?' : s.preset}  CWD ${s.cwd === '' ? '?' : s.cwd}`)
console.log(`LOG ${logPath}${badLines > 0 ? `（${String(badLines)} 行坏 JSON 已跳过）` : ''}`)
console.log(`EVENTS total=${String(summary.total)} turns=${String(summary.turns)} nonCompleted=${String(summary.nonCompletedTurns.length)} toolErrors=${String(summary.toolErrors.length)} approvals=${String(summary.approvals.length)} pendingQuestions=${String(summary.pendingQuestions.length)} presentCalls=${String(summary.presentCalls.length)}`)
const failures = []
for (const turn of summary.nonCompletedTurns) failures.push(`turn ${String(turn.turn)} ${turn.kind}${turn.detail === '' ? '' : `：${turn.detail}`}`)
for (const error of summary.toolErrors) failures.push(`tool error ${error.toolCallId}${error.text === '' ? '' : `：${error.text}`}`)
for (const approval of summary.approvals) failures.push(`approval ${approval.toolName === '' ? '?' : approval.toolName} → ${approval.decision}`)
for (const question of summary.pendingQuestions) failures.push(`question（${String(question.count)} 项）：${question.first}`)
if (failures.length === 0) console.log('FAILURES none')
else {
  console.log('FAILURES')
  for (const failure of failures) console.log(`  - ${redactTokenUrls(failure)}`)
}
if (summary.presentCalls.length > 0) console.log(`PRESENT calls=${String(summary.presentCalls.length)}`)
if (summary.lastAssistant.length > 0) {
  console.log('LAST ASSISTANT')
  for (const line of summary.lastAssistant[0].split('\n')) console.log(`  ${redactTokenUrls(line)}`)
}

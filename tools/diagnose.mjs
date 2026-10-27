#!/usr/bin/env node
// 状态：常驻
// 何时跑：一场会话/动议跑完后要回答「刚才哪里不对」时；或用户报症状、你要先读日志再猜原因时。
// 作用：从 dev home 的会话日志里折出失败摘要——非 completed 的 turn、tool/result 错误、bash 非零退出、
//   被拒/非 allow 或未 decided 的审批、待答问询、team failed、present 调用、最后 assistant 正文；中断轮（有 start 无 end）
//   会按最后工具区分「等人回答/等审批/真崩溃」；tool 调用统计；只读、无模型、无浏览器。
//   `--strict` = 有失败或非零 bash 即 exit 1（默认 0）；child 目录（无 `session-` 前缀）也可 `--session`。
// 用法：source run/env.sh && node tools/diagnose.mjs [--session <slug>[/<id前缀>]] [--json] [--home <路径>] [--strict]
//   不给 --session = 选最近更新的会话；日志优先走 pickSessionLog（zstd 多帧用 CLI 解）。
// 前置：dev home 有 sessions/；离开 dev home 时 fail-closed（requireDevHome）。
// `--home <路径>`（2026-10-23）：显式读一个**非 dev home**（如日用 `~/.dsh`——Web GUI 会话就住那儿）的会话日志。
//   只读、不加写；默认仍拒绝，必须显式点名——双 home 纪律不变，只是给「读一眼日用 home」一条正路。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
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
// --strict：把「摘要里有失败」变成非零退出（默认 0 保持只读摘要的兼容语义）。
const STRICT = args.includes('--strict')

const HOME_ARG = arg('home')
let home
if (HOME_ARG !== undefined) {
  home = resolve(HOME_ARG)
  if (!existsSync(home)) {
    console.error(`diagnose: --home 路径不存在：${home}`)
    process.exit(2)
  }
  console.error(`⚠ diagnose: 显式读非 dev home（只读）：${home}`)
} else {
  try {
    home = requireDevHome('diagnose')
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }
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
      if (!sessionEntry.isDirectory()) continue
      const dir = join(slugDir, sessionEntry.name)
      const stamp = sessionStamp(dir)
      if (stamp > 0 && (best === null || stamp > best.stamp)) best = { slug: slugEntry.name, id: sessionEntry.name, dir, stamp }
    }
  }
  return best
}

/** 按 `slug[/id前缀]` 找会话目录；id 前缀两态都吃（`018689c9` 与 `session-018689c9` 同义——与 orient 口径一致）；child 目录无 `session-` 前缀也收。 */
function selectedSession(selection) {
  const slash = selection.lastIndexOf('/')
  const slug = slash === -1 ? selection : selection.slice(0, slash)
  const rawPrefix = slash === -1 ? '' : selection.slice(slash + 1)
  const prefix = rawPrefix.replace(/^session-/, '')
  const slugDir = join(sessionsRoot, slug)
  if (!existsSync(slugDir)) throw new Error(`slug 不存在：${slug}`)
  const candidates = readdirSync(slugDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({ slug, id: entry.name, dir: join(slugDir, entry.name) }))
    .filter(entry => sessionStamp(entry.dir) > 0)
    .filter(entry => prefix === '' || entry.id.startsWith(`session-${prefix}`) || entry.id.replace(/^session-/, '').startsWith(prefix))
    .sort((left, right) => sessionStamp(right.dir) - sessionStamp(left.dir))
  if (candidates.length === 0) throw new Error(`slug ${slug} 下没有匹配 ${rawPrefix === '' ? '任意' : rawPrefix} 的会话`)
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

const failures = []
for (const hint of summary.interruptedHints) {
  const turn = String(hint.turn ?? '?')
  if (hint.kind === 'waiting-user') failures.push(`turn ${turn} 等人回答（最后工具 ask_user_question；不是进程被杀/崩溃）`)
  else if (hint.kind === 'waiting-approval') failures.push(`turn ${turn} 等审批（${hint.detail === '' ? '?' : hint.detail}；不是进程被杀/崩溃）`)
  else failures.push(`turn ${turn} interrupted（有 turn/start 无 turn/end；最后工具 ${hint.detail === '' ? '?' : hint.detail}）`)
}
for (const turn of summary.nonCompletedTurns) failures.push(`turn ${String(turn.turn)} ${turn.kind}${turn.detail === '' ? '' : `：${turn.detail}`}`)
for (const error of summary.toolErrors) failures.push(`tool error ${error.toolCallId}${error.text === '' ? '' : `：${error.text}`}`)
for (const approval of summary.approvals) failures.push(`approval ${approval.toolName === '' ? '?' : approval.toolName} → ${approval.decision}`)
for (const approval of summary.pendingApprovals) failures.push(`approval pending ${approval.toolName === '' ? '?' : approval.toolName}（未 decided：${approval.reason === '' ? '无原因' : approval.reason}）`)
for (const question of summary.pendingQuestions) failures.push(`question（${String(question.count)} 项）：${question.first}`)
for (const team of summary.teamFailures) failures.push(`team member ${team.member === '' ? '?' : team.member} failed${team.detail === '' ? '' : `：${team.detail}`}`)
if (badLines > 0) failures.push(`日志有 ${String(badLines)} 行坏 JSON（已跳过）`)

if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2))
  process.exit(STRICT && (failures.length > 0 || summary.toolNonZeroExits.length > 0) ? 1 : 0)
}

const s = summary.session
console.log(`SESSION ${target.slug}/${target.id}`)
console.log(`PRESET ${s.preset === '' ? '?' : s.preset}  CWD ${s.cwd === '' ? '?' : s.cwd}`)
console.log(`LOG ${logPath}${badLines > 0 ? `（${String(badLines)} 行坏 JSON 已跳过）` : ''}`)
console.log(`EVENTS total=${String(summary.total)} turns=${String(summary.turns)} interrupted=${String(summary.interruptedTurns.length)} nonCompleted=${String(summary.nonCompletedTurns.length)} toolCalls=${String(summary.toolCalls.total)} toolErrors=${String(summary.toolErrors.length)} nonzero=${String(summary.toolNonZeroExits.length)} approvals=${String(summary.approvals.length)} pendingApprovals=${String(summary.pendingApprovals.length)} pendingQuestions=${String(summary.pendingQuestions.length)} presentCalls=${String(summary.presentCalls.length)}`)
if (summary.toolCalls.total > 0) {
  const top = Object.entries(summary.toolCalls.byName).sort((left, right) => right[1] - left[1]).slice(0, 6)
  console.log(`TOOLS ${top.map(([name, count]) => `${name}×${String(count)}`).join(' ')}`)
}
if (summary.toolNonZeroExits.length > 0) {
  console.log(`NONZERO ${String(summary.toolNonZeroExits.length)}（bash 非零退出；不都是故障，逐条看）`)
  for (const exit of summary.toolNonZeroExits.slice(0, 8)) {
    console.log(`  - ${exit.toolCallId} exit ${String(exit.code)}${exit.text === '' ? '' : `：${redactTokenUrls(exit.text).slice(0, 200)}`}`)
  }
}
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
if (STRICT && (failures.length > 0 || summary.toolNonZeroExits.length > 0)) process.exitCode = 1

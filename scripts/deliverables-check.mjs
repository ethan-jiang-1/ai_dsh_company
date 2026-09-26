#!/usr/bin/env node
// 交付物三态判据的**运行场入口**（R4「成品流程」轮）。
// 何时跑：交付物三态判据或 company-workspace/deliverables 改动后；维护者按需跑（缺 DSH_HOME 自拒），不进 verify
//
// 与 `tests/deliverables.spec.ts` 的分工（guides/dev-loop §9.1 分层纪律）：
//   - 回归层（vitest）守判据本身，只读**明文**归档日志，秒级、无 key；
//   - 本脚本跑**运行场**——`company-workspace/` + `$DSH_HOME/sessions/`，那里的日志是
//     多帧 zstd（Node 内置 zstd 只解首帧，实测 329KB 只吐出 1 行），所以这里起 `zstd` 解帧。
//   判据逻辑一份，两处复用：`scripts/lib/deliverables.mjs`。
//
// 用法：
//   source dev/env.sh && node scripts/deliverables-check.mjs
//   node scripts/deliverables-check.mjs --workspace snapshots/r1-motion/workspace.expected \
//        --sessions snapshots/r1-motion --legacy-flat      # 审已归档快照（平铺旧形状）
//   node scripts/deliverables-check.mjs --workspace snapshots/r4-motion/workspace.expected \
//        --sessions snapshots/r4-motion --only support-sla-page   # 审快照里本轮那一件
//
// ⚠ 审归档快照必须配 `--only <slug>`：快照的 `workspace.expected/` 是**整盘拷贝**，而
//   `sessions/` 只装本轮日志——不给作用域会把历史成品误报成"无 Lead 背书"（输入不成对）。
//   整盘审计请跑运行场（默认档：真日志全在 $DSH_HOME）。
//
// 退出码：0 = 零违规；1 = 有违规（打印每条 code + path）。
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { requireDevHome } from './lib/runtime-home.mjs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditDeliverables, parseSessionLog } from './lib/deliverables.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const LEGACY_FLAT = process.argv.includes('--legacy-flat')
/** 只审一个交付物（审归档快照必给，见文件头）。 */
const ONLY_SLUG = arg('only')

const workspaceRel = arg('workspace', 'company-workspace')
const workspace = resolve(ROOT, workspaceRel)
if (!existsSync(workspace)) {
  console.error(`deliverables-check: 工作区不存在：${workspace}`)
  process.exit(2)
}

/** 递归列出工作区下的文件相对路径（正斜杠）。 */
function listFiles(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) listFiles(path, base, out)
    else out.push(path.slice(base.length + 1).replaceAll('\\', '/'))
  }
  return out
}

/**
 * 定位会话日志来源。
 * - `--sessions <dir>`：读该目录下的明文 `.jsonl`（`sessions/` 子目录也认）；
 * - 否则按 `$DSH_HOME` + 工作区绝对路径的目录名映射（DSH 的 per-workspace 分组）。
 */
function sessionLogs() {
  const explicit = arg('sessions')
  if (explicit !== undefined) {
    const dir = resolve(ROOT, explicit)
    const found = []
    const consider = (d) => {
      if (!existsSync(d)) return
      for (const name of readdirSync(d)) if (name.endsWith('.jsonl')) found.push(join(d, name))
    }
    consider(dir)
    consider(join(dir, 'sessions'))
    return { dirs: [dir], files: found }
  }

  let home
  try { home = requireDevHome('deliverables-check') } catch (error) {
    console.error(`${error.message}；或用 --sessions 指定明文归档日志目录`)
    process.exit(2)
  }
  const sessionRoot = join(home, 'sessions', `-${workspace.replaceAll('/', '-')}--`)
  if (!existsSync(sessionRoot)) {
    console.error(`deliverables-check: 该工作区还没有会话目录：${sessionRoot}`)
    process.exit(2)
  }
  return { dirs: [sessionRoot], files: [], sessionRoot }
}

const source = sessionLogs()

/** 解一份会话日志：明文直读；`.zstd` 交给 `zstd -dc`（多帧，Node 内置解不全）。 */
function readSessionText(file) {
  if (!file.endsWith('.zstd')) return readFileSync(file, 'utf8')
  try {
    return execFileSync('zstd', ['-dc', file], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8')
  } catch (error) {
    console.error(`deliverables-check: 解压失败（需要 zstd CLI）：${file}\n  ${error.message}`)
    process.exit(2)
  }
}

const sessions = []
if (source.files.length > 0) {
  for (const file of source.files) sessions.push(parseSessionLog(readSessionText(file)))
} else {
  for (const sessionDir of readdirSync(source.sessionRoot, { withFileTypes: true })) {
    if (!sessionDir.isDirectory()) continue
    const dir = join(source.sessionRoot, sessionDir.name)
    const log = readdirSync(dir).find(name => name.endsWith('.jsonl.zstd') || name.endsWith('.jsonl'))
    if (log === undefined) continue
    sessions.push(parseSessionLog(readSessionText(join(dir, log))))
  }
}

const workspaceFiles = listFiles(workspace)
// ⚠ fail-loud：工作区里一份 `deliverables/` 下的文件都找不到 ⇒ 几乎肯定是 `--workspace` 指错了
// 层级（实测（R4）：指到 `company-workspace/deliverables` 本身时，相对路径全部丢掉 `deliverables/`
// 前缀，判据会把**所有** Lead 声明报成 dangling —— 结论全假但不报错）。
if (!workspaceFiles.some(file => file.startsWith('deliverables/'))) {
  console.error(`deliverables-check: ${workspaceRel} 下找不到任何 deliverables/ 文件。\n  --workspace 要给**含 deliverables/ 的工作区根**（如 company-workspace），不是 deliverables/ 本身。`)
  process.exit(2)
}

const result = auditDeliverables({
  workspaceFiles,
  sessions,
  legacyFlat: LEGACY_FLAT,
  ...(ONLY_SLUG === undefined ? {} : { onlySlug: ONLY_SLUG }),
})

const leadSessions = sessions.filter(s => s.delegationDepth === 0 && s.agentPreset === 'ceo').length
console.log(`deliverables-check: ${workspaceRel}${LEGACY_FLAT ? '（平铺旧形状口径）' : ''}${ONLY_SLUG === undefined ? '' : `（只审 ${ONLY_SLUG}）`}`)
console.log(`  会话日志 ${sessions.length} 份（其中 Lead ${leadSessions} 份）`)
console.log(`  成品 ${result.finals.length} 份：${result.finals.map(f => f.path).join(' / ') || '（无）'}`)
console.log(`  过程稿 ${result.drafts.length} 份`)
if (result.violations.length === 0) {
  console.log('  违规 0 条 —— ALL PASS')
  process.exit(0)
}
console.log(`  违规 ${result.violations.length} 条：`)
for (const violation of result.violations) {
  console.log(`    ${violation.code} | ${violation.path}\n      ${violation.detail}`)
}
process.exit(1)

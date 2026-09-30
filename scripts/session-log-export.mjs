#!/usr/bin/env node
// 会话日志导出（研究卡 E3，2026-09-30 立）：把 $DSH_HOME 里的 zstd 多帧会话日志导出成
// **明文平铺 .jsonl 目录**，让 `deliverables-check --sessions` / `authorship-audit` 等明文消费者
// （含归档快照审计——snapshots/README「登记一条缺口」从此有了工具）吃得上。
// 何时跑：① 轮末收敛后要审归档快照（配 --workspace snapshots/<场景>/workspace.actual --sessions <本工具产物> --only <slug>）；
//   ② 跨 home 聚合审计（每家 home 各跑一次本工具再合并目录）；
//   ③ 要给别的工具喂明文日志时。成本：零模型；秒到分钟级（视日志量，zstd -dc 逐份解）。
// 用法：
//   source dev/env.sh && node scripts/session-log-export.mjs --out <dir> [--workspace <绝对路径>] [--home <DSH_HOME>]
//   不给 --workspace = 导出该 home 下全部 bucket（文件名带 bucket 前缀防撞）。
// 退出码：0 = 导出完成；1 = 无可导日志或全部失败；2 = 参数/环境失败。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url).split('/scripts/')[0])
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}
const OUT = arg('out')
if (OUT === undefined) { console.error('session-log-export: 必须给 --out <dir>'); process.exit(2) }
const HOME = arg('home') ?? process.env.DSH_HOME
if (HOME === undefined) { console.error('session-log-export: 需要 $DSH_HOME（先 source dev/env.sh）或 --home <path>'); process.exit(2) }
const SESSIONS = join(HOME, 'sessions')
if (!existsSync(SESSIONS)) { console.error(`session-log-export: 会话根不存在：${SESSIONS}`); process.exit(2) }

/** 单工作区过滤：DSH 的 per-workspace 分组名 = `-${绝对路径的 / 换 -}--`。 */
const workspaceArg = arg('workspace')
const wantedBucket = workspaceArg !== undefined ? `-${resolve(workspaceArg).replaceAll('/', '-')}--` : undefined

/** 找一个会话目录里的日志（与 deliverables-check 的活档同口径：优先 .jsonl.zstd，其次 .jsonl）。 */
function logOf(sessionDir) {
  const names = readdirSync(sessionDir)
  return names.find(name => name.endsWith('.jsonl.zstd')) ?? names.find(name => name.endsWith('.jsonl'))
}

/** 解一份日志：明文直读；zstd 多帧交给 CLI（Node 内置只解首帧）。 */
function readLogText(file) {
  if (!file.endsWith('.zstd')) return { text: readFileSync(file, 'utf8') }
  try {
    return { text: execFileSync('zstd', ['-dc', file], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8') }
  } catch (error) {
    return { error: error.message }
  }
}

const outDir = resolve(OUT)
mkdirSync(outDir, { recursive: true })
let exported = 0; let skipped = 0; let failed = 0
for (const bucket of readdirSync(SESSIONS, { withFileTypes: true })) {
  if (!bucket.isDirectory()) continue
  if (wantedBucket !== undefined && bucket.name !== wantedBucket) continue
  const bucketDir = join(SESSIONS, bucket.name)
  for (const session of readdirSync(bucketDir, { withFileTypes: true })) {
    if (!session.isDirectory()) continue
    const log = logOf(join(bucketDir, session.name))
    if (log === undefined) { skipped++; continue }
    const { text, error } = readLogText(join(bucketDir, session.name, log))
    if (error !== undefined) { failed++; console.error(`  ✗ ${bucket.name}/${session.name}: ${error}`); continue }
    if (text.trim() === '') { skipped++; continue }
    const prefix = wantedBucket !== undefined ? '' : `${bucket.name}__`
    writeFileSync(join(outDir, `${prefix}${session.name}.jsonl`), text)
    exported++
  }
}
console.log(`session-log-export: ${String(exported)} 份导出 / ${String(skipped)} 无日志跳过 / ${String(failed)} 失败 → ${outDir}${wantedBucket !== undefined ? `（bucket=${wantedBucket}）` : '（全 bucket）'}`)
process.exit(exported > 0 ? 0 : 1)

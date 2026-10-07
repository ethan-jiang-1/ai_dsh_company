#!/usr/bin/env node
// 状态：常驻
// 会话日志导出（研究卡 E3，2026-09-30 立）：把 $DSH_HOME 里的 zstd 多帧会话日志导出成
// **明文平铺 .jsonl 目录**，让 `deliverables-check --sessions` / `authorship-audit` 等明文消费者
// （含归档快照审计——snapshots/README「登记一条缺口」从此有了工具）吃得上。
// 何时跑：① 轮末收敛后要审归档快照（配 --workspace snapshots/<类型>/<场景>/workspace.actual --sessions <本工具产物> --only <slug>）；
//   ② 跨 home 聚合审计（每家 home 各跑一次本工具再合并目录）；
//   ③ 要给别的工具喂明文日志时。成本：零模型；秒到分钟级（视日志量，zstd -dc 逐份解）。
// 用法：
//   source run/env.sh && node tools/session-log-export.mjs --out <dir> [--workspace <绝对路径>] [--home <DSH_HOME>]
//   不给 --workspace = 导出该 home 下全部 bucket（文件名带 bucket 前缀防撞）。
// 退出码：0 = 导出完成；1 = 无可导日志或全部失败；2 = 参数/环境失败。
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { pickSessionLog } from './lib/session-log-generation.mjs'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { requireDevHome } from './lib/runtime-home.mjs'

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}
const OUT = arg('out')
if (OUT === undefined) { console.error('session-log-export: 必须给 --out <dir>'); process.exit(2) }
// env 路径过家族守卫（拒绝缺失/与日用 home 重叠/符号链接别名；2026-10-07 体检轮接线）；
// --home = 显式跨 home 逃生口（第二 home / 归档导出——明示传入不做日用拒绝）
const HOME = arg('home') ?? (() => { try { return requireDevHome('session-log-export') } catch (error) { console.error(error.message); process.exit(2) } })()
const SESSIONS = join(HOME, 'sessions')
if (!existsSync(SESSIONS)) { console.error(`session-log-export: 会话根不存在：${SESSIONS}`); process.exit(2) }

/** 单工作区过滤：DSH 的 per-workspace 分组名 = `-${绝对路径的 / 换 -}--`。 */
const workspaceArg = arg('workspace')
const wantedBucket = workspaceArg !== undefined ? `-${resolve(workspaceArg).replaceAll('/', '-')}--` : undefined

/** 找一个会话目录里的日志（世代选择唯一口径 = tools/lib/session-log-generation.mjs：版本化数值取最高、同代 zstd 优先、child 排除）。 */
const logOf = (sessionDir) => pickSessionLog(sessionDir)?.name

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

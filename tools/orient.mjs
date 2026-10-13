// 状态：常驻
// Orient：keyless 只读运行态观测（RFC driver-surface-package 条目 B；preset 字段与
// --session 历史会话口径 = observation-hardening 条目 B / observation-closeout 条目 A；
// 「待核工作候选」扫描节 = RFC orient-scan-view——默认全景对 deliverables/ 跑已采用的
// R3′（scanR3Dual），零容忍未达门槛只显示不进待办，规则语义唯一家 = candidate-scan.mjs；
// --workspace <dir> 把公司盘/扫描指向别的工作区（RFC r7-motion-final 走查切片，缺席 fail-loud））
// ——不开 web 会话就能看到当前 home（含「未 source run/env.sh = 日用 home」警告）、在场
// profiles、最近会话（含 preset）、公司盘概览、待核工作候选与便宜检查清单；--session <slug>[/<id前缀>]
// 列/查某 slug 历史会话的 preset·cwd·createdAt；--scenario <kind>/<场景> 按 snapshots/README
// 「Run bundle 引用合同」计算 run bundle 视图（引用不复制，不落盘 manifest）。何时跑：想看
// 运行态全景 / 排查「现在到底跑在哪个 home」/ 查某 slug 历史会话口径 / 回查某场景证据链时；
// 成本：纯 fs 只读 + zstd 解会话头部（前 64KB），秒级，无模型无浏览器。
// 纯逻辑核心 = tools/lib/orient.mjs（keyless 测试面）；git / zstd 等真实进程效果只住本 CLI 侧。
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { repositoryRoot } from './lib/repository-layout.mjs'
import { homeStatus, listSessions, listSlugSessions, orientState, parseSessionHead, renderOrient, renderRunBundle, renderSessionView, runBundleView } from './lib/orient.mjs'

const ROOT = repositoryRoot

/** slug 目录下最新会话日志文件（.jsonl 或 .jsonl.zstd，mtime 近序第一）；无则 null。 */
function newestLogFile(sessionDir) {
  const logs = readdirSync(sessionDir)
    .filter(name => /\.jsonl(\.zstd)?$/.test(name))
    .map(name => ({ path: join(sessionDir, name), mtime: statSync(join(sessionDir, name)).mtime }))
    .sort((a, b) => b.mtime - a.mtime)
  return logs[0]?.path ?? null
}

/** 解指定会话日志的头部（zstd 多帧用 CLI 解——Node 内置只解第一帧，教义 = dev-loop §3.7）；
 *  只取前 64KB（type:session 头行总在开头）。zstd 缺失/不可读 → undefined（「不可用」，不伪造）。 */
function decodeSessionHead(homePath, slug, sessionId) {
  try {
    const log = newestLogFile(join(homePath, 'sessions', slug, sessionId))
    if (!log) return undefined
    const head = log.endsWith('.zstd')
      ? execFileSync('zstd', ['-d', '-c', log], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }).slice(0, 65536)
      : readFileSync(log, 'utf8').slice(0, 65536)
    return parseSessionHead(head)
  } catch {
    return undefined
  }
}

/** 最近会话的 preset：解该 slug 下最新会话日志头部。 */
function sessionPresetFor(homePath, slug) {
  try {
    const slugDir = join(homePath, 'sessions', slug)
    const sessionDirs = readdirSync(slugDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('session-'))
      .map(entry => ({ name: entry.name, mtime: statSync(join(slugDir, entry.name)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
    if (sessionDirs.length === 0) return undefined
    return decodeSessionHead(homePath, slug, sessionDirs[0].name)?.preset
  } catch {
    return undefined
  }
}

const args = process.argv.slice(2)
const argValue = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}
const scenarioIndex = args.indexOf('--scenario')
const sessionIndex = args.indexOf('--session')
if (scenarioIndex !== -1) {
  const selection = args[scenarioIndex + 1]
  if (!selection) {
    console.error('用法：pnpm orient --scenario <kind>/<场景>（如 replay/r2-motion；清单见 snapshots/README）')
    process.exit(1)
  }
  try {
    console.log(renderRunBundle(runBundleView(ROOT, selection)))
  } catch (error) {
    // fail-loud：场景缺失/歧义直接报错，不静默降级
    console.error(String(error.message ?? error))
    process.exit(1)
  }
} else if (sessionIndex !== -1) {
  const selection = args[sessionIndex + 1]
  if (!selection) {
    console.error('用法：pnpm orient --session <slug>[/<id前缀>]（slug 清单 = 主视图会话节）')
    process.exit(1)
  }
  const home = homeStatus(process.env)
  if (home.kind !== 'ok') {
    console.error('先 source run/env.sh（--session 需要生效的开发 home）')
    process.exit(1)
  }
  try {
    const [slug, idPrefix] = selection.split('/')
    const all = listSlugSessions(home.home, slug)   // slug 不存在 → fail-loud
    let rows
    if (idPrefix) {
      // 前缀同时兼容全 id（session-…）与 uuid 部分（用户从输出里抄哪段都行）
      const matched = all.filter(row => row.id.startsWith(idPrefix) || row.id.replace(/^session-/, '').startsWith(idPrefix))
      if (matched.length === 0) throw new Error(`id 前缀 ${idPrefix} 在 ${slug} 下无命中`)
      if (matched.length > 1) throw new Error(`id 前缀 ${idPrefix} 命中 ${matched.length} 个（${matched.map(m => m.id).join(', ')}）——加长前缀`)
      rows = matched
    } else {
      rows = all.slice(0, 10)   // 解码成本界：列表视图最多解 10 个头部
    }
    const withHead = rows.map(row => ({ ...row, head: decodeSessionHead(home.home, slug, row.id) }))
    console.log(renderSessionView(slug, withHead, { total: all.length }))
  } catch (error) {
    // fail-loud：slug/id 不存在或歧义直接报错，不静默降级
    console.error(String(error.message ?? error))
    process.exit(1)
  }
} else {
  let gitStatus = null
  let gitIgnored = null
  try {
    gitStatus = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', 'company-workspace'],
      { encoding: 'utf8' }).split('\n').filter(Boolean).length
    // 2026-10-13 瘦身轮起 drafts/**（含 sources/）**不进 git** ⇒ 只数 tracked 面会把本地过程稿
    // 报成"零改动"（静默失真）。这里另数一行 ignored 面：它是**正常的本地工作件**，不是脏。
    gitIgnored = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--ignored=matching', '--', 'company-workspace'],
      { encoding: 'utf8' }).split('\n').filter(line => line.startsWith('!! ')).length
  } catch { /* git 不可用（如非 git 环境）→ 概览里如实报不可用 */ }
  const home = homeStatus(process.env)
  let sessionPresets = null
  if (home.kind === 'ok') {
    sessionPresets = {}
    for (const { slug } of listSessions(home.home, 5).recent) {
      sessionPresets[slug] = sessionPresetFor(home.home, slug)
    }
  }
  // --workspace <dir>：把公司盘/待核候选扫描指向别的工作区（如录制快照 workspace.expected）——
  // RFC r7-motion-final 走查切片。git 改动行仍只算 company-workspace 面（标签如实）。
  const wsArg = argValue('--workspace')
  const workspaceRoot = wsArg === undefined ? join(ROOT, 'company-workspace') : resolve(wsArg)
  if (wsArg !== undefined && !existsSync(workspaceRoot)) {
    console.error(`--workspace：目录不存在 ${workspaceRoot}`)
    process.exit(1)
  }
  console.log(renderOrient(orientState({
    env: process.env,
    workspaceRoot,
    gitStatus,
    gitIgnored,
    sessionPresets,
  })))
}

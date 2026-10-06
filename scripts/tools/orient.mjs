// 状态：常驻
// Orient：keyless 只读运行态观测（RFC driver-surface-package 条目 B；preset 字段 =
// observation-hardening 条目 B）——不开 web 会话就能看到当前 home（含「未 source dev/env.sh
// = 日用 home」警告）、在场 profiles、最近会话（含 preset）、公司盘概览与便宜检查清单；
// --scenario <kind>/<场景> 按 snapshots/README「Run bundle 引用合同」计算 run bundle 视图
// （引用不复制，不落盘 manifest）。何时跑：想看运行态全景 / 排查「现在到底跑在哪个 home」/
// 回查某场景证据链时；成本：纯 fs 只读 + zstd 解最近会话头部（前 64KB），秒级，无模型无浏览器。
// 纯逻辑核心 = scripts/lib/orient.mjs（keyless 测试面）；git / zstd 等真实进程效果只住本 CLI 侧。
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot } from '../lib/repository-layout.mjs'
import { homeStatus, listSessions, orientState, parseSessionPreset, renderOrient, renderRunBundle, runBundleView } from '../lib/orient.mjs'

const ROOT = repositoryRoot

/** 最近会话的 preset：解该 slug 下最新会话日志的头部（zstd 多帧用 CLI 解——Node 内置只解第一帧，
 *  教义 = dev-loop §3.7）；zstd 缺失/解码失败 → undefined（渲染为「不可用」，不伪造）。 */
function sessionPresetFor(homePath, slug) {
  try {
    const slugDir = join(homePath, 'sessions', slug)
    const sessionDirs = readdirSync(slugDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('session-'))
      .map(entry => ({ path: join(slugDir, entry.name), mtime: statSync(join(slugDir, entry.name)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
    if (sessionDirs.length === 0) return undefined
    const logs = readdirSync(sessionDirs[0].path)
      .filter(name => /\.jsonl(\.zstd)?$/.test(name))
      .map(name => ({ path: join(sessionDirs[0].path, name), mtime: statSync(join(sessionDirs[0].path, name)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
    if (logs.length === 0) return undefined
    const log = logs[0].path
    const head = log.endsWith('.zstd')
      ? execFileSync('zstd', ['-d', '-c', log], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }).slice(0, 65536)
      : readFileSync(log, 'utf8').slice(0, 65536)
    return parseSessionPreset(head)
  } catch {
    return undefined   // zstd 缺失 / 日志不可读 → 「不可用」
  }
}

const args = process.argv.slice(2)
const scenarioIndex = args.indexOf('--scenario')
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
} else {
  let gitStatus = null
  try {
    gitStatus = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', 'company-workspace'],
      { encoding: 'utf8' }).split('\n').filter(Boolean).length
  } catch { /* git 不可用（如非 git 环境）→ 概览里如实报不可用 */ }
  const home = homeStatus(process.env)
  let sessionPresets = null
  if (home.kind === 'ok') {
    sessionPresets = {}
    for (const { slug } of listSessions(home.home, 5).recent) {
      sessionPresets[slug] = sessionPresetFor(home.home, slug)
    }
  }
  console.log(renderOrient(orientState({
    env: process.env,
    workspaceRoot: join(ROOT, 'company-workspace'),
    gitStatus,
    sessionPresets,
  })))
}

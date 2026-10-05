// 状态：常驻
// Orient：keyless 只读运行态观测（RFC driver-surface-package 条目 B）——不开 web 会话就能看到
// 当前 home（含「未 source dev/env.sh = 日用 home」警告）、在场 profiles、最近会话、公司盘概览
// 与便宜检查清单；--scenario <kind>/<场景> 按 snapshots/README「Run bundle 引用合同」计算
// run bundle 视图（引用不复制，不落盘 manifest）。何时跑：想看运行态全景 / 排查「现在到底
// 跑在哪个 home」/ 回查某场景证据链时；成本：纯 fs 只读，秒级，无模型无浏览器。
// 纯逻辑核心 = scripts/lib/orient.mjs（keyless 测试面）；git 计数等真实进程效果只住本 CLI 侧。
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { repositoryRoot } from '../lib/repository-layout.mjs'
import { orientState, renderOrient, renderRunBundle, runBundleView } from '../lib/orient.mjs'

const ROOT = repositoryRoot
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
  console.log(renderOrient(orientState({
    env: process.env,
    workspaceRoot: join(ROOT, 'company-workspace'),
    gitStatus,
  })))
}

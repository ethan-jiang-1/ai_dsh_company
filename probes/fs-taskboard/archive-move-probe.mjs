#!/usr/bin/env node
// 状态：常驻
// 归档搬移机制认证档（2026-10-13 立，瘦身轮）：在**临时 git 仓**里真跑一次"交付物 → 归档家"的搬移。
// 何时跑：改 `tools/lib/converge-rules.mjs` 的 `archiveMovePlan` / `tools/converge.mjs` 的搬移段 /
//   `.gitignore` 的公司盘 drafts 规则时。零模型成本、零网络（只用本机 git + 临时目录）。
//
// 为什么需要它（为什么不是 keyless）：搬移失效的正是"**文件面**"——`git mv <目录>` 遇到未跟踪文件
// 会 fatal（`not under version control`），而 `drafts/**` 自瘦身轮起正是未跟踪的。keyless 回归层
// **不许起子进程**（tests/harness/layering.spec.ts 守卫；本档初版误住 tests/ 被它当场拦下），
// 所以"真 git"这半必须住探针档：真 .gitignore、真未跟踪件、真 git add。
//
// 判据（红即 exit 1）：
//   A1 计划形状：from/to 指向 deliverables → deliverables-archive，git 参数 = `add -A -- <旧> <新>`
//   A2 目录真搬走（工作树里旧路径不存在、新路径在场，含未跟踪的 drafts/sources）
//   A3 tracked 面 stage 成**重命名**（`R  …/final.md -> …/final.md`）——证明成品照样入库
//   A4 ignored 面**不进索引**（drafts/sources 不出现在 `git status --porcelain`）——瘦身不反弹
//   A5 反证口径写在注释里（把计划换成 `['mv', …]` ⇒ A2/A3 红）
// 用法：source run/env.sh && node probes/fs-taskboard/archive-move-probe.mjs
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { archiveMovePlan } from '../../tools/lib/converge-rules.mjs'

const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

const repo = mkdtempSync(join(tmpdir(), 'archive-move-probe-'))
const run = (args) => {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${String(r.stderr).slice(0, 200)}`)
  return r.stdout ?? ''
}

try {
  run(['init', '-q'])
  writeFileSync(join(repo, '.gitignore'), 'drafts/\n', 'utf8')
  const dirName = '2026-10-13-demo-slug'
  const live = join(repo, 'company-workspace', 'deliverables', dirName)
  mkdirSync(join(live, 'drafts', 'sources'), { recursive: true })
  mkdirSync(join(repo, 'company-workspace', 'deliverables-archive'), { recursive: true })
  writeFileSync(join(live, 'final.md'), '# 成品\n', 'utf8')
  writeFileSync(join(live, 'meta.md'), 'slug: demo-slug\n', 'utf8')
  writeFileSync(join(live, 'drafts', 'ceo.md'), '# 过程稿\n', 'utf8')
  writeFileSync(join(live, 'drafts', 'sources', 'raw.html'), '<html/>', 'utf8')
  run(['add', '-A'])
  // 先落一次提交：没有 HEAD 时 git 只报 A（无重命名基线），R 检测要求可比的上一版
  run(['-c', 'user.email=probe@example.invalid', '-c', 'user.name=probe', 'commit', '-qm', 'init'])

  const plan = archiveMovePlan(dirName)
  check('A1 计划形状（deliverables → deliverables-archive；git = add -A）',
    plan.from === `company-workspace/deliverables/${dirName}`
    && plan.to === `company-workspace/deliverables-archive/${dirName}`
    && plan.gitArgs.join(' ') === `add -A -- ${plan.from} ${plan.to}`,
    JSON.stringify(plan))

  renameSync(join(repo, plan.from), join(repo, plan.to))
  run(plan.gitArgs)

  check('A2 目录真搬走（含未跟踪的 drafts/sources）',
    !existsSync(join(repo, plan.from)) && existsSync(join(repo, plan.to, 'drafts', 'sources', 'raw.html')))
  const staged = run(['status', '--porcelain'])
  check('A3 tracked 面 stage 成重命名',
    staged.includes(`R  company-workspace/deliverables/${dirName}/final.md -> company-workspace/deliverables-archive/${dirName}/final.md`),
    staged.split('\n').filter(Boolean).slice(0, 3).join(' | '))
  check('A4 ignored 面不进索引（drafts/sources 不出现在 porcelain）',
    !staged.includes('drafts/ceo.md') && !staged.includes('sources/raw.html'))
} catch (error) {
  failures.push(error.message)
  console.error(`archive-move-probe: ${error.message}`)
} finally {
  rmSync(repo, { recursive: true, force: true })
}

console.log(failures.length === 0
  ? '\narchive-move-probe: ALL PASS（临时 git 仓真跑：fs 搬移 + git add -A；成品入库、过程稿不入库）'
  : `\narchive-move-probe: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1

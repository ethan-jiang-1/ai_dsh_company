// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { spawnSync } from 'node:child_process'
import { UNCONDITIONAL_STEPS, planPrePush, selectSurfaces } from '../../tools/lib/core/asset-lanes.mjs'

// ── 面规则完备性门（surface-coverage，2026-11-16 二轮立；2026-11-27 增全集 coveredBy↔planPrePush 一致性）──
// 为什么：pre-push 的 `SURFACE_RULES` 决定「改到哪个面要跑哪条真入口」。`asset-lanes.spec` 的
// 完备性判据只有样本抽样——BUG-186 修复后仍有 19 条 tracked 路径既无 asset 也无 `coveredBy`，
// spec 全绿（BUG-192）；2026-11-27 盲审二轮又抓出 `packages/company-pack/src/host/README.md` 在
// `SURFACE_RULES` 申报了 `typecheck/test:spec` 但 `planPrePush` 将其走 docs-only 跳过（假豁免）。
// 本门用 `git ls-files` 求全集：
//   ① 每条 tracked 路径必须有 surface asset 或 coveredBy 申报（`unseen` 为空）；
//   ② 每条 tracked 路径在 `coveredBy` 里申报的非无条件步骤，必须真被 `planPrePush([path]).steps` 勾选；
//   ③ tracked 集合为空 / git 不可用 = 判据没有对象，报错而不是通过。
//
// 负例留证 2026-11-16（二轮，真树实跑）：删掉 `packages/company-pack/locale/**` 规则 →
//   `FAIL surface-coverage: N 条 tracked 路径未分类…packages/company-pack/locale/en.json…`；还原 → 绿。
// 负例留证 2026-11-27（盲审二轮，真树实跑）：去掉 `packages/company-pack/src/**/README.md` 窄规则 →
//   `FAIL surface-coverage: 1 条 tracked 路径的 coveredBy 未被 planPrePush 真实触发（假豁免）：packages/company-pack/src/host/README.md（缺 smoke:fast/test:spec/typecheck）`；补回 → 绿。
export function run({ root, ok, fail }) {
  const listed = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  if (listed.status !== 0) {
    fail('surface-coverage', `git ls-files 失败（${(listed.stderr || '').trim().split('\n')[0] || '不是 git 仓库？'}）——完备性没有对象，不许当通过`)
    return
  }
  const paths = listed.stdout.split('\0').filter(Boolean)
  if (paths.length === 0) {
    fail('surface-coverage', 'tracked 路径为空——完备性没有对象，不许当通过')
    return
  }
  const { covered, unseen } = selectSurfaces(paths)
  if (unseen.length > 0) {
    const head = unseen.slice(0, 12).join('、')
    fail('surface-coverage', `${String(unseen.length)} 条 tracked 路径既没有 surface asset 也没有 coveredBy——登记 SURFACE_RULES（或写清由哪条无条件步骤覆盖）：${head}${unseen.length > 12 ? ` …共 ${String(unseen.length)} 条` : ''}`)
    return
  }
  const unconditional = new Set(UNCONDITIONAL_STEPS)
  const mismatches = []
  for (const entry of covered) {
    const scoped = entry.coveredBy.filter(step => !unconditional.has(step))
    if (scoped.length === 0) continue
    const planned = new Set(planPrePush([entry.path]).steps)
    const missing = scoped.filter(step => !planned.has(step))
    if (missing.length > 0) mismatches.push(`${entry.path}（缺 ${missing.join('/')}）`)
  }
  if (mismatches.length > 0) {
    const head = mismatches.slice(0, 8).join('；')
    fail('surface-coverage', `${String(mismatches.length)} 条 tracked 路径的 coveredBy 未被 planPrePush 真实触发（假豁免）：${head}${mismatches.length > 8 ? ` …共 ${String(mismatches.length)} 条` : ''}`)
    return
  }
  ok(`surface-coverage ×${String(paths.length)} tracked 路径（全集有 asset/coveredBy 且 coveredBy 均被 planPrePush 真实触发）`)
}

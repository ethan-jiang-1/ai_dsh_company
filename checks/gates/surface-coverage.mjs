// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { spawnSync } from 'node:child_process'
import { selectSurfaces } from '../../tools/lib/asset-lanes.mjs'

// ── 面规则完备性门（surface-coverage，2026-11-16 二轮立）──────────────────────────
// 为什么：pre-push 的 `SURFACE_RULES` 决定「改到哪个面要跑哪条真入口」。`asset-lanes.spec` 的
// 完备性判据只有 20 条样本 + 顶层目录抽样——BUG-186 修复后仍有 19 条 tracked 路径既无 asset
// 也无 `coveredBy`，spec 全绿（BUG-192）；选择器对未命中静默（BUG-186）又让它们能静默 push
// （BUG-199）。抽样判据自称「每个改动面都有证据」，实际只证样本——「判据名 > 判据面」的同一类
// 假绿。本门用 `git ls-files` 求全集：每条 tracked 路径必须有 surface asset 或 coveredBy 申报。
//
// 判据（机械、窄）：
//   ① `git ls-files -z` 的全集逐条过 `selectSurfaces`，`unseen` 必须为空；
//   ② tracked 集合为空 / git 不可用 = 判据没有对象，报错而不是通过。
// 业务语义（哪些面挂哪条 lane）仍归 `tools/lib/asset-lanes.mjs` + 它的 spec；本门只管「不漏」。
//
// 负例留证 2026-11-16（二轮，真树实跑）：删掉 `packages/company-pack/locale/**` 规则 →
//   `FAIL surface-coverage: N 条 tracked 路径未分类…packages/company-pack/locale/en.json…`；
//   还原 → 绿（全 tracked 有证据）。负例口径 = 只回滚规则、保留本门。
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
  const { unseen } = selectSurfaces(paths)
  if (unseen.length === 0) {
    ok(`surface-coverage ×${String(paths.length)} tracked 路径（每条都有 asset 或 coveredBy 申报）`)
    return
  }
  const head = unseen.slice(0, 12).join('、')
  fail('surface-coverage', `${String(unseen.length)} 条 tracked 路径既没有 surface asset 也没有 coveredBy——登记 SURFACE_RULES（或写清由哪条无条件步骤覆盖）：${head}${unseen.length > 12 ? ` …共 ${String(unseen.length)} 条` : ''}`)
}

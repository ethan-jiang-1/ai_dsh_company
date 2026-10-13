// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { lstatSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { canonicalSnapshotScenes } from '../../tools/lib/repository-layout.mjs'

// ── 2c-quater. snapshots 体积预算（2026-10-05 立，复跑轮用户拍板「无法承受没完没了的增长」）──
// 为什么：memory-convergence-*（轮末收敛整盘拷贝）是**唯一无界增长源**——每轮一份、两周 7 目录，
// 无预算时增长不可见。回归基线（r1/r2/r4/r5b/scenario-b/foundation）与探针证据按设计常驻本目录，
// 不设单项预算；总预算 + 收敛子预算让增长每次 verify 都可见。超线处置次序：tar.zst 压缩归档 →
// 外置冷存（三保：journal-audit 的 workspace.actual/kb 路径契约、CHARTER 历史纪要指针完整性、
// git remote 备份连续性）。反证 = 预算常量临时调 1 → 本门禁红（2026-10-05 实证）。
// 噪声剔除先例：r2-motion/replay/raw（6.4M）与 sessions/ 逐字节重复（md5 五对全双），已剔除——
// 派生/重复形状不入库；恢复路径 = git 历史。
export function run({ root, ok, fail }) {
  const walkBytes = dir => readdirSync(dir, { withFileTypes: true })
    .reduce((sum, d) => {
      const p = join(dir, d.name)
      return sum + (d.isDirectory() ? walkBytes(p) : lstatSync(p).size)
    }, 0)
  const SNAPSHOTS_TOTAL_BUDGET_MB = 64
  const SNAPSHOTS_CONVERGENCE_BUDGET_MB = 16
  const snapshotsDir = join(root, 'snapshots')
  const totalBytes = walkBytes(snapshotsDir)
  const convergenceBytes = canonicalSnapshotScenes(root)
    .filter(scene => scene.name.startsWith('memory-convergence-'))
    .reduce((sum, scene) => sum + walkBytes(scene.path), 0)
  const mb = b => (b / 1024 / 1024).toFixed(1) + 'M'
  totalBytes <= SNAPSHOTS_TOTAL_BUDGET_MB * 1024 * 1024
    ? ok(`snapshots-budget 总量 ${mb(totalBytes)}/${SNAPSHOTS_TOTAL_BUDGET_MB}M`)
    : fail('snapshots-budget', `snapshots 总量 ${mb(totalBytes)} > ${SNAPSHOTS_TOTAL_BUDGET_MB}M——压缩归档（tar.zst）或外置冷存（保 journal-audit 路径契约 / CHARTER 指针 / 备份连续性）`)
  convergenceBytes <= SNAPSHOTS_CONVERGENCE_BUDGET_MB * 1024 * 1024
    ? ok(`snapshots-budget memory-convergence ${mb(convergenceBytes)}/${SNAPSHOTS_CONVERGENCE_BUDGET_MB}M`)
    : fail('snapshots-budget', `memory-convergence-* 累计 ${mb(convergenceBytes)} > ${SNAPSHOTS_CONVERGENCE_BUDGET_MB}M——收敛切片是唯一无界源（压旧切片或外置）`)
}

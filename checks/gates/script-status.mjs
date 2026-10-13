// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { scriptInspection } from './script-triggers.mjs'

// ── 2f-bis. 脚本状态头注门禁（2026-10-04 清扫批，用户裁断③：头注加状态字段）────
// 负例留证 2026-10-04：剥掉任一脚本「状态」行 → script-status 红，还原即绿。
// 为什么：形态名 scripts/ 曾混住验证/调试/工具三用途（2026-10-07 S2 升顶层拆分），fresh agent 分不清活门禁与用完的探针
// （实测 migration-rehearsal 迁移已执行后头注仍像活触发器、--execute 改真盘）。解法与 2f 同教义：
// 家 = 脚本自己——每个脚本头注自述「状态：常驻」或「状态：已耗（YYYY-MM-DD …原因/复跑条件）」。
export function run({ ok, fail }) {
const ALL_SCRIPTS = scriptInspection.entries
const statusMissing = scriptInspection.missingStatus
const statusBad = scriptInspection.invalidStatus
statusMissing.length === 0 && statusBad.length === 0
  ? ok(`script-status ×${ALL_SCRIPTS.length}（头注自述「状态：常驻|已耗（日期+原因）」）`)
  : fail('script-status', `脚本状态头注缺失或形非法：缺 = ${statusMissing.join(', ') || '无'}；非法 = ${statusBad.join('；') || '无'}（格式：「// 状态：常驻」或「// 状态：已耗（YYYY-MM-DD …）」）`)
}
